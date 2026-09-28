// Smoke test del build 2026-09-27a — Conteo físico con hora del conteo.
// Uso: node tests/smoke_conteo_hora.cjs [ruta_html]
const fs=require('fs');
const src=fs.readFileSync(process.argv[2]||'fabrica_bolsas_v6.html','utf8');
const a=src.indexOf('// ===== CONTEO FÍSICO DE BOLSAS');
const b=src.indexOf('// Reconstruir movimientos desde stock_bolsas');
if(a<0||b<0||b<a){console.error('no encuentro el bloque');process.exit(1);}
let bloque=src.slice(a,b)
  .replace(/^let _CF=\{\};/m,'globalThis._CF={};')
  .replace(/^let _cfAplicando=false;/m,'globalThis._cfAplicando=false;')
  .replace(/^let _cfLibro=/m,'globalThis._cfLibro=')
  .replace(/^let _cfLSCargado=false;/m,'globalThis._cfLSCargado=false;');

let pass=0,fail=0;
function ok(c,m){if(c){pass++;}else{fail++;console.log('✖',m);}}
function eq(x,y,m){ok(Math.abs(x-y)<1e-6,m+' (dio '+x+', esperaba '+y+')');}

// ---- stubs globales ----
globalThis.r2=x=>Math.round((x+Number.EPSILON)*100)/100;
globalThis.escapeHtml=s=>String(s);
globalThis.localDate=()=>'2026-09-28';
globalThis.lpGetKgPaq=()=>1;globalThis.lpGetCostoRealKg=()=>100;globalThis.lpGetCostoTeorico=()=>0;
globalThis._prodOrdenados=l=>l.slice();
const toasts=[];globalThis.toast=(m,c)=>toasts.push([m,c]);
globalThis.confirm=()=>true;let confirmTxt='';
globalThis.pedirAdminYEjecutar=fn=>{globalThis._pend=fn();};
async function aplicar(){await cfAplicar();await globalThis._pend;}
globalThis.reload=async()=>{};
const LS={};globalThis.localStorage={getItem:k=>LS[k]??null,setItem:(k,v)=>{LS[k]=String(v);}};
// DOM mínimo
const els={};
function el(id){return els[id]||(els[id]={id,value:'',innerHTML:'',checked:false});}
globalThis.document={getElementById:id=>els[id]||null,querySelectorAll:()=>[],querySelector:()=>null};
['cf-tbl','cf-resumen','cf-hora','cf-hora-info','cf-search','cf-todos'].forEach(el);

// ---- datos: productos y "base" ----
globalThis.C={productos:[{id:1,codigo:'A'},{id:2,codigo:'B'},{id:3,codigo:'C'},{id:4,codigo:'D'}],stock_bolsas:[]};
let DB={stock:[],mov:[]};const rpcs=[];
function q(tabla){
  const st={filtros:[]};
  const api={
    select(){return api;},in(c,v){st.filtros.push(r=>v.includes(r[c]));return api;},
    gt(c,v){st.filtros.push(r=>new Date(r[c]).getTime()>new Date(v).getTime());return api;},
    order(){return api;},
    range(d,h){const rows=(tabla==='stock_bolsas'?DB.stock:DB.mov).filter(r=>st.filtros.every(f=>f(r)));return Promise.resolve({data:rows.slice(d,h+1),error:DB.err&&DB.err[tabla]?{message:'caído'}:null});}
  };return api;}
globalThis.sb={from:q,rpc:async(n,p)=>{rpcs.push(p);
  // simula el RPC: mueve la tabla y escribe el movimiento con fecha ahora
  if(p.p_paquetes>0)DB.stock.push({id:900+rpcs.length,producto_id:p.p_producto_id,cantidad_paquetes:p.p_paquetes,estado:'disponible'});
  else{let falta=-p.p_paquetes;for(const est of ['disponible','reservado'])for(const r of DB.stock.filter(r=>r.producto_id===p.p_producto_id&&r.estado===est)){const t=Math.min(falta,r.cantidad_paquetes);r.cantidad_paquetes-=t;falta-=t;}}
  DB.mov.push({id:9000+rpcs.length,producto_id:p.p_producto_id,paquetes:p.p_paquetes,fecha:new Date().toISOString(),observaciones:p.p_obs});
  return {data:{ok:true},error:null};}};
globalThis._traerQ=async(build)=>{const all=[];let d=0;while(true){const{data,error}=await build().range(d,d+999);if(error)return{data:all,error};all.push(...data);if(data.length<1000)break;d+=1000;}return{data:all,error:null};};

eval(bloque);

(async()=>{
// ===== 1. funciones puras =====
const T='2026-09-28T11:00:00.000Z';
const movs=[
  {producto_id:1,paquetes:3000,fecha:'2026-09-28T13:00:00Z'},              // corte después
  {producto_id:1,paquetes:-500,fecha:'2026-09-28T10:00:00Z'},              // antes: no cuenta
  {producto_id:2,paquetes:-800,fecha:'2026-09-28T12:00:00Z'},              // remito después
  {producto_id:1,paquetes:-200,fecha:'2026-09-28T14:00:00Z',observaciones:'Conteo físico 28/9 08:00: ...'}, // ajuste del propio conteo
];
const p=_cfPosterior(movs,T);
eq(p.post[1]||0,3000,'posterior prod 1 = sólo el corte de después');
eq(p.post[2]||0,-800,'posterior prod 2 = el remito de después');
eq(p.n,2,'2 movimientos posteriores (el ajuste de conteo no cuenta)');
ok(Object.keys(_cfPosterior(movs,null).post).length===0,'sin hora: nada posterior');
// el caso que motivó el build: 10.000 contados a las 8, 3.000 cortados a las 10, sistema ahora 13.000
let c=_cfCalc(10000,13000,3000);
eq(c.sistT,10000,'sistema a la hora = 10.000');eq(c.dif,0,'sin diferencia: el corte posterior NO se borra');eq(c.finalFis,13000,'queda 13.000');
// el mismo caso con la lógica vieja (sin hora) habría ajustado −3.000
eq(_cfCalc(10000,13000,0).dif,-3000,'sin hora se comporta como antes (−3.000)');
// remito posterior: contados 5.000, después salieron 800, ahora 4.500 → a esa hora 5.300 → dif −300 → final 4.200
c=_cfCalc(5000,4500,-800);eq(c.sistT,5300,'remito: sistema a la hora 5.300');eq(c.dif,-300,'remito: dif −300');eq(c.finalFis,4200,'remito: final = contado − remitido = 4.200');
// hora en datetime-local
ok(_cfHoraISO('')===null,'hora vacía → null');ok(_cfHoraISO('basura')===null,'hora inválida → null');
ok(_cfHoraFutura('2999-01-01T10:00'),'hora futura detectada');ok(!_cfHoraFutura('2020-01-01T10:00'),'hora pasada no es futura');

// ===== 2. aplicar de punta a punta =====
function reset(){DB={stock:[],mov:[]};rpcs.length=0;toasts.length=0;for(const k in _CF)delete _CF[k];}
reset();
const hora='2026-09-27T08:00';  // local
const tISO=new Date(hora).toISOString();
const despues=new Date(new Date(hora).getTime()+2*3600e3).toISOString();
DB.stock=[
  {id:1,producto_id:1,cantidad_paquetes:13000,estado:'disponible'},   // 10.000 + 3.000 cortados después
  {id:2,producto_id:2,cantidad_paquetes:4500,estado:'disponible'},    // 5.300 − 800 remitidos después
  {id:3,producto_id:3,cantidad_paquetes:1000,estado:'disponible'},{id:4,producto_id:3,cantidad_paquetes:3000,estado:'reservado'},
];
DB.mov=[{id:1,producto_id:1,paquetes:3000,fecha:despues},{id:2,producto_id:2,paquetes:-800,fecha:despues}];
el('cf-hora').value=hora;
_CF[1]=10000;_CF[2]=5000;_CF[3]=2500;  // prod 3: sistema 4.000, contado 2.500 → baja por debajo de lo reservado
confirmTxt='';globalThis.confirm=t=>{confirmTxt=t;return true;};
await aplicar();
const porProd={};rpcs.forEach(r=>porProd[r.p_producto_id]=r.p_paquetes);
ok(porProd[1]===undefined,'prod 1 sin ajuste (lo cortado después se respeta)');
eq(porProd[2],-300,'prod 2 ajusta −300');
eq(porProd[3],-1500,'prod 3 ajusta −1.500');
ok(/por debajo de lo reservado/.test(confirmTxt)&&/C: quedan 2\.500 y había 3\.000/.test(confirmTxt),'avisa que se achica la reserva de C');
ok(rpcs.every(r=>r.p_tipo==='ajuste_neutro'&&r.p_motivo_cod==='correccion'&&r.p_impacta===false),'modo por defecto: corrección sin efecto económico');
ok(/sistema a esa hora 5\.300, contado 5\.000/.test((rpcs.find(r=>r.p_producto_id===2)||{}).p_obs||''),'la observación dice el sistema a esa hora');
ok(_CF[1]===undefined&&_CF[2]===undefined&&_CF[3]===undefined,'lo aplicado sale de lo tipeado');
const fis=pid=>DB.stock.filter(r=>r.producto_id===pid).reduce((s,r)=>s+r.cantidad_paquetes,0);
eq(fis(1),13000,'stock final prod 1 = 13.000');eq(fis(2),4200,'stock final prod 2 = 4.200');eq(fis(3),2500,'stock final prod 3 = 2.500');

// re-tipear un producto ya aplicado con la MISMA hora no duplica el ajuste
rpcs.length=0;_CF[2]=4900;           // se equivocó: eran 4.900 a las 8
await aplicar();
eq((rpcs[0]||{}).p_paquetes,-100,'corregir lo ya aplicado ajusta sólo la diferencia nueva (−100), no −400');
eq(fis(2),4100,'prod 2 queda 4.900 − 800 = 4.100');

// ===== 3. candados =====
reset();DB.stock=[{id:1,producto_id:1,cantidad_paquetes:100,estado:'disponible'}];
el('cf-hora').value='2999-01-01T08:00';_CF[1]=50;
await aplicar();
ok(rpcs.length===0&&toasts.some(t=>/futuro/.test(t[0])),'hora futura: no aplica nada');
el('cf-hora').value=hora;DB.err={mov_bolsas:true};
await aplicar();
ok(rpcs.length===0&&toasts.some(t=>/no se aplicó nada/.test(t[0])),'libro caído: no aplica nada');
DB.err={stock_bolsas:true};toasts.length=0;
await aplicar();
ok(rpcs.length===0&&toasts.some(t=>/stock actual/.test(t[0])),'stock caído: no aplica nada');
DB.err=null;
// contado menos de lo que salió después = imposible
reset();DB.stock=[{id:1,producto_id:1,cantidad_paquetes:0,estado:'disponible'}];DB.mov=[{id:1,producto_id:1,paquetes:-500,fecha:despues}];
_CF[1]=200;
await aplicar();
ok(rpcs.length===0&&toasts.some(t=>/salió más de lo contado/.test(t[0])),'contado < lo remitido después: no aplica y avisa');
ok(_CF[1]===200,'lo imposible queda tipeado para revisarlo');
// cancelar el confirm no toca nada
reset();DB.stock=[{id:1,producto_id:1,cantidad_paquetes:100,estado:'disponible'}];_CF[1]=80;globalThis.confirm=()=>false;
await aplicar();
ok(rpcs.length===0&&_CF[1]===80,'cancelar: nada asentado y lo tipeado sigue');
globalThis.confirm=()=>true;
// sin hora = comportamiento anterior
reset();el('cf-hora').value='';DB.stock=[{id:1,producto_id:1,cantidad_paquetes:13000,estado:'disponible'}];DB.mov=[{id:1,producto_id:1,paquetes:3000,fecha:despues}];_CF[1]=10000;
await aplicar();
eq((rpcs[0]||{}).p_paquetes,-3000,'sin hora compara contra ahora (como antes)');

// ===== 4. persistencia en la PC =====
reset();el('cf-hora').value=hora;_CF[4]=77;_cfGuardarLS();
const guardado=JSON.parse(LS['cf_conteo_v1']);
ok(guardado.cont[4]===77&&guardado.hora===hora,'lo tipeado y la hora quedan en localStorage');
delete _CF[4];el('cf-hora').value='';globalThis._cfLSCargado=false;
_cfInitLS();
ok(_CF[4]===77&&el('cf-hora').value===hora,'al volver a abrir se recupera lo tipeado y la hora');
LS['cf_conteo_v1']='{roto';globalThis._cfLSCargado=false;_cfInitLS();ok(true,'localStorage roto no rompe');

// ===== 5. render: lista, columnas y botón =====
reset();el('cf-hora').value=hora;
C.stock_bolsas=[{producto_id:1,cantidad_paquetes:13000,estado:'disponible'},{producto_id:3,cantidad_paquetes:500,estado:'reservado'}];
DB.mov=[{id:1,producto_id:1,paquetes:3000,fecha:despues},{id:2,producto_id:2,paquetes:-800,fecha:despues}];
_cfLibro={t:'__',post:{},nMov:0,ok:false,cargando:false,err:null,tok:0};
renderConteoBolsas();                       // dispara la carga del libro
ok(!_cfPuedeAplicar(),'mientras carga el libro no se puede aplicar');
await new Promise(r=>setTimeout(r,20));
ok(_cfLibro.ok&&_cfLibro.nMov===2,'el libro cargó 2 movimientos posteriores');
const lista=_cfLista();
ok(lista.some(x=>x.p.id===2&&x.sistT===800&&x.vivo===0),'producto remitido entero después sigue en la lista con 800 a la hora del conteo');
const f1=lista.find(x=>x.p.id===1);eq(f1.sistT,10000,'prod 1 en pantalla: 10.000 a la hora');
_CF[1]=10000;renderConteoBolsas();
ok(/ahora 13\.000 \(\+3\.000 después\)/.test(el('cf-tbl').innerHTML),'la tabla muestra lo de ahora y lo movido después');
ok(/Sistema al contar/.test(el('cf-tbl').innerHTML),'encabezado nuevo');
ok(/desde entonces hubo <b>2<\/b> movimientos/.test(el('cf-hora-info').innerHTML),'la franja de la hora dice cuántos movimientos se respetan');
ok(/cfAplicar\(\)/.test(el('cf-resumen').innerHTML),'con libro cargado el botón aplicar está activo');
el('cf-hora').value='2999-01-01T08:00';cfHoraCambio();
ok(/futuro/.test(el('cf-hora-info').innerHTML)&&!/onclick="cfAplicar\(\)"/.test(el('cf-resumen').innerHTML),'hora futura: aviso rojo y botón apagado');
el('cf-hora').value='';cfHoraCambio();await new Promise(r=>setTimeout(r,20));
ok(/Sin hora de conteo/.test(el('cf-hora-info').innerHTML),'sin hora: aviso ámbar');
DB.err={mov_bolsas:true};el('cf-hora').value=hora;cfHoraCambio();await new Promise(r=>setTimeout(r,20));
ok(/No se pudo leer el libro/.test(el('cf-hora-info').innerHTML)&&!_cfPuedeAplicar(),'libro caído: aviso y no se puede aplicar');
const antes=_cfLibro.tok;renderConteoBolsas();await new Promise(r=>setTimeout(r,20));
ok(_cfLibro.tok===antes,'con error no reintenta en bucle');
DB.err=null;

console.log((fail?'✖ ':'✓ ')+pass+' ok · '+fail+' fallas');
process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
