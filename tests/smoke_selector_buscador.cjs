// smoke 29b — selectores con buscador y buscador de clientes del 360° (funciones puras)
// uso: node tests/smoke_selector_buscador.cjs fabrica_bolsas_v6.html
const fs=require('fs');const src=fs.readFileSync(process.argv[2]||'fabrica_bolsas_v6.html','utf8');
const grab=(ini,fin)=>{const a=src.indexOf(ini),b=src.indexOf(fin,a);if(a<0||b<0){console.log('FALTA '+ini);process.exit(1);}return src.slice(a,b);};
eval(grab('function _qkNorm(','function _qkFiltrar('));
eval(grab('function _sbFiltrar(','function _sbTitulo('));
eval(grab('function _c360Filtrar(','function _c360BarraEntrar('));
let ok=0,bad=0;const t=(x,m)=>{if(x)ok++;else{bad++;console.log('✗ '+m);}};

// ---- selector genérico ----
const O=[
  {i:0,v:'',t:'— seleccionar —',g:''},
  {i:1,v:'55',t:'PAPELERA FENIX',g:''},
  {i:2,v:'33',t:'GARCIA JULIO',g:''},
  {i:3,v:'34',t:'GARCIA LEONARDO',g:''},
  {i:4,v:'1',t:'LYME S.A.',g:''},
  {i:5,v:'9',t:'Muñoz Ezequiel',g:''},
  {i:6,v:'7',t:'BIGVEF',g:'Mayoristas'},
];
let r=_sbFiltrar(O,'');
t(r.length===O.length&&r[0].i===0,'vacío: todas en su orden, con la opción «seleccionar»');
r=_sbFiltrar(O,'garcia');
t(r.length===2&&r[0].v==='33','«garcia» → los dos García, en orden');
r=_sbFiltrar(O,'jul gar');
t(r.length===1&&r[0].v==='33','palabras en cualquier orden');
r=_sbFiltrar(O,'fenix');
t(r.length===1&&r[0].v==='55','encuentra por una palabra del medio');
r=_sbFiltrar(O,'munoz');
t(r.length===1&&r[0].v==='9','«munoz» encuentra Muñoz');
r=_sbFiltrar(O,'mayoristas');
t(r.length===1&&r[0].v==='7','busca también por el grupo');
r=_sbFiltrar(O,'leo');
t(r[0].v==='34','una palabra que empieza igual sube');
r=_sbFiltrar(O,'seleccionar');
t(r.length===1,'la opción vacía con texto se puede buscar');
t(_sbFiltrar(O,'zzz').length===0,'nada → vacío');
r=_sbFiltrar(O,'l');
t(r[0].v==='1','«l»: primero el que EMPIEZA con L (LYME)');

// ---- clientes 360 ----
const CL=[
  {id:55,nombre:'PAPELERA FENIX',razon_social:'Papelera Fénix SRL',codigo:'C055',cuit:'30-71234567-8'},
  {id:33,nombre:'GARCIA JULIO',codigo:'C033',cuit:'20-22222222-3'},
  {id:34,nombre:'GARCIA LEONARDO',codigo:'C034'},
  {id:1,nombre:'LYME',razon_social:'LYME S.A.',codigo:'C001',cuit:'30-55555555-1'},
];
t(_c360Filtrar(CL,'').length===0,'sin texto no lista nada (muestra recientes)');
r=_c360Filtrar(CL,'garcia');
t(r.length===2&&r[0].id===33,'«garcia» → 2, alfabético');
r=_c360Filtrar(CL,'fenix srl');
t(r.length===1&&r[0].id===55,'busca en la razón social');
r=_c360Filtrar(CL,'71234');
t(r.length===1&&r[0].id===55,'busca por CUIT sin guiones');
r=_c360Filtrar(CL,'30-5555');
t(r.length===1&&r[0].id===1,'busca por CUIT con guiones');
r=_c360Filtrar(CL,'c034');
t(r[0].id===34,'código exacto primero');
r=_c360Filtrar(CL,'ly');
t(r.length===1&&r[0].id===1,'empieza igual');
console.log((bad?'✗ ':'✓ ')+ok+' ok · '+bad+' fallas');process.exit(bad?1:0);
