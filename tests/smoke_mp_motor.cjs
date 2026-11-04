// 04l/04m · Materia prima en el motor único + órdenes de compra de MP (recepciones parciales, cumplimiento).
const fs=require('fs');const src=fs.readFileSync(process.argv[2]||(__dirname+'/../fabrica_bolsas_v6.html'),'utf8');
let ok=0,fail=0;const t=(c,m)=>{if(c)ok++;else{fail++;console.log('FALLA',m);}};
function cuerpo(fn){const m=new RegExp('^function '+fn+'\\(','m').exec(src);if(!m)return null;const j=src.indexOf('\nfunction ',m.index+10);return src.slice(m.index,j<0?undefined:j);}
const eng=cuerpo('calcScheduleReal');
t(/const mpOn=_mpPlanOn\(\);\s*if\(!mpOn\)\{activas\.forEach\(o=>planear\(o\)\);return sched;\}/.test(eng),'apagado → cascada de siempre');
t(/_mpAsignar\(activas\)/.test(eng)&&/backfilling/.test(eng),'prendido → asigna MP y rellena huecos');
global.J_INI=6;global.cfg={plan_mp:'respetar',plan_mp_lead_dias:4};
global.localDate=d=>{const x=d||new Date();return x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0');};
global.C={bobinas_prod:[],formulas:[{bobina_id:10,tipo_mp_id:1,porcentaje:90},{bobina_id:10,tipo_mp_id:2,porcentaje:10},{bobina_id:11,tipo_mp_id:3,porcentaje:100}],tipos_mp:[],lotes_mp:[],compras_gastos:[]};
['_mpPlanOn','_mpLeadDias','_mpLlegada','_mpAsignar','_prgMPRequiere','_ocmpTodosLotes','_ocmpLotesIdx','_ocmpTol','_ocmpProm','_ocmpLinea','_ocmpNetoFactura','_ocmpLinIdx','_ocmpPrecioLote','_ocmpFacturaCtrl','_ocmpOrden','_ocmpTodas','_ocmpDias','_ocmpMediana','_ocmpProvStats','_ocmpLlegadas']
  .forEach(f=>{const b=cuerpo(f);if(!b){t(false,'falta '+f);return;}eval.call(global,b.replace('function '+f,'global.'+f+'=function'));});
t(_mpPlanOn(),'interruptor lee cfg.plan_mp');
const L9=_mpLlegada('9','2026-11-04');
t(L9.estimado&&L9.fecha.getDate()===8,'sin compra → hoy + plazo, estimada');
const A=[{id:1,bobina_id:10,kg_totales:1000},{id:2,bobina_id:10,kg_totales:500},{id:3,bobina_id:11,kg_totales:50}];
// sin compras
let R=_mpAsignar(A,{1:1200,2:100,3:80},'2026-11-04',{});
t(!R[1].llega&&R[1].pct===1,'la primera de la cola se queda con la MP');
t(R[2].llega&&Math.round(R[2].falta[1])===150&&Math.round(R[2].falta[2])===50&&R[2].estimado,'la segunda espera lo que falta (estimada sin compra)');
t(!R[3].llega,'otra MP no se ve afectada');
// con compras: MP1 llega el 10 (100 kg) y el 12 (500 kg); MP2 el 9 (80 kg)
const d=s=>new Date(s+'T06:00:00');
R=_mpAsignar(A,{1:1200,2:100,3:80},'2026-11-04',{'1':[{fecha:d('2026-11-10'),kg:100,pc:'PC-1'},{fecha:d('2026-11-12'),kg:500,pc:'PC-2'}],'2':[{fecha:d('2026-11-09'),kg:80,pc:'PC-3'}]});
t(R[2].llega.getDate()===12&&!R[2].estimado&&R[2].cubre['1'].length===2&&!Object.keys(R[2].sinCompra).length,'cubierta por compras → llega con el último camión que hace falta, confirmada');
// 04s: liberada con faltante → no espera, se queda con lo que hay y dice cuánto alcanza
{const A2=[{id:1,bobina_id:10,kg_totales:1000},{id:2,bobina_id:10,kg_totales:500,mp_liberada_el:'2026-11-04T20:00:00Z'}];
 const R2=_mpAsignar(A2,{1:1200,2:100,3:80},'2026-11-04',{});
 t(!R2[2].llega&&R2[2].liberada&&R2[2].llegaResto&&Math.round(R2[2].kgPosible)===0,'liberada: no espera la compra, informa cuándo llega el resto y cuánto alcanza (0 kg: el colorante lo usó la primera)');
 const A3=[{id:2,bobina_id:10,kg_totales:500,mp_liberada_el:'x'},{id:1,bobina_id:10,kg_totales:1000}];
 const R3=_mpAsignar(A3,{1:1200,2:30},'2026-11-04',{});
 t(R3[2].liberada&&Math.round(R3[2].kgPosible)===300&&R3[1].llega,'arriba en la cola: alcanza para 300 kg con 30 kg de colorante al 10 %, y la siguiente espera');}
// órdenes de compra: recepciones parciales y cumplimiento
C.lotes_mp=[{id:1,ocmp_linea_id:11,kg_ingresados:8980,fecha_ingreso:'2026-10-05',tipo_mp_id:1,factura_compra_id:6},{id:2,ocmp_linea_id:21,kg_ingresados:4900,fecha_ingreso:'2026-10-22',tipo_mp_id:1,factura_compra_id:5},
  {id:3,ocmp_linea_id:31,kg_ingresados:3000,fecha_ingreso:'2026-11-03',tipo_mp_id:1}];
C.ocmp=[{id:1,numero:'PC-1',proveedor_id:7,fecha:'2026-10-01',fecha_prometida:'2026-10-03',tolerancia_pct:3,cerrada_el:'x',ordenes_compra_mp_lineas:[{id:11,tipo_mp_id:1,kg_pedidos:10000,precio_kg:1000}]},
  {id:2,numero:'PC-2',proveedor_id:7,fecha:'2026-10-18',fecha_prometida:'2026-10-20',tolerancia_pct:3,ordenes_compra_mp_lineas:[{id:21,tipo_mp_id:1,kg_pedidos:5000,precio_kg:1000}]},
  {id:3,numero:'PC-3',proveedor_id:7,fecha:'2026-11-01',fecha_prometida:'2026-11-06',tolerancia_pct:3,ordenes_compra_mp_lineas:[{id:31,tipo_mp_id:1,kg_pedidos:10000,precio_kg:1000}]}];
C.compras_gastos=[{id:5,neto:4900000,plano:'negro'},{id:6,neto:9500000,plano:'blanco'}];C.ocmp[0].plano='blanco';C.ocmp[1].plano='blanco';
const O=_ocmpTodas('2026-11-04');
t(O[0].estado==='faltante'&&O[1].estado==='completa'&&O[2].estado==='parcial','estados derivados: cerrada con faltante · recibida dentro de tolerancia · parcial');
const F6=_ocmpFacturaCtrl(6),F5=_ocmpFacturaCtrl(5);
t(F6.ctrl==='dif'&&Math.round(F6.dif)===520000&&F6.ordenes[0]==='PC-1'&&!F6.planoDif,'factura contra sus recepciones: diferencia +$520.000');
t(F5.ctrl==='dif'&&F5.planoDif&&Math.round(F5.dif)===0,'mismo importe pero factura en negro contra orden en blanco → avisa');
t(O[0].ctrl==='dif'&&O[2].ctrl==='sin_factura'&&O[2].kgSinFac===3000,'la orden marca factura con diferencia / kg sin facturar');
const S=_ocmpProvStats('2026-11-04',O)[7];
t(Math.abs(S.fill-(13880/15000))<1e-9&&S.atraso===2,'cumplimiento 92,5 % y atraso típico 2 días');
const LL=_ocmpLlegadas('2026-11-04')['1'];
t(LL&&LL.length===1&&Math.round(LL[0].kg)===Math.round(10000*13880/15000-3000)&&LL[0].fecha.getDate()===8,'planificar espera pedido × cumplimiento − recibido, en la prometida + atraso');
console.log('smoke_mp_motor: '+ok+' ok, '+fail+' fallas');process.exit(fail?1:0);
