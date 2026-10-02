// smoke 02d — horario especial de un día (18 a 06 sin crear turno)
// uso: TZ=America/Argentina/Buenos_Aires node tests/smoke_horario_especial.cjs fabrica_bolsas_v6.html
const fs=require('fs');
const src=fs.readFileSync(process.argv[2]||'fabrica_bolsas_v6.html','utf8');
const cut=(a,b)=>{const i=src.indexOf(a),j=src.indexOf(b);if(i<0||j<0||j<i){console.error('no se encontró '+a);process.exit(1);}return src.slice(i,j);};
globalThis.window=globalThis;
globalThis.C={fichajes:[],turnos_excepcion:[],turnos:[{id:2,nombre:'Extrusion Tarde',hora_entrada:'13:00:00',hora_salida:'22:00:00',cruza_medianoche:false,horas_extra_fijas:0,tolerancia_min:10}],esquemas_turno:[]};
globalThis.cfg={};
globalThis.r2=x=>Math.round((x+Number.EPSILON)*100)/100;
globalThis.localDate=d=>{d=d||new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
globalThis._minutosT=h=>{const p=String(h).split(':');return (+p[0])*60+(+p[1])+((+p[2]||0)/60);};
globalThis._esFeriado=()=>false;
(0,eval)(cut('let SUT={fecha:localDate()};','function _turnoRotacion(emp,fechaStr){'));
globalThis._turnoRotacion=(e,f)=>{const w=new Date(f+'T12:00:00').getDay();return (w>=1&&w<=5)?{turno:C.turnos[0]}:{turno:null};};
{const i=src.indexOf('function _turnoHoras(t){');(0,eval)(src.slice(i,src.indexOf('\n}\n',i)+3));}
(0,eval)(cut('function _asisReglasDef(){','// Rellena los inputs de una fila de la Quincena'));
let ok=0,bad=0;const t=(c,m)=>{if(c){ok++;}else{bad++;console.error('✗ '+m);}};
const G={id:5};
const m=(f,h,tp)=>{C.fichajes.push({empleado_id:5,fecha:f,hora:h,tipo:tp});window._fichIdxV=-1;};
['2026-09-28','2026-09-29','2026-09-30'].forEach(f=>C.turnos_excepcion.push({empleado_id:5,fecha:f,tipo:'especial',turno_id:null,hora_entrada:'18:00:00',hora_salida:'06:00:00'}));
// marcas como quedaron corregidas
m('2026-09-28','17:51:41','entrada');m('2026-09-29','06:00:00','entrada');m('2026-09-29','06:00:15','salida');
m('2026-09-29','18:00:00','entrada');m('2026-09-30','06:00:00','salida');
m('2026-09-30','17:56:13','entrada');m('2026-10-01','06:08:51','salida');
const td=_turnoDelDia(G,'2026-09-28');
t(td.turno&&td.turno.cruza_medianoche&&td.tipo==='especial','28: horario especial que cruza');
t(_turnoHoras(td.turno)===12,'dura 12 hs');
t(_turnoDelDia(G,'2026-10-01').turno.id===2,'01/10 vuelve a la rotación');
const s=_fichSemanaCalc(G,'2026-09-28');
['2026-09-28','2026-09-29','2026-09-30'].forEach(f=>{const x=s.filas.find(y=>y.fecha===f);
  t(x.normales===9&&x.extra===3,f+': 9 + 3 (dio '+x.normales+' + '+x.extra+', trabajó '+x.h.trabajadas+')');
  t(!x.h.abierto,f+': jornada cerrada');});
t(_fichHorasDia(G,'2026-09-29').trabajadas===12,'29: 18 a 6 = 12 hs (no cuenta la marca doble de las 6)');
console.log((bad?'FALLA':'OK')+' smoke_horario_especial: '+ok+' ok, '+bad+' mal');process.exit(bad?1:0);
