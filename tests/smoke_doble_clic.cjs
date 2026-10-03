// smoke 03a — candado anti doble clic en carga de bobinas
// uso: node tests/smoke_doble_clic.cjs fabrica_bolsas_v6.html
const fs=require('fs');const src=fs.readFileSync(process.argv[2]||'fabrica_bolsas_v6.html','utf8');
const a=src.indexOf('// ===== 🔒 CANDADO ANTI DOBLE CLIC');const b=src.indexOf('async function _guardarBobinaInner(');
if(a<0||b<0){console.log('FALTA el bloque');process.exit(1);}
let ok=0,bad=0;const t=(c,m)=>{if(c)ok++;else{bad++;console.log('✗ '+m);}};
const btn={disabled:false,style:{},dataset:{},textContent:'Registrar bobina'};
global.document={querySelectorAll:()=>[btn]};
let inner=0,db=0,soltar=null;
global._guardarBobinaInner=async()=>{inner++;await _guardarBobinaDB(1,2);};
global._guardarBobinaDBInner=async()=>{db++;await new Promise(r=>{soltar=r;});};
eval(src.slice(a,b).replace(/let _gbLock=false,_gbDBLock=false;/,'_gbLock=false;_gbDBLock=false;'));
(async()=>{
  const p1=guardarBobina();const p2=guardarBobina();const p3=guardarBobina();
  await new Promise(r=>setTimeout(r,5));
  t(inner===1&&db===1,'3 clics seguidos → un solo guardado ('+inner+'/'+db+')');
  t(btn.disabled===true&&btn.textContent==='Guardando…','botón bloqueado mientras guarda');
  const p4=_guardarBobinaDB(1,2);await new Promise(r=>setTimeout(r,5));
  t(db===1,'el modal de excedente tampoco puede grabar en paralelo');
  soltar();await Promise.all([p1,p2,p3,p4]);
  t(btn.disabled===false&&btn.textContent==='Registrar bobina','botón liberado al terminar');
  // la siguiente bobina se puede cargar
  const p5=guardarBobina();await new Promise(r=>setTimeout(r,5));t(db===2,'la bobina siguiente se graba normal');soltar();await p5;
  // un error no deja el candado trabado
  global._guardarBobinaDBInner=async()=>{throw new Error('red');};
  try{await guardarBobina();}catch(e){}
  t(!_gbLock&&!_gbDBLock&&btn.disabled===false,'un error no deja el botón trabado');
  // _gbEsDuplicada (pura)
  const ahora=Date.parse('2026-10-03T05:11:04.188Z');
  const prev=[{numero_bobina:'BOB-06481',orden_id:5,extrusora_id:7,metros_reales:'1000.00',kg_reales:'48.00',created_at:'2026-10-03T05:11:03.366Z',anulada:false}];
  t(_gbEsDuplicada(prev,5,7,1000,48,ahora,90000)?.numero_bobina==='BOB-06481','caso real 06481/82 → duplicada');
  t(!_gbEsDuplicada(prev,5,7,1000,48.2,ahora,90000),'otros kg → no es duplicada');
  t(!_gbEsDuplicada(prev,5,3,1000,48,ahora,90000),'otra extrusora en la misma OE → no es duplicada');
  t(!_gbEsDuplicada(prev,6,7,1000,48,ahora,90000),'otra OE → no es duplicada');
  t(!_gbEsDuplicada(prev,5,7,1000,48,ahora+120000,90000),'pasados 90 s → no es duplicada');
  t(!_gbEsDuplicada([Object.assign({},prev[0],{anulada:true})],5,7,1000,48,ahora,90000),'la anulada no cuenta');
  t(src.includes('.eq(\'orden_id\',ordId).eq(\'extrusora_id\',extId).gte(\'created_at\',desde)'),'consulta a la base antes del insert');
  t(!/nuevoDisp=r3\(\(lote\?\.kg_disponibles/.test(src),'anular bobina ya no suma kg a mano (lo hace el trigger)');
  console.log(ok+' ok · '+bad+' fallas');process.exit(bad?1:0);
})();
