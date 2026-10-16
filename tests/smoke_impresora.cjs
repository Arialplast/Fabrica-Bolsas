// smoke 16b — 🖨 impresora en el Panel corte: entrada/salida, rechazo de bobinas que no son para imprimir,
// control en la cortadora (impresa / imprimiendo / no escaneada), resumen de la tarjeta.
// uso: TZ=America/Argentina/Buenos_Aires node tests/smoke_impresora.cjs fabrica_bolsas_v6.html
const fs=require('fs');const src=fs.readFileSync(process.argv[2]||'fabrica_bolsas_v6.html','utf8');
const cut=(a,b)=>{const i=src.indexOf(a),j=src.indexOf(b,i);if(i<0||j<0)throw new Error('falta '+a);return src.slice(i,j);};
let ok=0,bad=0;const t=(c,m)=>{if(c)ok++;else{bad++;console.log('✗ '+m);}};
global.escapeHtml=x=>String(x==null?'':x);global._plcHora=s=>new Date(s).toTimeString().slice(0,5);
eval(cut('function _cvvHM(','\n')+';'+cut('function _cvvFH(','\n'));global._cvvHM=_cvvHM;global._cvvFH=_cvvFH;
eval(cut('function _pcorteHora(','function _pcorteCartelHtml'));global._pcorteHora=_pcorteHora;
eval(cut("const _BOB_OC_VIVA=","// 'propia'").replace('const _BOB_OC_VIVA=','global._BOB_OC_VIVA='));global._bobDuenaViva=_bobDuenaViva;
eval(cut('// ===== 🖨 IMPRESORA EN EL PANEL DE CORTE (16b) =====','// Arrancar una OC desde el panel').replace('const IMP=','global.IMP='));
global.C={productos:[{id:1,descripcion:'BOLSA RESIDUO GRANEL NEGRA IMPRESA 80X100'},{id:2,descripcion:'BOLSA CONSORCIO 60X90'}],
  ord_corte:[{id:58,numero_orden:'OC-1052958',cliente:'SOLBAYRES',estado:'En proceso',producto_id:1,orden_extrusion_id:500},
             {id:71,numero_orden:'OC-1052971',cliente:'GARCIA',estado:'Pendiente',producto_id:2,orden_extrusion_id:501}],ordenes:[]};
const BOB={1:{id:1,numero_bobina:'BOB-07100',orden_id:500,en_stock:true,metros_reales:'800'},2:{id:2,numero_bobina:'BOB-07101',orden_id:501,en_stock:true,metros_reales:'900'},
  3:{id:3,numero_bobina:'BOB-07102',orden_id:500,en_stock:false,metros_reales:'800'},4:{id:4,numero_bobina:'BOB-07103',orden_id:null,en_stock:true,metros_reales:'700'}};
let tabla=[],seq=0,fb=[],conf=true;
global.confirm=()=>conf;global._pcorteFeedback=(m,c,beep,cart)=>fb.push({m,beep,cart});global._pintarPanelCorte=()=>{};global._pcorteResolverOCobjetivo=()=>null;
global._traerQ=async b=>b().range(0,999);
global.sb={from(){let rows=null,op='sel',upd=null;const q={
  select(){return q;},neq(c,v){q.f=(q.f||[]).concat(r=>r[c]!==v);return q;},eq(c,v){q.f=(q.f||[]).concat(r=>r[c]===v);return q;},
  or(){return q;},order(){return q;},limit(){return q;},
  insert(f){if(tabla.some(r=>r.bobina_producida_id===f.bobina_producida_id&&r.estado!=='anulada'))return Promise.resolve({error:{code:'23505',message:'dup'}});
    tabla.push(Object.assign({id:++seq,created_at:new Date().toISOString()},f));return Promise.resolve({error:null});},
  update(u){op='upd';upd=u;return q;},
  _run(){const rs=tabla.filter(r=>(q.f||[]).every(f=>f(r)));if(op==='upd'){rs.forEach(r=>Object.assign(r,upd));return{error:null};}
    return{data:rs.map(r=>Object.assign({},r,{bobinas_producidas:BOB[r.bobina_producida_id],ordenes_corte:C.ord_corte.find(o=>o.id===r.orden_corte_id)||null})),error:null};},
  range(){return Promise.resolve(q._run());},then(a,b){return Promise.resolve(q._run()).then(a,b);}};return q;}};
(async()=>{
 t(_impEsImpresa(C.ord_corte[0])&&!_impEsImpresa(C.ord_corte[1]),'producto IMPRESA por descripción');
 global.window={_pcorteEmpleadoId:5,_pcorteOperario:'Guaraz',_pcorteImpresora:true};
 await _impEscanear(BOB[1]);
 t(tabla.length===1&&tabla[0].estado==='imprimiendo'&&tabla[0].orden_corte_id===58&&tabla[0].metros===800&&tabla[0].inicio,'entra: fila imprimiendo con OC, metros de extrusión e inicio');
 t(fb.pop().cart.titulo==='🖨 ENTRÓ A LA IMPRESORA','cartel de entrada');
 await _impEscanear(BOB[1]);
 t(tabla[0].estado==='impresa'&&tabla[0].fin,'2do escaneo: sale impresa');
 await _impEscanear(BOB[1]);
 t(tabla.length===1&&fb.pop().cart.titulo==='✕ YA SE IMPRIMIÓ','3er escaneo: ya se imprimió, no duplica');
 await _impEscanear(BOB[2]);
 t(tabla.length===1&&fb.pop().cart.titulo==='✕ NO ES PARA IMPRIMIR','bobina de producto sin impresión: rechazada');
 await _impEscanear(BOB[3]);
 t(tabla.length===1&&/no está en stock/.test(fb.pop().m),'bobina fuera de stock: rechazada');
 conf=false;await _impEscanear(BOB[4]);t(tabla.length===1,'sin OC y el operario dice que no: no se registra');
 conf=true;await _impEscanear(BOB[4]);t(tabla.length===2&&tabla[1].orden_corte_id===null,'sin OC y confirma: se registra sin OC');
 window._pcorteEmpleadoId=null;await _impEscanear(BOB[2]);t(/Elegí tu nombre/.test(fb.pop().m),'sin operario: no escanea');window._pcorteEmpleadoId=5;
 // cortadora
 t(await _impAntesDeCortar(BOB[1],C.ord_corte[0])===null,'cortadora: ya impresa → carga sin preguntar');
 t(await _impAntesDeCortar(BOB[2],C.ord_corte[1])===null,'cortadora: producto sin impresión → no aplica');
 const pre4=await _impAntesDeCortar(BOB[4],C.ord_corte[0]);t(pre4&&pre4.cerrar===2,'cortadora: estaba imprimiendo → se cierra al cargar');
 await _impDespuesDeCortar(pre4,BOB[4],C.ord_corte[0],5);t(tabla[1].estado==='impresa'&&/se cerró al cargarla/.test(tabla[1].observaciones),'cerrada al cargarla en corte');
 const B5={id:5,numero_bobina:'BOB-07104',orden_id:500,en_stock:true,metros_reales:'810'};BOB[5]=B5;
 conf=false;t(await _impAntesDeCortar(B5,C.ord_corte[0])===false,'no escaneada en impresora y dice que no está impresa → no carga');
 conf=true;const pre5=await _impAntesDeCortar(B5,C.ord_corte[0]);t(pre5&&pre5.declarar,'no escaneada y dice que sí → se declara');
 await _impDespuesDeCortar(pre5,B5,C.ord_corte[0],5);const r5=tabla.find(r=>r.bobina_producida_id===5);
 t(r5&&r5.estado==='impresa'&&r5.inicio===null&&r5.origen==='declarada_en_corte'&&r5.metros===810,'declarada: impresa sin inicio, origen declarada_en_corte');
 // resumen
 const ahora=new Date('2026-10-16T15:00:00-03:00').getTime();
 const rows=[{estado:'impresa',inicio:'2026-10-16T10:00:00-03:00',fin:'2026-10-16T10:40:00-03:00',metros:'800',bobinas_producidas:{en_stock:true}},
   {estado:'impresa',inicio:'2026-10-16T11:00:00-03:00',fin:'2026-10-16T11:20:00-03:00',metros:'400',bobinas_producidas:{en_stock:false}},
   {estado:'impresa',inicio:null,fin:'2026-10-16T12:00:00-03:00',metros:'700',bobinas_producidas:{en_stock:false}},
   {estado:'impresa',inicio:'2026-10-15T10:00:00-03:00',fin:'2026-10-15T10:30:00-03:00',metros:'900',bobinas_producidas:{en_stock:true}},
   {estado:'imprimiendo',inicio:'2026-10-16T14:30:00-03:00',fin:null,metros:'820',bobinas_producidas:{en_stock:true}}];
 const R=_impResumen(rows,ahora);
 t(R.hoy.length===3&&R.metrosHoy===1900,'hoy: 3 impresas, 1.900 m ('+R.metrosHoy+')');
 t(Math.round(R.minHoy)===60&&Math.round(R.mPorMin)===20,'velocidad sólo con entrada y salida: 1.200 m en 60 min = 20 m/min');
 t(R.sinEntrada===1,'1 sin escaneo de entrada');
 t(R.abiertas.length===1&&R.esperando.length===2&&R.metrosEsperando===1700,'1 en la impresora, 2 esperando corte (1.700 m)');
 // tarjeta
 IMP.rows=tabla.map(r=>Object.assign({},r,{bobinas_producidas:BOB[r.bobina_producida_id],ordenes_corte:C.ord_corte.find(o=>o.id===r.orden_corte_id)||null}));
 const h=_impTileHTML();t(/🖨 IMPRESORA/.test(h)&&/ESCANEANDO PARA LA IMPRESORA/.test(h)&&/Impresas esperando corte/.test(h),'tarjeta: se pinta');
 window._pcorteImpresora=false;t(/Escanear para imprimir/.test(_impTileHTML()),'tarjeta: botón para activar');
 console.log((bad?'FALLA':'OK')+' smoke_impresora: '+ok+' ok, '+bad+' mal');process.exit(bad?1:0);
})().catch(e=>{console.log('FALLA',e);process.exit(1);});
