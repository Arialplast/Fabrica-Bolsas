// 09c — Excedentes de OE en su propia pestaña, separados de Fuera de rango.
// Uso: node tests/smoke_excedentes.cjs fabrica_bolsas_v6.html
const fs=require('fs');
const src=fs.readFileSync(process.argv[2],'utf8');
const i0=src.indexOf('// ===== 📏 EXCEDENTES DE OE SEPARADOS');
const i1=src.indexOf('async function aceptarBobinaOriginal(');
if(i0<0||i1<0){console.error('no encontré el bloque');process.exit(1);}
let ok=0,bad=0;const t=(c,m)=>{if(c)ok++;else{bad++;console.error('✗ '+m);}};
const wraps={'fuera-rango-wrap':{innerHTML:''},'excedentes-wrap':{innerHTML:''}};
global.document={getElementById:id=>wraps[id]||null};
global.r1=x=>Math.round(x*10)/10;global.r4=x=>Math.round(x*1e4)/1e4;
global.escapeHtml=s=>String(s);global.calcRecomendaciones=()=>[];
global.C={bobinas:[],ordenes:[{id:2,numero_orden:'ORD-00002',cliente:'VEGA'}],bobinas_fuera:[
 {id:1,numero_bobina:'BOB-1',orden_id:1,ordenes:{numero_orden:'ORD-00001',cliente:'LYME'},metros_reales:400,kg_reales:40,kg_teoricos:40,motivo_fuera_rango:'EXCEDENTE DE OE: ORD-00001 quedaría en 4.400 m de 4.000 m (110%) — pendiente de asignación'},
 {id:2,numero_bobina:'BOB-2',orden_id:9,ordenes:{numero_orden:'ORD-00009'},metros_reales:300,kg_reales:20,kg_teoricos:30,motivo_fuera_rango:'Liviana: +33% (límite +10%)'},
 {id:3,numero_bobina:'BOB-3',orden_id:2,metros_reales:500,kg_reales:60,kg_teoricos:50,motivo_fuera_rango:'EXCEDENTE DE OE: ORD-00002 quedaría en 5.500 m de 5.000 m (110%) — pendiente de asignación · Pesada: −20% (límite −8%)'},
 {id:4,numero_bobina:'BOB-4',orden_id:1,ordenes:{numero_orden:'ORD-00001',cliente:'LYME'},metros_reales:400,kg_reales:40,kg_teoricos:40,motivo_fuera_rango:'EXCEDENTE DE OE: ORD-00001 …'},
]};
eval(src.slice(i0,i1).replace(/^function (\w+)/gm,'global.$1=function $1'));
renderFueraDeRango();
const fr=wraps['fuera-rango-wrap'].innerHTML,ex=wraps['excedentes-wrap'].innerHTML;
t(fr.includes('BOB-2'),'BOB-2 (liviana) en fuera de rango');
t(!fr.includes('BOB-1')&&!fr.includes('BOB-3')&&!fr.includes('BOB-4'),'ningún excedente en fuera de rango');
t(ex.includes('BOB-1')&&ex.includes('BOB-3')&&ex.includes('BOB-4'),'los tres excedentes en su pestaña');
t(!ex.includes('BOB-2'),'la liviana no aparece en excedentes');
t(ex.includes('ORD-00001 · LYME')&&ex.includes('2 bobinas · 800 m'),'cabecera por OE con cliente y totales');
t(ex.includes('ORD-00002 · VEGA'),'cliente desde C.ordenes cuando falta el embed');
t(ex.indexOf('ORD-00001')<ex.indexOf('ORD-00002'),'agrupado y ordenado por OE');
t(/BOB-3[^<]*<span[^>]*>· además fuera de tolerancia de peso/.test(ex),'excedente con peso fuera marcado');
t(!/BOB-1[^<]*<span/.test(ex),'excedente sano sin marca de peso');
t(ex.includes('>2</div>')&&ex.includes('OE con excedente'),'KPI de OE con excedente = 2');
C.bobinas_fuera=C.bobinas_fuera.filter(b=>b.id===2);renderFueraDeRango();
t(wraps['excedentes-wrap'].innerHTML.includes('No hay bobinas excedentes'),'vacío de excedentes');
C.bobinas_fuera=[];renderFueraDeRango();
t(wraps['fuera-rango-wrap'].innerHTML.includes('No hay bobinas fuera de rango'),'vacío de fuera de rango');
console.log((bad?'✗':'✓')+' smoke_excedentes: '+ok+' OK, '+bad+' fallas');process.exit(bad?1:0);
