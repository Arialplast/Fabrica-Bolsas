// 23n: margen por kilo de cada cliente en las acciones comerciales del plan de 8 semanas
const fs=require('fs');const s=fs.readFileSync(process.argv[2],'utf8');
let ok=true;const t=(n,c)=>{if(!c){ok=false;console.error('✗ '+n);}else console.log('✓ '+n);};
const i=s.indexOf('function _pmpMgCliDe(');const j=s.indexOf('function _pmpMgCli(',i);
const f=new Function(s.slice(i,j)+';return _pmpMgCliDe;')();
const PP=new Map([[1,{venta:100000,costo:60000,kg:100,paquetes:100}],[2,{venta:0,costo:0,kg:0,paquetes:0,sinCosto:true}]]);
const R=[{cliente_id:9,remito_lineas:[{producto_id:1,cantidad_paquetes:60,subtotal:48000}]},{cliente_id:47,remito_lineas:[{producto_id:1,cantidad_paquetes:80,subtotal:96000},{producto_id:2,cantidad_paquetes:5,subtotal:1}]},{cliente_id:5,estado:'anulado',remito_lineas:[{producto_id:1,cantidad_paquetes:900,subtotal:1}]}];
const m=f(R,PP);
t('cliente barato: (48.000 − 36.000) / 60 kg = 200 $/kg',Math.round(m[9])===200);
t('cliente caro: (96.000 − 48.000) / 80 kg = 600 $/kg',Math.round(m[47])===600);
t('producto sin costo no entra; remito anulado tampoco',m[5]===undefined);
t('el efecto lleva el margen del cliente',/mgC\(a\.cli,f\*p\/100,e\)/.test(s)&&/b\.mgCliAdj=/.test(s));
process.exit(ok?0:1);
