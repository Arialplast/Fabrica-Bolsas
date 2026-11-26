// 24a: el inventario de MP vencido no frena la carga de bobinas; se cuenta lo cargado desde que venció
const fs=require('fs');const src=fs.readFileSync(process.argv[2],'utf8');let f=0;const A=(c,m)=>{if(!c){f++;console.log('✗ '+m);}};
const blk=n=>{const i=src.indexOf('function '+n+'(');return src.slice(i,src.indexOf('\n}\n',i)+2);};
eval(blk('_invEstado'));
const ult='2026-11-20T10:00:00';
const B=[
  {created_at:'2026-11-21T23:00:00',kg_reales:20},            // antes de vencer (vence 22/11 10:00)
  {created_at:'2026-11-23T01:21:00',kg_reales:21.5},          // turno noche, vencido
  {created_at:'2026-11-23T02:40:00',kg_reales:21.3},
  {created_at:'2026-11-23T03:45:00',kg_reales:21,anulada:true}// anulada: no cuenta
];
let e=_invEstado(ult,2,B,'2026-11-23T09:00:00');
A(e&&e.vencido&&e.dias===2,'a los 2 días con frecuencia 2 está vencido');
A(e.bobinas===2&&Math.abs(e.kg-42.8)<0.01,'cuenta sólo lo cargado desde que venció, sin anuladas ('+e.bobinas+' / '+e.kg+')');
e=_invEstado(ult,2,B,'2026-11-21T09:00:00');
A(!e.vencido&&e.bobinas===0,'antes de vencer: no hay alerta');
A(_invEstado(null,2,B)===null,'sin inventario registrado: null');
// la carga de bobinas ya no tiene el return por inventario vencido
const g=blk('_guardarBobinaInner');
A(g.length>100&&!/inventario_bloquea/.test(g)&&!/Inventario de MP vencido/.test(g),'_guardarBobinaInner no bloquea por inventario');
A(!/La carga de bobinas está bloqueada hasta completar el inventario/.test(src),'no queda el texto del bloqueo');
console.log(f?('FALLÓ '+f):'OK inventario_no_bloquea');process.exit(f?1:0);
