// smoke 23a — el panel de corte escribe sobre la OC FRESCA de la base (OC-1052957 / OC-1053014)
// Caso real: la OC se cerró en la oficina y después la tablet (con la copia vieja) tocó «Terminó de cortar»
// → volvía a «Pendiente empaque», pisaba las observaciones del cierre y se podía cerrar dos veces (stock doble).
// uso: TZ=America/Argentina/Buenos_Aires node tests/smoke_oc_fresca.cjs fabrica_bolsas_v6.html
const fs=require('fs');const src=fs.readFileSync(process.argv[2]||'fabrica_bolsas_v6.html','utf8');
let ok=0,bad=0;const t=(c,m)=>{if(c)ok++;else{bad++;console.log('✗ '+m);}};
const grab=(a,b)=>{const i=src.indexOf(a),k=src.indexOf(b,i+1);if(i<0||k<0)throw new Error('no está '+a);return src.slice(i,k);};

// «base» simulada: una fila de ordenes_corte; el update respeta los filtros eq/neq/is
let DB=null,updates=[],fb=[],toasts=[];
function q(kind,payload){
  const f=[];const qq={
    eq:(c,v)=>{f.push(r=>r[c]===v);return qq;},neq:(c,v)=>{f.push(r=>r[c]!==v);return qq;},
    is:(c,v)=>{f.push(r=>r[c]===v);return qq;},in:(c,v)=>{f.push(r=>v.includes(r[c]));return qq;},
    select:()=>qq,single:()=>qq,
    then:(res,rej)=>Promise.resolve().then(()=>{
      const hit=DB&&f.every(fn=>fn(DB));
      if(kind==='select')return{data:hit?Object.assign({},DB):null,error:hit?null:{message:'no row'}};
      if(!hit)return{data:[],error:null};
      updates.push(payload);Object.assign(DB,payload);return{data:[{id:DB.id}],error:null};
    }).then(res,rej)};
  return qq;
}
global.sb={from:()=>({select:()=>q('select'),update:o=>q('update',o)})};
global.C={ord_corte:[],maq_corte:[]};global.window={};
global.localDate=()=>'2026-10-23';global.localTime=()=>'16:30:00';global.fmtHora=()=>'16:30';
global.reload=async()=>{};global._pintarPanelCorte=()=>{};global.confirm=()=>true;global.setTimeout=()=>{};
global._pcorteFeedback=(m)=>fb.push(m);global.toast=(m)=>toasts.push(m);
global.document={getElementById:()=>null,body:{insertAdjacentHTML:()=>{}}};
global.escapeHtml=x=>String(x);global.extraerNumeroOCdeEscaneo=x=>x;global.congelarBaselineCorte=async()=>{};
global.pedirAdminYEjecutar=()=>{throw new Error('no debía llegar al admin');};

eval(grab('async function _ocFresca','// ===== FIN 🔒 OC FRESCA'));
eval(grab('async function _pcorteIniciarOC','\n// Pausar: vuelve a Pendiente'));
eval(grab('async function _pcorteConfirmarPausa','\n// 20e — OC-1052980'));
eval(grab('async function _pcorteTerminoTodo','\nfunction calcPrecioCorte'));
eval(grab('async function cerrarOrdenCorte','\nfunction checkQRTarget'));

const OBS_CIERRE='[Iniciada en panel 2026-10-19 10:36 por CELIA]\nControl de golpes: 28.000 bolsas OK';
const fila=(estado,extra)=>Object.assign({id:989,numero_orden:'OC-1052957',estado,observaciones:OBS_CIERRE,fecha_completada:null},extra||{});

(async()=>{
  // 1) el caso del 19/10: tablet dice En proceso, la base ya está Completada
  DB=fila('Completada',{fecha_completada:'2026-10-19T18:26:20Z'});
  C.ord_corte=[{id:989,numero_orden:'OC-1052957',estado:'En proceso',observaciones:'[Iniciada en panel 2026-10-19 10:36 por CELIA]'}];
  updates=[];fb=[];
  await _pcorteTerminoTodo(989);
  t(updates.length===0,'cerrada en la base → «Terminó de cortar» no escribe');
  t(DB.estado==='Completada'&&DB.observaciones===OBS_CIERRE,'sigue Completada y con las observaciones del cierre');
  t(/ya está «Completada»/.test(fb.join()),'avisa en la tablet: '+fb.join(' | '));

  // 2) camino normal: en la base sigue En proceso → pasa a Pendiente empaque, marca sobre lo de la BASE
  DB=fila('En proceso',{observaciones:'[Iniciada en panel 2026-10-23 08:00 por CELIA] [📏 Bolsa medida 2026-10-23 09:00 por GUARAZ: 67 cm]'});
  C.ord_corte=[{id:989,numero_orden:'OC-1052957',estado:'En proceso',observaciones:'[Iniciada en panel 2026-10-23 08:00 por CELIA]'}];
  updates=[];fb=[];
  await _pcorteTerminoTodo(989);
  t(DB.estado==='Pendiente empaque','En proceso → Pendiente empaque');
  t(/Bolsa medida/.test(DB.observaciones)&&/\[Corte terminado en panel 2026-10-23 16:30/.test(DB.observaciones),'agrega la marca a lo que hay en la base (no pisa la medida): '+DB.observaciones);
  t(C.ord_corte[0].estado==='Pendiente empaque'&&C.ord_corte[0].observaciones===DB.observaciones,'la copia local queda igual a la base');

  // 3) pausar una OC que en la base ya está Completada
  DB=fila('Completada',{fecha_completada:'2026-10-22T17:19:36Z'});
  C.ord_corte=[{id:989,numero_orden:'OC-1052957',estado:'En proceso',observaciones:''}];
  updates=[];fb=[];
  await _pcorteConfirmarPausa(989,'Sin bobinas');
  t(updates.length===0&&DB.estado==='Completada','pausar no toca una OC cerrada');

  // 4) escanear el QR de una OC que la tablet ve Pendiente pero ya se cerró
  window._pcorteOperario='CELIA';
  C.ord_corte=[{id:989,numero_orden:'OC-1052957',estado:'Pendiente',observaciones:''}];
  updates=[];fb=[];
  await _pcorteIniciarOC('OC-1052957');
  t(updates.length===0&&DB.estado==='Completada','iniciar no reabre una OC cerrada');

  // 5) iniciar normal (base Pendiente)
  DB=fila('Pendiente',{observaciones:'Generada desde pedido PED-06098'});
  C.ord_corte=[{id:989,numero_orden:'OC-1052957',estado:'Pendiente',observaciones:''}];
  updates=[];
  await _pcorteIniciarOC('OC-1052957');
  t(DB.estado==='En proceso'&&/^Generada desde pedido PED-06098 \[Iniciada en panel 2026-10-23 16:30 por CELIA\]$/.test(DB.observaciones),'Pendiente → En proceso con la marca: '+DB.observaciones);

  // 6) _ocAnotar: si el estado cambió entre la lectura y la escritura, no escribe
  DB=fila('En proceso');
  const r0=await (async()=>{const real=global.sb.from;let n=0;
    global.sb={from:()=>({select:()=>q('select'),update:o=>{DB.estado='Completada';return q('update',o);}})};
    const r=await _ocAnotar(989,'[X]',{estado:'Pendiente empaque'},['En proceso']);
    global.sb={from:real};return r;})();
  t(r0.ok===false&&DB.estado==='Completada'&&!/\[X\]/.test(DB.observaciones),'carrera: cambió a Completada en el medio → no escribe');

  // 7) cierre en la oficina: la pantalla ve «Pendiente empaque» (revertida) pero la base tiene fecha_completada
  DB=fila('Pendiente empaque',{fecha_completada:'2026-10-19T18:26:20Z'});
  C.ord_corte=[{id:989,numero_orden:'OC-1052957',estado:'Pendiente empaque',observaciones:''}];
  updates=[];toasts=[];
  await cerrarOrdenCorte(989);
  t(updates.length===0,'no se vuelve a cerrar (no llega al admin ni al stock)');
  t(/ya se cerró el/.test(toasts.join())&&/duplicaría el stock/.test(toasts.join()),'avisa: '+toasts.join(' | '));

  // 8) la pantalla la ve abierta pero en la base ya está Completada
  DB=fila('Completada',{fecha_completada:'2026-10-23T12:00:00Z'});
  C.ord_corte=[{id:989,numero_orden:'OC-1052957',estado:'En proceso',observaciones:''}];
  toasts=[];
  await cerrarOrdenCorte(989);
  t(C.ord_corte[0].estado==='Completada'&&toasts.length===1,'la copia local se corrige a Completada');

  // 9) el update del cierre es atómico (filtros en la base)
  const cierre=grab('async function cerrarOrdenCorte','\nfunction checkQRTarget');
  t(/\.neq\('estado','Completada'\)\.is\('fecha_completada',null\)\.select\('id'\)/.test(cierre)&&/_updCierre\.length/.test(cierre),'update del cierre condicionado + chequea filas');

  console.log((bad?'FALLAN '+bad:'OK')+' smoke_oc_fresca: '+ok+' ok, '+bad+' mal');process.exit(bad?1:0);
})().catch(e=>{console.log('✗ excepción',e);process.exit(1);});
