// smoke 06a — plan de bobinas por pistas + compensación
// uso: TZ=America/Argentina/Buenos_Aires node tests/smoke_pistas.cjs fabrica_bolsas_v6.html
const fs=require('fs');
const src=fs.readFileSync(process.argv[2]||'fabrica_bolsas_v6.html','utf8');
const a=src.indexOf('// ===== 🧵 PLAN DE BOBINAS POR PISTAS');
const b=src.indexOf('// ===== FIN 🧵 PLAN DE BOBINAS POR PISTAS =====');
if(a<0||b<0||b<a){console.error('no se encontró el bloque');process.exit(1);}
globalThis.C={bobinas:[],ordenes:[],bobinas_prod:[]};
globalThis.cfg={bobinas_plan_pistas:''};   // 08c: pistas con largo fijo y piso (por defecto)   // 08b: el modo por pistas quedó apagado por defecto; acá se sigue probando
globalThis.r2=x=>Math.round(x*100)/100;
globalThis.escapeHtml=s=>String(s);
eval(src.slice(a,b).replace('const _PB_COLS=','globalThis._PB_COLS='));
let ok=0,bad=0;const t=(c,m)=>{if(c){ok++;}else{bad++;console.error('✗ '+m);}};
const pl=(M,P,L)=>_pbCalcularPlan(M,P,L,15);

// --- pistas por medida (regla de German) ---
t(_pbPistasSugeridas({ancho:45,espesor:15})===4,'45 cm → 4');
t(_pbPistasSugeridas({ancho:50,espesor:21})===4,'50 cm → 4');
t(_pbPistasSugeridas({ancho:60,espesor:40})===4,'60 cm 40 µ → 4');
t(_pbPistasSugeridas({ancho:60,espesor:55})===2,'60 cm 55 µ → 2');
t(_pbPistasSugeridas({ancho:70,espesor:23})===2,'70 cm → 2');
t(_pbPistasSugeridas({ancho:95,espesor:58})===2,'95 cm → 2');
t(_pbPistas({ancho:45,pistas:2})===2,'la ficha manda sobre la regla');

// --- 08c plan: largo fijo, de a P bobinas, siempre para arriba, piso 2/3, estirar hasta +25 % ---
let p=pl(7040,4,1500);t(p.N===4&&p.lU===1760&&p.metros===7040,'06329 50 poli 7.040 m → 4 × 1.760 (se estira, no hay bobinitas)');
p=pl(12960,4,1400);t(p.N===12&&p.lU===940&&p.metros===14960&&_pbTxtPlan(p)==='8 × 1.400 + 4 × 940 m · 4 pistas','06322 12.960 m → 8 × 1.400 + 4 × 940 (piso 2/3)');
p=pl(16320,4,1500);t(p.N===12&&p.lU===1080&&p.metros===16320,'06333 16.320 m → 8 × 1.500 + 4 × 1.080');
p=pl(3040,4,600);t(p.N===8&&p.lU===400&&p.metros===4000,'06325 3.040 m → 4 × 600 + 4 × 400 (al piso)');
p=pl(4800,4,1500);t(p.N===4&&p.lU===1200&&p.metros===4800,'4.800 m de 50 poli → 4 × 1.200');
p=pl(12000,4,1500);t(p.N===8&&p.lU===1500&&p.metros===12000,'justo 2 vueltas → 8 × 1.500');
p=pl(1000,4,1500);t(p.N===4&&p.lU===1000,'muy chico → 4 al piso (1.000)');
for(const M of [777,2987,9064,22103.8,43672,100000]){for(const P of [2,4]){
  const q=pl(M,P,1200);
  t(q.N%P===0,'múltiplo de pistas M='+M+' P='+P);
  t(q.metros>=M-0.5,'siempre para arriba M='+M+' P='+P);
  t(q.lU>=q.piso&&q.lU<=q.L*1.25+10,'última vuelta entre el piso y +25 % M='+M+' P='+P);
}}
t(_pbCalcularPlan(0,4,1500)===null,'sin metros → sin plan');

// --- compensación con piso ---
const P4=pl(6000,4,1500);   // 4 × 1.500
let c=_pbCompensar(P4,[1500,1500,1500,860]);
t(!c.cerrada&&c.faltan.length===1&&c.faltan[0]===640?false:true,'(no aplica)');
t(c.cerrada,'a una pista le faltan 640 (< piso 1.000) → se da por cerrada, sin bobinita');
c=_pbCompensar(P4,[1500,1500,1500,400]);
t(!c.cerrada&&c.faltan.length===1&&c.faltan[0]===1100,'pista con 400 m: faltan 1.100 (≥ piso) → una bobina de 1.100');
c=_pbCompensar(pl(12000,4,1500),[1500,1500,1500,900]);
t(c.faltan.every(x=>x>=1000),'ninguna bobina pedida queda por debajo del piso');
t(c.faltan.filter(x=>x>1500*1.25+10).length===0,'ninguna pasa de +25 %');
c=_pbCompensar(pl(12000,4,1500),[1700,1500]);
const tot2=c.pistas.map(x=>x.suma+x.prox.reduce((s,y)=>s+y,0));
t(Math.max(...tot2)-Math.min(...tot2)<=50,'una larga al principio: las demás se alargan y cierran parejas');
t(c.nExtra===0,'sin bobinas de más cuando hay lugar');
c=_pbCompensar(pl(7040,4,1500),[]);
t(c.faltan.length===4&&c.faltan.every(x=>x===1760),'sin hechas → 4 × 1.760');
c=_pbCompensar(pl(12960,4,1400),[]);
t(c.faltan.filter(x=>x===1400).length===8&&c.faltan.filter(x=>x===940).length===4,'sin hechas → 8 × 1.400 + 4 × 940');
t(_pbAgrupar([1550,1550,1500])==='2 × 1.550 m · 1 × 1.500 m','agrupar para mostrar');

// --- payload de insert ---
C.bobinas=[{id:1,ancho:45,espesor:15,kg_por_metro:0.013,pistas:4,metros_bobina_obj:1500}];
const pay=_pbAplicarAPayload({bobina_id:1,metros:12360,kg_totales:1});
t(pay.metros===12360&&pay.bobinas_plan===8&&pay.metros_bobina_plan===1500&&pay.pistas_plan===4,'insert: 12.360 m → 4 × 1.500 + 4 × 1.590 (sobran 90 por pista: se estira)');
const pay2=_pbAplicarAPayload({bobina_id:1,metros:13600,kg_totales:1});
t(pay2.metros===16000&&pay2.bobinas_plan===12,'insert: 13.600 m → 8 × 1.500 + 4 × 1.000 = 16.000 (sobran 400 por pista: ni se estira ni llega al piso → al piso)');
t(Math.abs(pay2.kg_totales-208)<0.01,'kg recalculados con los metros nuevos');
const gr=_pbAplicarAPayload({bobina_id:1,metros:500,origen:'venta_bobina'});
t(gr.metros===500&&!gr.bobinas_plan,'venta de bobina por kilo no se toca');

// --- OE con bobinas cargadas ---
C.ordenes=[{id:9,bobina_id:1,metros:6000,bobinas_plan:4,metros_bobina_plan:1500,pistas_plan:4}];
C.bobinas_prod=[{orden_id:9,metros_reales:1500},{orden_id:9,metros_reales:1500},{orden_id:9,metros_reales:400},{orden_id:9,metros_reales:1500,anulada:true}];
t(!_pbOECierra(C.ordenes[0],1500),'llega a la 4ª pero una pista quedó en 400 → no cierra');
t(_pbEstadoOE(C.ordenes[0],1500).comp.faltan[0]===1100,'pide 1.100 (≥ piso)');
C.bobinas_prod.push({orden_id:9,metros_reales:1500},{orden_id:9,metros_reales:1100});
t(_pbOECierra(C.ordenes[0],0),'con la compensación, cierra');
C.ordenes.push({id:10,bobina_id:1,metros:7040,bobinas_plan:8,metros_bobina_plan:880,pistas_plan:4});
t(_pbEstadoOE(C.ordenes[1]).plan.lU===1760,'OE vieja con plan 8 × 880 → se recalcula con la regla nueva (4 × 1.760)');
t(_pbOECierra({id:77,origen:'venta_bobina',metros:100},0),'sin plan: cierra como siempre');

// --- 08b largo fijo (modo por defecto) ---
cfg.bobinas_plan_pistas='no';
{let q=_pbCalcularPlan(4800,4,1500,15);t(q.fijo&&q.N===4&&q.L===1500&&q.metros===6000,'fijo: OE nueva de 4.800 m → se redondea para arriba a 4 × 1.500');
 q=_pbCalcularPlan(7040,4,1500,15);t(q.N===5&&q.metros===7500,'fijo: 7.040 m → 5 × 1.500 (sin múltiplo de pistas)');
 t(_pbFaltanFijo(7040,1500).join()==='1500,1500,1500,1500,1040','fijo: OE existente de 7.040 → 4 × 1.500 + la última de 1.040');
 t(_pbFaltanFijo(1900,1500).join()==='1900','fijo: si sobra menos de medio largo, la última lo absorbe (1.900, no 1.500 + 400)');
 t(_pbFaltanFijo(2400,1500).join()==='1500,900','fijo: sobra 900 (más de medio largo) → 1.500 + 900');
 t(_pbFaltanFijo(0,1500).length===0,'fijo: llegó a los metros → nada');
 const bob={id:91,ancho:50,espesor:18,pistas:4,metros_bobina_obj:1500,kg_por_metro:0.0156};C.bobinas.push(bob);
 const oe={id:991,bobina_id:91,metros:7040,bobinas_plan:8,metros_bobina_plan:880,pistas_plan:4,numero_orden:'ORD-X'};
 C.bobinas_prod.push({orden_id:991,metros_reales:1554},{orden_id:991,metros_reales:1500});
 const e=_pbEstadoOE(oe);
 t(e.plan.fijo&&e.plan.L===1500&&e.comp.faltan.join()==='1500,1500,990','fijo: la OE con plan viejo (8 × 880) pasa a pedir 1.500 por bobina');
 t(_pbOECierra(oe,100),'fijo: la OE cierra al llegar a los metros (no espera pistas)');
 t(!/pistas/.test(_pbTxtPlan(e.plan)),'fijo: el texto del plan no habla de pistas');
 cfg.bobinas_plan_pistas='';}

console.log((bad?'✗ ':'✓ ')+ok+' ok'+(bad?' · '+bad+' fallaron':''));
process.exit(bad?1:0);
