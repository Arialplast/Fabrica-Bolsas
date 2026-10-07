// 07p — Cambiar una línea de bolsa a «por kilo» (PED-06106) y candado de confirmación.
// Uso: TZ=America/Argentina/Buenos_Aires node tests/smoke_granel_cambio_producto.cjs fabrica_bolsas_v6.html
const fs=require('fs');
const src=fs.readFileSync(process.argv[2]||'fabrica_bolsas_v6.html','utf8');
let ok=0,fail=0;
const t=(n,c)=>{if(c){ok++;}else{fail++;console.log('✗ '+n);}};
function bloque(ini,fin){const a=src.indexOf(ini);const b=src.indexOf(fin,a+ini.length);if(a<0||b<0)throw new Error('no encontré '+ini);return src.slice(a,b);}

global.C={
  productos:[
    {id:48,codigo:'00309',descripcion:'BOBINA RESIDUO GRANEL CARAMELO',es_bobina_granel:true,bobina_id:152,empaque_id:2,merma_pct:3},
    {id:126,codigo:'00493',descripcion:'BOLSA RESIDUO GRANEL ROJA',es_bobina_granel:false,bobina_id:91,empaque_id:2,paquetes_por_bolson:500,merma_pct:3},
    {id:200,codigo:'00999',descripcion:'OTRA BOBINA POR KG',es_bobina_granel:true,bobina_id:153,empaque_id:2,merma_pct:4},
  ],
  emp:[{id:2,unidades:1}],maq_corte:[{id:1,en_servicio:true}],
};
global.document={getElementById:()=>({style:{},innerHTML:'',value:''})};
global.sb={from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{valor:100}})})})})};
global.getPaqBolsonAplicable=(pid)=>({paq:500,esEspecial:false,defecto:500});
global.renderOrdenesNP=()=>{};
global._pedLineas=[];global._pedOrdenes=[];

// generarOrdenesCorte usa _pedLineas/_pedOrdenes como globales (let top-level → global en el test)
let gen=bloque('async function generarOrdenesCorte(){','// ===== TANDAS DE PRODUCCIÓN POR LÍNEA =====');
eval(gen.replace('async function generarOrdenesCorte(){','global.generarOrdenesCorte=async function(){'));
let cand=bloque('// ===== 07p: CANDADO','// ─── Camino B');
eval(cand.replace(/function (_\w+)\(/g,'global.$1=function('));

(async()=>{
  // 1) Línea cargada como bolsa 00493
  _pedLineas=[{id:1,producto_id:126,cantidad:450}];
  await generarOrdenesCorte();
  t('bolsa: 1 orden',_pedOrdenes.length===1);
  t('bolsa: genOE false por defecto',_pedOrdenes[0].genOE===false);
  t('bolsa: con número de OC',!!_pedOrdenes[0].numero_orden);
  // 2) Se cambia a 00309 (por kilo) — el caso PED-06106
  _pedLineas[0].producto_id=48;
  await generarOrdenesCorte();
  const o=_pedOrdenes[0];
  t('granel: sigue habiendo 1 orden',_pedOrdenes.length===1);
  t('granel: producto de la línea (48)',o.producto_id===48);
  t('granel: OE tildada',o.genOE===true);
  t('granel: sin número de OC',o.numero_orden===null);
  t('granel: sin máquinas de corte',o.maquinas.length===0);
  t('granel: esGranel',o.esGranel===true);
  // 3) Granel → otro granel
  _pedLineas[0].producto_id=200;
  await generarOrdenesCorte();
  t('granel→granel: producto 200',_pedOrdenes[0].producto_id===200);
  t('granel→granel: merma de la ficha nueva',_pedOrdenes[0].merma===4);
  t('granel→granel: OE tildada',_pedOrdenes[0].genOE===true);
  // 4) Granel → bolsa
  _pedLineas[0].producto_id=126;
  await generarOrdenesCorte();
  t('granel→bolsa: producto 126',_pedOrdenes[0].producto_id===126);
  t('granel→bolsa: ya no es granel',!_pedOrdenes[0].esGranel);
  t('granel→bolsa: con número de OC',!!_pedOrdenes[0].numero_orden);
  t('granel→bolsa: con máquina de corte',_pedOrdenes[0].maquinas.length===1);
  t('granel→bolsa: bolsones calculados',_pedOrdenes[0].bolsones===1);
  // 5) Granel → granel con plan viejo (oExist granel pero producto viejo y genOE false): el plan real de PED-06106
  _pedOrdenes=[{linea_id:1,producto_id:126,esGranel:true,genOE:false,cantidad:450,maquinas:[],numero_orden:null}];
  _pedLineas=[{id:1,producto_id:48,cantidad:450}];
  await generarOrdenesCorte();
  t('plan PED-06106: toma producto 48',_pedOrdenes[0].producto_id===48);
  t('plan PED-06106: OE tildada',_pedOrdenes[0].genOE===true);

  // Candado de confirmación con el plan guardado REAL de PED-06106
  const planReal={meta:{lineas:[{tmpId:1,cantidad:450,producto_id:48}]},
    ordenes:[{genOE:false,esGranel:true,linea_id:1,producto_id:126,confirmar:true,numero_orden:null}]};
  const d=_planDesalineado(planReal);
  t('candado: detecta el desalineo',d.length===1&&d[0].lineaProd===48);
  const msg=_planDesalineadoMsg(d);
  t('candado: mensaje nombra los dos códigos',msg.includes('00309')&&msg.includes('00493'));
  t('candado: plan sano pasa',_planDesalineado({meta:{lineas:[{tmpId:1,producto_id:48}]},ordenes:[{linea_id:1,producto_id:48,confirmar:true}]}).length===0);
  t('candado: ids como texto no dan falso positivo',_planDesalineado({meta:{lineas:[{tmpId:1,producto_id:'48'}]},ordenes:[{linea_id:1,producto_id:48,confirmar:true}]}).length===0);
  t('candado: orden sin confirmar no cuenta',_planDesalineado({meta:{lineas:[{tmpId:1,producto_id:48}]},ordenes:[{linea_id:1,producto_id:126,confirmar:false}]}).length===0);
  t('candado: plan sin meta no rompe',_planDesalineado({ordenes:[{linea_id:1,producto_id:126,confirmar:true}]}).length===0);
  t('aviso granel sin OE',_planGranelSinOE({ordenes:[{linea_id:1,producto_id:48,confirmar:true,genOE:false}]}).length===1);
  t('aviso: granel con OE no avisa',_planGranelSinOE({ordenes:[{linea_id:1,producto_id:48,confirmar:true,genOE:true}]}).length===0);
  t('aviso: bolsa sin OE no avisa',_planGranelSinOE({ordenes:[{linea_id:1,producto_id:126,confirmar:true,genOE:false}]}).length===0);

  console.log((fail?'✗ ':'✓ ')+ok+' OK · '+fail+' fallaron');
  process.exit(fail?1:0);
})();
