// smoke 28a — cobros del plan: demora real por cliente + curvas acumuladas (funciones puras)
// uso: TZ=America/Argentina/Buenos_Aires node tests/smoke_cobros_plan.cjs fabrica_bolsas_v6.html
const fs=require('fs');const src=fs.readFileSync(process.argv[2]||'fabrica_bolsas_v6.html','utf8');
const a=src.indexOf('// ===== 💰 COBROS DEL PLAN');const b=src.indexOf('// ── Las OC del plan con cuándo salen');
const c=src.indexOf('// ── Curvas acumuladas por día (PURA)');const d=src.indexOf('// ── Pantalla ──');
if(a<0||b<0||c<0||d<0){console.log('FALTA el bloque');process.exit(1);}
global.localDate=()=> '2026-09-28';
eval((src.slice(a,b)+src.slice(c,d)).replace(/^const /gm,'var ').replace(/^let /gm,'var '));
let ok=0,bad=0;const t=(x,m)=>{if(x)ok++;else{bad++;console.log('✗ '+m);}};
const hoy=new Date('2026-09-28T12:00:00');
const clientes=[{id:1,dias_credito:0},{id:2,dias_credito:30},{id:3,dias_credito:15},{id:4,dias_credito:null},{id:5,dias_credito:3}];
const remitos=[
  {id:10,fecha:'2026-09-01'},{id:11,fecha:'2026-09-10'},          // cli 1 (paga contado de verdad)
  {id:20,fecha:'2026-08-01'},{id:21,fecha:'2026-08-15'},          // cli 2 (pacta 30, paga 50 / impago)
  {id:30,fecha:'2026-09-20'},                                     // cli 3 (una sola observación)
  {id:50,fecha:'2026-08-01'},{id:51,fecha:'2026-08-10',anulado_el:'2026-08-11'},{id:52,fecha:'2026-03-01'}, // cli 5
];
const rvs=[
  {id:1,cliente_id:1,fecha:'2026-09-01',total:100000,rv_remitos:[{remito_id:10}]},
  {id:2,cliente_id:1,fecha:'2026-09-12',total:300000,rv_remitos:[{remito_id:11}]},  // remito del 10: los días se miden desde el remito
  {id:3,cliente_id:2,fecha:'2026-08-01',total:200000,rv_remitos:[{remito_id:20}]},
  {id:4,cliente_id:2,fecha:'2026-08-15',total:200000,rv_remitos:[{remito_id:21}]},  // impago, 44 días > 30 pactados → cota 44
  {id:5,cliente_id:3,fecha:'2026-09-20',total:50000,rv_remitos:[{remito_id:30}]},
  {id:6,cliente_id:5,fecha:'2026-08-01',total:100000,rv_remitos:[{remito_id:50}]},
  {id:7,cliente_id:5,fecha:'2026-08-10',total:100000,estado:'anulada',rv_remitos:[{remito_id:51}]},
  {id:8,cliente_id:5,fecha:'2026-03-01',total:100000,rv_remitos:[{remito_id:52}]},  // fuera de la ventana de 120 días
  {id:9,cliente_id:5,fecha:'2026-08-20',total:100000,rv_remitos:[]},                // sin remito → fecha del RV
];
const recibos=[
  {fecha:'2026-09-01',estado:'ok',recibo_rvs:[{rv_id:1,monto_aplicado:100000}]},
  {fecha:'2026-09-12',estado:'ok',recibo_rvs:[{rv_id:2,monto_aplicado:150000}]},
  {fecha:'2026-09-14',estado:'ok',recibo_rvs:[{rv_id:2,monto_aplicado:150000}]},    // se salda el 14: 4 días desde el remito
  {fecha:'2026-09-20',estado:'ok',recibo_rvs:[{rv_id:3,monto_aplicado:150000}]},    // parcial…
  {fecha:'2026-09-21',estado:'anulado',recibo_rvs:[{rv_id:3,monto_aplicado:50000}]},// anulado no cuenta
  {fecha:'2026-09-01',estado:'ok',recibo_rvs:[{rv_id:6,monto_aplicado:100000}]},
  {fecha:'2026-09-01',estado:'ok',recibo_rvs:[{rv_id:9,monto_aplicado:100000}]},
];
const compensaciones=[{fecha:'2026-09-25',comp_aplicaciones:[{rv_id:3,monto_aplicado:30000}]}];
const notas=[{doc_tipo:'rv',doc_id:3,fecha:'2026-09-25',total:20000,estado:'emitida'}]; // RV3 se salda el 25/09 con comp + NC → 55 días
const D=_cpDemoraClientes({facturas:[],rvs,remitos,recibos,compensaciones,notas,clientes,hoy});
// cli 1: RV1 0 días ×100k, RV2 4 días ×300k → (0+1.2M)/400k = 3
t(D[1].origen==='real'&&D[1].dias===3,'cli1 ponderado por monto desde el remito = 3 (dio '+D[1].dias+')');
t(D[1].nPag===2&&D[1].nImp===0,'cli1 dos pagados');
// cli 2: RV3 55 días ×200k, RV4 impago 44 días (cota) ×200k → 49.5 → 50
t(D[2].origen==='real'&&D[2].dias===50,'cli2 con impago vencido como cota = 50 (dio '+D[2].dias+')');
t(D[2].nImp===1,'cli2 marca un impago');
t(D[2].pactado===30,'cli2 conserva lo pactado');
// cli 3: una sola observación → lo pactado
t(D[3].origen==='pactado'&&D[3].dias===15,'cli3 con 1 documento usa lo pactado');
// cli 4: sin nada y sin dato → 30 marcado sin_dato
t(D[4].origen==='sin_dato'&&D[4].dias===30,'cli4 sin dato = 30 marcado');
// cli 5: RV6 31 días, RV7 anulado fuera, RV8 fuera de ventana, RV9 sin remito 12 días → (31+12)/2=21.5→22
t(D[5].origen==='real'&&D[5].dias===22&&D[5].nPag===2,'cli5 ignora anulado y fuera de ventana (dio '+D[5].dias+')');
// Impago DENTRO del plazo no dice nada
const D2=_cpDemoraClientes({facturas:[],rvs:[{id:1,cliente_id:2,fecha:'2026-09-20',total:1000,rv_remitos:[]},{id:2,cliente_id:2,fecha:'2026-09-21',total:1000,rv_remitos:[]}],remitos:[],recibos:[],compensaciones:[],notas:[],clientes,hoy});
t(D2[2].origen==='pactado','impagos dentro del plazo no cuentan como demora');
// Facturas también: factura_remitos o remitos.factura_id
const D3=_cpDemoraClientes({facturas:[{id:7,cliente_id:3,fecha:'2026-09-05',total:1000,factura_remitos:[]},{id:8,cliente_id:3,fecha:'2026-09-05',total:1000,estado:'anulada'},{id:9,cliente_id:3,fecha:'2026-09-06',total:1000,factura_remitos:[{remito_id:99}]}],rvs:[],
  remitos:[{id:98,fecha:'2026-09-01',factura_id:7},{id:99,fecha:'2026-09-02'}],
  recibos:[{fecha:'2026-09-11',estado:'ok',recibo_facturas:[{factura_id:7,monto_aplicado:1000},{factura_id:9,monto_aplicado:1000}]}],compensaciones:[],notas:[],clientes,hoy});
t(D3[3].origen==='real'&&D3[3].dias===10&&D3[3].nPag===2,'facturas: remito por factura_id y por factura_remitos, anulada fuera (dio '+D3[3].dias+')');
// ── Curvas ──
const mk=(sale,valor,dem)=>({sale:new Date(sale+'T12:00:00'),valor,dem});
const its=[mk('2026-09-29',100,{dias:10,pactado:0}),mk('2026-10-01',200,{dias:0,pactado:0}),mk('2026-09-20',50,{dias:3,pactado:30})];
const cv=_cpCurvas(its,'real',hoy);
t(Math.abs(cv.total-350)<1e-9,'total 350');
t(cv.en(0).ya===50&&cv.en(0).cob===50,'lo que "sale" en el pasado se toma hoy, y su cobro vencido también entra hoy');
t(cv.en(3).ya===350&&cv.en(3).cob===250,'día 3: salió todo, entró 250');
t(cv.en(11).cob===350,'día 11 entra todo');
t(cv.gapMax===100,'máximo financiado = 100 (dio '+cv.gapMax+')');
t(cv.dias.every((p,i)=>p.cob<=p.ya+1e-9),'nunca se cobra antes de entregar');
const cp=_cpCurvas(its,'pactado',hoy);
t(cp.en(1).cob===100&&cp.en(3).cob===300,'modo pactado usa la ficha (contado entra al salir)');
t(cp.en(21).cob===300&&cp.en(22).cob===350,'pactado 30 días desde el 20/09: entra el 20/10 (día 22)');
console.log(ok+' ok · '+bad+' fallas');process.exit(bad?1:0);
