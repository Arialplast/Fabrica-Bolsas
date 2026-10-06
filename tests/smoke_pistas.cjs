// smoke 06a — plan de bobinas por pistas + compensación
// uso: TZ=America/Argentina/Buenos_Aires node tests/smoke_pistas.cjs fabrica_bolsas_v6.html
const fs=require('fs');
const src=fs.readFileSync(process.argv[2]||'fabrica_bolsas_v6.html','utf8');
const a=src.indexOf('// ===== 🧵 PLAN DE BOBINAS POR PISTAS');
const b=src.indexOf('// ===== FIN 🧵 PLAN DE BOBINAS POR PISTAS =====');
if(a<0||b<0||b<a){console.error('no se encontró el bloque');process.exit(1);}
globalThis.C={bobinas:[],ordenes:[],bobinas_prod:[]};
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

// --- plan: casos reales ---
let p=pl(12360,4,1500);t(p.N===8&&p.L===1550&&p.metros===12400,'ORD-06210 12.360 m → 8 × 1.550');
p=pl(5974,4,1500);t(p.N===4&&p.L===1500,'ORD-06302 5.974 m → 4 × 1.500');
p=pl(14420,2,950);t(p.N%2===0&&p.N===16&&p.L===910,'80 cm 14.420 m → 16 × 910');
p=pl(41818,4,1500);t(p.N===28&&p.L===1500,'41.818 m → el más cercano al objetivo: 28 × 1.500');
p=pl(3502,4,1500);t(p.N===4&&p.L===880&&!p.enRango,'pedido chico → 4 parejas más cortas');
p=pl(1000,4,1500);t(p.N===4&&p.L===750,'muy chico → piso de media bobina');
p=pl(1.4*4*1500,4,1500);t(p.N===8&&p.L===1050,'entre dos cantidades → bobinas más cortas, no más pesadas');
for(const M of [777,2987,9064,22103.8,43672,100000]){for(const P of [2,4]){
  const q=pl(M,P,1200);
  t(q.N%P===0,'múltiplo de pistas M='+M+' P='+P);
  t(q.metros>=M&&q.metros<=Math.max(M+q.N*10+q.L,q.P*600),'cubre lo pedido sin pasarse de más (salvo el piso de media bobina) M='+M+' P='+P);
}}
t(_pbCalcularPlan(0,4,1500)===null,'sin metros → sin plan');

// --- compensación ---
let c=_pbCompensar({N:4,L:1500,P:4},[1500,1500,1500,860]);
t(!c.cerrada&&c.faltan.length===1&&c.faltan[0]===640&&c.nExtra===1,'860 m → pedir 1 bobina de 640 para esa pista');
c=_pbCompensar({N:16,L:910,P:2},[]);
t(c.faltan.length===16&&c.faltan.every(x=>x===910),'sin hechas → 16 × 910');
c=_pbCompensar({N:4,L:1500,P:4},[1510,1500,1490,1520]);
t(c.cerrada,'diferencias chicas → cierra');
c=_pbCompensar({N:4,L:1500,P:4},[1750,1500,1500,1500]);
t(c.cerrada,'una pista que se pasó no obliga a hacer bobinitas en las otras');
c=_pbCompensar({N:8,L:1500,P:4},[1500,1500,1500,900]);
t(!c.cerrada&&c.faltan.length===5&&!c.faltan.includes(2100)&&c.nExtra===1,'pista corta: 2.100 m pasan del máximo → 2 bobinas de 1.050 en vez de una pesada');
t(c.faltan.filter(x=>x>1500*1.15).length===0,'ninguna bobina pedida pasa del máximo');
const tot=c.pistas.map(x=>x.suma+x.prox.reduce((s,y)=>s+y,0));
t(Math.max(...tot)-Math.min(...tot)<=50,'con las que faltan, las 4 pistas cierran parejas');
c=_pbCompensar({N:8,L:1500,P:4},[1700,1500]);
const tot2=c.pistas.map(x=>x.suma+x.prox.reduce((s,y)=>s+y,0));
t(Math.max(...tot2)-Math.min(...tot2)<=50,'una larga al principio: las demás se alargan y cierran parejas');
t(c.nExtra===0,'sin bobinas de más cuando hay lugar');
t(_pbAgrupar([1550,1550,1500])==='2 × 1.550 m · 1 × 1.500 m','agrupar para mostrar');

// --- payload de insert ---
C.bobinas=[{id:1,ancho:45,espesor:15,kg_por_metro:0.013,pistas:4,metros_bobina_obj:1500}];
const pay=_pbAplicarAPayload({bobina_id:1,metros:12360,kg_totales:1});
t(pay.metros===12400&&pay.bobinas_plan===8&&pay.metros_bobina_plan===1550&&pay.pistas_plan===4,'insert lleva el plan y los metros N×L');
t(Math.abs(pay.kg_totales-161.2)<0.01,'kg recalculados con los metros nuevos');
const gr=_pbAplicarAPayload({bobina_id:1,metros:500,origen:'venta_bobina'});
t(gr.metros===500&&!gr.bobinas_plan,'venta de bobina por kilo no se toca');

// --- OE con bobinas cargadas ---
C.ordenes=[{id:9,bobina_id:1,metros:6000,bobinas_plan:4,metros_bobina_plan:1500,pistas_plan:4}];
C.bobinas_prod=[{orden_id:9,metros_reales:1500},{orden_id:9,metros_reales:1500},{orden_id:9,metros_reales:860},{orden_id:9,metros_reales:1500,anulada:true}];
t(!_pbOECierra(C.ordenes[0],1500),'llega a la 4ª pero una pista quedó en 860 → no cierra');
t(_pbOECierra(C.ordenes[0],1500)===false&&_pbEstadoOE(C.ordenes[0],1500).comp.faltan[0]===640,'pide 640');
C.bobinas_prod.push({orden_id:9,metros_reales:1500},{orden_id:9,metros_reales:640});
t(_pbOECierra(C.ordenes[0],0),'con la compensación, cierra');
t(_pbOECierra({id:77,origen:'venta_bobina',metros:100},0),'sin plan: cierra como siempre');

console.log((bad?'✗ ':'✓ ')+ok+' ok'+(bad?' · '+bad+' fallaron':''));
process.exit(bad?1:0);
