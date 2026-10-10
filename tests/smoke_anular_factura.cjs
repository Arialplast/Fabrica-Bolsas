// Smoke 10b — anular factura: sólo sin CAE y sin plata encima; con CAE, NC.
// Correr: TZ=America/Argentina/Buenos_Aires node tests/smoke_anular_factura.cjs fabrica_bolsas_v6.html
const fs=require('fs');const src=fs.readFileSync(process.argv[2]||'fabrica_bolsas_v6.html','utf8');
const cut=(a,b)=>{const i=src.indexOf(a),j=src.indexOf(b,i);if(i<0||j<0)throw new Error('no encontré '+a);return src.slice(i,j);};
global.r2=n=>Math.round((+n||0)*100)/100;
global.toastLog=[];global.toast=(m,c)=>toastLog.push([m,c]);
global.confirm=()=>true;
global.C={facturas:[],recibos:[],compensaciones:[],notas_credito:[],notas_debito:[],nc_aplicaciones:[]};
(0,eval)(cut('function _aplicadoAFactura(','// ============================================================'));
(0,eval)(cut('function _notasCreditoDe(','// Crédito de una NC todavía disponible'));
(0,eval)(cut('// ===== 🚫 ANULAR FACTURA','// =================================================================\n// ======= EDITAR FACTURA SIN CAE'));
let ok=0,mal=0;const t=(n,c)=>{if(c)ok++;else{mal++;console.log('✗',n);}};

// --- caso real: 0001-00000041, sin CAE, sin cobros ---
const f41={id:129,numero:'0001-00000041',estado:'pendiente',cae:null,cae_estado:null,total:2608.31};
C.facturas=[f41];
t('41 se puede anular',_facAnulable(f41).ok);
t('41 botón activo',_facAnularBtn(f41).includes('onclick="anularFactura(129)"'));

// --- con CAE: nunca ---
const fc={id:1,estado:'pendiente',cae:'76123456789012',cae_estado:'autorizado',total:1000};
t('con CAE no',!_facAnulable(fc).ok);
t('con CAE manda a NC',/nota de crédito/.test(_facAnulable(fc).motivo));
const bC=_facAnularBtn(fc);
t('con CAE botón apagado, no escondido',bC.includes('disabled')&&!bC.includes('onclick'));
t('con CAE title dice NC',bC.includes('NC'));
// con CAE aunque esté cobrada parcial o tenga estado raro
t('con CAE + cobrada parcial no',!_facAnulableDatos({estado:'parcial',cae:'1'},500,0,0).ok);

// --- emitida en Flexxus / procesando ---
t('Flexxus no',!_facAnulable({id:2,estado:'pendiente',cae:null,cae_estado:'externo'}).ok);
t('procesando no',/Verificar/.test(_facAnulable({id:3,estado:'pendiente',cae:null,cae_estado:'procesando'}).motivo));
t('rechazado sí (no existe en ARCA)',_facAnulable({id:4,estado:'pendiente',cae:null,cae_estado:'rechazado'}).ok);
t('prueba sí',_facAnulable({id:5,estado:'pendiente',cae:null,cae_estado:'prueba'}).ok);

// --- plata encima ---
C.recibos=[{estado:'emitido',recibo_facturas:[{factura_id:10,monto_aplicado:300}]},
           {estado:'anulado',recibo_facturas:[{factura_id:11,monto_aplicado:999}]}];
t('parcialmente cobrada no',!_facAnulable({id:10,estado:'parcial',cae:null}).ok);
t('motivo dice cobros',/cobros/.test(_facAnulable({id:10,estado:'parcial',cae:null}).motivo));
t('recibo anulado no cuenta',_facAnulable({id:11,estado:'pendiente',cae:null}).ok);
C.compensaciones=[{comp_aplicaciones:[{factura_id:12,monto_aplicado:50}]}];
t('compensación cuenta',!_facAnulable({id:12,estado:'parcial',cae:null}).ok);
// NC viva sin CAE sobre la factura: no (quedaría colgando); y no la cuenta como cobro
C.notas_credito=[{id:1,doc_tipo:'factura',doc_id:13,total:200,estado:'emitida'},{id:2,doc_tipo:'factura',doc_id:14,total:200,estado:'anulada'}];
const a13=_facAnulable({id:13,estado:'parcial',cae:null});
t('NC viva bloquea',!a13.ok&&/NC/.test(a13.motivo)&&!/cobros/.test(a13.motivo));
t('NC anulada no bloquea',_facAnulable({id:14,estado:'pendiente',cae:null}).ok);
C.notas_debito=[{id:1,doc_tipo:'factura',doc_id:15,anulada:false},{id:2,doc_tipo:'factura',doc_id:16,anulada:true}];
t('ND viva bloquea',/ND/.test(_facAnulable({id:15,estado:'pendiente',cae:null}).motivo));
t('ND anulada no bloquea',_facAnulable({id:16,estado:'pendiente',cae:null}).ok);
t('NC y ND juntas',/1 NC y 1 ND/.test(_facAnulableDatos({estado:'pendiente',cae:null},0,1,1).motivo));
t('redondeo: 0,005 cobrado no bloquea',_facAnulableDatos({estado:'pendiente',cae:null},0.005,0,0).ok);

// --- anulada: sin botón ---
t('anulada sin botón',_facAnularBtn({id:9,estado:'anulada'})==='');
t('motivo con comillas escapado',!_facAnularBtn({id:8,estado:'pendiente',cae:null,cae_estado:'procesando'}).includes('""'));

// --- anularFactura: la escritura (mock sb) ---
function mockSb(base){
  const log=[];
  const q=(tabla)=>{const st={tabla,op:'select',filt:[]};const p={
    select(){return p;},eq(k,v){st.filt.push([k,v]);return p;},in(k,v){st.filt.push([k,v]);return p;},is(k,v){st.filt.push(['is:'+k,v]);return p;},
    update(v){st.op='update';st.val=v;return p;},delete(){st.op='delete';return p;},
    maybeSingle(){return Promise.resolve(res());},
    then(r,j){return Promise.resolve(res()).then(r,j);}};
    function res(){log.push(st);return base(st);} return p;};
  return {from:q,log};
}
async function run(){
  const fBase={id:129,numero:'0001-00000041',estado:'pendiente',cae:null,cae_estado:null};
  // A) camino feliz: el orden es vínculos → remitos → factura, y la factura con candado cae=null
  global.sb=mockSb(st=>{
    if(st.tabla==='facturas'&&st.op==='select')return {data:fBase};
    if(st.tabla==='facturas'&&st.op==='update')return {data:[{id:129}]};
    if(st.tabla==='factura_lineas')return {data:[{id:501}]};
    return {data:[]};
  });
  global.pedirAdminYEjecutar=fn=>fn();global.reload=async()=>{};global.renderFacturas=()=>{};global.renderRemitosPendientes=()=>{};
  C.facturas=[{...fBase,total:2608.31}];C.recibos=[];C.compensaciones=[];C.notas_credito=[];C.notas_debito=[];
  toastLog.length=0;
  await anularFactura(129);await new Promise(r=>setTimeout(r,10));
  const w=sb.log.filter(s=>s.op!=='select').map(s=>s.op+':'+s.tabla);
  t('orden de escritura',JSON.stringify(w)===JSON.stringify(['delete:factura_linea_remitos','update:remitos','update:facturas']));
  const del=sb.log.find(s=>s.op==='delete');
  t('borra vínculos SOLO de sus renglones',JSON.stringify(del.filt)===JSON.stringify([['factura_linea_id',[501]]]));
  const uf=sb.log.find(s=>s.op==='update'&&s.tabla==='facturas');
  t('update con candado cae null',uf.filt.some(f=>f[0]==='is:cae'&&f[1]===null));
  t('toast verde',toastLog.some(x=>x[1]==='green'));

  // B) la caché dice sin CAE, pero en la base YA tiene CAE (otra pestaña): no escribe nada
  global.sb=mockSb(st=>{
    if(st.tabla==='facturas'&&st.op==='select')return {data:{...fBase,cae:'76000000000001'}};
    return {data:[]};
  });
  toastLog.length=0;
  await anularFactura(129);await new Promise(r=>setTimeout(r,10));
  t('base con CAE: cero escrituras',sb.log.filter(s=>s.op!=='select').length===0);
  t('base con CAE: avisa NC',toastLog.some(x=>/nota de crédito/.test(x[0])));

  // C) en la base tiene un recibo vivo: no escribe
  global.sb=mockSb(st=>{
    if(st.tabla==='facturas'&&st.op==='select')return {data:fBase};
    if(st.tabla==='recibo_facturas')return {data:[{monto_aplicado:1000,recibos:{estado:'emitido'}}]};
    return {data:[]};
  });
  await anularFactura(129);await new Promise(r=>setTimeout(r,10));
  t('cobro en base: cero escrituras',sb.log.filter(s=>s.op!=='select').length===0);

  // D) falla leer la base: no escribe (no se asume "está todo bien")
  global.sb=mockSb(st=>st.tabla==='notas_debito'?{error:{message:'timeout'}}:(st.tabla==='facturas'?{data:fBase}:{data:[]}));
  toastLog.length=0;
  await anularFactura(129);await new Promise(r=>setTimeout(r,10));
  t('error de lectura: cero escrituras',sb.log.filter(s=>s.op!=='select').length===0&&toastLog.some(x=>/verificar/.test(x[0])));

  // E) la caché ya dice CAE: ni pregunta ni toca la base
  C.facturas=[{...fBase,cae:'1'}];
  global.sb=mockSb(()=>({data:[]}));
  await anularFactura(129);
  t('caché con CAE: ni lee la base',sb.log.length===0);

  console.log((mal?'✗ ':'✓ ')+ok+' OK, '+mal+' fallas');process.exit(mal?1:0);
}
run();
