// Smoke 05b — de quién es la bobina + origen de la carga.
// Uso: TZ=America/Argentina/Buenos_Aires node tests/smoke_bob_duena.cjs fabrica_bolsas_v6.html
// Caso real 05/10: BOB-05319 (OE 740 = ORD-06178, de OC-1052795 GRUPO ENSER, Pendiente)
// cargada a OC-1052870 BIGVEF (OE 816). Sobrantes de AGUACA: OE 839, su OC-1052893 Completada.
const fs=require('fs');
const src=fs.readFileSync(process.argv[2]||'fabrica_bolsas_v6.html','utf8');
let pass=0,fail=0;const ok=(c,m)=>{if(c)pass++;else{fail++;console.log('✗ '+m);}};
const a=src.indexOf('// ===== 🔖 DE QUIÉN ES LA BOBINA'),b=src.indexOf('// === Set de bobinas seleccionadas');
ok(a>0&&b>a,'bloque presente');
global.window=global;
global.C={ordenes:[{id:740,numero_orden:'ORD-06178'},{id:839,numero_orden:'ORD-06277'},{id:816,numero_orden:'ORD-06254'}],
 ord_corte:[
  {id:827,numero_orden:'OC-1052795',cliente:'GRUPO ENSER',estado:'Pendiente',orden_extrusion_id:740},
  {id:925,numero_orden:'OC-1052893',cliente:'AGUACA MANA SA',estado:'Completada',orden_extrusion_id:839},
  {id:902,numero_orden:'OC-1052870',cliente:'BIGVEF SRL',estado:'En proceso',orden_extrusion_id:816},
  {id:950,numero_orden:'OC-X',cliente:'RESERVANTE',estado:'En proceso',orden_extrusion_id:999}]};
let inserts=[];
global.sb={from:()=>({insert:async rows=>{inserts.push(rows);const arr=Array.isArray(rows)?rows:[rows];
  if(global._sinCol&&arr.some(r=>'origen' in r))return {error:{code:'PGRST204',message:"Could not find the 'origen' column"}};return {error:null};}})};
(0,eval)(src.slice(a,b).replace(/^const _BOB_OC_VIVA/m,'var _BOB_OC_VIVA'));
const oc=C.ord_corte[2];
const b5319={id:5382,numero_bobina:'BOB-05319',orden_id:740,metros_reales:1000};
const b6327={id:1,numero_bobina:'BOB-06327',orden_id:839,metros_reales:1150};
const bPropia={id:2,numero_bobina:'BOB-063xx',orden_id:816};
const bLibre={id:3,numero_bobina:'BOB-LIB',orden_id:null};
ok(_bobOrigenClase(b5319,oc)==='duena','5319 → dueña viva');
ok(_bobDuenaViva(b5319,oc).numero_orden==='OC-1052795','dueña = OC-1052795');
ok(_bobOrigenClase(b6327,oc)==='sobrante','sobrante de AGUACA no pregunta');
ok(_bobOrigenClase(bPropia,oc)==='propia','de su propia OE');
ok(_bobOrigenClase(bLibre,oc)==='libre','stock libre');
const t=_bobAvisoDuena(b5319,oc);
ok(/GRUPO ENSER/.test(t)&&/OC-1052795/.test(t)&&/1\.000 m/.test(t)&&/BIGVEF/.test(t),'el aviso nombra al cliente, la OC y los metros');
ok(_bobAvisoDuena(b6327,oc)==='','sobrante sin aviso');
// estados: Pendiente empaque / Completada / Cancelada ya no son dueñas
['Pendiente empaque','Completada','Cancelada'].forEach(e=>{C.ord_corte[0].estado=e;ok(_bobOrigenClase(b5319,oc)==='sobrante','dueña en '+e+' → sobrante');});
['Suspendida','En proceso'].forEach(e=>{C.ord_corte[0].estado=e;ok(_bobOrigenClase(b5319,oc)==='duena','dueña en '+e+' → sigue siendo dueña');});
C.ord_corte[0].estado='Pendiente';
// reserva manual desde el Balance manda
const bRes={id:4,numero_bobina:'BOB-R',orden_id:null,reservada_oc_id:950};
ok(_bobOrigenClase(bRes,oc)==='duena'&&_bobDuenaViva(bRes,oc).cliente==='RESERVANTE','reservada a otra OC viva → dueña');
ok(_bobOrigenClase({...bRes,reservada_oc_id:902},oc)==='libre','reservada a esta misma OC → no es ajena');
// la propia OC de la OE no se cuenta como dueña ajena
ok(_bobDuenaViva({id:5,orden_id:816},oc)===null,'su propia OC no es dueña ajena');
// insert con origen y fallback sin la columna
(async()=>{
  await _ocbInsert({orden_corte_id:902,bobina_producida_id:5382,origen:'boton'});
  ok(inserts.length===1&&inserts[0].origen==='boton','graba origen');
  global._sinCol=true;inserts=[];
  const r=await _ocbInsert([{orden_corte_id:902,bobina_producida_id:1,origen:'pistola'}]);
  ok(!r.error&&inserts.length===2&&!('origen' in inserts[1][0]),'sin la columna reintenta sin origen');
  // los caminos reales pasan el origen
  ok(/onclick="_pcorteCargarBobina\('\+oc\.id\+','\+b\.id\+','\+\(maqId\|\|'null'\)\+',\\'boton\\'\)"/.test(src),'botón «+ Cargar» manda boton');
  ok(src.includes("await _pcorteCargarBobina(ocId,b.id,undefined,'pistola');"),'escaneo del panel manda pistola');
  ok(src.includes("window._confBobOrigen[b.id]='pistola'")&&src.includes("window._confBobOrigen[id]='lista'")&&src.includes("window._confBobOrigen[b.id]='qr'"),'Confección marca pistola / lista / qr');
  ok(src.includes("origen:window._confBobOrigen[b.id]||'lista'"),'Confección graba el origen');
  ok((src.match(/sb\.from\('orden_corte_bobinas'\)\.insert\(/g)||[]).length===2,'solo quedan los 2 inserts dentro de _ocbInsert');
  ok(src.includes("_bobOrigenClase(b,oc)!=='sobrante'"),'Confección no pregunta por sobrantes');
  ok(src.includes("if(_cls==='duena'){")&&src.includes('confirm(_bobAvisoDuena(b,oc))'),'panel: aviso rojo para dueña viva');
  console.log((fail?'✗ ':'✓ ')+pass+' ok, '+fail+' fallas');process.exit(fail?1:0);
})();
