// 22x: _alEntregadoPorLinea cuenta renglones de remito sueltos (mismo producto) y la carga histórica del campo viejo
const fs=require('fs');const src=fs.readFileSync(process.argv[2],'utf8');let f=0;const A=(c,m)=>{if(!c){f++;console.log('✗ '+m);}};
let C={remitos:[],stock_bolsas:[]};const _lineaCancelada=li=>li.estado_linea==='cancelada';
const _alRemitosDe=p=>C.remitos.filter(r=>String(r.pedido_id)===String(p.id)&&r.estado!=='anulado');
const i=src.indexOf('function _alEntregadoPorLinea(p){');const j=src.indexOf('\n}\n',i);eval(src.slice(i,j+2));
// caso Collinet: 200 con renglón + 300 + 300 sueltos del mismo producto, pedido 500
let p={id:1,pedido_lineas:[{id:841,producto_id:11,cantidad:500},{id:840,producto_id:12,cantidad:100}]};
C.remitos=[{pedido_id:1,remito_lineas:[{pedido_linea_id:841,producto_id:11,cantidad_paquetes:200},{pedido_linea_id:null,producto_id:11,cantidad_paquetes:300},{pedido_linea_id:840,producto_id:12,cantidad_paquetes:84}]},{pedido_id:1,remito_lineas:[{pedido_linea_id:null,producto_id:11,cantidad_paquetes:300}]}];
let E=_alEntregadoPorLinea(p);A(E[841]===500,'lo suelto completa el renglón sin pasar de lo pedido: '+E[841]);A(E[840]===84,'otro producto no se toca: '+E[840]);
// producto repetido en dos renglones: lo suelto se reparte en orden
p={id:2,pedido_lineas:[{id:1,producto_id:5,cantidad:100},{id:2,producto_id:5,cantidad:100}]};
C.remitos=[{pedido_id:2,remito_lineas:[{pedido_linea_id:1,producto_id:5,cantidad_paquetes:100},{pedido_linea_id:null,producto_id:5,cantidad_paquetes:60}]}];
E=_alEntregadoPorLinea(p);A(E[1]===100&&E[2]===60,'reparto en orden: '+E[1]+'/'+E[2]);
// carga histórica en el campo viejo, con remitos en otros renglones (Grupo Enser PED-05960)
p={id:3,pedido_lineas:[{id:524,producto_id:2,cantidad:6000},{id:525,producto_id:97,cantidad:500,entregado:500}]};
C.remitos=[{pedido_id:3,remito_lineas:[{pedido_linea_id:524,producto_id:2,cantidad_paquetes:6000}]}];
E=_alEntregadoPorLinea(p);A(E[525]===500&&E[524]===6000,'campo viejo vale si el renglón no tiene remito');
// si el renglón tiene remito, el campo viejo NO se suma
p={id:4,pedido_lineas:[{id:9,producto_id:2,cantidad:100,entregado:100}]};C.remitos=[{pedido_id:4,remito_lineas:[{pedido_linea_id:9,producto_id:2,cantidad_paquetes:40}]}];
E=_alEntregadoPorLinea(p);A(E[9]===40,'no cuenta dos veces: '+E[9]);
// remito anulado no entrega; renglón cancelado no recibe
p={id:5,pedido_lineas:[{id:7,producto_id:3,cantidad:50,estado_linea:'cancelada'},{id:8,producto_id:3,cantidad:50}]};C.remitos=[{pedido_id:5,remito_lineas:[{pedido_linea_id:null,producto_id:3,cantidad_paquetes:30},{pedido_linea_id:8,producto_id:3,cantidad_paquetes:10}]},{pedido_id:5,estado:'anulado',remito_lineas:[{pedido_linea_id:8,producto_id:3,cantidad_paquetes:40}]}];
E=_alEntregadoPorLinea(p);A(E[7]===0&&E[8]===40,'cancelado no recibe, anulado no cuenta: '+E[7]+'/'+E[8]);
console.log(f?('FALLÓ '+f):'OK entregado_sueltas');process.exit(f?1:0);
