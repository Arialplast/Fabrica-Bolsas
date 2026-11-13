// 13c: la nota de dotación de cortadores NO puede ir en r.avisos (anula la fecha sugerida y traba el guardado del pedido)
const fs=require('fs');const src=fs.readFileSync(process.argv[2],'utf8');
const i=src.indexOf('function simularPromesaPedido(');if(i<0){console.log('✗ falta simularPromesaPedido');process.exit(1);}
const body=src.slice(i,i+14000);let fail=0;const ok=(c,m)=>{if(!c){fail++;console.log('✗ '+m);}};
ok(!/avisos\.push\([^)]*cortadores/.test(body)&&!/avisos\.push\('Corte al/.test(body),'la dotación no se carga como aviso/problema');
ok(/r\.nota=/.test(body),'la dotación va en r.nota');
if(fail)process.exit(1);console.log('✓ promesa_nota_dotacion OK');
