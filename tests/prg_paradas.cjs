// 23a: el Programa sombrea las horas en que no se trabaja
const fs=require('fs');const src=fs.readFileSync(process.argv[2],'utf8');let f=0;const A=(c,m)=>{if(!c){f++;console.log('✗ '+m);}};
const i=src.indexOf('function _prgFuera(');eval(src.slice(i,src.indexOf('\n}\n',i)+2));
const H=3600000;
// horizonte vie 22 h → lun 10 h (60 h). Trabajo: hasta sáb 12 h (14 h) y desde lun 6 h (56 h)
let F=_prgFuera([{a:-5*H,z:14*H},{a:56*H,z:200*H}],0,60*H);
A(F.length===1&&F[0].a===14*H&&F[0].z===56*H,'un solo hueco: sábado 12 → lunes 6');
A(_prgFuera([{a:0,z:10*H}],0,10*H).length===0,'todo trabajo: sin franjas');
F=_prgFuera([],0,10*H);A(F.length===1&&F[0].z===10*H,'sin jornada: todo parado');
F=_prgFuera([{a:6*H,z:15*H},{a:30*H,z:39*H}],0,48*H);A(F.length===3,'jornada partida: tres huecos');
A(/OFF=\{oe:_prgParadas\(t0,t1,'extrusion'\),oc:_prgParadas\(t0,t1,'corte'\)\}/.test(src)&&/class=\\?"prg-off\\?"/.test(src),'el Programa dibuja las franjas');
A(/hsLaboralesEntre\(new Date\(Math\.max\(b\.ini,ahora\)\),new Date\(b\.fin\),'extrusion'\)/.test(src),'duración en horas de trabajo');
console.log(f?('FALLÓ '+f):'OK prg_paradas');process.exit(f?1:0);
