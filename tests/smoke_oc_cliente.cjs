// 04n: OC del cliente — helpers puros _ocClienteDePedidos / _ocClienteDeFactura
const fs=require('fs');const src=fs.readFileSync(process.argv[2],'utf8');
const a=src.indexOf('// ===== 🧾 ORDEN DE COMPRA DEL CLIENTE (04n)');
const b=src.indexOf('async function editarOcCliente(');
if(a<0||b<0){console.log('FALTA BLOQUE');process.exit(1);}
global.C={pedidos:[{id:252,oc_cliente:'2303'},{id:329,oc_cliente:' 2353 '},{id:225,oc_cliente:null},{id:9,oc_cliente:'2303'}],
 remitos:[{id:363,pedido_id:252,factura_id:77},{id:509,pedido_id:329,factura_id:115},{id:510,pedido_id:9,factura_id:500},{id:289,pedido_id:225,factura_id:60}]};
eval(src.slice(a,b).replace(/^function (\w+)/gm,'global.$1=function $1'));
let ok=0,fail=0;const t=(n,c)=>{c?ok++:(fail++,console.log('✗',n));};
const j=x=>JSON.stringify(x);
t('un pedido',j(_ocClienteDePedidos([252]))==='["2303"]');
t('trim',j(_ocClienteDePedidos([329]))==='["2353"]');
t('sin oc',j(_ocClienteDePedidos([225]))==='[]');
t('dedup',j(_ocClienteDePedidos([252,9,329]))==='["2303","2353"]');
t('ids string',j(_ocClienteDePedidos(['252']))==='["2303"]');
t('fact por cabecera',j(_ocClienteDeFactura({id:154,pedido_id:252,factura_remitos:[]}))==='["2303"]');
t('fact por remitos.factura_id',j(_ocClienteDeFactura({id:115,pedido_id:null}))==='["2353"]');
t('fact por factura_remitos',j(_ocClienteDeFactura({id:999,factura_remitos:[{remito_id:363},{remito_id:509}]}))==='["2303","2353"]');
t('fact sin oc',j(_ocClienteDeFactura({id:60}))==='[]');
t('fact null',j(_ocClienteDeFactura(null))==='[]');
console.log(ok+' ok, '+fail+' fallas');process.exit(fail?1:0);
