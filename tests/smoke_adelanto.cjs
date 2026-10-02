// smoke 02c — día pagado a devolver: se paga y la extra posterior lo descuenta
// uso: TZ=America/Argentina/Buenos_Aires node tests/smoke_adelanto.cjs fabrica_bolsas_v6.html
const fs=require('fs');
const src=fs.readFileSync(process.argv[2]||'fabrica_bolsas_v6.html','utf8');
const a=src.indexOf('function _asisReglasDef(){');
const b=src.indexOf('// Rellena los inputs de una fila de la Quincena');
if(a<0||b<0||b<a){console.error('no se encontró el bloque');process.exit(1);}
globalThis.window=globalThis;
globalThis.C={fichajes:[],turnos_excepcion:[]};globalThis.cfg={};
globalThis.r2=x=>Math.round((x+Number.EPSILON)*100)/100;
globalThis.localDate=d=>{d=d||new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
globalThis._minutosT=h=>{const p=String(h).split(':');return (+p[0])*60+(+p[1])+((+p[2]||0)/60);};
globalThis._esFeriado=()=>false;
globalThis._lunesDeStr=s=>{const d=new Date(s+'T12:00:00');const w=(d.getDay()+6)%7;d.setDate(d.getDate()-w);return localDate(d);};
const NOCHE={id:5,hora_entrada:'22:00:00',hora_salida:'06:00:00',cruza_medianoche:true,horas_extra_fijas:0};
globalThis._turnoHoras=t=>{let d=(_minutosT(t.hora_salida)-_minutosT(t.hora_entrada))/60;if(d<0)d+=24;return d;};
globalThis._turnoDelDia=(e,f)=>{
  const ex=C.turnos_excepcion.find(x=>x.empleado_id===e.id&&x.fecha===f);
  const w=new Date(f+'T12:00:00').getDay();
  const base=(w>=1&&w<=5)?NOCHE:null;
  if(ex)return {turno:null,franco:true,tipo:ex.tipo,obs:ex.obs,turnoBase:base};
  return base?{turno:base}:{turno:null};
};
(0,eval)(src.slice(a,b));
let ok=0,bad=0;const t=(c,m)=>{if(c){ok++;}else{bad++;console.error('✗ '+m);}};
const P={id:4};
const m=(f,h,tp)=>{C.fichajes.push({empleado_id:4,fecha:f,hora:h,tipo:tp});window._fichIdxV=-1;window._adCache={};};
// semana de Pavoni 14-18/09: noches lun-jue, viernes no vino
m('2026-09-14','21:57:58','entrada');m('2026-09-15','06:04:48','salida');
m('2026-09-15','21:56:34','entrada');m('2026-09-16','06:04:08','salida');
m('2026-09-16','21:57:50','entrada');m('2026-09-17','06:00:17','salida');
m('2026-09-17','22:01:53','entrada');m('2026-09-18','06:00:09','salida');
C.turnos_excepcion.push({empleado_id:4,fecha:'2026-09-18',tipo:'adelanto',turno_id:null,obs:'no vino'});
const h18=_fichHorasDia(P,'2026-09-18');
t(h18.adelanto&&h18.adelantoHs===8,'viernes: adelanto de 8 hs (dio '+h18.adelantoHs+')');
t(h18.trabajadas===0,'viernes: la salida de las 6 es de la noche del jueves');
const h17=_fichHorasDia(P,'2026-09-17');
t(Math.abs(h17.trabajadas-7.97)<0.05,'jueves ~8 hs (dio '+h17.trabajadas+')');
let ad=_adelantoCuenta(P,'2026-09-30');
t(ad.deuda===8&&ad.prestado===8&&ad.devuelto===0,'debe 8 sin extra posterior');
let q=_fichHorasQuincena(P,'2026-09',2);
t(q.dias_adelanto===1&&q.horas_adelanto===8,'quincena: 1 día pagado a devolver');
t(q.deuda_adelanto===8,'quincena: deuda 8');
// semana siguiente: dos noches de 10 hs → 2 extra c/u devuelven 4
m('2026-09-21','22:00:00','entrada');m('2026-09-22','08:00:00','salida');
m('2026-09-22','22:00:00','entrada');m('2026-09-23','08:00:00','salida');
ad=_adelantoCuenta(P,'2026-09-30');
t(ad.devuelto===4&&ad.deuda===4,'devolvió 4, debe 4 (dio '+ad.devuelto+'/'+ad.deuda+')');
q=_fichHorasQuincena(P,'2026-09',2);
t(q.horas_extra50===0,'esas extra no se pagan (dio '+q.horas_extra50+')');
t(q.horas_devueltas===4,'quincena: 4 devueltas');
// más extra: 6 hs → 4 devuelve, 2 se pagan
m('2026-09-23','22:00:00','entrada');m('2026-09-24','12:00:00','salida');   // 14 hs: 6 extra
ad=_adelantoCuenta(P,'2026-09-30');
t(ad.deuda===0&&ad.devuelto===8,'saldado (dio '+ad.deuda+')');
q=_fichHorasQuincena(P,'2026-09',2);
t(q.horas_extra50===2,'sobrante pagado como extra: 2 (dio '+q.horas_extra50+')');
// normales de la quincena incluyen las 8 pagadas del viernes
const nSinAd=(()=>{const s=C.turnos_excepcion.splice(0);window._adCache={};const r=_fichHorasQuincena(P,'2026-09',2).horas_normales;C.turnos_excepcion.push(...s);window._adCache={};return r;})();
t(r2(q.horas_normales-nSinAd)===8,'quincena paga las 8 del viernes como normales (dif '+r2(q.horas_normales-nSinAd)+')');
// sin adelanto todo igual que antes
C.turnos_excepcion.length=0;window._adCache={};
q=_fichHorasQuincena(P,'2026-09',2);
t(q.horas_extra50===10&&q.deuda_adelanto===0,'sin adelanto: 2+2+6 = 10 extra pagada (dio '+q.horas_extra50);
console.log((bad?'FALLA':'OK')+' smoke_adelanto: '+ok+' ok, '+bad+' mal');process.exit(bad?1:0);
