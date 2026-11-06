// 06f: _estadoOperativoPedido / _pedidoInfoProduccion con el mismo producto en dos líneas (PED-06016)
const fs=require('fs');const src=fs.readFileSync(process.argv[2],'utf8');
function grab(name){const a=src.indexOf('function '+name+'(');if(a<0)throw 'falta '+name;
  let i=src.indexOf('{',a),d=0;for(;i<src.length;i++){if(src[i]==='{')d++;else if(src[i]==='}'){d--;if(!d)break;}}
  return 'global.'+name+'='+src.slice(a,i+1)+';';}
global.C={ord_corte:[],productos:[],bobinas_prod:[],stock_bolsas:[]};
global._lineaCancelada=l=>(parseFloat(l.cantidad_cancelada)||0)>=(parseFloat(l.cantidad)||0)&&(parseFloat(l.cantidad)||0)>0;
global._granelLineaEstado=()=>null;global._granelPedido=()=>[];global._cobradoPedido=()=>8157250.19;
eval(grab('_estadoOperativoPedido'));
let ok=0,fail=0;const t=(n,c,x)=>{c?ok++:(fail++,console.log('✗',n,x===undefined?'':x));};
const p={id:329,estado:'Entregado parcial',total:23921554.8,pedido_ordenes_corte:[],
 pedido_lineas:[{id:648,producto_id:105,cantidad:1200,entregado:0},{id:649,producto_id:93,cantidad:400,entregado:0},{id:650,producto_id:93,cantidad:400,entregado:0}]};
C.stock_bolsas=[{pedido_id:329,producto_id:105,estado:'entregado',cantidad_paquetes:872},{pedido_id:329,producto_id:105,estado:'reservado',cantidad_paquetes:5},
 {pedido_id:329,producto_id:93,estado:'entregado',cantidad_paquetes:800},{pedido_id:329,producto_id:93,estado:'reservado',cantidad_paquetes:0}];
const e=_estadoOperativoPedido(p);t('PED-06016 entrega parcial',e==='entregado_parcial',e);
// entrega completa con líneas repetidas sigue dando completo
C.stock_bolsas[0].cantidad_paquetes=1200;const e2=_estadoOperativoPedido(p);t('completo con repetidas',e2==='cobrado_parcial'||e2==='entregado_completo',e2);
// pedido normal de una línea
C.stock_bolsas=[{pedido_id:1,producto_id:7,estado:'entregado',cantidad_paquetes:100}];
const q={id:1,estado:'Confirmado',total:100,pedido_ordenes_corte:[],pedido_lineas:[{id:1,producto_id:7,cantidad:200}]};
t('una línea parcial',_estadoOperativoPedido(q)==='entregado_parcial');
C.stock_bolsas[0].cantidad_paquetes=200;global._cobradoPedido=()=>0;
t('una línea completa',_estadoOperativoPedido(q)==='entregado_completo');
// dos productos distintos, uno entregado
C.stock_bolsas=[{pedido_id:2,producto_id:7,estado:'entregado',cantidad_paquetes:50}];
t('dos productos',_estadoOperativoPedido({id:2,estado:'Confirmado',total:1,pedido_ordenes_corte:[],pedido_lineas:[{id:1,producto_id:7,cantidad:50},{id:2,producto_id:8,cantidad:50}]})==='entregado_parcial');
console.log(ok+' ok, '+fail+' fallas');process.exit(fail?1:0);
