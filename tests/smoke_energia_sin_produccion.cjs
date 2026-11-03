// 02l: ⚡ «Consumo sin producción» (> 10 kW durante 45 min seguidos o más con 0 extrusoras produciendo
// según el PLC) y kg netos para kWh/kg. Funciones puras de la pantalla Extrusión en vivo.
const fs=require('fs');const src=fs.readFileSync(process.argv[2]||(__dirname+'/../fabrica_bolsas_v6.html'),'utf8');
function bloque(ini,fin){const i=src.indexOf(ini);const j=src.indexOf(fin,i);if(i<0||j<0)throw new Error('no encuentro '+ini);return src.slice(i,j);}
eval(bloque('const ENE={','function _enePrecio(').replace('const ENE=','global.ENE='));
eval(bloque('function _eneSinProduccion(','// Plan de recursos: ¿había alguna extrusora'));
eval(bloque('function _eneMinutosPLC(','// Pura: «Consumo sin producción»'));
eval(bloque('function _evvKgNeto(','// 07j'));
eval(bloque('function _eneTsBob(','async function _eneEntre('));
eval(bloque('function _eneKgEntre(','// Carga lo de Extrusión en vivo'));
let ok=0,fail=0;const t=(c,m)=>{if(c)ok++;else{fail++;console.log('FALLA',m);}};
const T0=Date.UTC(2026,10,1,3,0,0);   // 01/11 00:00 AR
const iso=k=>new Date(T0+k*60000).toISOString();
// PLC: una máquina, minuto a minuto, produciendo de 0 a 59 y de 200 a 299; parada el resto (hay dato siempre)
const mins=[];for(let k=1;k<=400;k++)mins.push({ts:iso(k),dtMin:1,est:(k<60||(k>=200&&k<300))?'P':'S'});
const P=_eneMinutosPLC([{mins}]);
t(P.dato.has(Math.floor(T0/60000)+100)&&!P.prod.has(Math.floor(T0/60000)+100),'minuto 100: hay dato y no produce');
// energía: 15 kW todo el tiempo
const E=[];for(let k=1;k<=400;k++)E.push({t:T0+k*60000,kw:15,kwh:0.25});
let r=_eneSinProduccion(E,P);
t(r.length===2,'dos rachas (61–198 y 301–400): '+r.length);
t(r[0]&&r[0].n>=130&&Math.abs(r[0].kwh-r[0].n*0.25)<1e-9,'kWh = suma de los minutos');
// por debajo de 10 kW no alarma
t(_eneSinProduccion(E.map(e=>Object.assign({},e,{kw:8})),P).length===0,'8 kW no alarma');
// racha corta (< 45 min) no alarma
const E2=E.filter(e=>{const k=(e.t-T0)/60000;return k>=60&&k<100;});
t(_eneSinProduccion(E2,P).length===0,'40 min no alarma');
// hueco del medidor de 10 min corta la racha
const E3=E.filter(e=>{const k=(e.t-T0)/60000;return k>=61&&k<199&&!(k>=100&&k<110);});
r=_eneSinProduccion(E3,P);t(r.length===1&&r[0].n<45+50,'el hueco corta: '+r.map(x=>x.n));
// sin dato del PLC no alarma (no se adivina)
t(_eneSinProduccion(E,{prod:new Set(),dato:new Set()}).length===0,'sin PLC no alarma');
// kg netos: con tara si hay peso de balanza
const bobs=[{kg_reales:20.85,tara_tubo_kg:0.85,peso_origen:'balanza',fecha_produccion:'2026-11-01',hora_produccion:'10:00'},
  {kg_reales:10,tara_tubo_kg:0.85,peso_origen:null,fecha_produccion:'2026-11-01',hora_produccion:'11:00'},
  {kg_reales:99,fecha_produccion:'2026-11-01',hora_produccion:'12:00',anulada:true}];
t(Math.abs(_eneKgEntre(bobs,T0,T0+86400000)-30)<1e-9,'kg netos 20 + 10, sin anuladas');
console.log('smoke_energia_sin_produccion: '+ok+' ok, '+fail+' fallas');process.exit(fail?1:0);
