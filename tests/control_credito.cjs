// 13a: control de crédito al tomar un pedido
const fs=require('fs');const src=fs.readFileSync(process.argv[2],'utf8');
function fn(name){const i=src.indexOf('function '+name+'(');if(i<0)throw new Error('falta '+name);let d=0,j=src.indexOf('{',i);for(let k=j;k<src.length;k++){if(src[k]==='{')d++;else if(src[k]==='}'){d--;if(!d)return src.slice(i,k+1);}}}
let fail=0;const ok=(c,m)=>{if(!c){fail++;console.log('✗ '+m);}};
const r2=n=>Math.round(n*100)/100;const fmtMoney=n=>'$'+n;const localDate=d=>(d||new Date()).toISOString().slice(0,10);
let AG={tot:0,venc:0,b2:0,dias:0};const _ccAging=()=>AG;
global.C={cli_credito:[],remitos:[],pedidos:[]};
eval(fn('_credLimite'));eval(fn('_credEstado'));
// sin nada
let S=_credEstado(1,1000);ok(S.nivel==='ok'&&S.expo===1000&&S.limite===null,'cliente limpio: ok');
// deuda vencida → aviso
AG={tot:5000000,venc:2000000,b2:0,dias:20};S=_credEstado(1,1000);ok(S.nivel==='aviso'&&S.expo===5001000,'vencido → aviso');
AG={tot:5000000,venc:90000,b2:90000,dias:20};S=_credEstado(1,0);ok(S.nivel==='ok','resto chico (< $100.000) no dispara');
// +60 días → retener
AG={tot:5000000,venc:2000000,b2:500000,dias:50};S=_credEstado(1,0);ok(S.nivel==='retener','deuda de +60 días → retener');
// límite
AG={tot:5000,venc:0,b2:0,dias:5};C.cli_credito=[{cliente_id:1,limite:8000}];
C.remitos=[{id:1,cliente_id:1,pedido_id:10,estado:'emitido',factura_id:null,rv_id:null,fecha:localDate(),remito_lineas:[{pedido_linea_id:100,cantidad_paquetes:4,subtotal:400}]},
           {id:2,cliente_id:1,pedido_id:10,estado:'emitido',factura_id:7,rv_id:null,fecha:localDate(),remito_lineas:[{pedido_linea_id:100,cantidad_paquetes:1,subtotal:100}]}];
C.pedidos=[{id:10,cliente_id:1,estado:'En producción',subtotal:1000,total:1210,pedido_lineas:[{id:100,cantidad:10,cantidad_cancelada:0,precio_paquete:100}]},
           {id:11,cliente_id:1,estado:'Entregado',subtotal:1,total:1,pedido_lineas:[{id:101,cantidad:10,precio_paquete:100}]}];
S=_credEstado(1,1000);
ok(S.sinFact===400,'entregado sin facturar = remito sin factura → '+S.sinFact);
ok(S.enCurso===605,'en curso = (10 − 5 remitidos) × 100 × 1,21 → '+S.enCurso);
ok(S.expo===7005&&S.nivel==='ok'&&S.disp===995,'dentro del límite → '+S.expo);
S=_credEstado(1,2500);ok(S.nivel==='retener'&&S.disp<0,'sobre el límite → retener');
ok(_credEstado(2,0).limite===null,'otro cliente sin límite');
if(fail){console.log('FALLARON '+fail);process.exit(1);}console.log('✓ control_credito OK');
