// smoke 07e — 📏 cuentametros PLC: carga de bobinas (cierre propuesto) + Extrusión en vivo
// uso: TZ=America/Argentina/Buenos_Aires node tests/smoke_plc.cjs fabrica_bolsas_v6.html
const fs=require('fs');const src=fs.readFileSync(process.argv[2]||'fabrica_bolsas_v6.html','utf8');
const a=src.indexOf('// ===== 📏 CUENTAMETROS PLC EN LA CARGA');const b=src.indexOf('// ===== ⚖ BALANZA DE EXTRUSIÓN (06b)');
if(a<0||b<0||b<a){console.log('FALTA el bloque');process.exit(1);}
let ok=0,bad=0;const t=(c,m)=>{if(c)ok++;else{bad++;console.log('✗ '+m);}};

// ---- reloj fijo: 06/10/2026 08:00 (Argentina) ----
const AHORA=new Date('2026-10-06T08:00:00-03:00').getTime();
const _Date=Date;global.Date=class extends _Date{constructor(...x){super(...(x.length?x:[AHORA]));}static now(){return AHORA;}};

// ---- datos: odómetros reales del registrador (grupo 1 = EXT-03, grupo 3 = EXT-07) ----
const iso=s=>s.replace(' ','T').slice(0,19)+'-03:00';
const minutos=[],cierres=[];let idc=1;
const L=x=>parseInt(x,10);
// serie sintética con la forma real: EXT-03 ~1 pulso/48 s… se arma con datos verificables a mano
for(let i=0;i<=24*60;i++){
  const ts=new Date(AHORA-(24*60-i)*60000);
  // grupo 1: 40 pulsos/min (32 m/min a 0,80), parada entre los minutos 600 y 650 (50 min)
  const parado=i>600&&i<=650;
  const prev=minutos.filter(m=>m.grupo===1).slice(-1)[0];
  const br=prev?prev.odo_bruto+(parado?0:40):100000;
  const fi=prev?prev.odo_film+(parado?0:(i>1380?36:40)):99000;   // última hora: film 90 %
  const sp=prev?prev.seg_prod+(parado?0:60):5000;
  minutos.push({grupo:1,ts:ts.toISOString(),odo_bruto:br,odo_film:fi,seg_film:0,seg_prod:sp,cierres:0});
  // grupo 3: siempre produciendo, 30 pulsos/min
  const p3=minutos.filter(m=>m.grupo===3).slice(-1)[0];
  minutos.push({grupo:3,ts:ts.toISOString(),odo_bruto:p3?p3.odo_bruto+30:20000,odo_film:p3?p3.odo_film+30:19900,seg_film:0,seg_prod:p3?p3.seg_prod+60:3000,cierres:0});
}
// cierres de grupo 1 cada 45 min de producción (1800 pulsos = 1440 m a 0,80)
function cierre(grupo,n,minAtras,br,pc,desc){
  return{id:idc++,grupo,n_cierre:n,cerrado_en:new Date(AHORA-minAtras*60000).toISOString(),odo_bruto:br,odo_film:br-500,film_cierre:br-500,prod_cierre:pc,seg_film:0,seg_prod:pc,descartado:!!desc};
}
cierres.push(cierre(1,130,200,200000,10000));
cierres.push(cierre(1,131,155,201800,12700));   // 1.440 m · 45 min
cierres.push(cierre(1,132,110,203600,15400));   // 1.440 m · 45 min
cierres.push(cierre(1,133,108,203632,15420,true)); // doble toque: descartado
cierres.push(cierre(1,134,63,205400,18080));    // contra el 133: 1.414 m · 44,3 min
cierres.push(cierre(1,135,18,207200,20780));    // 1.440 m
cierres.push(cierre(3,11,120,50000,4000));
cierres.push(cierre(3,13,60,51800,7600));        // salto de 11 a 13: un cierre perdido → sin metros
const estado=[{grupo:1,actualizado_en:new Date(AHORA-5000).toISOString(),odo_bruto:207900,odo_film:207300,cierres:135,film_cierre:206700,prod_cierre:20780},
              {grupo:3,actualizado_en:new Date(AHORA-5000).toISOString(),odo_bruto:52500,odo_film:52400,cierres:13,film_cierre:51300,prod_cierre:7600}];
// bobinas del MES: la del cierre 131 y la del 132 ya cargadas y atadas
const bobinas=[
  {id:501,numero_bobina:'BOB-06574',extrusora_id:3,orden_id:874,bobina_tipo_id:10,metros_reales:1500,kg_reales:30.0,peso_bruto_kg:30.0,tara_tubo_kg:1.1,peso_origen:'balanza',fecha_produccion:'2026-10-06',hora_produccion:'05:30:00',operario:'MARTIN MASSI',plc_cierre_id:2,anulada:false},
  {id:502,numero_bobina:'BOB-06576',extrusora_id:3,orden_id:874,bobina_tipo_id:10,metros_reales:1400,kg_reales:30.0,peso_bruto_kg:null,peso_origen:null,fecha_produccion:'2026-10-06',hora_produccion:'06:15:00',operario:'MARTIN MASSI',plc_cierre_id:3,anulada:false},
  {id:503,numero_bobina:'BOB-06572',extrusora_id:1,orden_id:879,bobina_tipo_id:11,metros_reales:900,kg_reales:25.4,fecha_produccion:'2026-10-06',hora_produccion:'04:15:00',operario:'MAURO PAVONI',plc_cierre_id:null,anulada:false}];
const cfgRows=[{clave:'plc_factor',valor:'{"3":{"m_pulso":0.80,"congelado":false},"7":{"m_pulso":0.80,"congelado":false}}'},
               {clave:'plc_vinculo_desde',valor:'2026-10-06T04:00:00-03:00'}];
const grupos=[{id:1,grupo:1,extrusora_id:3,desde:'2026-09-25T03:00:00Z',hasta:null},{id:2,grupo:3,extrusora_id:7,desde:'2026-10-03T15:00:00Z',hasta:null}];

// ---- mock de supabase: filtros mínimos que usa el bloque ----
const tablas={plc_grupos:grupos,plc_minutos:minutos,plc_cierres:cierres,plc_estado:estado,bobinas_producidas:bobinas,configuracion:cfgRows};
const rpcs=[];
function q(tabla){
  let rows=(tablas[tabla]||[]).slice();let single=false,lim=null,ord=null,asc=true;
  const api={
    select(){return api;},
    is(c,v){rows=rows.filter(r=>(r[c]??null)===v);return api;},
    eq(c,v){rows=rows.filter(r=>String(r[c])===String(v));return api;},
    in(c,vs){rows=rows.filter(r=>vs.map(String).includes(String(r[c])));return api;},
    gte(c,v){rows=rows.filter(r=>String(r[c])>=String(v)||new Date(r[c])>=new Date(v));return api;},
    order(c,o){if(!ord){ord=c;asc=!(o&&o.ascending===false);}return api;},
    limit(n){lim=n;return api;},
    range(x,y){return Promise.resolve(fin(x,y));},
    maybeSingle(){single=true;return api;},
    then(res,rej){return Promise.resolve(fin()).then(res,rej);}
  };
  function fin(x,y){
    let r=rows;
    if(ord)r=r.slice().sort((p,q)=>{const A=p[ord],B=q[ord];return (A>B?1:A<B?-1:0)*(asc?1:-1);});
    if(lim!=null)r=r.slice(0,lim);
    if(x!=null)r=r.slice(x,y+1);
    return {data:single?(r[0]||null):r,error:null};
  }
  return api;
}
global.sb={from:q,rpc:(n,p)=>{rpcs.push([n,p]);const c=cierres.find(x=>x.id===p.p_id);if(c)c.descartado=p.p_descartado;return Promise.resolve({error:null});}};
global._traerQ=async(build)=>{const r=await build().range(0,100000);return r;};

// ---- DOM mínimo ----
const els={};
function el(id){if(!els[id])els[id]={id,value:'',innerHTML:'',textContent:'',style:{},classList:{_s:new Set(),add(c){this._s.add(c);},remove(c){this._s.delete(c);},contains(c){return this._s.has(c);},toggle(){} }};return els[id];}
['cb-plc','cb-ext','cb-op-sel','evv-body','evv-ts','page-carga-bobinas','page-extrusion-vivo'].forEach(el);
el('page-carga-bobinas').classList.add('active');
global.window=global;
global.document={getElementById:id=>els[id]||null,querySelectorAll:()=>[],body:{insertAdjacentHTML(){}}};
global.escapeHtml=x=>String(x==null?'':x);global.toast=()=>{};global.cfg={tolerancia_advertencia_pesada_pct:'2',tolerancia_advertencia_liviana_pct:'5',tolerancia_pesada_pct:'8',tolerancia_liviana_pct:'10'};
global.localDate=d=>{const x=d||new Date();return x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0');};
global.localTime=()=>'08:00:00';
global.C={extrusoras:[{id:1,nombre:'EXT-01',en_servicio:true},{id:3,nombre:'EXT-03',en_servicio:true},{id:7,nombre:'EXT-07',en_servicio:true},{id:2,nombre:'EXT-02',en_servicio:false}],
  bobinas:[{id:10,nombre:'B90-14',kg_por_metro:0.0200},{id:11,nombre:'B100',kg_por_metro:0.028}],
  ordenes:[{id:874,numero_orden:'ORD-06311'},{id:879,numero_orden:'ORD-06307'}],operarios:[{id:5,nombre:'MASSI'}]};
eval(src.slice(a,b).replace(/^const (PLC|PLCP|EST|EVV|PLC_VINCULO_DESDE_DEF)=/gm,'global.$1='));

(async()=>{
// ---- puras ----
t(_plcFactor({"3":{m_pulso:0.79,congelado:true}},3).m===0.79&&_plcFactor({"3":{m_pulso:0.79,congelado:true}},3).congelado,'factor congelado de la config');
t(_plcFactor({},7).m===0.80&&!_plcFactor({},7).congelado,'sin config → 0,80 provisorio');
const calc=_plcCalcCierres(cierres.filter(c=>c.grupo===1),0.80);
t(calc[0].metros===null,'el primer cierre no tiene anterior → sin metros');
t(calc[1].metros===1440&&calc[1].minProd===45,'cierre 131: 1.800 pulsos = 1.440 m, 45 min');
t(calc[4].metros===Math.round((205400-203632)*0.8)&&calc[4].n_cierre===134,'cierre 134 se mide contra el 133 (descartado), que sí existió');
const c3=_plcCalcCierres(cierres.filter(c=>c.grupo===3),0.80);
t(c3[1].metros===null,'salto de contador (11→13): cierre perdido → sin metros, no se propone');
const pend=_plcPendientes(calc,new Set([2,3]),'2026-10-06T04:00:00-03:00');
t(pend.map(c=>c.n_cierre).join()==='134,135','pendientes: sin los atados (131,132), sin el descartado (133), sin el primero');
t(_plcPendientes(calc,new Set(),'2026-10-06T07:00:00-03:00').map(c=>c.n_cierre).join()==='135','antes del arranque del vínculo no se propone nada');
t(_plcEsChoqueCierre({message:'duplicate key value violates unique constraint "bobinas_producidas_plc_cierre_uq"'}),'choque del cierre se distingue');
t(!_plcEsChoqueCierre({message:'duplicate key value violates unique constraint "bobinas_producidas_numero_bobina_key"'}),'choque de número NO es del cierre');

// ---- carga: EXT-03 propone el cierre más viejo sin bobina ----
el('cb-ext').value='3';
await plcCbRefrescar();
t(PLC.sel===cierres.find(c=>c.n_cierre===134).id,'propone el 134 (el más viejo sin bobina)');
t(/2<\/b> cierres sin bobina/.test(els['cb-plc'].innerHTML),'avisa que hay 2 cierres sin bobina');
t(/1\.414 m/.test(els['cb-plc'].innerHTML)&&/1\.440 m/.test(els['cb-plc'].innerHTML),'muestra los metros de cada cierre');
t(/Bobina en curso en la máquina: <b class="mono">560 m/.test(els['cb-plc'].innerHTML),'bobina en curso: (207.900−207.200)×0,80 = 560 m');
t(!/kg\/h|kg estimad/i.test(els['cb-plc'].innerHTML),'P4: el operario no ve kg estimados ni kg/h');
t(JSON.stringify(_plcColsBobina())===JSON.stringify({plc_cierre_id:PLC.sel}),'el insert lleva plc_cierre_id');
plcCbElegir(null);
t(JSON.stringify(_plcColsBobina())==='{}','«sin cierre» → no se graba cierre');
// descartar el 134
const id134=cierres.find(c=>c.n_cierre===134).id;
plcCbElegir(id134);els['plc-desc-nota']={value:'doble toque'};els['cb-op-sel'].value='5';
await _plcDescartarOk(id134);
t(rpcs.length===1&&rpcs[0][0]==='plc_cierre_marcar'&&rpcs[0][1].p_descartado===true&&/doble toque.*MASSI/.test(rpcs[0][1].p_nota),'«no fue bobina» llama a la función con nota y operario');
t(PLC.sel===cierres.find(c=>c.n_cierre===135).id,'después del descarte propone el 135');
// EXT-01 no está en el PLC
el('cb-ext').value='1';
await plcCbRefrescar();
t(els['cb-plc'].innerHTML===''&&JSON.stringify(_plcColsBobina())==='{}','EXT-01 sin PLC: no muestra nada ni graba cierre');
// sin extrusora
el('cb-ext').value='';await plcCbRefrescar();
t(els['cb-plc'].innerHTML==='','sin extrusora elegida: vacío');

// ---- extrusión en vivo ----
const mins1=_evvMinutos(minutos.filter(m=>m.grupo===1),0.80);
t(mins1.length===1440,'1.440 minutos en 24 h');
t(mins1.filter(m=>m.est==='S').length===50,'50 minutos parada');
t(mins1[0].mmin===32,'40 pulsos/min × 0,80 = 32 m/min');
const par=_evvParadas(mins1,5);
t(par.length===1&&par[0].min===50,'una parada de 50 min');
t(_evvMinutos([{ts:'2026-10-06T00:00:00Z',odo_bruto:10,odo_film:10,seg_prod:10},{ts:'2026-10-06T00:01:00Z',odo_bruto:5,odo_film:5,seg_prod:5}],0.8)[0].est==='X','odómetro que baja → minuto marcado (PLC reiniciado)');
t(_evvKgNeto({kg_reales:30,tara_tubo_kg:1.1,peso_origen:'balanza'})===28.9&&_evvKgNeto({kg_reales:30})===30&&_evvKgCalidad({kg_reales:30,peso_bruto_kg:30})===30&&_evvKgCalidad({kg_reales:30,peso_bruto_kg:null})===30,'g/m se juzga con tubo (bruto o régimen viejo)');
await renderExtrusionVivo();
const H=els['evv-body'].innerHTML;
t(!/No se pudieron/.test(H),'la pantalla se arma sin error');
t(/EXT-03/.test(H)&&/EXT-07/.test(H)&&/EXT-01/.test(H)&&!/EXT-02/.test(H),'tarjetas: E3 y E7 con PLC, E1 sin PLC, E2 fuera de servicio no aparece');
t(/Sin medición/.test(H)&&/EXT-01 sin PLC/.test(H),'EXT-01 marcada sin PLC (tarjeta y barra de estado)');
// uso EXT-03 = 1390/1440
t(H.includes('96,5 %'),'uso EXT-03 = 1.390/1.440 = 96,5 %');
// kg/h de la BOB-06574: 28,9 kg / 0,75 h = 38,5
t(H.includes('38,5'),'kg/h de una bobina = kg neto ÷ horas produciendo entre cierres (38,5)');
// g/m: 30 kg con tubo / 1440 m = 20,8 g/m vs 20,0 → +4,2 %
t(H.includes('20,8')&&H.includes('+4,2 %'),'g/m real con metros del PLC y su desvío (+4,2 %)');
t(/SIN BOBINA/.test(H),'el cierre 135 sin bobina aparece marcado');
t(/NO FUE BOBINA/.test(H),'los descartados se ven como tales');
t(/fotocélula/.test(H),'alerta de fotocélula (film 90 % la última hora)');
t(/provisorio/.test(H),'avisa factor provisorio');
t(/Paradas de 5 min o más/.test(H)&&/50 min/.test(H),'tabla de paradas con la de 50 min');
t(/Por turno/.test(H)&&/MARTIN MASSI/.test(H),'tabla por turno con el operario');
t(/estimados sólo acá/.test(H)&&/el operario ve la advertencia/.test(H),'pie: estimados sólo acá y advertencia del operario');
t(/Gramaje real vs orden/.test(H)&&/kg\/h por bobina/.test(H)&&/evx-filt/.test(H),'07s: gráficos por bobina y filtros de la tabla');

// ---- 07g panel operario ----
const mm=(n,br,fi)=>({ts:new Date(AHORA-(10-n)*60000).toISOString(),odo_bruto:br,odo_film:fi});
t(_plcpEstado([mm(1,100,100),mm(2,140,140),mm(3,180,180)]).est==='P','panel: pulsos con film → produciendo');
t(_plcpEstado([mm(1,100,100),mm(2,140,100),mm(3,180,100),mm(4,220,100)]).est==='F','panel: pulsos sin film → gira sin film');
const pz=_plcpEstado([mm(1,100,100),mm(2,140,140),mm(3,140,140),mm(4,140,140),mm(5,140,140)]);
t(pz.est==='S'&&pz.min===3,'panel: parada hace 3 min');
const hp=_plcpHtml(3,{pend:[{id:9,cerrado_en:new Date(AHORA-600000).toISOString(),metros:1452},{id:10,cerrado_en:new Date(AHORA).toISOString(),metros:1440}],enCurso:320,estadoViejo:false,estado:{est:'P'}});
t(/BOBINA EN CURSO/.test(hp)&&/320/.test(hp)&&/2 BOBINAS PARA PESAR/.test(hp)&&/plcPanelPesar\(3,9\)/.test(hp)&&/la más vieja/.test(hp),'panel: bobina en curso y bobinas para pesar, la más vieja primero');
t(!/kg\/h|kg estimad/i.test(hp),'panel P4: sin kg estimados ni kg/h');
t(/Sin cuentametros/.test(_plcpHtml(1,null)),'panel: máquina sin PLC lo dice');
// ---- 07h estación de extrusión ----
t(_eeMinParada([mm(1,100,100),mm(2,100,100),mm(3,100,100),mm(4,140,140),mm(5,140,140)])===3,'estación: minutos parada en el turno');
t(src.includes("go('estacion-ext'); document.body.classList.add('pext-on');"),'estación: la estación Extrusión entra a la pantalla nueva');
t(!src.includes('pop-plc-\'+ext.id'),'estación: se sacó el bloque de la 07g del panel');

// ---- 07i ----
t(Math.round(_eeMmin([mm(1,100,100),mm(2,150,150),mm(3,200,200)],0.8))===40,'m/min: 50 pulsos/min × 0,8 = 40');
// metros del PLC en la carga
el('cb-mts');el('hint-mts');el('lock-mts');global.calcCarga=()=>{};
PLC.datos={pend:[{id:77,metros:1452}]};PLC.sel=77;_plcAplicarMetros();
t(els['cb-mts'].value==='1452'&&els['cb-mts'].readOnly===true,'07i: con cierre, metros del PLC y no se tipean');
PLC.sel=null;_plcAplicarMetros();
t(els['cb-mts'].value===''&&els['cb-mts'].readOnly===false,'07i: sin cierre, metros a mano');

// ---- 07j un solo criterio ----
t(_evvJuicio(-8.8).t==='LIVIANA'&&_evvJuicio(-8.8).a==='ENGORDAR'&&_evvJuicio(-8.8).k==='warn','−8,8 % → LIVIANA, engordar (advertencia)');
t(_evvJuicio(-4.9).t==='EN RANGO','−4,9 % → en rango (OK liviana hasta −5 %)');
t(_evvJuicio(3).t==='PESADA'&&_evvJuicio(3).a==='AFINAR','+3 % → PESADA, afinar (OK pesada sólo hasta +2 %)');
t(_evvJuicio(9).k==='bad'&&_evvJuicio(-11).k==='bad','pasando +8 % / −10 % → rechazo');

// ---- 07m una sola cuenta de pesada/liviana (estación = Extrusión en vivo) ----
{
  C.bobinas.push({id:12,nombre:'Lyme',kg_por_metro:0.0199});
  const cc=(id,min,m,mp,desc)=>({id,cerrado_en:new Date(AHORA-min*60000).toISOString(),metros:m,minProd:mp,descartado:!!desc});
  const bb=(id,kg,br,tipo,an)=>({id,numero_bobina:'BOB-'+id,kg_reales:kg,peso_bruto_kg:br,tara_tubo_kg:0.73,peso_origen:'balanza',bobina_tipo_id:tipo,anulada:!!an});
  // EXT-07 real del 07/10: 06585 9,66/489 · 06588 30,12/1599 · 06589 28,40/1527 → 18,86 g/m (−5,2 %)
  const calc=[cc(1,900,860,31.6),cc(2,200,489,17.2),cc(3,140,1599,56.3),cc(4,80,1527,53.7),cc(5,20,1504,54.1)];
  const mp=new Map([[1,bb(6581,16.61,17.34,12)],[2,bb(6585,8.93,9.66,12)],[3,bb(6588,30.12,30.12,12)],[4,bb(6589,28.40,28.4,12)]]);
  const R=_plcRefMaquina(calc,mp,0.0199);
  t(R&&R.nJ===3&&Math.abs(R.gpm-18.86)<0.01,'07m: g/m real = kg con tubo ÷ metros PLC de las últimas 3 pesadas (18,86)');
  t(R.J.a==='ENGORDAR'&&R.J.t==='LIVIANA','07m: EXT-07 −5,2 % → LIVIANA / ENGORDAR');
  t(R.nros.join()==='BOB-6585,BOB-6588,BOB-6589','07m: la de hace 15 h queda afuera (últimas 12 h)');
  t(R.kgh>R.kghNeto,'07m: kg/h con tubo (operario) > sin tubo (dueño)');
  // la estación y el dueño llaman a la misma función con los mismos datos → mismo veredicto
  const R2=_plcRefMaquina(calc,mp,0.0199);t(JSON.stringify(R)===JSON.stringify(R2),'07m: misma entrada, mismo veredicto en las dos pantallas');
  t(_plcRefMaquina(calc,mp,0.028).J===null,'07m: si la orden cambió de bobina, no se juzga con las pesadas de la anterior');
  t(_plcRefMaquina(calc,new Map(),0.0199)===null,'07m: sin pesadas → sin indicación');
  t(!/_eeIndicacion\(/.test(src),'07m: no queda la cuenta vieja por kg/h ÷ m/min');
}

// ---- 07n estado al instante + cambio de velocidad ----
{
  const T=AHORA;let br=1000,sp=500;const h=[];
  const muestra=(k,dbr,dsp)=>{br+=dbr;sp+=dsp;h.push({t:T-(30-k)*2000,br,sf:sp,sp});};
  for(let k=0;k<=20;k++)muestra(k,1,2);                       // produciendo
  t(_plcVivoEstado(h,T-18000).est==='P','vivo: con pulsos y segundos produciendo → PRODUCIENDO');
  // se pincha: el rodillo sigue, el PLC deja de sumar producción
  for(let k=21;k<=24;k++)muestra(k,1,0);
  t(_plcVivoEstado(h,T-12000).est==='F','vivo: rodillo gira y no suma producción → SIN FILM a los pocos segundos');
  // vuelve el film: en la muestra siguiente ya es PRODUCIENDO (antes tardaba hasta 3 min)
  muestra(25,1,2);
  t(_plcVivoEstado(h,T-10000).est==='P','vivo: vuelve el film → PRODUCIENDO en la muestra siguiente');
  // se para el rodillo 10 s
  for(let k=26;k<=30;k++)muestra(k,0,2);
  const vp=_plcVivoEstado(h,T);t(vp.est==='S'&&vp.min===0,'vivo: sin pulsos 8 s → PARADA aunque el PLC siga sumando por su ventana de 20 s');
  t(_plcVivoEstado(h,T+30000)===null,'vivo: la PC no sube hace 20 s → no inventa (usa los minutos)');
  t(_plcVivoEstado(h.slice(-1),T)===null,'vivo: con una sola muestra no decide');
  // velocidad de los últimos 5 minutos produciendo: 39 pulsos/min × 0,793 = 30,9
  const mv=[];for(let i=0;i<10;i++)mv.push({ts:new Date(T-(10-i)*60000).toISOString(),odo_bruto:5000+i*39,seg_prod:100+i*60});
  const va=_plcVelAhora(mv,0.793);t(va&&Math.abs(va.v-30.93)<0.01&&va.n===5,'velocidad: 39 pulsos/min → 30,9 m/min');
  const mv2=mv.map((m,i)=>i===9?Object.assign({},m,{seg_prod:m.seg_prod-40}):m);
  t(_plcVelAhora(mv2,0.793).n===5,'velocidad: un minuto con parada no entra');
  const R={vUlt:31.0,nroUlt:'BOB-06590',J:{a:'ENGORDAR'}};
  const cv=_plcCambioVel({v:32.6},R);
  t(cv&&cv.sube&&cv.ef==='AFINASTE'&&/al revés/.test(cv.rel),'cambio: +5 % con ENGORDAR pendiente → AFINASTE, ojo va al revés');
  const cb=_plcCambioVel({v:29.5},R);
  t(cb&&!cb.sube&&cb.ef==='ENGORDASTE'&&/para el lado/.test(cb.rel),'cambio: −5 % con ENGORDAR → ENGORDASTE, va para el lado que pide');
  t(_plcCambioVel({v:31.5},R)===null,'cambio: +1,6 % no avisa (ruido de 1 pulso/min)');
  t(_plcCambioVel({v:33},{J:null})===null,'cambio: sin bobina pesada de referencia no avisa');
}

// ---- 07o semáforo en vivo + barra de la bobina en curso ----
{
  const cc=(id,min,m,mp)=>({id,cerrado_en:new Date(AHORA-min*60000).toISOString(),metros:m,minProd:mp});
  const bb=(id,kg,tipo)=>({id,numero_bobina:'BOB-'+id,kg_reales:kg,peso_bruto_kg:kg,bobina_tipo_id:tipo});
  const calc=[cc(2,200,489,17.2),cc(3,140,1599,56.3),cc(4,80,1527,53.7)];
  const mp=new Map([[2,bb(6585,9.66,12)],[3,bb(6588,30.12,12)],[4,bb(6589,28.4,12)]]);
  const R=_plcRefMaquina(calc,mp,0.0199);
  const vB=3615/127.2;   // m/min de esas mismas bobinas
  const S0=_plcSemaforo(R,{v:vB});
  t(S0&&Math.abs(S0.g-R.gpm)<0.01,'semáforo: a la misma velocidad que las pesadas, el estimado = el real de la balanza');
  t(S0.J.a===R.J.a,'semáforo: misma velocidad → mismo veredicto que el real');
  const S1=_plcSemaforo(R,{v:vB*0.94});
  t(S1.g>R.gpm&&S1.J.a==='OK','semáforo: bajar 6 % la velocidad engorda → pasa de ENGORDAR a OK');
  t(_plcSemaforo(R,null)===null&&_plcSemaforo(null,{v:30})===null,'semáforo: sin velocidad o sin pesadas → nada (se ve el real)');
  t(_plcSemaforo(_plcRefMaquina(calc,mp,0.028),{v:30})===null,'semáforo: otro tipo de bobina en la orden → no estima');
  const base={meta:{m:1500},est:{seg_prod:5000},ult:{prod_cierre:2000,cerrado_en:new Date(AHORA-3600000).toISOString()}};
  const b1=_eeBarInfo(Object.assign({},base,{enCurso:700}));t(b1.cls===''&&Math.abs(b1.p-0.4667)<0.001&&b1.minP===50,'barra: 700/1500 m, 50 min produciendo');
  t(_eeBarInfo(Object.assign({},base,{enCurso:1440})).cls==='cerca','barra: 96 % → PREPARATE');
  t(_eeBarInfo(Object.assign({},base,{enCurso:1500})).cls==='cortar','barra: 100 % → LLEGASTE: CORTÁ');
  t(_eeBarInfo(Object.assign({},base,{enCurso:900,estadoViejo:true})).cur===null,'barra: sin datos de la PC no muestra metros');
  t(_eeBarInfo({meta:{cerrada:true}}).cerrada,'barra: pistas cerradas → lo dice');
}

// ---- 07p qué orden corre en cada máquina ----
{
  const sw=new Date(AHORA-40*60000).toISOString();
  const A={id:884,numero_orden:'ORD-06322',estado:'En proceso',orden_extrusoras:[{id:1,extrusora_id:3,fecha_inicio:null,fecha_fin:null},{id:2,extrusora_id:7}]};
  const B={id:891,numero_orden:'ORD-06329',estado:'En proceso',orden_extrusoras:[{id:3,extrusora_id:3,fecha_inicio:null,fecha_fin:null},{id:4,extrusora_id:7}]};
  t(_oeEnMaquina([A],3)===A,'orden en máquina: una sola En proceso → esa');
  t(_oeEnMaquina([A,B],3)===null,'orden en máquina: dos En proceso sin marca → no se sabe (pide elegir)');
  A.orden_extrusoras[0].fecha_fin=sw;B.orden_extrusoras[0].fecha_inicio=sw;
  t(_oeEnMaquina([A,B],3)===B,'orden en máquina: EXT-03 cambiada a la 06329 → la 06329');
  t(_oeEnMaquina([A,B],3,AHORA-60*60000)===A,'orden en máquina: una bobina cerrada antes del cambio → la orden de antes');
  t(_oeEnMaquina([A,B],7)===null,'orden en máquina: EXT-07 con las dos sin marca → pide elegir');
  B.orden_extrusoras[1].fecha_fin=sw;
  t(_oeEnMaquina([A,B],7)===A,'orden en máquina: EXT-07 dejó la 06329 → sigue la 06322');
  // la referencia de velocidad es sólo del mismo tipo de bobina
  const cc=(id,min,m,mp)=>({id,cerrado_en:new Date(AHORA-min*60000).toISOString(),metros:m,minProd:mp});
  const R=_plcRefMaquina([cc(1,100,1500,48)],new Map([[1,{id:1,numero_bobina:'B1',kg_reales:29.6,peso_bruto_kg:29.6,bobina_tipo_id:12}]]),0.0177);
  t(R&&!R.vUlt&&_plcCambioVel({v:42},R)===null,'cambio de velocidad: no compara contra bobinas de otro producto');
}

console.log((bad?'✗ ':'✓ ')+ok+' ok · '+bad+' fallas');
process.exit(bad?1:0);
})().catch(e=>{console.log('✗ excepción',e);process.exit(1);});
