// 13e — Crédito de NC aplicable entre cuentas del mismo CUIT.
// Uso: node tests/smoke_nc_mismo_cuit.cjs fabrica_bolsas_v6.html   (datos inventados)
const fs=require('fs');
const src=fs.readFileSync(process.argv[2],'utf8');
let ok=0,bad=0;const t=(c,m)=>{if(c)ok++;else{bad++;console.error('✗ '+m);}};
const cut=(a,b)=>{const i=src.indexOf(a),j=src.indexOf(b,i+1);if(i<0||j<0){console.error('no encontré '+a);process.exit(1);}return src.slice(i,j);};
const glob=s=>s.replace(/^function (\w+)/gm,'global.$1=function $1');
global.r2=x=>Math.round(x*100)/100;
global.C={
  clientes:[{id:1,nombre:'PEREZ A',cuit:'20-11111111-1'},{id:2,nombre:'PEREZ A_MARCA',cuit:'20111111111'},{id:3,nombre:'OTRO',cuit:'30-22222222-2'},{id:4,nombre:'SIN CUIT',cuit:null},{id:5,nombre:'CUIT CORTO',cuit:'123'}],
  facturas:[{id:10,cliente_id:1,total:1000},{id:11,cliente_id:2,total:500}],
  rvs:[],
  notas_credito:[{id:100,cliente_id:1,doc_tipo:'factura',doc_id:10,total:300,plano:'formal',estado:'emitida'},
                 {id:101,cliente_id:3,doc_tipo:'factura',doc_id:99,total:50,plano:'formal',estado:'emitida'}],
  nc_aplicaciones:[],recibos:[{estado:'activo',recibo_facturas:[{factura_id:10,monto_aplicado:1000}]}],compensaciones:[]};
eval(glob(cut('// ===== 🪪 CRÉDITO DE NC ENTRE CUENTAS','function abrirAplicarCreditoNC(')));
eval(glob(cut('function _notasCreditoDe(','// Crédito de una NC todavía')));
eval(glob(cut('function _ncCreditoDisp(','// ====')));
eval(glob(cut('function _aplicadoAFactura(','// ====')));
eval(glob(cut('function _saldoFactura(','function _estadoFactura(')));
t(_cuitNorm('20-11111111-1')==='20111111111','normaliza guiones');
t(_cuitNorm('123')==='','CUIT corto no vale');
const s1=_cliMismoCuit(1);
t(s1.has(1)&&s1.has(2)&&!s1.has(3),'1 y 2 comparten CUIT, 3 no');
t(_cliMismoCuit(4).size===1&&_cliMismoCuit(4).has(4),'sin CUIT: solo la propia cuenta');
t(_cliMismoCuit(5).size===1,'CUIT inválido: solo la propia cuenta');
t(_ncCreditoDisp(C.notas_credito[0])===300,'la NC dejó la factura cobrada en −300 → 300 de crédito');
t(_ncCreditoCliente(2,'formal')===300,'la cuenta hermana ve el crédito de la NC');
t(_ncCreditoCliente(1,'formal')===300,'la cuenta propia también');
t(_ncCreditoCliente(2,'informal')===0,'no cruza de circuito');
t(_ncCreditoCliente(3,'formal')===0||_ncCreditoCliente(3,'formal')===50,'otro CUIT no ve la de Pérez');
// aplicar 300 a la factura 11 de la cuenta 2
C.nc_aplicaciones.push({nc_id:100,doc_tipo:'factura',doc_id:11,monto_aplicado:300});
t(_saldoFactura(C.facturas[1])===200,'factura de la cuenta hermana baja a 200');
t(_saldoFactura(C.facturas[0])===0,'la factura de origen vuelve a 0 (sin crédito colgado)');
t(_ncCreditoCliente(2,'formal')===0,'crédito consumido');
t(src.includes("const ncs=(C.notas_credito||[]).filter(n=>_ids.has(n.cliente_id)&&"),'el modal usa el mismo CUIT');
console.log((bad?'✗':'✓')+' smoke_nc_mismo_cuit: '+ok+' OK'+(bad?', '+bad+' FALLAN':''));
process.exit(bad?1:0);
