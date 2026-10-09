// smoke 09h — Sala de planes: total por cliente (pura + render, sin DOM; datos inventados)
// uso: TZ=America/Argentina/Buenos_Aires node tests/smoke_total_cliente_planes.cjs fabrica_bolsas_v6.html
const fs=require('fs');const src=fs.readFileSync(process.argv[2]||'fabrica_bolsas_v6.html','utf8');
const a=src.indexOf('// ===== 👥 TOTAL POR CLIENTE EN LA SALA DE PLANES');const b=src.indexOf('function pcobVer(');
if(a<0||b<0||b<a){console.log('FALTA el bloque');process.exit(1);}
let ok=0,bad=0;const t=(c,m)=>{if(c)ok++;else{bad++;console.log('✗ '+m);}};
// ---- stubs ----
global.r2=v=>Math.round((+v||0)*100)/100;
global.escapeHtml=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;');
global.C={
  clientes:[{id:1,razon_social:'VEGA'},{id:2,razon_social:'LYME SA'},{id:3,razon_social:'GARCIA LEONARDO'}],
  facturas:[{id:10,cliente_id:2},{id:11,cliente_id:2}],
  rvs:[{id:20,cliente_id:1}],
  remitos:[{id:30,cliente_id:3}],
  pedidos:[{id:40,cliente_id:1},{id:41,cliente_id:null,cliente:'CLIENTE SUELTO'}],
  saldos_iniciales:[]
};
global.lcCliNombre=id=>{const c=C.clientes.find(x=>x.id===id);return c?c.razon_social:'Cliente';};
global.chCheques=()=>[{id:50,cliente_id:3}];
// progreso inventado por paso: id → {estado,cobrado}
const PR={c2:{estado:'parcial',cobrado:300},c3:{estado:'cumplido',cobrado:500},c4:{estado:'fallado',cobrado:0}};
global._pcobProgresoCobro=s=>{const x=PR[s.id];return x?{planeado:+s.monto,cobrado:x.cobrado,estado:x.estado,saldoAct:+s.monto-x.cobrado,auto:true}:null;};
global._plEstadoPaso=s=>{if(s.tipo==='cobro'){const p=_pcobProgresoCobro(s);if(p)return p.estado;}return s.estado==='hecho'?'cumplido':(s.estado||'pendiente');};
global._plPasosProblema=p=>[{s:{id:'c1'},motivo:'atrasado 3 días'},{s:{id:'c4'},motivo:'se cayó'}];
eval(src.slice(a,b).replace(/^const _PL_HINTS_REF=/m,'global._PL_HINTS_REF='));

// ---- parser de refs ----
t(_plCliNombreDeRef('Cobrar: Factura A 0001-00000022 · LYME SA ($1.000)')==='LYME SA','ref de factura');
t(_plCliNombreDeRef('Cobrar: 📦 Pedido PED-06016 · DAG SRL · a producir ($5)')==='DAG SRL','hint de pedido recortado');
t(_plCliNombreDeRef('Cobrar: 📦 REM-00508 entregado · falta facturar · VEGA ($9) [reemplazo]')==='VEGA','hint de remito + [reemplazo]');
t(_plCliNombreDeRef('Cobrar: algo sin cliente ($1)')==='','sin « · » no inventa');

// ---- pasos ----
const pasos=[
  {id:'o1',tipo:'objetivo',monto:9999,texto:'Cubrir: ARCA'},
  {id:'c1',tipo:'cobro',origen_tipo:'rv',origen_id:20,monto:1000,estado:'pendiente',texto:'Cobrar: RV 1 · VEGA ($1.000)'},
  {id:'c2',tipo:'cobro',origen_tipo:'factura',origen_id:10,monto:800,texto:'Cobrar: Factura · LYME SA ($800)'},
  {id:'c3',tipo:'cobro',origen_tipo:'factura',origen_id:11,monto:500,texto:'Cobrar: Factura · LYME SA ($500)'},
  {id:'c4',tipo:'cobro',origen_tipo:'remito',origen_id:30,monto:700,texto:'Cobrar: REM · GARCIA LEONARDO ($700)'},
  {id:'c5',tipo:'cobro',origen_tipo:'cheque',origen_id:50,monto:200,estado:'pendiente',texto:'Cobrar: Cheque · GARCIA LEONARDO ($200)'},
  {id:'c6',tipo:'cobro',origen_tipo:'pedido',origen_id:40,monto:400,estado:'pendiente',texto:'Cobrar: Pedido · VEGA · a producir ($400)'},
  {id:'c7',tipo:'cobro',origen_tipo:'pedido',origen_id:41,monto:150,estado:'pendiente',texto:'x'},
  {id:'c8',tipo:'cobro',origen_tipo:'factura',origen_id:999,monto:50,estado:'hecho',texto:'Cobrar: Factura vieja · LYME SA ($50)'},
  {id:'c9',tipo:'cambio_cheque',monto:333,texto:'Cambio'},
  {id:'c10',tipo:'uso_caja',monto:444,texto:'Caja'},
];
const atr=new Set(['c1','c4']);
const F=_plTotalesPorCliente(pasos,atr);
const by=n=>F.find(f=>f.nombre===n);
t(F.length===4,'4 clientes (VEGA, LYME, GARCIA, CLIENTE SUELTO): '+F.map(f=>f.nombre).join('|'));
const V=by('VEGA'),L=by('LYME SA'),G=by('GARCIA LEONARDO'),S=by('CLIENTE SUELTO');
t(V&&V.n===2&&V.planeado===1400&&V.cobrado===0&&V.falta===1400&&V.atrasados===1,'VEGA: RV + pedido, 1 atrasado');
t(L&&L.n===3&&L.planeado===1350&&L.cobrado===850&&L.falta===500,'LYME: parcial 300 + cumplido 500 + doc fuera de caché cobrado 50 (agrupado por nombre con el id)');
t(G&&G.n===2&&G.caido===700&&G.falta===200&&G.cobrado===0&&G.atrasados===0,'GARCIA: remito caído no suma a falta, ni cuenta como atrasado');
t(S&&S.planeado===150,'pedido sin cliente_id usa el nombre del pedido');
// invariantes de descomposición
const cob=pasos.filter(s=>s.tipo==='cobro');
const sum=k=>Math.round(F.reduce((s,f)=>s+f[k],0)*100)/100;
t(sum('planeado')===cob.reduce((s,x)=>s+x.monto,0),'Σ en el plan = Σ pasos de cobro (sin objetivo, cheque cambiado ni caja)');
t(sum('n')===cob.length,'Σ docs = pasos de cobro');
F.forEach(f=>t(Math.abs(f.planeado-(f.cobrado+f.falta+f.caido))<0.01,'planeado = cobrado + falta + caído para '+f.nombre));
t(F[0].falta>=F[1].falta&&F[1].falta>=F[2].falta,'ordenado por lo que falta cobrar');
t(_plTotalesPorCliente([],null).length===0,'plan sin cobros → vacío');

// ---- render ----
const html=_plTotCliHtml({pasos},false);
t(html.includes('TOTAL POR CLIENTE')&&html.includes('4 clientes'),'título con cantidad');
t(html.includes('VEGA')&&html.includes('⚠ 1 atrasado'),'marca atrasados');
t(html.includes('Caído'),'columna caído sólo si hay caídos');
t(!_plTotCliHtml({pasos:pasos.filter(s=>s.id!=='c4')},false).includes('Caído'),'sin caídos no hay columna');
t(_plTotCliHtml({pasos:[{tipo:'objetivo',monto:1}]},false)==='','sin cobros no pinta nada');
t(!_plTotCliHtml({pasos},true).includes('atrasado'),'plan cerrado no marca atrasados');

// ---- canasta del armador ----
const K=_plCanastaPorCliente([{tipo:'rv',id:20,cliente_id:1,ref:'RV · VEGA',saldo:1000},{tipo:'pedido',id:40,cliente_id:1,ref:'x',saldo:400},{tipo:'factura',id:10,cliente_id:2,ref:'F · LYME SA',saldo:800}],[{tipo:'factura',id:999,ref:'Factura vieja · LYME SA',monto:50}]);
t(K.length===2&&K[0].nombre==='VEGA'&&K[0].monto===1400&&K[0].n===2,'canasta: VEGA 1400 en 2 docs');
t(K[1].nombre==='LYME SA'&&K[1].monto===850,'canasta: extra fuera del flujo se suma a LYME por nombre');

// ---- enganches ----
t(src.includes("const _totCli=_plTotCliHtml(p,cerrado);"),'pcobVer pinta el total');
t(src.includes('_plCanastaPorCliente(seleccionados,PLW.recursosExtra)'),'armador paso 2 pinta la canasta');
t(src.includes('+tablaCli')&&src.includes('_plTotalesPorCliente(p.pasos,atrP)'),'la hoja impresa lleva la tabla');
console.log(ok+' ok · '+bad+' fallas');process.exit(bad?1:0);
