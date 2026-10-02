// smoke 02b — hora extra por bloques completos de 30 min (lo suelto no se paga)
// uso: TZ=America/Argentina/Buenos_Aires node tests/smoke_bloque_extra.cjs fabrica_bolsas_v6.html
const fs=require('fs');
const src=fs.readFileSync(process.argv[2]||'fabrica_bolsas_v6.html','utf8');
const a=src.indexOf('function _asisReglasDef(){');
const b=src.indexOf('// Devuelve {normales, extra} ya corregidos por la regla semanal');
if(a<0||b<0||b<a){console.error('no se encontró el bloque');process.exit(1);}
globalThis.C={fichajes:[]};globalThis.cfg={};
globalThis.r2=x=>Math.round((x+Number.EPSILON)*100)/100;
globalThis.localDate=d=>{d=d||new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
globalThis._minutosT=h=>{const p=String(h).split(':');return (+p[0])*60+(+p[1])+((+p[2]||0)/60);};
globalThis._esFeriado=()=>false;
globalThis._lunesDeStr=s=>{const d=new Date(s+'T12:00:00');const w=(d.getDay()+6)%7;d.setDate(d.getDate()-w);return localDate(d);};
const TURNO={hora_entrada:'13:00:00',hora_salida:'22:00:00',horas_extra_fijas:0};
globalThis._turnoHoras=t=>(_minutosT(t.hora_salida)-_minutosT(t.hora_entrada))/60;
globalThis._turnoDelDia=(e,f)=>{const w=new Date(f+'T12:00:00').getDay();return (w>=1&&w<=5)?{turno:TURNO,tipo:'turno'}:{turno:null,franco:false};};
(0,eval)(src.slice(a,b));
let ok=0,bad=0;const t=(c,m)=>{if(c){ok++;}else{bad++;console.error('✗ '+m);}};
const fich=(f,e,s)=>{C.fichajes.push({empleado_id:1,fecha:f,hora:e+':00',tipo:'entrada'},{empleado_id:1,fecha:f,hora:s+':00',tipo:'salida'});window._fichIdxV=-1;};
globalThis.window=globalThis;
// bloques
t(_asisBloqueExtra(3+4/60)===3,'3h04 → 3h');
t(_asisBloqueExtra(34/60)===0.5,'0h34 → 0h30');
t(_asisBloqueExtra(20/60)===0,'0h20 → 0');
t(_asisBloqueExtra(0.5)===0.5,'0h30 exacta → 0h30');
t(_asisBloqueExtra(-1)===0,'negativo → 0');
t(_asisBloqueExtra(20/60,{extra_min_min:0})===r2(20/60),'bloque 0 → sin redondeo');
// semana real de Guaraz 14–19/09/2026
fich('2026-09-14','12:55','22:03');fich('2026-09-15','12:59','22:00');fich('2026-09-16','12:54','22:08');
fich('2026-09-17','12:56','22:05');fich('2026-09-18','12:59','22:01');fich('2026-09-19','06:01','12:05');
const s=_fichSemanaCalc({id:1},'2026-09-14');
const sab=s.filas.find(x=>x.fecha==='2026-09-19');
t(sab.normales===3,'sábado 3 normales (dio '+sab.normales+')');
t(sab.extra===3,'sábado 3 extra, no 3h39 (dio '+sab.extra+')');
s.filas.filter(x=>x.dow>=1&&x.dow<=5).forEach(x=>{t(x.normales===9&&x.extra===0,x.fecha+' 9 normales 0 extra (dio '+x.normales+'/'+x.extra+')');});
t(s.extra===3,'extra semanal 3 (dio '+s.extra+')');
// día con 9h40 → 30 min extra
C.fichajes=[];fich('2026-09-21','13:00','22:40');
const s2=_fichSemanaCalc({id:1},'2026-09-21');const l=s2.filas[0];
t(l.normales===9&&l.extra===0.5,'9h40 → 9 + 0h30 (dio '+l.normales+'/'+l.extra+')');
// día corto: no se toca
C.fichajes=[];fich('2026-09-21','13:00','21:00');
const l3=_fichSemanaCalc({id:1},'2026-09-21').filas[0];
t(l3.normales===8&&l3.extra===0,'8h → 8 normales');
// sábado 3h20 → 3 normales 0 extra
C.fichajes=[];fich('2026-09-26','06:00','09:20');
const s4=_fichSemanaCalc({id:1},'2026-09-21').filas.find(x=>x.dow===6);
t(s4.normales===3&&s4.extra===0,'sábado 3h20 → 3 + 0 (dio '+s4.normales+'/'+s4.extra+')');
console.log((bad?'FALLA':'OK')+' smoke_bloque_extra: '+ok+' ok, '+bad+' mal');process.exit(bad?1:0);
