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
const cargas=[{orden_corte_id:10,maquina_id:1,empleado_id:1,metros_usados:52.5,t:T('07:00:00')},{orden_corte_id:10,maquina_id:1,empleado_id:1,metros_usados:52.5,t:T('07:00:05')},{orden_corte_id:11,maquina_id:1,empleado_id:1,metros_usados:300,t:T('12:00:00')}];
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
t(Math.round(A.sinUbicar)===-240,'OC-A sobran 240: debían salir 210 − bultos 400 − scrap 50 ('+A.sinUbicar+')');t(A.sem==='bad','OC-A no cierra');
t(B.golpes===115&&B.tardeG===75,'OC-B 75 golpes tarde + 40 sin hora ('+B.golpes+','+B.tardeG+')');
t(B.decl==null&&B.sem==='','OC-B abierta sin semáforo');
// 3) operario
const O=_cvvOperarios(tds,cargas,turnos,T('06:00:00'),T('16:00:00'))[0];
t(Math.round(O.fich/M)===540,'fichado 9 h');t(O.nLarga===2,'2 paradas largas (07:05→08:10 y 08:12→11:00) ('+O.nLarga+')');
t(Math.round(O.arr/M)===61,'arranque 61 min ('+Math.round(O.arr/M)+')');t(O.cargas===3&&O.cambiosOC===1,'3 bobinas, 1 cambio de OC');
t(O.golpes===220,'golpes 180 + 40 sin hora ('+O.golpes+')');
t(Math.round(O.cort/M)===11,'cortando: 3 corridas 4 + 2,5 + 4 min ('+Math.round(O.cort/M)+' min)');
// 4) estado al instante
const now=T('10:00:00');
t(_cvvSt({actualizado_en:new Date(now-5000).toISOString(),ultimo_golpe:new Date(now-3000).toISOString()},now).k==='P','cortando');
t(_cvvSt({actualizado_en:new Date(now-5000).toISOString(),ultimo_golpe:new Date(now-60000).toISOString()},now).k==='F','pausa');
t(_cvvSt({actualizado_en:new Date(now-5000).toISOString(),ultimo_golpe:new Date(now-600000).toISOString()},now).t==='Parada 10 min','parada 10 min');
t(_cvvSt({actualizado_en:new Date(now-300000).toISOString()},now).k==='N','sin datos');

// 15f: pistas por tres vías
{const P=_cvvPistas;
 let r=P(908,3226,3136);t(r.p===null&&r.conf==='dudoso','OC-1052965 en CORTE-01: 908 golpes no cierran ('+r.conf+')');
 r=P(1537,3226,3136);t(r.p===2&&r.conf==='ok','OC-1052965 en CORTE-02: 1.537 × 2 cierra');
 r=P(4562,3953,4448);t(r.p===1&&r.conf==='faltaBob','OC-1052942 sin la BOB-06894: golpes = declarado, faltan metros ('+r.conf+')');
 r=P(4322,8630,8528);t(r.p===2&&r.conf==='ok','OC-1052964 2 pistas');
 r=P(2730,5516,5640);t(r.p===2&&r.conf==='ok','OC-1052962 2 pistas (lo prestado queda en sin ubicar)');
 r=P(1000,2100,null);t(r.p===2&&r.conf==='metros','OC abierta: sólo metros');}
// 5) control al cerrar la OC (sb simulado)
(async()=>{
const tabla={orden_corte_bobinas:[{id:1,orden_corte_id:10,metros_usados:52.5,fecha_asignacion:new Date(T('07:00:00')).toISOString(),empleado_id:1,maquina_id:1},
   {id:3,orden_corte_id:10,metros_usados:52.5,fecha_asignacion:new Date(T('07:00:05')).toISOString(),empleado_id:1,maquina_id:1},
   {id:2,orden_corte_id:11,metros_usados:300,fecha_asignacion:new Date(T('12:00:00')).toISOString(),empleado_id:1,maquina_id:1}],
 corte_tandas:tds.filter(x=>!x.sin_hora).map((x,i)=>({id:i,maquina:x.maquina,inicio:new Date(x.ti).toISOString(),fin:new Date(x.tf).toISOString(),golpes:x.golpes,sin_hora:false})),
 ordenes_corte:[{id:11,estado:'En proceso',fecha_completada:null}],corte_restos:[]};
const q=(n)=>{let rows=tabla[n].slice();const o={select(){return o;},eq(c,v){rows=rows.filter(r=>r[c]===v);return o;},in(c,v){rows=rows.filter(r=>v.includes(r[c]));return o;},
  gte(c,v){rows=rows.filter(r=>r[c]>=v);return o;},order(){return o;},range(a,b){return Promise.resolve({data:rows.slice(a,b+1),error:null});},then(f,r){return Promise.resolve({data:rows,error:null}).then(f,r);}};return o;};
global.sb={from:q};global.localDate=()=>'2026-10-14';
global._traerQ=async(b)=>b().range(0,999);
const prod={metros_por_bolsa:0.5,peso_por_bolsa:0.01};
let R=await _cvvControlCierre({id:10,numero_orden:'OC-A'},210,0,prod);
t(R&&R.cortadas===210&&!R.alerta,'cierra justo: 210 cortadas = 210 declaradas, sin alerta ('+(R&&R.cortadas)+')');
t(/2 pistas · tenía que hacer 105 golpes, hizo 105/.test(R.linea)&&/BOLSAS: cortadas 210 \(golpes\) · bobinas 210/.test(R.linea)&&/FILM: /.test(R.linea)&&/CIERRA/.test(R.linea),'línea: '+R.linea);
R=await _cvvControlCierre({id:10,numero_orden:'OC-A'},200,0,prod);
t(R.alerta&&Math.round(R.sinUbicar)===10,'10 cortadas fuera de los bultos, sin scrap → faltan 10');
R=await _cvvControlCierre({id:10,numero_orden:'OC-A'},205,0.05,prod);
t(!R.alerta,'205 + 5 de scrap = 210 → no pide');
R=await _cvvControlCierre({id:99,numero_orden:'OC-X'},100,0,prod);
t(R===null,'OC sin cargas en cortadoras con sensor → no controla');
R=await _cvvControlCierre({id:10,numero_orden:'OC-A'},210,0,prod);
t(R.faltaBolsas===0,'con todas las bobinas cargadas no falta bobina');
tabla.orden_corte_bobinas[0].metros_usados=40;tabla.orden_corte_bobinas[1].metros_usados=40;   // las bobinas cargadas dan 160 bolsas y se cortaron 210
R=await _cvvControlCierre({id:10,numero_orden:'OC-A'},210,0,prod);
t(R.alerta&&Math.round(R.faltaBolsas)===50&&Math.round(R.faltaM)===25,'falta bobina: 50 bolsas = 25 m ('+R.faltaBolsas+','+R.faltaM+')');
t(R.maqPpal===1&&R.empPpal===1,'máquina y operario de la OC para la carga');
// 16a: golpes que tenía que hacer = bobina más larga de cada par ÷ largo (datos reales OC-1052971, 0,78 m)
{const c=(m,t)=>({metros_usados:m,t});
 const o={pistas:2,golpes:1348+1251,teo:4132/0.78,pConf:'ok',tiradas:[{cs:[c(1014),c(1054)],golpes:1251},{cs:[c(1013),c(1051)],golpes:1348}]};
 _cvvGolpesEsp(o,0.78);
 t(Math.round(o.tiradas[1].gEsp)===1347,'Celia 07007+07008: tenía que hacer 1.347 ('+o.tiradas[1].gEsp+')');
 t(Math.round(o.tiradas[0].gEsp)===1351,'Guaraz 07005+07009: tenía que hacer 1.351');
 t(Math.round(o.gEsp)===2699&&Math.abs(o.difGolpes*100+3.7)<0.1,'OC: 2.699 esperados, −3,7 % ('+(o.difGolpes*100).toFixed(2)+')');
 t(Math.abs(o.cortadas-2599*o.teo/o.gEsp)<1e-6&&Math.round(o.cortadas)===5102,'cortadas = golpes × bolsas por golpe de estas bobinas ('+o.cortadas+')');
 t(o.parDesc===0,'pares completos: cuenta exacta');
 const o2={pistas:2,golpes:1000,tiradas:[{cs:[c(780),c(780),c(780)],golpes:1000}]};_cvvGolpesEsp(o2,0.78);
 t(o2.parDesc===1&&Math.round(o2.gEsp)===1500,'3 bobinas juntas en 2 pistas: el par por la más larga, la que sobra repartida');
 // 17a: OC-1052973 — la bobina de 256 m al final corre sola; la detección de pistas por la cuenta física da 2
 const o4={golpes:2881,teo:4623/0.85,tiradas:[{maq:1,cs:[c(1109),c(1215)]},{maq:1,cs:[c(1016),c(1027)]},{maq:1,cs:[c(256)]}]};
 _cvvPistasFis(o4,0.85);_cvvGolpesEsp(o4,0.85);
 t(o4.pistas===2&&o4.pConf==='ok','2973: 2 pistas por golpes contra bobinas (antes «no se puede afirmar»)');
 t(Math.round(o4.gEsp)===2939&&Math.abs(o4.difGolpes*100+2.0)<0.1&&o4.tiradas[2].pistas===1,'2973: 2.939 golpes esperados (−2,0 %), la última de 256 m corre sola');
 const o5={golpes:2000,teo:3000/0.5,tiradas:[{maq:1,cs:[c(500)]},{maq:1,cs:[c(500)]},{maq:1,cs:[c(500),c(500)]}]};_cvvPistasFis(o5,0.5);_cvvGolpesEsp(o5,0.5);
 t(o5.pistas===2&&Math.round(o5.gEsp)===2000,'sueltas en el medio reemplazan pistas: se reparten (500 + 500 + 1.000)');
 const o6={golpes:3124,teo:4151/0.68,tiradas:[{maq:1,cs:[c(1020),c(1004),c(1006),c(1121)]}]};_cvvPistasFis(o6,0.68);
 t(o6.pistas===2,'4 bobinas juntas que cierran casi igual con 2 o 3 pistas: se toma 2');
 const o7={golpes:500,teo:3000,decl:null,tiradas:[{maq:1,cs:[c(1000),c(1000)]}]};_cvvPistasFis(o7,1);
 t(o7.pistas==null,'nada cierra: no se afirma pistas');
 const o3={pistas:1,golpes:2000,tiradas:[{cs:[c(780),c(780)],golpes:2000}]};_cvvGolpesEsp(o3,0.78);
 t(Math.round(o3.gEsp)===2000&&o3.cola===0&&o3.cortadas===2000,'1 pista: suma de metros ÷ largo');}
// 16c: golpes después de «Corte terminado en panel» no van a esa OC (caso OC-1052984)
{const TT=s=>new Date('2026-10-16T'+s+'-03:00').getTime();
 const ocs2={84:{id:84,observaciones:'[Iniciada en panel 2026-10-16 09:42 por X] [Corte terminado en panel 2026-10-16 10:32 por X — pendiente de cierre]',estado:'Completada'},48:{id:48,observaciones:'',estado:'En proceso'}};
 const cg=[{t:TT('09:42:58'),orden_corte_id:84,maquina_id:1,empleado_id:1},{t:TT('11:12:29'),orden_corte_id:48,maquina_id:1,empleado_id:1}];
 const td=[{maquina:1,ti:TT('10:00:00'),tf:TT('10:00:08'),golpes:5},{maquina:1,ti:TT('10:33:30'),tf:TT('10:33:38'),golpes:5},{maquina:1,ti:TT('10:39:48'),tf:TT('10:40:30'),golpes:25}];
 _cvvAsignar(td,cg,ocs2,{});
 t(td[0].oc===84&&td[0].regla==='antes','antes de terminar: va a la OC escaneada');
 t(td[1].oc===84,'dentro de los 2 min de gracia después de «terminó»: sigue en la OC');
 t(td[2].oc===48&&td[2].regla==='tarde','después de «terminó de cortar»: va al escaneo siguiente (tarde)');
 const ocs3={84:{id:84,observaciones:'[Corte terminado en panel 2026-10-16 10:32 por X] [REABIERTA en panel 2026-10-16 10:38 por X]',estado:'En proceso'}};
 const td3=[{maquina:1,ti:TT('10:45:00'),tf:TT('10:45:08'),golpes:5}];_cvvAsignar(td3,[cg[0]],ocs3,{});
 t(td3[0].oc===84,'reabierta después de terminar: vuelve a contar');
 t(_cvvTerminada(ocs2[84],TT('10:36:00'))&&!_cvvTerminada(ocs2[84],TT('10:20:00'))&&!_cvvTerminada({},TT('10:36:00')),'_cvvTerminada');}
// 20g: factor corregido — bobinas del PLC anteriores al cambio (id ≤ 7306) se llevan al factor nuevo
{t(Math.abs(_cvvMargen({id:7000,plc_cierre_id:9,extrusora_id:1})-0.2443/0.2475)<1e-9,'EXT-01 vieja: −1,3 %');
 t(Math.abs(_cvvMargen({id:7306,plc_cierre_id:9,extrusora_id:3})-0.781/0.793)<1e-9,'EXT-03 vieja (justo en el corte): −1,5 %');
 t(Math.abs(_cvvMargen({plc_cierre_id:9,extrusora_id:7},7100)-0.776/0.793)<1e-9,'EXT-07 vieja (0,793), id por bobina_producida_id → 0,776 (26b)');
 t(Math.abs(_cvvMargen({id:7400,plc_cierre_id:9,extrusora_id:7})-0.776/0.781)<1e-9,'EXT-07 medida con 0,781 (20/10–26/10) → 0,776 (26b)');
 t(_cvvMargen({id:7460,plc_cierre_id:9,extrusora_id:7})===1,'EXT-07 después del 26/10: sin corrección');
 t(_cvvMargen({id:7307,plc_cierre_id:9,extrusora_id:3})===1,'cargada después del cambio: sin corrección');
 t(_cvvMargen({id:7000,plc_cierre_id:null,extrusora_id:1})===1&&_cvvMargen({id:7000,plc_cierre_id:5,extrusora_id:2})===1&&_cvvMargen(null)===1&&_cvvMargen({plc_cierre_id:5,extrusora_id:3})===1,'metros a mano, otra extrusora o sin id: sin corrección');
 t(_cvvMargen({id:7000,plc_cierre_id:5,extrusora_id:3})<1,'nunca agranda los metros (16d iba al revés)');
 t(Math.round(_cvvMetros({metros_usados:'1166',bobina_producida_id:7000,bobinas_producidas:{plc_cierre_id:1,extrusora_id:1}}))===1151,'1.166 m de tarjeta EXT-01 vieja = 1.151 m');}
// 17b: golpes sueltos antes de arrancar la OC (asignados «tarde») + hueco largo → no es parada de la OC
{const TT=s=>new Date('2026-10-16T'+s+'-03:00').getTime();const td=(a,g,r)=>({maquina:1,ti:TT(a),tf:TT(a)+g*1500,golpes:g,regla:r,emp:1});
 const o={tanda:25,cargas:[{maquina_id:1,t:TT('06:59:05')}],tds:[td('06:06:23',9,'tarde'),td('06:07:00',5,'tarde'),td('06:07:40',3,'tarde'),td('07:01:29',25,'antes'),td('07:02:20',25,'antes'),td('07:10:00',25,'antes')]};
 const X=_cvvParadasOC(o);
 t(X.arr&&Math.round(X.arr.seg/60)===54&&X.arr.gPrev===17,'arranque: 54 min y 17 golpes sueltos antes ('+(X.arr&&X.arr.seg)+')');
 t(X.P.length===1&&Math.round(X.P[0].seg)>400,'paradas de la OC: sólo la de 07:03 → 07:10 ('+X.P.map(p=>Math.round(p.seg)).join(',')+')');
 t(X.a===TT('07:01:29'),'la OC empieza 07:01:29');}
console.log((bad?'FALLA':'OK')+' smoke_corte_vivo: '+ok+' ok, '+bad+' mal');process.exit(bad?1:0);
})();
