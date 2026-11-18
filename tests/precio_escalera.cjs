// 22a: escalera de precios (piso / equilibrio / objetivo) y blindaje de la lista asignada
const fs=require('fs');const src=fs.readFileSync(process.argv[2],'utf8');let n=0;const A=(c,t)=>{if(!c){console.error('✗ '+t);process.exit(1);}n++;};
const ev=eval('('+src.match(/function _precioEvalCon\(std,pk,R\)\{[\s\S]*?\n\}/)[0]+')');
const R={pisoPct:20,estKg:862,gan:300};
let e=ev(2000,0,R);A(Math.abs(e.piso-2500)<1e-6&&e.eq===2862&&e.obj===3162&&!e.col,'líneas: piso = std/(1-20 %), equilibrio = std+estructura, objetivo = +ganancia');
A(ev(2000,2400,R).col==='rojo','debajo del piso → rojo');A(ev(2000,2600,R).col==='naranja','arriba del piso, debajo del pleno → naranja');
A(ev(2000,3000,R).col==='amarillo','cubre el pleno, debajo del objetivo → amarillo');A(ev(2000,3162,R).col==='verde'&&ev(2000,3500,R).col==='verde','en el objetivo o arriba → verde');
e=ev(2000,2500,R);A(e.col==='naranja'&&Math.abs(e.mStd-20)<1e-9,'justo en el piso no es rojo; margen s/estándar = 20 %');
A(Math.abs(ev(2000,4000,R).mEq-(1-2862/4000)*100)<1e-9,'margen s/pleno');
A(ev(2000,3000,{pisoPct:20,estKg:862,gan:null}).col==='verde','sin meta de resultado: cubrir el pleno es verde');
A(ev(2000,3000,{pisoPct:20,estKg:862,gan:-500}).obj===2862,'plan con pérdida: el objetivo no baja del equilibrio');
A(ev(0,3000,R)===null,'sin costo estándar no juzga');
// el criterio: la estructura se reparte sobre los kilos del plan
A(/estKg:kgPlan>0\?estMes\/kgPlan/.test(src),'estructura por kilo = estructura del mes ÷ kilos del plan');
A(/function _aumEstructuraKg\(\)\{\n  \/\/ 22a[^\n]*\n  try\{const r=_precioRefs\(\)/.test(src),'Aumentos usa la misma estructura que la escalera');
// blindaje de lista asignada
const g=src.match(/async function guardarListaCliente\(\)\{[\s\S]*?\n\}/)[0];
A(/_pcPreparar\(cambios/.test(g)&&/_pcRegistrar\(cambios,'manual lista asignada'/.test(g),'cambiar la lista confirma y deja historial');
A(/no tiene precios: el cliente quedaría sin precio/.test(g)&&g.indexOf('no tiene precios')<g.indexOf("sb.from('clientes').update"),'no deja asignar una lista vacía (antes de escribir)');
A(g.indexOf('_pcPreparar')<g.indexOf("sb.from('clientes').update"),'confirma antes de escribir');
A(/id="ecli-lista" disabled/.test(src),'la ficha del cliente no cambia la lista');
A(/\+_lpOpts\(cli\?\.lista_precio_id\|\|null\)/.test(src),'el desplegable no ofrece listas vacías');
const usable=eval('(()=>{const C={lista_items:[{lista_id:1,precio_paquete:5}],clientes:[{lista_precio_id:2}]};return '+src.match(/function _lpUsable\(l,selId\)\{.*\}/)[0]+'})()');
A(usable({id:1},null)&&usable({id:2},null)&&!usable({id:3},null)&&usable({id:3},3),'lista usable = con precios o con clientes, o la que ya tiene');
console.log('✓ precio_escalera '+n+' ok');
