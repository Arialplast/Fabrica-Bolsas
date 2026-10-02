// smoke 02e — botones de imprimir en las tarjetas del planificador (pura, sin DOM)
// uso: node tests/smoke_plan_imprimir.cjs fabrica_bolsas_v6.html
const fs=require('fs');const src=fs.readFileSync(process.argv[2]||'fabrica_bolsas_v6.html','utf8');
const a=src.indexOf('function _planBtnsImprimir(');const b=src.indexOf('function renderPlanCardCompact(');
if(a<0||b<0||b<a){console.log('FALTA el bloque');process.exit(1);}
eval(src.slice(a,b));
let ok=0,bad=0;const t=(c,m)=>{if(c)ok++;else{bad++;console.log('✗ '+m);}};
const oc=_planBtnsImprimir('oc',123),oe=_planBtnsImprimir('oe',77);
t(oc.includes("imprimirOrden(123,'corte')"),'OC: hoja A4 de corte');
t(oc.includes('imprimirEtiquetasBulto(123)'),'OC: etiquetas de bulto');
t((oc.match(/event\.stopPropagation\(\)/g)||[]).length===2,'OC: no despliega/arrastra al clickear');
t(oe.includes("imprimirOrden(77,'extrusion')")&&!oe.includes('imprimirEtiquetasBulto'),'OE: sólo hoja de extrusión');
const card=src.slice(b,src.indexOf('function moverPlanGlobal('));
t((card.match(/_planBtnsImprimir\(tipo,o\.id\)/g)||[]).length===2,'tarjeta en proceso y movible llevan los botones');
t(card.includes('moverPlanGlobal(')&&card.includes('draggable="true"'),'flechas y arrastre intactos');
console.log(ok+' ok · '+bad+' fallas');process.exit(bad?1:0);
