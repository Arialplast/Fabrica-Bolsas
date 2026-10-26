// smoke 26c — 🧷 fundas de empaque: peso, FIFO, costo por OC y descuento al cerrar
// Datos reales: funda chica 35×34 a 19 g/m = 6,46 g; grande 40×37 = 7,03 g; remito Fénix $6.785/kg.
// uso: TZ=America/Argentina/Buenos_Aires node tests/smoke_fundas.cjs fabrica_bolsas_v6.html
const fs=require('fs');const src=fs.readFileSync(process.argv[2]||'fabrica_bolsas_v6.html','utf8');
let ok=0,bad=0;const t=(c,m)=>{if(c)ok++;else{bad++;console.log('✗ '+m);}};
const grab=(a,b)=>{const i=src.indexOf(a),k=src.indexOf(b,i+1);if(i<0||k<0)throw new Error('no está '+a);return src.slice(i,k);};
const near=(a,b,e)=>Math.abs(a-b)<=(e||0.01);

global.r1=n=>Math.round(n*10)/10;global.r2=n=>Math.round(n*100)/100;global.r3=n=>Math.round(n*1000)/1000;global.r4=n=>Math.round(n*10000)/10000;
global.localDate=d=>{const dt=d||new Date('2026-10-26T12:00:00');return dt.getFullYear()+'-'+String(dt.getMonth()+1).padStart(2,'0')+'-'+String(dt.getDate()).padStart(2,'0');};
global.cfg={funda_desde:'2026-09-22'};global.getCfg=(k,d)=>cfg[k]!==undefined?cfg[k]:d;
global.window={};let toasts=[];global.toast=m=>toasts.push(m);global.escapeHtml=x=>String(x);
const chica={id:101,codigo:'F45A',nombre:'FUNDA 45A',categoria:'empaque',funda_ancho_cm:35,funda_largo_cm:34,funda_g_metro:19};
const grande={id:108,codigo:'F80P',nombre:'FUNDA 80P',categoria:'empaque',funda_ancho_cm:40,funda_largo_cm:37,funda_g_metro:19};
const sinLote={id:107,codigo:'F75P',nombre:'FUNDA 75P',categoria:'empaque',funda_ancho_cm:40,funda_largo_cm:37,funda_g_metro:19};
global.C={fundas:[chica,grande,sinLote],
  lotes_funda:[{id:1,tipo_mp_id:101,kg_disponibles:33.8,precio_kg:6785,fecha_ingreso:'2026-09-22'},
               {id:2,tipo_mp_id:108,kg_disponibles:0.745,precio_kg:6785,fecha_ingreso:'2026-09-22'}],
  productos:[{id:29,codigo:'00008',funda_tipo_mp_id:101},{id:11,codigo:'00398',funda_tipo_mp_id:108},
             {id:3,codigo:'00005',funda_tipo_mp_id:107},{id:82,codigo:'00082',funda_tipo_mp_id:null}],
  mov_funda_oc:[],ord_corte:[]};

eval(grab('function _fundaG(t)','\n// ── Pantalla 🧷 Fundas'));

// peso de una funda
t(near(_fundaG(chica),6.46,0.0001),'chica 6,46 g');
t(near(_fundaG(grande),7.03,0.0001),'grande 7,03 g');
t(_fundaG({funda_g_metro:19})===0,'sin largo → 0');
// FIFO puro
let f=_fundaFIFO([{id:1,kg_disponibles:2,precio_kg:10},{id:2,kg_disponibles:5,precio_kg:20}],3.5);
t(f.partes.length===2&&f.partes[0].kg===2&&f.partes[1].kg===1.5&&f.falta===0,'FIFO reparte 2 + 1,5');
f=_fundaFIFO([{id:1,kg_disponibles:1,precio_kg:10}],3);
t(f.partes[0].kg===1&&near(f.falta,2),'FIFO avisa faltante 2');
t(_fundaFIFO([],1).falta===1,'sin lotes → falta todo');
// costo por OC
const oc=(id,prod,paq,fecha,estado)=>({id,producto_id:prod,cantidad_bultos_reales:paq,fecha_completada:fecha,estado:estado||'Completada'});
let c=_fundaCostoOC(oc(900,29,1000,'2026-10-10T15:00:00-03:00'));
t(c.via==='form'&&near(c.kgTeo,6.46)&&near(c.costo,r2(6.46*6785)),'OC sin traza → 1000 paq × 6,46 g × $6.785 = $43.831');
C.mov_funda_oc=[{ref_id:900,tipo_mp_id:101,kg:-6.46,precio_kg:6785,fecha:'2026-10-10'}];
c=_fundaCostoOC(oc(900,29,1000,'2026-10-10T15:00:00-03:00'));
t(c.via==='real'&&near(c.costo,43831.1,0.1)&&c.kgTraz===6.46,'OC trazada → real');
C.mov_funda_oc=[{ref_id:901,tipo_mp_id:108,kg:-0.745,precio_kg:6785,fecha:'2026-10-20'}];
c=_fundaCostoOC(oc(901,11,500,'2026-10-20T10:00:00-03:00'));
t(c.via==='mixto'&&near(c.kgTeo,3.515)&&near(c.costo,r2(3.515*6785),0.1),'OC con faltante → mixto, todo valuado');
t(_fundaCostoOC(oc(902,29,1000,'2026-09-15T10:00:00-03:00')).costo===0,'antes de funda_desde → sin costo (estaba en gastos)');
t(_fundaCostoOC(oc(903,29,1000,'2026-09-22T01:00:00-03:00')).costo>0,'el 22/09 a la madrugada (hora AR) ya cuenta');
t(_fundaCostoOC(oc(904,82,1000,'2026-10-10T10:00:00-03:00')).costo===0,'granel sin funda → 0');
t(_fundaCostoOC(oc(905,29,1000,'2026-10-10T10:00:00-03:00','En proceso')).costo===0,'OC abierta → 0');
c=_fundaCostoOC(oc(906,3,380,'2026-10-05T10:00:00-03:00'));
t(c.via==='form'&&near(c.costo,r2(r3(380*7.03/1000)*6785),0.1),'75P sin lote propio → toma el último $/kg de fundas');

// descuento al cerrar (sb simulado)
let inserts=[],yaHay=false,lotesDB=[{id:1,kg_disponibles:33.8,precio_kg:6785,fecha_ingreso:'2026-09-22'}],failSel=false;
function qb(tabla){const q={_t:tabla,
  select:()=>q,eq:()=>q,gt:()=>q,order:()=>q,limit:()=>q,
  insert:rows=>{inserts.push(...rows);return Promise.resolve({error:null});},
  then:(res,rej)=>Promise.resolve().then(()=>{
    if(failSel)return{data:null,error:{message:'red caída'}};
    if(tabla==='mov_mp')return{data:yaHay?[{id:1}]:[],error:null};
    return{data:lotesDB,error:null};}).then(res,rej)};return q;}
global.sb={from:qb};
(async()=>{
  let r=await _fundaConsumirOC(900,29,2000,'OC-1053100');
  t(r&&near(r.kg,12.92)&&inserts.length===1&&inserts[0].kg===-12.92&&inserts[0].ref_tipo==='orden_corte'&&inserts[0].ref_id===900&&inserts[0].tipo_mov==='consumo','cierre descuenta 2000 × 6,46 g = 12,92 kg');
  t(inserts[0].precio_kg===6785&&inserts[0].lote_id===1&&/OC-1053100/.test(inserts[0].motivo),'movimiento con lote, precio y OC');
  inserts=[];yaHay=true;
  r=await _fundaConsumirOC(900,29,2000,'OC-1053100');
  t(r&&r.yaEstaba&&inserts.length===0,'segunda vez no descuenta de nuevo');
  yaHay=false;inserts=[];toasts=[];lotesDB=[{id:2,kg_disponibles:0.745,precio_kg:6785,fecha_ingreso:'2026-09-22'}];
  r=await _fundaConsumirOC(901,11,500,'OC-1053101');
  t(inserts.length===1&&inserts[0].kg===-0.745&&r.falta>2.7&&toasts.some(x=>/faltaron/.test(x)),'sin stock suficiente: descuenta lo que hay y avisa');
  inserts=[];r=await _fundaConsumirOC(902,82,500,'OC-X');
  t(r===null&&inserts.length===0,'producto sin funda no toca nada');
  failSel=true;toasts=[];
  r=await _fundaConsumirOC(900,29,100,'OC-Y');
  t(r===null&&toasts.some(x=>/no pude descontar/.test(x)),'error de red no frena el cierre, avisa');
  // enganches en el HTML
  t(/await _fundaConsumirOC\(id,o\.producto_id,totalPaq,o\.numero_orden\)/.test(src),'cerrarOrdenCorte llama al descuento');
  t((src.match(/_fundaCostoOC\(o\)/g)||[]).length>=2,'Rentabilidad y Resultado suman la funda');
  t(/C\.tipos_mp=C\.tipos_mp\.filter\(t=>t\.categoria!=='empaque'\)/.test(src),'reload saca las fundas de la MP de extrusión');
  console.log((bad?'✗ ':'✓ ')+ok+' ok, '+bad+' mal');process.exit(bad?1:0);
})();
