// 13d — Facturas de ADELANTO FINANCIERO: fuera de facturación/cobranza comercial.
// Uso: node tests/smoke_fac_financiera.cjs fabrica_bolsas_v6.html   (datos inventados)
const fs=require('fs');
const src=fs.readFileSync(process.argv[2],'utf8');
let ok=0,bad=0;const t=(c,m)=>{if(c)ok++;else{bad++;console.error('✗ '+m);}};
const cut=(a,b)=>{const i=src.indexOf(a),j=src.indexOf(b,i+1);if(i<0||j<0){console.error('no encontré '+a);process.exit(1);}return src.slice(i,j);};
const glob=s=>s.replace(/^function (\w+)/gm,'global.$1=function $1');
global.r2=x=>Math.round(x*100)/100;
global.C={facturas:[
  {id:1,total:1000,observaciones:'ADELANTO FINANCIERO A CUENTA — Flexxus'},
  {id:2,total:500,observaciones:null},
  {id:3,total:700,observaciones:'adelanto financiero (minúsculas)'}]};
eval(glob(cut('// ===== 💸 FACTURAS DE FINANCIACIÓN','function _saldoFactura(')));
t(_facEsFinanciera(C.facturas[0]),'marcada por observaciones');
t(!_facEsFinanciera(C.facturas[1]),'factura común no');
t(_facEsFinanciera(C.facturas[2]),'sin distinguir mayúsculas');
t(!_facEsFinanciera(null),'null no rompe');
t(_recEsFinanciero({recibo_facturas:[{factura_id:1}]}),'recibo que solo cancela la financiera');
t(!_recEsFinanciero({recibo_facturas:[{factura_id:1},{factura_id:2}]}),'recibo mixto cuenta como cobranza');
t(!_recEsFinanciero({recibo_facturas:[]}),'recibo sin facturas (saldo a favor / RV) no');
t(!_recEsFinanciero({recibo_facturas:[{factura_id:1}],recibo_rvs:[{rv_id:9}]}),'recibo con RV no');
// enganches
t(src.includes("if(_facEsFinanciera(f))return;const m=_c360Fecha(f)"),'Cliente 360: facturación mensual');
t(src.includes("if(_recEsFinanciero(r))return;const m=_c360Fecha(r)"),'Cliente 360: cobros mensuales');
t(src.includes("_c360Facturas(id).filter(f=>!_facEsFinanciera(f))"),'Cliente 360: ticket');
t(src.includes("if(/anul/i.test(f.estado||''))return;if(typeof _facEsFinanciera==='function'&&_facEsFinanciera(f))return;"),'demora de cobro');
t(src.includes("f.estado==='anulada'||_facEsFinanciera(f))return;const fe="),'concentración 90 días');
t(src.includes("&&!_facEsFinanciera(f)).reduce("),'facturado 30d');
t(src.includes("&&!_recEsFinanciero(r))"),'cobrado 30d');
t(src.includes("r.estado==='anulado'||_recEsFinanciero(r))return;const k="),'gráfico mensual cobros');
// el saldo NO se toca: la factura sigue en cuenta corriente
t(!/_facEsFinanciera/.test(cut('function _saldoFactura(','function _estadoFactura(')),'el saldo de la factura no se altera');
console.log((bad?'✗':'✓')+' smoke_fac_financiera: '+ok+' OK'+(bad?', '+bad+' FALLAN':''));
process.exit(bad?1:0);
