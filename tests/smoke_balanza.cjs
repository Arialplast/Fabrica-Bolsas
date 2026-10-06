// smoke 06b — ⚖ balanza Kretz en la carga de bobinas
// uso: TZ=America/Argentina/Buenos_Aires node tests/smoke_balanza.cjs fabrica_bolsas_v6.html
const fs=require('fs');const src=fs.readFileSync(process.argv[2]||'fabrica_bolsas_v6.html','utf8');
const a=src.indexOf('// ===== ⚖ BALANZA DE EXTRUSIÓN (06b)');const b=src.indexOf('// ===== 🔒 CANDADO ANTI DOBLE CLIC');
if(a<0||b<0||b<a){console.log('FALTA el bloque');process.exit(1);}
let ok=0,bad=0;const t=(c,m)=>{if(c)ok++;else{bad++;console.log('✗ '+m);}};

// ---- mocks ----
const els={};
function el(id){if(!els[id])els[id]={id,value:'',innerHTML:'',textContent:'',style:{},disabled:false,
  classList:{_s:new Set(),add(...c){c.forEach(x=>this._s.add(x));},remove(...c){c.forEach(x=>this._s.delete(x));},contains(c){return this._s.has(c);}}};return els[id];}
['bal-box','bal-con','bal-btn','bal-peso','bal-estado','bal-neto','bal-manual','cb-bruto','lock-bruto','cb-kg','cb-kg-origen','cb-orden','page-carga-bobinas'].forEach(el);
el('page-carga-bobinas').classList.add('active');
global.window={};
global.document={getElementById:id=>els[id]||null,querySelectorAll:()=>[],body:{insertAdjacentHTML(){}}};
global.navigator={};               // sin Web Serial: no se abre nada en el test
global.cfg={};
global.C={ordenes:[{id:1,numero_orden:'ORD-1',bobina_id:10,bobinas:{id:10,ancho:90,kg_por_metro:0.04}},
                   {id:2,numero_orden:'ORD-2',bobina_id:11,bobinas:{id:11,ancho:80}},
                   {id:3,numero_orden:'ORD-3',bobina_id:12,bobinas:{id:12}}],bobinas:[{id:12,ancho:null}]};
let calcs=0;global.calcCarga=()=>{calcs++;};
global.escapeHtml=x=>String(x);global.toast=()=>{};
let retro=false;global._cbRetroActivo=()=>retro;
eval(src.slice(a,b).replace('var BAL=window.BAL||','global.BAL=window.BAL||').replace(/^const (_BAL_\w+)=/gm,'global.$1='));

// ---- trama / parser ----
t(_balParsearTrama('\x02061.64\r')===61.64,'trama real <STX>061.64<CR> → 61,64');
t(_balParsearTrama('\x02000.00')===0,'cero');
t(_balParsearTrama('-001.20')===-1.2,'negativo (balanza sin tara)');
t(_balParsearTrama('061,64')===61.64,'coma decimal');
t(_balParsearTrama('\x02----')===null&&_balParsearTrama('')===null,'trama sin número → null');
let sp=_balSeparar('\x02061.64\r\x02061.6');
t(sp.tramas.length===1&&_balParsearTrama(sp.tramas[0])===61.64&&sp.resto==='\x02061.6','trama cortada entre lecturas queda en el resto');
sp=_balSeparar(sp.resto+'5\r\x02061.66\r');
t(sp.tramas.map(_balParsearTrama).join()==='61.65,61.66'&&sp.resto==='','se completa con la lectura siguiente');
t(_balSeparar('\r\r\x02\r').tramas.length===0,'líneas vacías o sólo STX se descartan');

// ---- estabilidad ----
const serie=(t0,dur,f,paso=100)=>{const o=[];for(let x=0;x<=dur;x+=paso)o.push({t:t0+x,kg:f(x)});return o;};
const T0=1e6;
let e=_balEstabilidad(serie(T0,2500,()=>61.64),T0+2500);
t(e.estado==='estable'&&e.kg===61.64,'quieto 2,5 s → ESTABLE 61,64');
e=_balEstabilidad(serie(T0,2500,x=>61.62+((x/100)%2)*0.04),T0+2500);
t(e.estado==='estable'&&Math.abs(e.kg-61.64)<0.011,'oscila 0,04 → ESTABLE con el promedio ('+e.kg+')');
e=_balEstabilidad(serie(T0,2500,x=>61.6+((x/100)%2)*0.06),T0+2500);
t(e.estado==='moviendo','oscila 0,06 → Moviéndose');
e=_balEstabilidad(serie(T0,1200,()=>61.64),T0+1200);
t(e.estado==='moviendo','quieto sólo 1,2 s → todavía no');
e=_balEstabilidad(serie(T0,2500,x=>x<400?30:61.64),T0+2500);
t(e.estado==='estable'&&e.kg===61.64,'subió y se quedó quieta 2 s → estable con lo de la ventana');
e=_balEstabilidad(serie(T0,2500,x=>x<1000?30:61.64),T0+2500);
t(e.estado==='moviendo','quieta sólo 1,5 s → todavía Moviéndose');
e=_balEstabilidad(serie(T0,2500,x=>x<1500?30:61.64),T0+2500);
t(e.estado==='moviendo','recién apoyada (1 s quieta) → Moviéndose');
e=_balEstabilidad(serie(T0,2500,()=>4.5),T0+2500);
t(e.estado==='bajo'&&e.vivo===4.5,'4,5 kg → Menos de 5 kg');
e=_balEstabilidad(serie(T0,2500,()=>5.0),T0+2500);
t(e.estado==='bajo','5,00 justo → no (tiene que ser > 5)');
e=_balEstabilidad(serie(T0,2500,()=>61.64),T0+2500+1600);
t(e.estado==='sin_senal'&&e.vivo===61.64,'sin tramas 1,6 s → sin señal');
t(_balEstabilidad([],T0).estado==='sin_senal','sin muestras → sin señal');
e=_balEstabilidad(serie(T0,2500,x=>61.6+((x/100)%2)*0.06),T0+2500,{tolKg:0.1});
t(e.estado==='estable','tolerancia configurable (cfg.balanza_tol_kg)');

// ---- tara por ancho ----
const tab={'90':1.1};
let tr=_balTaraAncho(90,tab);t(tr.kg===1.1&&!tr.estimado,'90 cm = 1,10 pesado');
tr=_balTaraAncho(80,tab);t(tr.kg===0.98&&tr.estimado,'80 cm ≈ 0,98 estimado');
tr=_balTaraAncho(60,tab);t(tr.kg===0.73&&tr.estimado,'60 cm ≈ 0,73 estimado');
tr=_balTaraAncho('90.00',tab);t(tr.kg===1.1&&!tr.estimado,'ancho como texto "90.00" de la base');
tr=_balTaraAncho(60,{'90':1.1,'60':0.8});t(tr.kg===0.8&&!tr.estimado,'60 pesado gana sobre la proporción');
tr=_balTaraAncho(45,{'90':1.1,'60':0.8});t(tr.estimado&&tr.kg===Math.round(45*((1.1/90+0.8/60)/2)*100)/100,'estimado con el promedio kg/cm de los pesados');
t(_balTaraAncho(null,tab)===null&&_balTaraAncho(0,tab)===null,'sin ancho → null');
t(_balTaraAncho(80,{}).kg===0.98,'tabla vacía → 1,1/90 por defecto');
cfg.taras_tubo='{"90":1.2}';t(_balTablaTaras()['90']===1.2,'lee configuracion.taras_tubo (texto JSON)');
cfg.taras_tubo='basura';t(_balTablaTaras()['90']===1.1,'JSON roto → 90 = 1,1');
cfg.taras_tubo=undefined;

// ---- cálculo puro ----
let c=_balCalcPuro({bruto:61.64},NaN,false,90,tab,true);
t(c.origen==='balanza'&&c.tara===1.1&&c.neto===60.54,'balanza: 61,64 − 1,10 = 60,54');
c=_balCalcPuro({bruto:61.64},62,false,90,tab,true);
t(c.origen==='balanza','con balanza, lo tipeado a mano no cuenta');
c=_balCalcPuro({bruto:61.64},62,true,90,tab,true);
t(c.origen==='manual'&&c.neto===60.9,'manual permitido y tipeado → gana el manual');
c=_balCalcPuro(null,NaN,true,90,tab,true);t(c===null,'nada → null');
c=_balCalcPuro({bruto:61.64},NaN,false,90,tab,false);t(c.sinOrden&&c.neto===null,'sin orden → no hay neto');
c=_balCalcPuro({bruto:61.64},NaN,false,null,tab,true);t(c.sinAncho&&c.neto===null,'orden sin ancho → no se inventa el tubo');
c=_balCalcPuro({bruto:1.0},NaN,false,90,tab,true);t(c.neto<0,'menos que el tubo → neto negativo (no se completa)');

// ---- flujo con pantalla (mocks) ----
const ahoraReal=Date.now;let AHORA=T0;Date.now=()=>AHORA;
BAL.conectada=true;
function pesar(kg,ms){for(let x=0;x<ms;x+=100){AHORA+=100;_balMuestra(kg);if(x%400===0)_balTick();}_balTick();}
el('cb-orden').value='1';
pesar(30,500);t(el('cb-kg').value==='','moviéndose → Kg reales vacío');
pesar(61.64,2600);
t(el('cb-kg').value==='60.54','ESTABLE → Kg reales = neto 60.54 solo');
t(el('bal-estado').textContent==='● ESTABLE','pinta ESTABLE');
t(el('bal-manual').style.display==='none','con balanza no aparece el peso manual');
t(/NETO/.test(el('bal-neto').innerHTML)&&/1,10/.test(el('bal-neto').innerHTML),'muestra tubo y neto');
const snap=_balPesoParaGuardar(60.54);
t(snap&&snap.bruto===61.64&&snap.tara===1.1&&snap.origen==='balanza','foto para guardar: bruto/tara/origen');
t(_balPesoParaGuardar(60.0)===null,'si los kg del formulario no son los de la balanza → no se atribuyen');
window._balPesoSnap=snap;
let cols=_balColsBobina(60.54);
t(cols.peso_bruto_kg===61.64&&cols.tara_tubo_kg===1.1&&cols.peso_origen==='balanza','columnas de la bobina');
t(_balColsBobina(59).peso_origen==='manual'&&!('peso_bruto_kg' in _balColsBobina(59)),'kg que no coinciden con la foto → manual sin bruto');
// cambio de orden → otro ancho
el('cb-orden').value='2';_balAplicarKg(true);
t(el('cb-kg').value==='60.66','orden de 80 cm → 61,64 − 0,98 = 60,66');
el('cb-orden').value='3';_balAplicarKg(true);
t(el('cb-kg').value===''&&/ancho/.test(el('bal-neto').innerHTML),'orden sin ancho → no completa y avisa');
el('cb-orden').value='1';_balAplicarKg(true);
// guardar → desarmar
_balTrasGuardar();_balLimpiar();el('cb-kg').value='';
pesar(61.64,2600);
t(el('cb-kg').value==='','la misma bobina sigue en la balanza → NO se vuelve a tomar');
t(/sacá la bobina/i.test(el('bal-estado').textContent),'pide sacar la bobina');
t(/Sacá de la balanza/.test(_balMsgSinKg()),'registrar sin peso → explica que hay que sacarla');
pesar(0.2,600);
t(BAL.armada===true,'bajó de 5 kg → se rearma');
pesar(58.3,2600);
t(el('cb-kg').value==='57.2','la siguiente: 58,30 − 1,10 = 57,20');
// sin señal > 5 s → se habilita el manual
pesar(58.3,0);AHORA+=1600;_balTick();
t(BAL.est.estado==='sin_senal','balanza apagada → sin señal');
AHORA+=3000;_balTick();
t(!_balManualPermitido(),'sin señal hace 3 s → todavía no se habilita el manual');
AHORA+=2100;_balTick();
t(_balManualPermitido()&&el('bal-manual').style.display==='','sin señal > 5 s → aparece el peso manual');
el('cb-bruto').value='45';_balAplicarKg(true);
t(el('cb-kg').value==='43.9'&&BAL.ultimoCalc.origen==='manual','manual 45 − 1,10 = 43,90 marcado manual');
// vuelve la señal → se borra lo manual
pesar(58.3,2600);
t(el('cb-bruto').value===''&&el('cb-kg').value==='57.2'&&BAL.ultimoCalc.origen==='balanza','vuelve la balanza → se borra el manual y manda la balanza');
// desconectada
_balPerdida();
t(!BAL.conectada&&_balManualPermitido(),'cable desenchufado → manual permitido');
t(el('cb-kg').value==='57.2','lo ya tomado no se pierde al desconectar');
_balLimpiar();el('cb-bruto').value='70';_balAplicarKg(true);
t(el('cb-kg').value==='68.9'&&_balPesoParaGuardar(68.9).origen==='manual','sin balanza: manual 70 → 68,90');
// turno atrasado con balanza conectada
el('cb-bruto').value='';BAL.conectada=true;retro=true;
t(_balManualPermitido(),'turno atrasado → se permite manual aunque haya balanza');
retro=false;
// payload sin SQL
const pl={numero_bobina:'BOB-1',kg_reales:60.54,observaciones:'x',peso_bruto_kg:61.64,tara_tubo_kg:1.1,peso_origen:'balanza'};
const sin=_balPayloadSinCols(pl);
t(!('peso_origen' in sin)&&!('peso_bruto_kg' in sin)&&!('tara_tubo_kg' in sin),'sin SQL: saca las 3 columnas');
t(sin.observaciones==='x | ⚖ Balanza: bruto 61.64 − tubo 1.1 = neto 60.54 kg','sin SQL: lo deja en observaciones');
t(_balPayloadSinCols({kg_reales:5,peso_origen:'manual'}).observaciones==='⚖ Peso manual','manual sin bruto → nota corta');
t(_balSinColumnas({message:'Could not find the \'peso_bruto_kg\' column of \'bobinas_producidas\''})&&!_balSinColumnas({message:'otra cosa'}),'detecta columnas faltantes');
// marcas
t(_balMarca({peso_origen:'manual'}).includes('✍')&&_balMarca({peso_origen:'balanza',peso_bruto_kg:1,tara_tubo_kg:1}).includes('⚖')&&_balMarca({})==='','marcas ✍ / ⚖ / nada (viejas)');
Date.now=ahoraReal;

// ---- enganches en el resto del archivo ----
t(src.includes('..._balColsBobina(kgR)'),'el insert de la bobina lleva las columnas de peso');
t(src.includes('window._balPesoSnap=(typeof _balPesoParaGuardar'),'foto del peso al apretar Registrar');
t(/try\{_balTrasGuardar\(\);\}catch\(e\)\{\}\s*limpiarCarga\(\);/.test(src),'tras guardar se desarma antes de limpiar');
t(/id="cb-kg"[^>]*readonly/.test(src),'Kg reales no se tipea');
t(src.includes("try{balInitPantalla();}"),'initCarga engancha la balanza');
t(src.includes("pesoOrigen:b.peso_origen||null"),'análisis de extrusión lee el origen');
t((src.match(/_balMarca\(b\)/g)||[]).length>=2,'historial y stock marcan el origen');
t(src.includes("const APP_BUILD='2026-10-06b'")&&src.includes('build 2026-10-06b</span>'),'sello 06b en los dos lugares');
console.log(ok+' ok · '+bad+' fallas');process.exit(bad?1:0);
