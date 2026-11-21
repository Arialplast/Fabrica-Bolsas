// 23g: dos órdenes en proceso que comparten extrusoras
const fs=require('fs');const src=fs.readFileSync(process.argv[2],'utf8');let f=0;const A=(c,m)=>{if(!c){f++;console.log('✗ '+m);}};
const i=src.indexOf('function _extRealEnProceso(');eval(src.slice(i,src.indexOf('\n}\n',i)+2));
// caso real 21/11: LYME (507) con última bobina en EXT-03 (11:09) y EXT-07 (11:49); BIO-LIMP (514) recién habilitada, sin bobinas
let R=_extRealEnProceso([{id:514,maqs:[3,7],rest:175},{id:507,maqs:[3,7],rest:20}],{3:{oe:507,t:1109},7:{oe:507,t:1149},1:{oe:534,t:1113}});
A(R.own[3]===514&&R.own[7]===507,'514 toma la máquina que cerró antes (EXT-03); 507 sigue en EXT-07');
A(R.estimada[514]===3,'es una estimación hasta su primera bobina');
A(JSON.stringify(R.restr[507])==='[7]'&&!R.restr[514],'la que termina queda sólo en la suya; la nueva suma la otra después');
A(R.primero.join()==='507','la que termina se programa primero');
// ya con la primera bobina de la 514 en EXT-07 (la realidad fue al revés de lo estimado): se corrige solo
R=_extRealEnProceso([{id:514,maqs:[3,7],rest:150},{id:507,maqs:[3,7],rest:20}],{3:{oe:507,t:1109},7:{oe:514,t:1230}});
A(R.own[7]===514&&R.own[3]===507&&R.estimada[514]==null&&JSON.stringify(R.restr[507])==='[3]','con bobina real manda la bobina');
// una sola orden en proceso en sus máquinas: nada cambia
R=_extRealEnProceso([{id:514,maqs:[3,7],rest:100}],{3:{oe:514,t:1},7:{oe:514,t:2}});A(!Object.keys(R.restr).length&&!R.primero.length,'una sola: sin cambios');
// órdenes en máquinas distintas: nada cambia
R=_extRealEnProceso([{id:1,maqs:[1],rest:50},{id:2,maqs:[2],rest:50}],{1:{oe:1,t:1},2:{oe:2,t:2}});A(!Object.keys(R.restr).length,'máquinas distintas: sin cambios');
// la anterior tiene UNA sola máquina: la nueva no se la saca (espera, como siempre)
R=_extRealEnProceso([{id:9,maqs:[1],rest:50},{id:8,maqs:[1],rest:10}],{1:{oe:8,t:5}});A(R.own[1]===8&&R.estimada[9]==null,'no le saca la única máquina');
// la última bobina es de una orden ya cerrada: nadie es dueño
R=_extRealEnProceso([{id:514,maqs:[3,7],rest:100},{id:507,maqs:[3,7],rest:20}],{3:{oe:400,t:1},7:{oe:400,t:2}});A(!Object.keys(R.own).length,'bobinas de una orden cerrada no cuentan');
A(/if\(_rs\)ent\.soloMaq=_rs\.slice\(\)/.test(src)&&/S\[o\.id\]\.soloMaq\.some/.test(src),'el Programa dibuja cada orden en su máquina real');
console.log(f?('FALLÓ '+f):'OK ext_real_en_proceso');process.exit(f?1:0);
