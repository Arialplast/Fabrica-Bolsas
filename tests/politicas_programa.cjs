// 12j: métricas económicas de un escenario de programación
const fs=require('fs');const src=fs.readFileSync(process.argv[2],'utf8');
function fn(name){const i=src.indexOf('function '+name+'(');if(i<0)throw new Error('falta '+name);let d=0,j=src.indexOf('{',i);for(let k=j;k<src.length;k++){if(src[k]==='{')d++;else if(src[k]==='}'){d--;if(!d)return src.slice(i,k+1);}}}
let fail=0;const ok=(c,m)=>{if(!c){fail++;console.log('✗ '+m);}};
const hoy=Date.now(),D=86400000;
global.C={ord_corte:[{id:1},{id:2},{id:3}]};
const eco={1:{margen:100,venta:400,hs:2,dias:10,clase:'A'},2:{margen:300,venta:900,hs:3,dias:60,clase:'B'},3:{margen:50,venta:200,hs:1,dias:0,clase:'A'}};
global._polOC=(oc)=>eco[oc.id];
eval(fn('_polMetricas'));
const E={RC:{1:{},2:{},3:{}},ocEst:{1:{ped:10},2:{ped:20},3:{ped:10}},
  ped:{10:{fin:new Date(hoy+2*D),promesa:new Date(hoy+5*D),E:{tipo:'ok'}},20:{fin:new Date(hoy+10*D),promesa:new Date(hoy+4*D),E:{tipo:'atrasada'}}}};
const M=_polMetricas(E);
ok(M.n===2,'2 pedidos');ok(M.mTot===450&&M.vTot===1500,'totales');
ok(M.mOk===150,'margen a tiempo = pedido 10 (100+50)');
ok(M.aAtr===0,'el atrasado es clase B');
ok(M.caja30===600,'cobra en 30 d: pedido 10 (2+10 días) sí, pedido 20 (10+60) no → '+M.caja30);
ok(Math.abs(M.dMargen-(150*2+300*10)/450)<0.01,'días hasta entregar ponderados por margen → '+M.dMargen);
ok(Math.abs(M.dCobro-(600*12+900*70)/1500)<0.01,'días hasta cobrar ponderados por venta → '+M.dCobro);
if(fail){console.log('FALLARON '+fail);process.exit(1);}console.log('✓ politicas_programa OK');
