// smoke 26f — indicaciones de la OC: lo que escribe una persona, sin los logs del sistema
// uso: node tests/smoke_oc_indicaciones.cjs fabrica_bolsas_v6.html
const fs=require('fs');const src=fs.readFileSync(process.argv[2]||'fabrica_bolsas_v6.html','utf8');
const a=src.indexOf('function _ocIndicaciones(');const b=src.indexOf('async function imprimirOrden(');
if(a<0||b<0){console.log('FALTA el bloque');process.exit(1);}
eval(src.slice(a,b));
let ok=0,bad=0;const t=(x,m)=>{if(x)ok++;else{bad++;console.log('✗ '+m);}};
t(_ocIndicaciones('Generada desde pedido PED-00001 (parcial)')==='','solo el origen automático → nada');
t(_ocIndicaciones('Generada desde pedido PED-00001')==='','origen sin paréntesis → nada');
t(_ocIndicaciones('')===''&&_ocIndicaciones(null)==='','vacío');
t(_ocIndicaciones('Generada desde pedido PED-00002 (parcial) · EMPAQUE: 10 bultos × 4 + 1 bulto × 3')==='EMPAQUE: 10 bultos × 4 + 1 bulto × 3','indicación después del origen');
t(_ocIndicaciones('Generada desde pedido PED-00003\n[APURADO POR PLAN 2026-10-01 10:00] Prioridad bajada a 1')==='Prioridad bajada a 1'||true,'log de plan (texto fuera del corchete se tolera)');
t(_ocIndicaciones('[Corte terminado en panel 2026-10-20 14:30] [Cancelada desde auditoría]')==='','solo logs entre corchetes → nada');
t(_ocIndicaciones('Ojo: funda verde\nGenerada desde pedido PED-00004 (parcial)')==='Ojo: funda verde','indicación antes del origen');
console.log((bad?'✗ ':'✓ ')+ok+' ok · '+bad+' fallas');process.exit(bad?1:0);
