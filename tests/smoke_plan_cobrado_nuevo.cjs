// smoke 14a — Sala de planes: «ya cobrado» = sólo plata que entró DESPUÉS de armar el plan.
// Caso real: plan 22 (armado 09/10). QUILPLAST figuraba con $1.037.821,30 cobrados porque
// el 13/10 se reimputó un recibo del 30/09 (RECI-000185) a sus RV.
// uso: node tests/smoke_plan_cobrado_nuevo.cjs fabrica_bolsas_v6.html
const fs=require('fs'),path=require('path');
const src=fs.readFileSync(process.argv[2]||'fabrica_bolsas_v6.html','utf8');
const fx=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures','plan22_20261014.json'),'utf8'));
let ok=0,bad=0;const t=(c,m)=>{if(c)ok++;else{bad++;console.log('✗ '+m);}};
const fn=name=>{const i=src.indexOf('function '+name+'(');if(i<0)throw new Error('falta '+name);let d=0,j=src.indexOf('{',i);for(let k=j;k<src.length;k++){if(src[k]==='{')d++;else if(src[k]==='}'){d--;if(!d)return src.slice(i,k+1);}}};
global.r2=n=>Math.round((parseFloat(n)||0)*100)/100;
global._ncTotalDe=()=>0;
global.lcCliNombre=id=>fx.clientes[String(id)]||('#'+id);
global.chCheques=()=>[];global._pcobProgresoCheque=()=>null;
const pend={413:1377130,415:5400000,416:2107820,418:1472800,419:1350000};
global._calcularCobroPedido=p=>({pendiente:pend[p.id]});
global.C={recibos:fx.recibos,rvs:fx.rvs,facturas:fx.facturas,compensaciones:[],pedidos:Object.keys(pend).map(id=>({id:+id,cliente:'x'})),planes_compra:[fx.plan]};
const nombres=['_aplicadoAFactura','_saldoFactura','_aplicadoARV','_saldoRV','_plPlanDePaso','_plCobradoNuevo','_plRepartoCobro','_pcobProgresoCobro','_plEstadoPaso','_plCliNombreDeRef','_plCliDeOrigen','_plCliDePaso','_plTotalesPorCliente'];
let code='';for(const n of nombres){try{code+=fn(n)+'\n';}catch(e){if(n==='_aplicadoAFactura')continue;throw e;}}
global._PL_HINTS_REF=[' · falta OC',' · a producir',' · falta facturar',' · factura al cerrar el pedido'];
if(!/function _aplicadoAFactura\(/.test(code)){
  global._aplicadoAFactura=id=>{let s=0;C.recibos.forEach(r=>{if(r.estado==='anulado')return;(r.recibo_facturas||[]).forEach(a=>{if(a.factura_id===id)s+=a.monto_aplicado;});});return s;};
}
eval(code.replace(/^function (\w+)\(/gm,'global.$1=function('));
const P=fx.plan,pa=id=>P.pasos.find(s=>s.id===id);

// --- QUILPLAST: el caso que lo originó
let pr=_pcobProgresoCobro(pa('c37'));
t(pr.cobrado===0&&pr.caido===376517.3&&pr.estado==='fallado','RV-000243: no entró plata nueva → caído 376.517,30 ('+JSON.stringify(pr)+')');
pr=_pcobProgresoCobro(pa('c36'));
t(pr.cobrado===0&&pr.caido===236430&&pr.estado==='fallado','RV-000246: caído 236.430');
pr=_pcobProgresoCobro(pa('c34'));
t(pr.cobrado===231657.65&&pr.caido===193216.35&&pr.saldoAct===0&&pr.estado==='parcial','RV-000260: cobrado 231.657,65 (RECI-000189 14/10) + caído 193.216,35');
// --- recibo del mismo día del plan sí cuenta; recibo backdateado pero viejo no
t(_pcobProgresoCobro(pa('c35')).estado==='cumplido','RV-000252: RECI-000179 (09/10, mismo día) cuenta como cobrado');
pr=_pcobProgresoCobro(pa('c29'));
t(pr.cobrado===4003665.28&&pr.saldoAct===265599.72&&pr.caido===0,'Vázquez: REC-000099 (fecha 02/09, cargado 01/10) no cuenta; falta 265.599,72');
pr=_pcobProgresoCobro(pa('c40'));
t(pr.estado==='cumplido'&&pr.cobrado===136229.08,'García RV-000225: sólo lo de RECI-000188');
pr=_pcobProgresoCobro(pa('c26'));
t(pr.estado==='fallado'&&pr.caido===2608.31,'Collinet 0001-00000041 anulada → caída');
pr=_pcobProgresoCobro(pa('c27'));
t(pr.cobrado===1718548&&pr.saldoAct===39098&&pr.estado==='parcial','Ente: cobró 1.718.548, falta 39.098');
// --- pedido: cuenta de siempre
t(_pcobProgresoCobro(pa('c44')).estado==='pendiente','pedido DAG sin cambios');
// --- sin plan identificable → comportamiento viejo
const suelto=JSON.parse(JSON.stringify(pa('c37')));
t(_pcobProgresoCobro(suelto).estado==='cumplido','paso suelto (sin plan) → cuenta vieja');
t(_pcobProgresoCobro(suelto,P).estado==='fallado','copia con plan explícito → cuenta nueva (cierre de plan)');

// --- totales por cliente: la suma cierra con lo planeado
const filas=_plTotalesPorCliente(P.pasos,new Set(),P);
const T=filas.reduce((a,f)=>({pl:r2(a.pl+f.planeado),co:r2(a.co+f.cobrado),fa:r2(a.fa+f.falta),ca:r2(a.ca+f.caido)}),{pl:0,co:0,fa:0,ca:0});
const q=filas.find(f=>/QUILPLAST/.test(f.nombre));
t(q&&q.cobrado===231657.65&&q.falta===0&&q.caido===806163.65,'Quilplast fila: cobrado 231.657,65 · caído 806.163,65 ('+JSON.stringify(q)+')');
t(T.pl===36835280.64,'planeado total 36.835.280,64 ('+T.pl+')');
t(T.co===19393902.54,'cobrado total 19.393.902,54 ('+T.co+')');
t(T.fa===16632606.14,'falta total 16.632.606,14 ('+T.fa+')');
t(T.ca===808771.96,'caído total 808.771,96 ('+T.ca+')');
t(r2(T.co+T.fa+T.ca)===T.pl,'cobrado+falta+caído = planeado');
// --- enganches
t(/_pcobProgresoCobro\(s,p\)\)?:null;/.test(src)||/_pcobProgresoCobro\(s,p\)/.test(src),'detalle/cierre/solidez pasan el plan');
t(/_plTotalesPorCliente\(p\.pasos,atrP,p\)/.test(src)&&/_plTotalesPorCliente\(p\.pasos,atr,p\)/.test(src),'pantalla e impresión pasan el plan');
console.log(ok+' ok · '+bad+' fallas');process.exit(bad?1:0);
