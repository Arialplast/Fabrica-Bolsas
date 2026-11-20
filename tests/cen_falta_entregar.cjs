// 22u: «falta entregar» de Compromisos sale de los remitos, no del campo viejo pedido_lineas.entregado
const fs=require('fs');const src=fs.readFileSync(process.argv[2],'utf8');let n=0;const A=(c,t)=>{if(!c){console.error('✗ '+t);process.exit(1);}n++;};
const g=re=>{const m=src.match(re);if(!m)throw new Error('falta '+re);return m[0];};
// el derivador canónico, con el caso real de DAG (PED-06016): campo en 0, 5 remitos
global.C={remitos:[
  {id:1,pedido_id:9,estado:'emitido',remito_lineas:[{pedido_linea_id:648,cantidad_paquetes:500},{pedido_linea_id:649,cantidad_paquetes:200}]},
  {id:2,pedido_id:9,estado:'emitido',remito_lineas:[{pedido_linea_id:648,cantidad_paquetes:372},{pedido_linea_id:649,cantidad_paquetes:200},{pedido_linea_id:650,cantidad_paquetes:400}]},
  {id:3,pedido_id:9,estado:'anulado',remito_lineas:[{pedido_linea_id:648,cantidad_paquetes:999}]}],stock_bolsas:[]};
eval(g(/function _alRemitosDe\(p\)\{[\s\S]*?\n\}/));
const i=src.indexOf('function _alEntregadoPorLinea(p){');const j=src.indexOf('\n}\n',i);eval(src.slice(i,j+2));
const ped={id:9,pedido_lineas:[{id:648,cantidad:1200,entregado:0,precio_paquete:9884.94},{id:649,cantidad:400,entregado:0,precio_paquete:9884.94},{id:650,cantidad:400,entregado:0,precio_paquete:9884.94}]};
const E=_alEntregadoPorLinea(ped);
A(E[648]===872&&E[649]===400&&E[650]===400,'entregado por renglón = suma de remitos vivos (el anulado no cuenta) → '+JSON.stringify(E));
const falta=ped.pedido_lineas.reduce((s,l)=>s+Math.max(0,l.cantidad-E[l.id])*l.precio_paquete,0);
A(Math.round(falta)===3242260,'DAG: faltan $ 3.242.260, no $ 19.769.880 → '+Math.round(falta));
// cableado: Compromisos usa ese derivador
const c=g(/function _cenCompromisos\(\)\{[\s\S]*?\n\}/);
A(/ENT=_alEntregadoPorLinea\(f\.p\)/.test(c),'Compromisos pide lo entregado al derivador de remitos');
A(/const yaEnt=\(l\.id in ENT\)\?/.test(c)&&/-yaEnt-/.test(c),'y lo resta de lo pedido');
A(!/parseFloat\(l\.cantidad\)\|\|0\)-\(parseFloat\(l\.entregado\)/.test(c),'ya no resta el campo viejo directamente');
console.log('✓ cen_falta_entregar '+n+' ok');
