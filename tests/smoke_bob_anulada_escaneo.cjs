// smoke 03b — bobina anulada escaneada en corte: avisa y deja nota
// uso: node tests/smoke_bob_anulada_escaneo.cjs fabrica_bolsas_v6.html
const fs=require('fs');const src=fs.readFileSync(process.argv[2]||'fabrica_bolsas_v6.html','utf8');
const a=src.indexOf('// ===== 🔎 BOBINA ANULADA ESCANEADA');const b=src.indexOf('function procesarEscaneoBobina(raw){');
if(a<0||b<0){console.log('FALTA el bloque');process.exit(1);}
let ok=0,bad=0;const t=(c,m)=>{if(c)ok++;else{bad++;console.log('✗ '+m);}};
global.localDate=()=>'2026-10-03';global.localTime=()=>'12:40:11';
let db={},upd=null;
global.sb={from:()=>({select(){return this;},eq(c,v){this.v=v;return this;},
  maybeSingle(){return Promise.resolve({data:db[this.v]||null,error:null});},
  update(o){upd=o;return {eq:()=>Promise.resolve({error:null})};}})};
eval(src.slice(a,b));
(async()=>{
  let fb=[];const f=(m,c)=>fb.push(m);
  db['BOB-05982']={id:6051,numero_bobina:'BOB-05982',anulada:true,anulada_motivo:'duplicada (doble clic)',observaciones:null};
  await _bobAnuladaEscaneada('BOB-05982','Panel de corte','ARAUJO',f);
  t(fb.length===2&&/no encontrada/.test(fb[0])&&/ANULADA/.test(fb[1])&&/duplicada/.test(fb[1]),'avisa que está anulada');
  t(upd&&/ESCANEADA EN CORTE 2026-10-03 12:40 \(Panel de corte · ARAUJO\)/.test(upd.observaciones),'deja la nota en la bobina');
  fb=[];upd=null;db['BOB-00001']={id:1,numero_bobina:'BOB-00001',anulada:false};
  await _bobAnuladaEscaneada('BOB-00001','x','',f);
  t(fb.length===1&&!upd,'no anulada: sólo «no encontrada», no escribe');
  fb=[];await _bobAnuladaEscaneada('BOB-99999','x','',f);
  t(fb.length===1&&!upd,'inexistente: sólo «no encontrada»');
  db['BOB-1']={id:2,anulada:true,observaciones:'prev'};await _bobAnuladaEscaneada('BOB-1','x','',f);
  t(upd&&/^prev \| ⚠ ESCANEADA/.test(upd.observaciones),'conserva observaciones previas');
  t(src.includes("_bobAnuladaEscaneada(nro,'Confección'")&&src.includes("await _bobAnuladaEscaneada(nro,'Panel de corte'"),'enganchado en pistola y panel');
  console.log(ok+' ok · '+bad+' fallas');process.exit(bad?1:0);
})();
