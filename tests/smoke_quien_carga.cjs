// smoke 20b — 👥 pantalla compartida: pregunta quién carga si la última carga de la máquina es de otra persona.
const fs=require('fs');const src=fs.readFileSync(process.argv[2]||'fabrica_bolsas_v6.html','utf8');
let ok=0,bad=0;const t=(c,m)=>{if(c)ok++;else{bad++;console.log('✗ '+m);}};
const i=src.indexOf('// ===== 👥 PANTALLA COMPARTIDA: ¿QUIÉN CARGA? (20b) =====');const j=src.indexOf('// ===== 📢 CARTEL GRANDE DEL LECTOR (07b) =====',i);
eval(src.slice(i,j));
global.C={maq_corte:[{id:2,nombre:'CORTE-02'}]};global.escapeHtml=x=>String(x);global._pcorteHora=s=>'07:51';
global._empNombre=id=>({1:'ARAUJO CELIA',5:'GUARAZ SERGIO'})[id]||'';
let ult=null,html='';global.sb={from:()=>{const q={select:()=>q,eq:()=>q,gte:()=>q,order:()=>q,limit:()=>Promise.resolve({data:ult?[ult]:[],error:null})};return q;}};
global.window={};global.document={activeElement:null,getElementById:()=>null,body:{insertAdjacentHTML:(w,h)=>{html=h;}}};
(async()=>{
 t(!_pcorteHayQuePreguntar(1,null),'máquina sin cargas: no pregunta');
 t(!_pcorteHayQuePreguntar(5,{empleado_id:5}),'misma persona: no pregunta');
 t(_pcorteHayQuePreguntar(1,{empleado_id:5}),'otra persona: pregunta');
 ult={empleado_id:5,fecha_asignacion:'x'};
 let p=_pcorteQuienCarga(2,1);await new Promise(r=>setImmediate(r));
 t(/GUARAZ SERGIO/.test(html)&&/ARAUJO CELIA/.test(html)&&/CORTE-02/.test(html),'cartel con los dos nombres y la máquina');
 t(!/<button/.test(html),'sin <button> (la pistola no lo confirma con Enter)');
 window._pqcRes(5);t(await p===5,'toca Guaraz → carga como Guaraz');
 p=_pcorteQuienCarga(2,1);await new Promise(r=>setImmediate(r));window._pqcRes(null);t(await p===null,'«No cargar» → no carga');
 ult={empleado_id:1,fecha_asignacion:'x'};t(await _pcorteQuienCarga(2,1)===1,'última carga suya → sigue sin preguntar');
 console.log((bad?'FALLA':'OK')+' smoke_quien_carga: '+ok+' ok, '+bad+' mal');process.exit(bad?1:0);
})();
