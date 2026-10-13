// smoke 13a — 📏 Extrusión en vivo / Estación: máquinas SIEMPRE por número de extrusora
// (EXT-01, EXT-03, EXT-07), y EXT-01 entrando por el grupo 2 del PLC con su factor 0,2475.
// uso: TZ=America/Argentina/Buenos_Aires node tests/smoke_orden_ext.cjs fabrica_bolsas_v6.html
const fs=require('fs');const src=fs.readFileSync(process.argv[2]||'fabrica_bolsas_v6.html','utf8');
const a=src.indexOf('// ===== 📏 CUENTAMETROS PLC EN LA CARGA');const b=src.indexOf('// ===== ⚖ BALANZA DE EXTRUSIÓN (06b)');
if(a<0||b<0||b<a){console.log('FALTA el bloque');process.exit(1);}
let ok=0,bad=0;const t=(c,m)=>{if(c)ok++;else{bad++;console.log('✗ '+m);}};

const AHORA=new Date('2026-10-13T10:00:00-03:00').getTime();
const _Date=Date;global.Date=class extends _Date{constructor(...x){super(...(x.length?x:[AHORA]));}static now(){return AHORA;}};
const T=m=>new Date(AHORA-m*60000).toISOString();

// ---- plc_grupos como está en la base el 13/10: el orden de las filas NO es el de las máquinas ----
const DESDE1='2026-10-12T14:38:11.857Z';   // EXT-01 conectada al grupo 2
const grupos=[{id:1,grupo:1,extrusora_id:3,desde:'2026-09-25T03:00:00Z',hasta:null},
              {id:2,grupo:3,extrusora_id:7,desde:'2026-10-03T15:00:00Z',hasta:null},
              {id:3,grupo:2,extrusora_id:1,desde:DESDE1,hasta:null}];
const desde1Min=(AHORA-new Date(DESDE1).getTime())/60000;   // ~1.162 min atrás

// minutos: 24 h + margen; grupo 2 con PRUEBAS antes de DESDE1 (pulsos que no son de EXT-01)
const minutos=[];
for(let i=0;i<=26*60;i++){
  const ts=T(26*60-i);const atras=26*60-i;
  const g=(grupo,br,fi,sp)=>minutos.push({grupo,ts,odo_bruto:br,odo_film:fi,seg_film:0,seg_prod:sp,cierres:0});
  g(1,100000+i*40,99000+i*40,5000+i*60);
  g(3,20000+i*30,19900+i*30,3000+i*60);
  // grupo 2: antes de la conexión, prueba de banco a 400 pulsos/min; después, 120 pulsos/min reales
  const antes=atras>desde1Min;
  const k=antes?i*400:(Math.round((26*60-desde1Min))*400+(i-Math.round(26*60-desde1Min))*120);
  g(2,k,k,1000+i*60);
}
const ult2=minutos.filter(m=>m.grupo===2).slice(-1)[0];
let idc=1;
const ci=(grupo,n,minAtras,film,pc,desc)=>({id:idc++,grupo,n_cierre:n,cerrado_en:T(minAtras),odo_bruto:film,odo_film:film,film_cierre:film,prod_cierre:pc,seg_prod:pc,descartado:!!desc});
const cierres=[
  ci(1,130,200,180000,10000),ci(1,131,150,181800,13000),
  ci(3,11,180,50000,4000),ci(3,12,90,51800,9400),
  // grupo 2: una prueba ANTES de la conexión (no es de EXT-01) y dos cierres reales después
  ci(2,3,desde1Min+20,204,651,true),
  ci(2,4,600,ult2.odo_film-120*500,30000),
  ci(2,5,100,ult2.odo_film-120*80,60000)];
const estado=[1,3,2].map(g=>{const u=minutos.filter(m=>m.grupo===g).slice(-1)[0];const c=cierres.filter(x=>x.grupo===g).slice(-1)[0];
  return{grupo:g,actualizado_en:T(0.05),odo_bruto:u.odo_bruto,odo_film:u.odo_film,seg_prod:u.seg_prod,cierres:c.n_cierre};});
const bobinas=[];
const cfgRows=[{clave:'plc_factor',valor:'{"1":{"m_pulso":0.2475,"congelado":true},"3":{"m_pulso":0.793,"congelado":true},"7":{"m_pulso":0.793,"congelado":true}}'},
               {clave:'plc_vinculo_desde',valor:'2026-10-07T14:05:28-03:00'}];
const tablas={plc_grupos:grupos,plc_minutos:minutos,plc_cierres:cierres,plc_estado:estado,bobinas_producidas:bobinas,configuracion:cfgRows};
function q(tabla){
  let rows=(tablas[tabla]||[]).slice();let single=false,lim=null,ord=null,asc=true;
  const api={select(){return api;},is(c,v){rows=rows.filter(r=>(r[c]??null)===v);return api;},
    eq(c,v){rows=rows.filter(r=>String(r[c])===String(v));return api;},
    in(c,vs){rows=rows.filter(r=>vs.map(String).includes(String(r[c])));return api;},
    gte(c,v){rows=rows.filter(r=>new Date(r[c])>=new Date(v)||String(r[c])>=String(v));return api;},
    order(c,o){if(!ord){ord=c;asc=!(o&&o.ascending===false);}return api;},
    limit(n){lim=n;return api;},range(x,y){return Promise.resolve(fin(x,y));},
    maybeSingle(){single=true;return api;},then(res,rej){return Promise.resolve(fin()).then(res,rej);}};
  function fin(x,y){let r=rows;
    if(ord)r=r.slice().sort((p,q)=>{const A=p[ord],B=q[ord];return (A>B?1:A<B?-1:0)*(asc?1:-1);});
    if(lim!=null)r=r.slice(0,lim);if(x!=null)r=r.slice(x,y+1);
    return {data:single?(r[0]||null):r,error:null};}
  return api;
}
global.sb={from:q,rpc:()=>Promise.resolve({error:null})};
global._traerQ=async(build)=>build().range(0,1e6);
const els={};
function el(id){if(!els[id])els[id]={id,value:'',innerHTML:'',textContent:'',style:{},setAttribute(){},classList:{_s:new Set(),add(c){this._s.add(c);},remove(c){this._s.delete(c);},contains(c){return this._s.has(c);},toggle(){}}};return els[id];}
['evv-body','evv-ts','page-extrusion-vivo','ee-body'].forEach(el);
global.window=global;
global.document={getElementById:id=>els[id]||null,querySelectorAll:()=>[],body:{insertAdjacentHTML(){}}};
global.escapeHtml=x=>String(x==null?'':x);global.toast=()=>{};
global.cfg={tolerancia_advertencia_pesada_pct:'2',tolerancia_advertencia_liviana_pct:'5',tolerancia_pesada_pct:'8',tolerancia_liviana_pct:'10'};
global.localDate=d=>{const x=d||new Date();return x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0');};
global.localTime=()=>'10:00:00';
// C.extrusoras desordenado a propósito
global.C={extrusoras:[{id:7,nombre:'EXT-07',en_servicio:true},{id:3,nombre:'EXT-03',en_servicio:true},{id:2,nombre:'EXT-02',en_servicio:false},{id:1,nombre:'EXT-01',en_servicio:true}],
  bobinas:[],ordenes:[],operarios:[]};
eval(src.slice(a,b).replace(/^const (PLC|PLCP|EST|EVV|PLC_VINCULO_DESDE_DEF)=/gm,'global.$1='));

(async()=>{
// ---- regla pura ----
const ord=xs=>xs.slice().sort(_extCmp).map(e=>e.nombre).join(',');
t(ord([{nombre:'EXT-07'},{nombre:'EXT-01'},{nombre:'EXT-03'}])==='EXT-01,EXT-03,EXT-07','_extCmp: por número');
t(ord([{nombre:'EXT-10'},{nombre:'EXT-9'},{nombre:'EXT-02'}])==='EXT-02,EXT-9,EXT-10','_extCmp: numérico, no alfabético (EXT-9 antes que EXT-10)');
t(_extNro({nombre:'EXT-01'})===1&&_extNro({id:5,nombre:''})===5,'_extNro: del nombre, o el id si no hay número');

// ---- grupos del PLC salen ordenados por máquina, no por grupo ----
const gs=await _plcGrupos();
t(gs.map(g=>g.extrusora_id).join()==='1,3,7','_plcGrupos: EXT-01 (grupo 2), EXT-03 (grupo 1), EXT-07 (grupo 3)');

// ---- factor de EXT-01 = clave «1» (por extrusora, no por grupo) ----
const cfgP=await _plcCfg();
t(_plcFactor(cfgP.factor,1).m===0.2475&&_plcFactor(cfgP.factor,1).congelado,'EXT-01 toma 0,2475 fijado (clave «1»)');
t(_plcFactor(cfgP.factor,3).m===0.793,'EXT-03 sigue con 0,793 (no se cruza con el grupo 1)');

// ---- estación: datos de EXT-01 ----
const d1=await _plcDatosExt(1);
t(d1&&d1.grupo===2,'estación: EXT-01 lee el grupo 2');
t(d1.fac.m===0.2475,'estación: EXT-01 con factor 0,2475');
t(d1.enCurso===Math.round(120*80*0.2475),'estación: bobina en curso de EXT-01 = 9.600 pulsos × 0,2475 = '+Math.round(9600*0.2475)+' m (dio '+d1.enCurso+')');
const c5=d1.calc.find(c=>c.n_cierre===5);
t(c5&&c5.metros===Math.round(120*420*0.2475),'estación: cierre 5 de EXT-01 = 50.400 pulsos × 0,2475');
t(!d1.calc.some(c=>c.n_cierre===3),'estación: la prueba anterior a la conexión no es de EXT-01');
t(_eeExts().map(e=>e.nombre).join()==='EXT-01,EXT-03,EXT-07','estación: máquinas EXT-01, EXT-03, EXT-07');

// ---- Extrusión en vivo ----
PLC.grupos=null;   // que vuelva a leer (como al abrir la pantalla)
await renderExtrusionVivo();
const H=els['evv-body'].innerHTML;
t(!/No se pudieron/.test(H),'vivo: se arma sin error');
const pos=n=>H.indexOf('<h3>'+n+'</h3>');
t(pos('EXT-01')>0&&pos('EXT-01')<pos('EXT-03')&&pos('EXT-03')<pos('EXT-07'),'vivo: tarjetas EXT-01, EXT-03, EXT-07');
t(EVV.maqs.map(m=>m.ext.nombre).join()==='EXT-01,EXT-03,EXT-07','vivo: máquinas en orden');
const rows=[...H.matchAll(/class="evx-tlrow" data-g="(\d+)"><span class="nm">([^<]+)</g)].map(x=>x[2]);
t(rows.join()==='EXT-01,EXT-03,EXT-07','vivo: línea de tiempo EXT-01, EXT-03, EXT-07 (dio '+rows.join()+')');
const fil=[...H.matchAll(/data-f="([^"]+)"/g)].map(x=>x[1]);
t(fil.join()==='Todas,EXT-01,EXT-03,EXT-07,Con aviso','vivo: filtros de la tabla de cierres en orden');
const th=[...H.matchAll(/<th>kg\/h (E\d)<\/th>/g)].map(x=>x[1]);
t(th.join()==='E1,E3,E7','vivo: resumen por turno con columnas E1, E3, E7 (dio '+th.join()+')');
const m1=EVV.maqs.find(m=>m.ext.id===1);
t(m1.fac.m===0.2475,'vivo: EXT-01 con factor 0,2475');
t(m1.enCurso===d1.enCurso,'vivo: bobina en curso de EXT-01 igual a la estación ('+m1.enCurso+' m)');
t(!m1.bobs.some(o=>o.c.n_cierre===3),'vivo: la prueba del grupo 2 anterior a la conexión no aparece como cierre de EXT-01');
t(m1.minsRaw.every(r=>new Date(r.ts)>=new Date(DESDE1)),'vivo: los minutos de EXT-01 arrancan en la conexión');
t(m1.mins.every(x=>x.mmin<=Math.round(120*0.2475*10)/10+0.01),'vivo: m/min de EXT-01 sin el pico de la prueba (≤ 29,7 m/min)');
t(Math.abs(m1.mminVivo-120*0.2475)<0.5,'vivo: velocidad de EXT-01 ≈ 29,7 m/min (dio '+m1.mminVivo+')');
// tabla de cierres: a igual hora, por número
EVV.filas=[{maq:'EXT-07',ext:{nombre:'EXT-07'},c:{cerrado_en:T(5)}},{maq:'EXT-01',ext:{nombre:'EXT-01'},c:{cerrado_en:T(5)}}]
  .sort((x,y)=>(new Date(y.c.cerrado_en)-new Date(x.c.cerrado_en))||_extCmp(x.ext,y.ext));
t(EVV.filas[0].maq==='EXT-01','tabla: cierres a la misma hora, EXT-01 antes que EXT-07');

console.log((bad?'✗ ':'✓ ')+ok+' ok · '+bad+' fallas');process.exit(bad?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
