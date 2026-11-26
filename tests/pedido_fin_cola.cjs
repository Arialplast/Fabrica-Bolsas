// 23m: las órdenes de un pedido nuevo entran al final de la cola, no con prioridad 1
const fs=require('fs');const s=fs.readFileSync(process.argv[2],'utf8');
const i=s.indexOf('function _priFinCola(');if(i<0){console.error('falta _priFinCola');process.exit(1);}
const j=s.indexOf('async function confirmarTandasParcial(',i);
let C;const f=new Function('C',s.slice(i,j)+';return _priFinCola;');
let ok=true;const t=(n,c)=>{if(!c){ok=false;console.error('✗ '+n);}else console.log('✓ '+n);};
C={ord_corte:[{estado:'Pendiente',prioridad:32},{estado:'Completada',prioridad:80},{estado:'En proceso',prioridad:99}],ordenes:[{estado:'Pendiente',prioridad:31}]};
t('va después de la última abierta (33)',f(C)()===33);
t('cola vacía → 1',f({ord_corte:[],ordenes:[]})()===1);
const k=s.indexOf('async function confirmarPedido(pedidoId');const body=s.slice(k,k+12000);
t('confirmarPedido usa el final de la cola',/_priCur=prioridadBase\|\|_priFinCola\(\)/.test(body));
t('las OC toman número correlativo',/x\.prioridad=_priCur\+\+/.test(body));
t('la OE ya no nace con prioridad 1',!/priInput=o\._oePri\|\|1/.test(body)&&/priInput=_ocsL\.length\?Math\.min/.test(body));
process.exit(ok?0:1);
