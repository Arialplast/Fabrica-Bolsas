// smoke 13b — recibos: releer la base antes de guardar/imputar + numeración única
// Caso real QUILPLAST 30/09: 2ª PC con caché vieja repitió RECI-000165 e imputó de nuevo
// a RV-000219/241 ya pagados.
// uso: node tests/smoke_recibo_fresco.cjs fabrica_bolsas_v6.html
const fs=require('fs');const src=fs.readFileSync(process.argv[2]||'fabrica_bolsas_v6.html','utf8');
const a=src.indexOf('// ===== 🧾 RECIBOS FRESCOS ANTES DE COBRAR');const b=src.indexOf('async function _cargarRecibos(){');
if(a<0||b<0||b<a){console.log('FALTA el bloque');process.exit(1);}
let ok=0,bad=0;const t=(c,m)=>{if(c)ok++;else{bad++;console.log('✗ '+m);}};
const fn=name=>{const i=src.indexOf('function '+name+'(');if(i<0)throw new Error('falta '+name);let d=0,j=src.indexOf('{',i);for(let k=j;k<src.length;k++){if(src[k]==='{')d++;else if(src[k]==='}'){d--;if(!d)return src.slice(i,k+1);}}};
global.r2=n=>Math.round((parseFloat(n)||0)*100)/100;
global._ncTotalDe=()=>0;
global.C={};
eval(['_aplicadoARV','_saldoRV','_aplicadoASaldoInicial','_saldoInicial'].map(fn).join('\n').replace(/function (\w+)\(/g,'global.$1=function('));
global._saldoFactura=()=>0;global._saldoND=()=>0;
let baseRecibos=null,falla=false;
global._cargarRecibos=async()=>falla?{data:null,error:{message:'red'}}:{data:baseRecibos,error:null};
eval(src.slice(a,b).replace(/async function (\w+)\(/g,'global.$1=async function(').replace(/\nfunction (\w+)\(/g,'\nglobal.$1=function('));

(async()=>{
  // RV-000219 (452.709) — PC A cobró con RECI-000165; PC B tiene la caché de antes.
  C.rvs=[{id:220,numero:'RV-000219',total:'452709.00'},{id:243,numero:'RV-000241',total:'517560.00'}];
  const viejos=[{id:257,numero:'RECI-000164',plano:'informal',estado:'activo',recibo_rvs:[{rv_id:220,monto_aplicado:'164105.35'}]}];
  C.recibos=viejos.slice();
  const recA={id:268,numero:'RECI-000165',plano:'informal',estado:'activo',total_cobrado:'1000000',total_retenciones:'0',total_aplicado:'1000000',recibo_rvs:[{rv_id:220,monto_aplicado:'288603.65'},{rv_id:243,monto_aplicado:'517560'}]};
  baseRecibos=viejos.concat([recA,{id:300,numero:'REC-000105',plano:'formal',estado:'activo',recibo_rvs:[]}]);
  t(_recSaldoDestino('RV',220)===288603.65,'caché vieja: PC B ve RV-000219 con saldo 288.603,65');
  t(_recSiguienteNumero(C.recibos,'informal',0)==='RECI-000165','caché vieja: PC B iba a usar RECI-000165 (el bug)');
  t(await _recRefrescarCache()===true,'refresco OK');
  t(_recSaldoDestino('RV',220)===0,'tras releer: RV-000219 saldo 0 → la imputación de B se bloquea');
  t(_recSaldoDestino('RV',243)===0,'tras releer: RV-000241 saldo 0');
  t(_recSiguienteNumero(C.recibos,'informal',0)==='RECI-000166','tras releer: número siguiente RECI-000166');
  t(_recSiguienteNumero(C.recibos,'informal',2)==='RECI-000168','reintento por choque: salta al siguiente');
  t(_recSiguienteNumero(C.recibos,'formal',0)==='REC-000106','formal numera aparte (REC-)');
  t(_recSiguienteNumero([],'formal',0)==='REC-000001','sin recibos → 000001');
  // un recibo anulado no cuenta para el saldo, pero su número sí queda ocupado
  baseRecibos=viejos.concat([Object.assign({},recA,{estado:'anulado'})]);await _recRefrescarCache();
  t(_recSaldoDestino('RV',220)===288603.65,'recibo anulado no descuenta saldo');
  t(_recSiguienteNumero(C.recibos,'informal',0)==='RECI-000166','número del anulado no se reutiliza');
  // si la base no responde, no se pisa la caché y se informa falla
  const antes=C.recibos;falla=true;
  t(await _recRefrescarCache()===false&&C.recibos===antes,'sin conexión → false, caché intacta (y no se guarda)');
  falla=false;
  t(_recSaldoDestino('NOTA_DEBITO',1)===0&&_recSaldoDestino('SALDO_INI',99)===0,'tipos ND / SALDO_INI resueltos');
  // enganches en el código
  const g=src.slice(src.indexOf('async function guardarRecibo('),src.indexOf('function imprimirRecibo('));
  t(g.indexOf('_recRefrescarCache()')>0&&g.indexOf('_recRefrescarCache()')<g.indexOf('Anti-sobreaplicación'),'guardarRecibo relee ANTES de validar');
  t(/_recSiguienteNumero\(C\.recibos/.test(g)&&/23505/.test(g),'guardarRecibo numera con la caché fresca y reintenta en 23505');
  t(!/const ultRec=/.test(g),'se fue la numeración vieja');
  const ci=src.slice(src.indexOf('async function confirmarImputar('),src.indexOf('async function aplicarImputacion('));
  t(ci.indexOf('_recRefrescarCache()')>0&&ci.indexOf('_recRefrescarCache()')<ci.indexOf('aplicarImputacion('),'Cuenta corriente relee antes de imputar');
  t(/_recSaldoDestino\(/.test(ci)&&/ya no tiene ese crédito libre/.test(ci),'Cuenta corriente valida saldo destino y crédito del recibo');
  console.log(ok+' ok · '+bad+' fallas');process.exit(bad?1:0);
})();
