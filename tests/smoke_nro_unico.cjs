// smoke 21a — numeración sin repetir: último por id (no por texto) + reintento de alta si el número choca
// uso: node tests/smoke_nro_unico.cjs fabrica_bolsas_v6.html
const fs=require('fs');const src=fs.readFileSync(process.argv[2]||'fabrica_bolsas_v6.html','utf8');
const grab=(a,b)=>{const i=src.indexOf(a),j=src.indexOf(b,i);if(i<0||j<0)throw new Error('falta '+a);return src.slice(i,j);};
let ok=0,bad=0;const t=(c,m)=>{if(c)ok++;else{bad++;console.log('✗ '+m);}};
const DB={contadores:{numero_orden_corte:1052993},ordenes_corte:[{id:19,numero_orden:'oc-5701'},{id:1026,numero_orden:'OC-1052994'},{id:1027,numero_orden:'OC-1052995'}]};
function q(tabla){const st={tabla,f:{}};const api={
  select(){return api;},eq(k,v){st.f[k]=v;return api;},order(){return api;},limit(){return Promise.resolve({data:[...DB[tabla]].sort((a,b)=>b.id-a.id),error:null});},
  maybeSingle(){return Promise.resolve({data:{valor:DB.contadores[st.f.nombre]},error:null});},
  upsert(o){DB.contadores[o.nombre]=o.valor;return Promise.resolve({error:null});},
  insert(p){st.ins=p;return api;},
  single(){const p=st.ins;if(DB[tabla].some(r=>r.numero_orden.toUpperCase()===p.numero_orden.toUpperCase()))return Promise.resolve({data:null,error:{code:'23505',message:'duplicate key value violates unique constraint'}});
    const r={...p,id:Math.max(...DB[tabla].map(x=>x.id))+1};DB[tabla].push(r);return Promise.resolve({data:r,error:null});}};return api;}
global.sb={from:q};
eval(grab('function _nroDe(','async function generarNroBobina(')+grab('async function generarNroOC(','// Generador de número ORD'));
(async()=>{
  const r=await _nroSiguiente('numero_orden_corte','ordenes_corte','numero_orden','OC-',5);
  t(r.txt==='OC-1052996','con el contador atrás (993) igual da la 996: '+r.txt);
  DB.contadores.numero_orden_corte=1052993;
  const x=await _ocInsertar({numero_orden:'OC-1052994',cliente:'X'});
  t(x.data&&x.data.numero_orden==='OC-1052996','número repetido → reintenta con el siguiente libre: '+(x.data&&x.data.numero_orden));
  t(DB.contadores.numero_orden_corte>=1052996,'contador queda al día');
  const nums=DB.ordenes_corte.map(r=>r.numero_orden.toUpperCase());t(new Set(nums).size===nums.length,'sin repetidos');
  console.log((bad?'':'OK ')+'smoke_nro_unico: '+ok+' ok, '+bad+' mal');process.exit(bad?1:0);
})();
