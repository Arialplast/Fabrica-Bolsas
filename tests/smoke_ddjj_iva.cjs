// smoke 26e — DDJJ de IVA: estado derivado de pagos/planes y de la deuda propia + cálculo del F.2051
// uso: TZ=America/Argentina/Buenos_Aires node tests/smoke_ddjj_iva.cjs fabrica_bolsas_v6.html
// Datos inventados (el repo es público: no se commitean montos reales).
const fs=require('fs');const src=fs.readFileSync(process.argv[2]||'fabrica_bolsas_v6.html','utf8');
const a=src.indexOf('//  🧾 DDJJ DE IVA (26e)');const b=src.indexOf('function renderIvaDdjj(');
const c=src.indexOf('// Saldo a pagar según el F.2051');const d=src.indexOf('function ivAbrirForm(');
if(a<0||b<0||c<0||d<0){console.log('FALTA el bloque');process.exit(1);}
global.localDate=()=> '2026-10-26';
global.r2=n=>Math.round(n*100)/100;
eval((src.slice(a,b)+src.slice(c,d)).replace(/^const /gm,'var ').replace(/^let /gm,'var '));
let ok=0,bad=0;const t=(x,m)=>{if(x)ok++;else{bad++;console.log('✗ '+m);}};
const near=(x,y)=>Math.abs(x-y)<0.011;

// ── Cálculo del F.2051 ──
let k=_ivCalc(1000000,1200000,300000,40000,10000);       // mes con saldo técnico a favor: arrastra ST y LD
t(near(k.st,-500000)&&k.pagar===0&&near(k.favor,50000),'mes a favor '+JSON.stringify(k));
k=_ivCalc(2000000,800000,500000,50000,1234.56);          // mes siguiente usa el ST y la LD del anterior
t(near(k.st,700000)&&near(k.pagar,648765.44),'usa ST y LD anteriores '+JSON.stringify(k));
k=_ivCalc(3000000,1000000,0,0,250000);
t(near(k.pagar,1750000),'normal '+JSON.stringify(k));
k=_ivCalc(1000,900,0,0,150);                              // retenciones > saldo → queda LD a favor
t(k.pagar===0&&near(k.favor,50),'retenciones mayores que el saldo '+JSON.stringify(k));

// ── Estado derivado ──
const deudas=[
  {id:12,descripcion:'Plan W111111 — IVA 02/2026',cuotas:[]},
  {id:15,descripcion:'IVA DDJJ impagas 04-06/2026',cuotas:[]},
  {id:23,descripcion:'Plan W222222 · IVA 06/2026',cuotas:[]},
  {id:28,descripcion:'IVA DDJJ 07/2026 (saldo DJ)',cuotas:[
    {nro:1,parte:'a',parte_de:1,monto:400000,estado:'pagada',cuenta_id:2,afecta_caja:true,monto_pagado:400000,refinanciada:false,vencimiento:'2026-10-20'},
    {nro:1.5,parte:'b',parte_de:1,monto:600000,estado:'pendiente',vencimiento:'2026-10-20'}]},
];
const pagos=[
  {id:2,ddjj_iva_id:5,monto:900000,afecta_caja:true,deuda_financiera_id:15},
  {id:3,ddjj_iva_id:6,monto:300000,afecta_caja:true,deuda_financiera_id:15},
  {id:4,ddjj_iva_id:6,monto:500000,afecta_caja:false,motivo:'refinanciado en plan W222222',deuda_financiera_id:23},
  {id:5,ddjj_iva_id:7,monto:400000,afecta_caja:true,deuda_financiera_id:28},   // espejo de la deuda propia: NO se suma dos veces
  {id:7,ddjj_iva_id:2,monto:700000,afecta_caja:false,motivo:'refinanciado en plan W111111',deuda_financiera_id:12},
];
const E=dj=>_ivEstado(dj,pagos,deudas,'2026-10-26');
let e=E({id:1,saldo_a_pagar:0,saldo_a_favor:50000,saldo_tecnico:-500000});
t(e.est==='a_favor'&&e.pend===0,'a favor '+e.est);
e=E({id:2,saldo_a_pagar:700000});
t(e.est==='refinanciado'&&e.pend===0&&e.planes.join()==='W111111','en plan '+JSON.stringify(e));
e=E({id:5,saldo_a_pagar:900000});
t(e.est==='pagado'&&near(e.pagado,900000),'pagada '+e.est);
e=E({id:6,saldo_a_pagar:800000});
t(e.est==='pagado_plan'&&near(e.pagado,300000)&&near(e.refi,500000)&&e.pend===0&&e.planes.join()==='W222222','parcial + plan '+JSON.stringify(e));
e=E({id:7,saldo_a_pagar:1000000,vencimiento:'2026-10-20',deuda_financiera_id:28});
t(e.est==='parcial_vencida'&&near(e.pagado,400000)&&near(e.pend,600000)&&e.enFlujo,'parcial vencida, sin doble conteo '+JSON.stringify({p:e.pagado,pe:e.pend,est:e.est}));
e=E({id:8,saldo_a_pagar:650000,vencimiento:'2026-11-19'});
t(e.est==='pendiente'&&near(e.pend,650000)&&!e.enFlujo,'pendiente fuera del flujo '+e.est);
e=E({id:9,saldo_a_pagar:550000,vencimiento:'2026-10-01'});
t(e.est==='vencida','vencida '+e.est);
// la deuda propia pasada a plan después: queda «en plan» con el código del plan
const d2=JSON.parse(JSON.stringify(deudas));d2[3].cuotas[1]={...d2[3].cuotas[1],estado:'pagada',refinanciada:true,afecta_caja:false,plan_ref:'W333333',monto_pagado:600000};
e=_ivEstado({id:7,saldo_a_pagar:1000000,vencimiento:'2026-10-20',deuda_financiera_id:28},pagos,d2,'2026-10-26');
t(e.est==='pagado_plan'&&e.pend===0&&e.planes.join()==='W333333','resto a plan '+JSON.stringify(e));

console.log((bad?'✗ ':'✓ ')+ok+' ok · '+bad+' fallas');process.exit(bad?1:0);
