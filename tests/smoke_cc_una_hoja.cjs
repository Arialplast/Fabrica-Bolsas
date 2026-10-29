// smoke 29d — cuenta corriente para el cliente en una hoja (función pura _c360CortarHoja)
// uso: node tests/smoke_cc_una_hoja.cjs fabrica_bolsas_v6.html
const fs=require('fs');const src=fs.readFileSync(process.argv[2]||'fabrica_bolsas_v6.html','utf8');
const a=src.indexOf('function _c360CortarHoja('),b=src.indexOf('function _c360FmtFecha(');
if(a<0||b<0){console.log('FALTA el bloque');process.exit(1);}
eval(src.slice(a,b));
let ok=0,bad=0;const t=(x,m)=>{if(x)ok++;else{bad++;console.log('✗ '+m);}};
const mk=n=>{let s=0;return Array.from({length:n},(_,i)=>{const d=i%3===2?0:1000,h=i%3===2?1500:0;s+=d-h;return{fecha:'2026-'+String(1+Math.floor(i/28)).padStart(2,'0')+'-'+String(1+i%28).padStart(2,'0'),debe:d,haber:h,saldo:s};});};
let m=mk(10),r=_c360CortarHoja(m,26);
t(r.filas.length===10&&r.saldoAnterior===null&&r.ocultos===0,'pocos movimientos: van todos, sin saldo anterior');
m=mk(80);r=_c360CortarHoja(m,26);
t(r.filas.length===26,'muchos: 26 filas');
t(r.ocultos===54,'54 resumidos en el saldo anterior');
t(r.saldoAnterior===m[53].saldo,'saldo anterior = saldo corriendo justo antes del primero que se muestra');
t(r.fechaDesde===r.filas[0].fecha,'fecha desde = la del primero mostrado');
t(r.filas[25].saldo===m[79].saldo,'el saldo final no cambia');
const recalc=r.filas.reduce((s,x)=>s+x.debe-x.haber,r.saldoAnterior);
t(Math.abs(recalc-m[79].saldo)<0.001,'saldo anterior + debe − haber de las filas = saldo final');
r=_c360CortarHoja(mk(26),26);t(r.saldoAnterior===null&&r.filas.length===26,'justo 26: todos, sin saldo anterior');
r=_c360CortarHoja(mk(27),26);t(r.ocultos===1&&r.filas.length===26,'27: uno resumido');
r=_c360CortarHoja([],26);t(r.filas.length===0,'sin movimientos');
console.log((bad?'✗ ':'✓ ')+ok+' ok · '+bad+' fallas');process.exit(bad?1:0);
