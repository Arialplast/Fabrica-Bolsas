// smoke 27b — planificador: mover a posición N dentro de una máquina (pura, sin DOM)
// uso: node tests/smoke_plan_compacto.cjs fabrica_bolsas_v6.html
const fs=require('fs');const src=fs.readFileSync(process.argv[2]||'fabrica_bolsas_v6.html','utf8');
const a=src.indexOf('function _planMoverAPos(');const b=src.indexOf('function planIrAPos(');
if(a<0||b<0){console.log('FALTA el bloque');process.exit(1);}
eval(src.slice(a,b));
let ok=0,bad=0;const t=(c,m)=>{if(c)ok++;else{bad++;console.log('✗ '+m);}};
// Global: 1..30. La máquina muestra un subconjunto (las otras corren en otra máquina).
const mk=()=>Array.from({length:30},(_,i)=>i+1);
const col=[2,4,6,8,10,12,14,16,18,20,22,24,26,28,30]; // 15 pendientes en esta máquina
// 1) Caso German: la de la posición 14 (con 1 en proceso: id 26 está en pos 14) → a la 2
let L=mk(),r=_planMoverAPos(L,col,1,26,2);
t(r.ok&&r.destPos===2,'sube a pos 2');
t(L.indexOf(26)===L.indexOf(2)-1,'queda justo antes de la que era 2ª (id 2)');
t(L.length===30&&new Set(L).size===30,'no pierde ni duplica órdenes');
// El orden de la columna recalculado por prioridad: 26 primero
const colDesp=col.slice().sort((x,y)=>L.indexOf(x)-L.indexOf(y));
t(colDesp[0]===26&&colDesp[1]===2,'en la columna queda 1ª pendiente = posición 2');
// Las órdenes de OTRAS máquinas conservan su orden relativo
const otras=L.filter(x=>!col.includes(x));t(otras.join()===mk().filter(x=>!col.includes(x)).join(),'otras máquinas intactas');
// 2) Bajar: id 2 (pos 2) → pos 5 (id 8 ocupa pos 5) → queda después de 8
L=mk();r=_planMoverAPos(L,col,1,2,5);
const c2=col.slice().sort((x,y)=>L.indexOf(x)-L.indexOf(y));
t(r.ok&&c2.indexOf(2)+2===5,'baja a pos 5');
// 3) Posición menor que las en proceso → primera pendiente
L=mk();r=_planMoverAPos(L,col,2,30,1);t(r.ok&&r.destPos===3,'pos 1 con 2 en proceso → queda en 3');
// 4) Posición más allá del final → última
L=mk();r=_planMoverAPos(L,col,0,2,99);const c4=col.slice().sort((x,y)=>L.indexOf(x)-L.indexOf(y));
t(r.ok&&c4[c4.length-1]===2&&L[L.length-1]===2,'99 → al final');
// 5) Misma posición → no toca
L=mk();r=_planMoverAPos(L,col,0,6,3);t(!r.ok&&L.join()===mk().join(),'misma posición: no cambia');
// 6) Id que no está en la máquina / posición inválida
L=mk();t(!_planMoverAPos(L,col,0,3,1).ok,'id ajeno rechazado');
t(!_planMoverAPos(L,col,0,6,NaN).ok&&!_planMoverAPos(L,col,0,6,0).ok,'posición inválida rechazada');
t(L.join()===mk().join(),'rechazos no mutan la lista');
// 7) Estructura del render: la tarjeta sigue teniendo draggable, flechas y el detalle envuelto
t(src.includes('<div class="plan-det">')&&src.includes("onclick=\"moverPlanGlobal(")&&src.includes('_planAplicarVista(tipo);'),'render intacto + vista aplicada');
t((src.match(/plan-(oe|oc)-vista-btn/g)||[]).length>=2,'botones de vista');
console.log(ok+' ok · '+bad+' fallas');process.exit(bad?1:0);
