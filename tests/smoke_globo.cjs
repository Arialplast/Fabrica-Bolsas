// smoke 14b — 🎈 globo pinchado vs fotocélula (causa del «FILM xx %» de un cierre)
// uso: TZ=America/Argentina/Buenos_Aires node tests/smoke_globo.cjs fabrica_bolsas_v6.html
const fs=require('fs');const src=fs.readFileSync(process.argv[2]||'fabrica_bolsas_v6.html','utf8');
const a=src.indexOf('// ===== 🎈 GLOBO PINCHADO vs FOTOCÉLULA');const b=src.indexOf('// Pura: metros CON FILM de la bobina en curso');
if(a<0||b<0||b<a){console.log('FALTA el bloque');process.exit(1);}
let ok=0,bad=0;const t=(c,m)=>{if(c)ok++;else{bad++;console.log('✗ '+m);}};
global._plcHora=iso=>{const d=new Date(iso);return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');};
eval(src.slice(a,b).replace('const PLC_GLOBO=','global.PLC_GLOBO='));
const F=0.8,T0=new Date('2026-10-14T10:00:00-03:00').getTime();
// arma filas de plc_minutos desde una lista de [bruto, film] por minuto
function serie(pm){const rows=[{ts:new Date(T0).toISOString(),odo_bruto:1000,odo_film:900}];
  pm.forEach(([br,fi],i)=>{const p=rows[rows.length-1];rows.push({ts:new Date(T0+(i+1)*60000).toISOString(),odo_bruto:p.odo_bruto+br,odo_film:p.odo_film+fi});});return rows;}
function cierreDe(pm){const br=pm.reduce((s,x)=>s+x[0],0),fi=pm.reduce((s,x)=>s+x[1],0);
  return{pulsosBruto:br,pulsos:fi,metros:Math.round(fi*F),metrosBruto:Math.round(br*F),filmPct:br?Math.round(fi/br*1000)/10:null,
    desde:new Date(T0).toISOString(),cerrado_en:new Date(T0+pm.length*60000).toISOString()};}
const run=pm=>{const c=cierreDe(pm);const m=_plcMinsEntre(_plcMinDeltas(serie(pm)),c.desde,c.cerrado_en);return{c,cf:_plcCausaFilm(c,m,F)};};
const N=(n,v)=>Array.from({length:n},()=>v.slice());

// 1) bobina sana: todo con film
{const{cf}=run(N(40,[40,40]));t(cf.tipo==='ok','sana → ok ('+cf.tipo+')');t(!cf.pregunta,'sana no pregunta');}
// 2) globo pinchado puro: 10 ok, 5 min film 0, 10 ok
{const pm=[...N(10,[40,40]),...N(5,[40,0]),...N(10,[40,40])];const{c,cf}=run(pm);
 t(cf.tipo==='globo','pinchazo → globo ('+cf.tipo+')');t(cf.bloques.length===1,'1 bloque');
 t(cf.globoM===160,'metros globo = 5×40×0,8 = 160 ('+cf.globoM+')');t(cf.bloques[0].min===5,'5 min');
 t(_plcTxtGlobo(cf.bloques[0])==='Globo pinchado 10:10–10:15 (160 m)','texto: '+_plcTxtGlobo(cf.bloques[0]));
 t(!cf.pregunta,'globo no pregunta');t(c.filmPct<95,'film < 95 % ('+c.filmPct+')');}
// 3) dos bloques separados
{const pm=[...N(5,[40,40]),...N(2,[40,0]),...N(5,[40,40]),...N(3,[40,0]),...N(5,[40,40])];const{cf}=run(pm);
 t(cf.bloques.length===2,'2 bloques ('+cf.bloques.length+')');t(cf.globoM===160,'2+3 min = 160 m ('+cf.globoM+')');}
// 4) bordes parciales del pinchazo NO son fotocélula
{const pm=[...N(10,[40,40]),[40,20],...N(4,[40,0]),[40,10],...N(10,[40,40])];const{cf}=run(pm);
 t(cf.tipo==='globo','con bordes sigue globo ('+cf.tipo+', foto '+cf.fotoPct+' %)');t(cf.globoM===128,'4 min de bloque = 128 m ('+cf.globoM+')');}
// 5) fotocélula: pérdida repartida 10 % en todos los minutos
{const{cf}=run(N(40,[40,36]));t(cf.tipo==='foto','repartida 10 % → foto ('+cf.tipo+')');t(Math.abs(cf.fotoPct-10)<0.01,'10 % ('+cf.fotoPct+')');t(!cf.pregunta,'foto no pregunta');
 t(cf.fotoM===128,'perdió 40×4×0,8 = 128 m ('+cf.fotoM+')');}
// 6) repartida chica (2 %) → no es aviso
{const pm=[...N(20,[40,40]),...N(20,[50,48])];const{cf}=run(pm);t(cf.tipo==='ok','2 % → ok ('+cf.tipo+' '+cf.fotoPct+')');}
// 7) los dos → ambos, pregunta
{const pm=[...N(10,[40,36]),...N(4,[40,0]),...N(10,[40,36]),...N(10,[40,30])];const{cf}=run(pm);
 t(cf.tipo==='ambos','globo + foto → ambos ('+cf.tipo+')');t(cf.pregunta,'ambos pregunta');}
// 8) faltan minutos y film bajo → duda
{const pm=N(30,[40,30]);const c=cierreDe(pm);const m=_plcMinsEntre(_plcMinDeltas(serie(pm)).slice(0,10),c.desde,c.cerrado_en);const cf=_plcCausaFilm(c,m,F);
 t(cf.tipo==='duda','cobertura 33 % → duda ('+cf.tipo+' cob '+cf.cob+')');t(cf.pregunta,'duda pregunta');}
// 9) minuto parado (bruto 0) corta el bloque, y no cuenta
{const pm=[...N(5,[40,40]),...N(2,[40,0]),...N(3,[0,0]),...N(2,[40,0]),...N(5,[40,40])];const{cf}=run(pm);
 t(cf.bloques.length===2,'parada en medio → 2 bloques ('+cf.bloques.length+')');}
// 10) film < 1 % cuenta como 0
{const pm=[...N(5,[40,40]),...N(3,[400,2]),...N(5,[40,40])];const{cf}=run(pm);t(cf.bloques.length===1&&cf.tipo==='globo','film 0,5 % → globo ('+cf.tipo+')');}
// 11) respuesta del operario
{const pm=[...N(10,[40,36]),...N(4,[40,0]),...N(10,[40,36]),...N(10,[40,30])];const{c,cf}=run(pm);
 const perd=c.metrosBruto-c.metros;
 const si=_plcCausaFinal(cf,Object.assign({},c,{globo_pinchado:true}));t(si.tipo==='globo'&&si.globoM===perd&&si.resp===true,'Sí → todo globo ('+si.globoM+'/'+perd+')');
 const no=_plcCausaFinal(cf,Object.assign({},c,{globo_pinchado:false}));t(no.tipo==='foto'&&no.fotoM===perd&&!no.bloques.length,'No → todo fotocélula');
 const nada=_plcCausaFinal(cf,c);t(nada.tipo==='ambos'&&nada.resp===null,'sin respuesta queda ambos');
 t(_plcNecesitaGlobo(Object.assign({cf},c)),'pendiente sin respuesta necesita pregunta');
 t(!_plcNecesitaGlobo(Object.assign({cf},c,{globo_pinchado:false})),'ya respondido no pregunta');
 t(_plcNecesitaGlobo({filmPct:70}),'sin minutos y film 70 % → pregunta');t(!_plcNecesitaGlobo({filmPct:99}),'sin minutos y film 99 % → no');}
// 12) el respondido en una bobina sin pregunta no cambia nada
{const{c,cf}=run([...N(10,[40,40]),...N(5,[40,0])]);const f=_plcCausaFinal(cf,Object.assign({},c,{globo_pinchado:false}));t(f.tipo==='globo','globo claro no se cambia por respuesta');}
// 13) intervalo: minutos de antes del desde no entran
{const pm=[...N(5,[40,0]),...N(20,[40,40])];const rows=serie(pm);const c=cierreDe(pm.slice(5));c.desde=new Date(T0+5*60000).toISOString();
 const cf=_plcCausaFilm(c,_plcMinsEntre(_plcMinDeltas(rows),c.desde,c.cerrado_en),F);t(cf.tipo==='ok'&&!cf.bloques.length,'pinchazo del cierre anterior no entra ('+cf.tipo+')');}
console.log((bad?'✗':'✓')+' smoke_globo: '+ok+' OK, '+bad+' fallas');process.exit(bad?1:0);
