// smoke 15b — ✂ Corte en vivo: turnos sin confiar en entrada/salida, golpe → OC/operario, control de OC, operarios
// uso: TZ=America/Argentina/Buenos_Aires node tests/smoke_corte_vivo.cjs fabrica_bolsas_v6.html
const fs=require('fs');const src=fs.readFileSync(process.argv[2]||'fabrica_bolsas_v6.html','utf8');
const a=src.indexOf('// ===== ✂ CORTE EN VIVO (15b) =====');const b=src.indexOf('function _cvvCard(');
if(a<0||b<0||b<a){console.log('FALTA el bloque');process.exit(1);}
let ok=0,bad=0;const t=(c,m)=>{if(c)ok++;else{bad++;console.log('✗ '+m);}};
global.C={empleados:[{id:1,apellido_nombre:'Araujo Celia'},{id:2,apellido_nombre:'Acevedo Braian'}],maq_corte:[{id:1,nombre:'CORTE-01'},{id:2,nombre:'CORTE-02'}]};
eval(src.slice(a,b).replace('const CVV=','global.CVV=').replace('const CVV_PAUSA_MIN=3,CVV_LARGA_MIN=20;','global.CVV_PAUSA_MIN=3;global.CVV_LARGA_MIN=20;').replace('const _CVV_OPCOL','global._CVV_OPCOL'));
const T=(s)=>new Date('2026-10-14T'+s+'-03:00').getTime(),H=3600000,M=60000;
// 1) turnos: Acevedo marca «entrada» al irse; doble escaneo; turno en curso
{const f=[{empleado_id:2,fecha:'2026-10-13',hora:'14:52:00',tipo:'entrada'},{empleado_id:2,fecha:'2026-10-14',hora:'00:32:00',tipo:'entrada'},
  {empleado_id:1,fecha:'2026-10-14',hora:'06:11:00',tipo:'entrada'},{empleado_id:1,fecha:'2026-10-14',hora:'06:11:04',tipo:'salida'},{empleado_id:1,fecha:'2026-10-14',hora:'15:00:00',tipo:'salida'},
  {empleado_id:2,fecha:'2026-10-14',hora:'14:58:00',tipo:'salida'}];
 const tu=_cvvTurnos(f,T('16:00:00'));
 t(tu[2].length===2,'Acevedo: 2 turnos ('+tu[2].length+')');t(Math.round((tu[2][0][1]-tu[2][0][0])/M)===580,'1er turno 9 h 40');
 t(tu[2][1][1]===T('16:00:00'),'turno en curso hasta ahora');
 t(tu[1].length===1&&tu[1][0][0]===T('06:11:00')&&tu[1][0][1]===T('15:00:00'),'Celia: doble escaneo descartado');}
// 2) asignación
const ocs={10:{id:10,numero_orden:'OC-A',estado:'Completada',fecha_completada:'2026-10-14T13:00:00-03:00',unidades_reales:400,peso_scrap_kg:0.5,productos:{metros_por_bolsa:0.5,peso_por_bolsa:0.01}},
  11:{id:11,numero_orden:'OC-B',estado:'En proceso',unidades_reales:null,peso_scrap_kg:null,productos:{metros_por_bolsa:1,peso_por_bolsa:0.02}}};
const cargas=[{orden_corte_id:10,maquina_id:1,empleado_id:1,metros_usados:100,t:T('07:00:00')},{orden_corte_id:11,maquina_id:1,empleado_id:1,metros_usados:300,t:T('12:00:00')}];
const turnos={1:[[T('06:00:00'),T('15:00:00')]]};
const td=(m,a,z,g,x)=>Object.assign({maquina:m,ti:T(a),tf:T(z),golpes:g,sin_hora:false},x||{});
// OC-A: 4 tandas de 25 + 1 incompleta de 5 (=105 golpes × 2 pistas = 210 bolsas, teo 200)
// parada 07:30–08:10 (40 min, larga); OC-B: escaneada 12:00 pero cortó 11:00 (tarde), 3 tandas 25 a 1 pista
const tds=[td(1,'07:01:00','07:02:00',25),td(1,'07:02:30','07:03:30',25),td(1,'07:04:00','07:05:00',5),
  td(1,'08:10:00','08:11:00',25),td(1,'08:11:30','08:12:30',25),
  td(1,'11:00:00','11:01:00',25),td(1,'11:01:30','11:02:30',25),td(1,'11:03:00','11:04:00',25),
  td(1,'14:30:00','14:30:00',40,{sin_hora:true})];
_cvvAsignar(tds,cargas,ocs,turnos);
t(tds.slice(0,5).every(x=>x.oc===10&&x.regla==='antes'),'07–08 h → OC-A');
t(tds.slice(5,8).every(x=>x.oc===11&&x.regla==='tarde'),'11 h (antes de escanear 12 h) → OC-B tarde');
t(tds.every(x=>x.emp===1),'operario Celia');
const R=_cvvOCs(tds,cargas,ocs),A=R.find(o=>o.id===10),B=R.find(o=>o.id===11);
t(A.golpes===105&&A.pistas===2&&A.cortadas===210,'OC-A 105 golpes × 2 = 210 ('+A.golpes+'×'+A.pistas+')');
t(A.tanda===25&&A.parciales.length===1&&A.bolsasParc===10,'OC-A tanda 25, 1 incompleta = 10 bolsas');
t(Math.round(A.sinUbicar)===-240,'OC-A sin ubicar = 210−400−50 = −240 ('+A.sinUbicar+')');t(A.sem==='bad','OC-A no cierra');
t(B.golpes===115&&B.tardeG===75,'OC-B 75 golpes tarde + 40 sin hora ('+B.golpes+','+B.tardeG+')');
t(B.decl==null&&B.sem==='','OC-B abierta sin semáforo');
// 3) operario
const O=_cvvOperarios(tds,cargas,turnos,T('06:00:00'),T('16:00:00'))[0];
t(Math.round(O.fich/M)===540,'fichado 9 h');t(O.nLarga===2,'2 paradas largas (07:05→08:10 y 08:12→11:00) ('+O.nLarga+')');
t(Math.round(O.arr/M)===61,'arranque 61 min ('+Math.round(O.arr/M)+')');t(O.cargas===2&&O.cambiosOC===1,'2 bobinas, 1 cambio de OC');
t(O.golpes===220,'golpes 180 + 40 sin hora ('+O.golpes+')');
t(Math.round(O.cort/M)===11,'cortando: 3 corridas 4 + 2,5 + 4 min ('+Math.round(O.cort/M)+' min)');
// 4) estado al instante
const now=T('10:00:00');
t(_cvvSt({actualizado_en:new Date(now-5000).toISOString(),ultimo_golpe:new Date(now-3000).toISOString()},now).k==='P','cortando');
t(_cvvSt({actualizado_en:new Date(now-5000).toISOString(),ultimo_golpe:new Date(now-60000).toISOString()},now).k==='F','pausa');
t(_cvvSt({actualizado_en:new Date(now-5000).toISOString(),ultimo_golpe:new Date(now-600000).toISOString()},now).t==='Parada 10 min','parada 10 min');
t(_cvvSt({actualizado_en:new Date(now-300000).toISOString()},now).k==='N','sin datos');
console.log((bad?'FALLA':'OK')+' smoke_corte_vivo: '+ok+' ok, '+bad+' mal');process.exit(bad?1:0);
