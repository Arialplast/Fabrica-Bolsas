// Smoke 28e — pedido con dos líneas del mismo producto (PED-06016 DAG: 00123 × 400 + 400)
// Uso: TZ=America/Argentina/Buenos_Aires node tests/smoke_lineas_repetidas.cjs fabrica_bolsas_v6.html
const fs=require('fs');
const html=fs.readFileSync(process.argv[2]||'fabrica_bolsas_v6.html','utf8');
function grab(name){
  const i=html.indexOf('function '+name+'(');
  if(i<0)throw new Error('no está '+name);
  let d=0,j=html.indexOf('{',i);
  for(let k=j;k<html.length;k++){if(html[k]==='{')d++;else if(html[k]==='}'){d--;if(!d)return html.slice(i,k+1);}}
}
global.C={};
const code=['_lineaBDDeOrdenPlan','_paqPedidosProducto','_repartoEnLineas','_paqYaEnOCLinea','_paqYaEnOC','_estadoLineaCalculado']
  .map(grab).join('\n')+'\nfunction _lineaCancelada(l){return l.estado_linea==="cancelada";}\nfunction _granelLineaEstado(){return null;}\nfunction r2(x){return Math.round(x*100)/100;}';
eval(code.replace(/function (\w+)\(/g,'global.$1=function $1('));
let n=0,f=0;const ok=(c,m)=>{n++;if(!c){f++;console.log('✗',m);}else console.log('✓',m);};

const plan={meta:{lineas:[{tmpId:1,producto_id:105},{tmpId:2,producto_id:93},{tmpId:3,producto_id:93}]},
  ordenes:[{linea_id:1,producto_id:105},{linea_id:2,producto_id:93},{linea_id:3,producto_id:93}]};
const L=[{id:648,producto_id:105,cantidad:1200},{id:649,producto_id:93,cantidad:400},{id:650,producto_id:93,cantidad:400}];
ok(_lineaBDDeOrdenPlan(plan,L,plan.ordenes[0]).id===648,'blanca → 648');
ok(_lineaBDDeOrdenPlan(plan,L,plan.ordenes[1]).id===649,'amarilla tanda línea 2 → 649');
ok(_lineaBDDeOrdenPlan(plan,L,plan.ordenes[2]).id===650,'amarilla línea 3 → 650 (antes 649)');
ok(_lineaBDDeOrdenPlan(plan,[...L].reverse(),plan.ordenes[2]).id===650,'no depende del orden del array');
ok(_lineaBDDeOrdenPlan({ordenes:plan.ordenes},L,plan.ordenes[2]).id===650,'sin meta: cae al orden de plan.ordenes');

const p={id:329,pedido_lineas:L,plan_ordenes:plan,pedido_ordenes_corte:[
  {pedido_linea_id:649,orden_corte_id:814},{pedido_linea_id:649,orden_corte_id:900},{pedido_linea_id:650,orden_corte_id:903}]};
ok(_paqPedidosProducto(p,93)===800,'pedido 00123 = 800 (antes se topeaba en 400)');
C.pedidos=[p];C.ord_corte=[{id:814,cantidad_paquetes:200,estado:'Completada'},{id:900,cantidad_paquetes:200,estado:'Completada'},{id:903,cantidad_paquetes:200,estado:'Completada'}];
ok(_paqYaEnOCLinea(329,649)===400&&_paqYaEnOCLinea(329,650)===200,'OC por línea 400 / 200');
ok(_paqYaEnOC(329,null)===600,'_paqYaEnOC sin cambios');

// Pantalla: 218 entregado + 182 reservado (situación de hoy antes de la reparación)
C.stock_bolsas=[{producto_id:93,pedido_id:329,estado:'entregado',cantidad_paquetes:218},{producto_id:93,pedido_id:329,estado:'reservado',cantidad_paquetes:182}];
C.maq_corte=[];C.productos=[];C.bobinas_prod=[];
const e649=_estadoLineaCalculado(p,L[1]),e650=_estadoLineaCalculado(p,L[2]);
ok(e649.paqEntregado===218&&e649.paqProducido===400,'649: entregado 218 · producido 400');
ok(e650.paqEntregado===0&&e650.paqProducido===0,'650: entregado 0 · producido 0 (antes 218/400 repetido)');
// Después de reservar las 220 libres
C.stock_bolsas.push({producto_id:93,pedido_id:329,estado:'reservado',cantidad_paquetes:220});
const r650=_estadoLineaCalculado(p,L[2]);
ok(r650.paqProducido===220&&r650.paqEntregado===0,'650 tras reparar: producido 220');
// Una sola línea del producto: igual que antes
const e648=_estadoLineaCalculado(p,L[0]);
ok(e648.paqProducido===0,'línea única sin stock: 0');
C.stock_bolsas.push({producto_id:105,pedido_id:329,estado:'reservado',cantidad_paquetes:312},{producto_id:105,pedido_id:329,estado:'entregado',cantidad_paquetes:92});
const e648b=_estadoLineaCalculado(p,L[0]);
ok(e648b.paqProducido===404&&e648b.paqEntregado===92,'blanca 404 / 92 como en pantalla');
const rep=_repartoEnLineas([{id:1,cantidad:400},{id:2,cantidad:400}],850);
ok(rep[1]===400&&rep[2]===450,'sobreproducción va a la última');
console.log('\n'+(n-f)+'/'+n+' ok');process.exit(f?1:0);
