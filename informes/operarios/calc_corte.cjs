// Cálculo de corte por turno fichado. Uso: node calc_corte.cjs <dir_trabajo> <desde ISO> <hasta ISO>
// Lee datos.json y tandas.json de <dir_trabajo>; escribe corte.json. Usa las mismas reglas que el MES (Corte en vivo).
const fs=require('fs'),path=require('path');
const W=process.argv[2],DESDE=new Date(process.argv[3]).getTime(),HASTA=new Date(process.argv[4]).getTime();
const src=fs.readFileSync(path.join(__dirname,'../../fabrica_bolsas_v6.html'),'utf8');
const CFG=JSON.parse(fs.readFileSync(path.join(__dirname,'config.json')));const AJ=JSON.parse(fs.readFileSync(path.join(__dirname,'ajustes.json')));
const D=JSON.parse(fs.readFileSync(path.join(W,'datos.json')));const TD=JSON.parse(fs.readFileSync(path.join(W,'tandas.json')))||[];
global.C={empleados:(D.emp||[]),maq_corte:[{id:1,nombre:'CORTE-01'},{id:2,nombre:'CORTE-02'},{id:3,nombre:'CORTE-3'}]};
global.localDate=()=>new Date(HASTA).toISOString().slice(0,10);global.escapeHtml=x=>String(x==null?'':x);global._plcHora=s=>new Date(s).toTimeString().slice(0,5);
const a=src.indexOf('// ===== ✂ CORTE EN VIVO (15b) =====');const b=src.indexOf('function _cvvCard(');
eval(src.slice(a,b).replace('const CVV=','global.CVV=').replace('const CVV_PAUSA_MIN=3,CVV_LARGA_MIN=20;','global.CVV_PAUSA_MIN=3;global.CVV_LARGA_MIN=20;').replace('const _CVV_OPCOL','global._CVV_OPCOL'));
const pa=src.indexOf('const PST={'),pb=src.indexOf('// ---- datos del panel ----');eval(src.slice(pa,pb).replace('const PST=','global.PST='));
global.PLC={cfg:{factor:{'1':{m_pulso:0.2475},'3':{m_pulso:0.793},'7':{m_pulso:0.793}}}};
// ajustes de salida
(AJ.salida_tope||[]).forEach(t=>{(D.fich||[]).forEach(f=>{if(f.empleado_id===t.emp&&f.fecha===t.fecha&&f.tipo==='salida'&&f.hora.slice(0,5)>t.hasta)f.hora=t.hasta+':00';});});
const ocs={};(D.oc||[]).forEach(o=>ocs[o.id]=o);const ocNum=id=>(ocs[id]||{}).numero_orden;
const noMano=new Set((AJ.oc_no_cuenta_a_mano||[]).map(x=>x.oc));
const sinEsc=(AJ.cargas_sin_escanear||[]);
const cargas=(D.ocb||[]).filter(c=>CVV.maqs.includes(c.maquina_id)).map(c=>Object.assign({t:new Date(c.fecha_asignacion).getTime()},c));
const esSinEsc=c=>c.origen==='manual'&&sinEsc.some(s=>s.oc.includes(ocNum(c.orden_corte_id))&&c.t>=new Date(s.desde).getTime()&&c.t<new Date(s.hasta).getTime());
const turnos=_cvvTurnos(D.fich||[],HASTA);
const tandas=_cvvAsignar(TD.map(t=>Object.assign({ti:new Date(t.inicio).getTime(),tf:new Date(t.fin).getTime()},t)),cargas,ocs,turnos);
const ocsR=_cvvOCs(tandas,cargas,ocs);const ocPor={};ocsR.forEach(o=>ocPor[o.id]=o);
// huecos del registrador (ninguna cortadora con golpes > 3 h)
const fins=tandas.map(t=>t.tf).sort((x,y)=>x-y);const huecos=[];
for(let i=1;i<fins.length;i++)if(fins[i]-fins[i-1]>3*3600000)huecos.push([fins[i-1],fins[i]]);
const hhmm=t=>new Date(t).toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'America/Argentina/Buenos_Aires'});
const out=[];const corteDesde=new Date(CFG.corte_desde).getTime();
for(const e of Object.keys(CFG.cortadores)){(turnos[e]||[]).forEach(([ta,tz])=>{if(ta<DESDE||ta>=HASTA)return;
  const O=_cvvOperarios(tandas,cargas,{[e]:[[ta,tz]]},ta-1,tz+1).find(x=>x.emp===e);
  const tds=tandas.filter(t=>String(t.emp)===e&&t.ti>=ta-60000&&t.ti<=tz+60000);
  let bolsas=0;tds.forEach(t=>{const o=ocPor[t.oc];if(o&&o.pistas)bolsas+=t.golpes*o.pistas;});
  const cs=cargas.filter(c=>String(c.empleado_id)===e&&c.t>=ta-3600000&&c.t<=tz);
  // paradas: cambio de bobina si se escaneó una bobina en esa cortadora durante la parada o hasta 5 min después
  const runs=_cvvCorridas(tds,null);const P=[];
  for(let i=1;i<runs.length;i++){const g0=runs[i-1].z,g1=runs[i].a,min=(g1-g0)/60000;if(min<=CVV_PAUSA_MIN)continue;
    const mq=[runs[i-1].maq,runs[i].maq];const sc=cargas.filter(c=>mq.includes(c.maquina_id)&&c.t>=g0-60000&&c.t<=g1+300000);
    P.push({min,larga:min>CVV_LARGA_MIN,cambio:sc.length>0});}
  let excl=null;
  if(ta<corteDesde)excl='el registrador de golpes todavía no funcionaba';
  huecos.forEach(([h0,h1])=>{const ov=Math.min(h1,tz)-Math.max(h0,ta);if(!(ov>3*3600000&&ov>0.4*(tz-ta)))return;
    // sólo es «sin datos» si había otro cortador fichado que tampoco cortó; si estaba solo, el tiempo es suyo
    const a0=Math.max(h0,ta),z0=Math.min(h1,tz);
    const otros=Object.keys(CFG.cortadores).filter(o=>o!==e&&(turnos[o]||[]).some(([x,y])=>Math.min(y,z0)-Math.max(x,a0)>2*3600000));
    if(otros.length)excl=`ninguna cortadora dio golpes de ${hhmm(h0)} a ${hhmm(h1)} con dos cortadores fichados (revisar: corte de luz o registrador)`;});
  (AJ.excluir_turno||[]).forEach(x=>{if(String(x.emp)===e&&new Date(ta).toISOString().slice(0,10)===x.fecha)excl=x.motivo;});
  const conOrigen=ta>=new Date(CFG.origen_carga_desde).getTime();
  out.push({emp:+e,a:ta,z:tz,excl,fich:(tz-ta)/60000,cort:O?O.cort/60000:0,larga:O?O.larga/60000:0,nLarga:O?O.nLarga:0,arr:O?O.arr/60000:0,cie:O?O.cie/60000:0,sinG:O?O.sinG/60000:0,
    golpes:O?O.golpes:0,bolsas,cargas:cs.length,conOrigen,
    mano:conOrigen?cs.filter(c=>c.origen==='manual'&&!noMano.has(ocNum(c.orden_corte_id))&&!esSinEsc(c)).length:null,
    sinEsc:conOrigen?cs.filter(esSinEsc).length:null,
    cbN:P.filter(p=>p.cambio&&!p.larga).length,cbT:P.filter(p=>p.cambio&&!p.larga).reduce((s,p)=>s+p.min,0),cbL:P.filter(p=>p.cambio&&!p.larga).map(p=>p.min),
    ocN:P.filter(p=>!p.cambio&&!p.larga).length,ocT:P.filter(p=>!p.cambio&&!p.larga).reduce((s,p)=>s+p.min,0),
    largas:O?O.largas.map(l=>({a:hhmm(l.a),z:hhmm(l.z),min:Math.round((l.z-l.a)/60000)})):[]});});}
// cierres de OC completadas en el período
const tabla={orden_corte_bobinas:D.ocb||[],corte_tandas:TD,ordenes_corte:D.oc||[]};
const q=n=>{let rows=tabla[n].slice();const o={select(){return o;},eq(c,v){rows=rows.filter(r=>r[c]===v);return o;},in(c,v){rows=rows.filter(r=>v.includes(r[c]));return o;},
 gte(c,v){rows=rows.filter(r=>new Date(r[c])>=new Date(v));return o;},order(){return o;},range(x,y){return Promise.resolve({data:rows.slice(x,y+1),error:null});},then(f,r){return Promise.resolve({data:rows,error:null}).then(f,r);}};return o;};
global._plcCfg=async()=>PLC.cfg;global.sb={from:q};global._traerQ=async b=>b().range(0,999999);
(async()=>{const cierres=[];
 for(const oc of (D.oc||[])){if(oc.estado!=='Completada'||!oc.fecha_completada)continue;const fc=new Date(oc.fecha_completada).getTime();if(fc<DESDE||fc>=HASTA)continue;
  if(!cargas.some(c=>c.orden_corte_id===oc.id))continue;
  const obs=(oc.observaciones||'').split('\n✂')[0];
  try{const R=await _cvvControlCierre({id:oc.id,numero_orden:oc.numero_orden,observaciones:obs},oc.unidades_reales,parseFloat(oc.peso_scrap_kg||0),oc.productos);if(!R)continue;
   const emps={};R.tds.forEach(t=>{if(t.emp!=null)emps[t.emp]=(emps[t.emp]||0)+t.golpes;});
   const main=Object.keys(emps).sort((x,y)=>emps[y]-emps[x])[0]||null;
   const cb=cargas.filter(c=>c.orden_corte_id===oc.id);const sinPlc=cb.filter(c=>!(c.bobinas_producidas&&c.bobinas_producidas.plc_cierre_id)).length;
   cierres.push({sinPlc,nb:cb.length,n:oc.numero_orden,cli:oc.cliente,prod:oc.productos.descripcion,decl:oc.unidades_reales,scrap:+oc.peso_scrap_kg,teo:R.teo,faltan:R.faltan,pct:R.pct,golpes:R.golpes,gEsp:R.gEsp,dif:R.difGolpes,emps,main:main?+main:null,
     expl:((oc.observaciones||'').match(/EXPLICACIÓN DEL OPERARIO: ([^\n\]]*)/)||[])[1]||null,fecha:oc.fecha_completada});}catch(e){}}
 fs.writeFileSync(path.join(W,'corte.json'),JSON.stringify({turnos:out,cierres,huecos}));
 console.log('corte:',out.length,'turnos,',cierres.length,'cierres');})();
