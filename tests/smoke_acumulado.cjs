// 04d: acumulado de faltantes por máquina + umbral 3 % con pistas completas
const fs=require('fs');const src=fs.readFileSync(__dirname+'/../fabrica_bolsas_v6.html','utf8');
let ok=0,mal=0;const t=(c,m)=>{if(c)ok++;else{mal++;console.log('MAL',m);}};
const i=src.indexOf('function _cvvAcumCalc(');const j=src.indexOf('\nasync function _cvvAcumulado',i);
const f=new Function(src.slice(i,j)+';return _cvvAcumCalc;')();
const filas=[{cierre_cortadas:10000,cierre_faltan:150,cierre_maquinas:'1'},{cierre_cortadas:20000,cierre_faltan:300,cierre_maquinas:'2'},{cierre_cortadas:5000,cierre_faltan:-20,cierre_maquinas:'1,2'}];
const A=f(filas,['1'],{ent:5000,faltan:100});
t(A.n===3&&A.c===20000&&A.f===230,'suma C1 + esta OC: '+JSON.stringify(A));
t(A.nivel==='rojo','1,15 % → rojo');
t(f(filas,['2'],null).nivel==='rojo','C2 1,12 % → rojo');
t(f([{cierre_cortadas:10000,cierre_faltan:60,cierre_maquinas:'1'}],['1'],null).nivel==='ambar','0,6 % → ámbar');
t(f([{cierre_cortadas:10000,cierre_faltan:20,cierre_maquinas:'1'}],['1'],null).nivel==='ok','0,2 % → ok');
t(/R\.tol=\(R\.pst&&R\.pst\.completa&&R\.pst\.cortP!=null\)\?0\.03:0\.01;/.test(src)&&/R\.pct>R\.tol\?'faltan'/.test(src),'umbral 3 % con pistas completas');
t(/cierre_cortadas:ctl&&ctl\.ent!=null/.test(src)&&/cierre_faltan:ctl&&ctl\.faltan!=null/.test(src),'el cierre guarda cortadas y faltan');
t(/R\.alerta=\(R\.base!=='pistas'&&\(R\.pConf==='dudoso'\|\|!R\.golpes\)\)/.test(src),'05b: por pistas no alerta por golpes de tirada');
t(/R\.base!=='pistas'&&\(R\.pConf==='dudoso'\|\|!R\.golpes\)\?'<div style="border:2px solid var\(--amber\)/.test(src),'05b: sin cartel LOS GOLPES NO SON DE ESTA OC por pistas');
console.log(ok+' ok, '+mal+' mal');process.exit(mal?1:0);
