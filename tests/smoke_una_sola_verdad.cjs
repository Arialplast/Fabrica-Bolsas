// 04b · Etapa 3 «una sola verdad»: las pantallas que muestran fechas usan el cronograma REAL.
// computeSchedule / computeScheduleCorte son adaptadores del real; el teórico sólo lo usan los
// Gantt que comparan «programado vs real».
const fs=require('fs');const src=fs.readFileSync(process.argv[2]||(__dirname+'/../fabrica_bolsas_v6.html'),'utf8');
let ok=0,fail=0;const t=(c,m)=>{if(c)ok++;else{fail++;console.log('FALLA',m);}};
function cuerpo(fn){const i=src.indexOf('function '+fn+'(');if(i<0)return null;const j=src.indexOf('\nfunction ',i+10);return src.slice(i,j<0?undefined:j);}
const cs=cuerpo('computeSchedule'),cc=cuerpo('computeScheduleCorte');
t(cs&&/calcScheduleReal\(\)/.test(cs),'computeSchedule sale de calcScheduleReal');
t(cc&&/calcScheduleCorteReal\(\)/.test(cc),'computeScheduleCorte sale de calcScheduleCorteReal');
t(cuerpo('computeScheduleTeorico')&&cuerpo('computeScheduleCorteTeorico'),'el teórico sigue existiendo');
// quién usa el teórico: sólo los Gantt de programado vs real
const usos=[...src.matchAll(/(?<!function )computeSchedule(Corte)?Teorico\(\)/g)].map(m=>{const pre=src.slice(0,m.index);const k=pre.lastIndexOf('\nfunction ');const k2=pre.lastIndexOf('\nasync function ');const st=Math.max(k,k2);return (src.slice(st+1,st+80).match(/function ([A-Za-z_0-9]+)/)||[])[1];});
const permit=new Set(['renderGantt','renderGanttDiario','renderGanttDiarioAdmin','renderGanttCorteDiario']);
t(usos.length>0&&usos.every(u=>permit.has(u)),'el teórico sólo en Gantt programado vs real: '+usos.join(','));
// las pantallas de fechas siguen llamando al adaptador
['renderOrdenes','renderDash','renderCap','renderOrdenesCorte','renderCapCorte','renderGanttCorte'].forEach(fn=>{const b=cuerpo(fn);t(b&&/computeSchedule(Corte)?\(\)/.test(b)&&!/Teorico\(\)/.test(b),fn+' usa el cronograma real');});
console.log('smoke_una_sola_verdad: '+ok+' ok, '+fail+' fallas');process.exit(fail?1:0);
