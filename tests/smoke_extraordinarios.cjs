// 13c — Extraordinarios debajo del Resultado del mes (multas y gastos marcados).
// Uso: TZ=America/Argentina/Buenos_Aires node tests/smoke_extraordinarios.cjs fabrica_bolsas_v6.html
// Datos inventados (el repo es público).
const fs=require('fs');
const src=fs.readFileSync(process.argv[2],'utf8');
let ok=0,bad=0;const t=(c,m)=>{if(c)ok++;else{bad++;console.error('✗ '+m);}};
const cut=(a,b)=>{const i=src.indexOf(a),j=src.indexOf(b,i+1);if(i<0||j<0){console.error('no encontré '+a);process.exit(1);}return src.slice(i,j);};
const glob=s=>s.replace(/^function (\w+)/gm,'global.$1=function $1');

global.r2=x=>Math.round(x*100)/100;
global.escapeHtml=s=>String(s).replace(/</g,'&lt;');
global.C={
  categorias_gasto:[{codigo:'multas',nombre:'Multas y recargos'},{codigo:'raro',nombre:'Juicio (extraordinario)'},{codigo:'servicios',nombre:'Servicios'}],
  proveedores:[{id:29,nombre:'PROVEEDOR LUZ'}],
  compras_gastos:[
    {id:1,fecha:'2026-09-02',categoria:'multas',proveedor_id:29,neto:1000,total:1270,afecta_resultado:false,descripcion:'Multa luz',comprobante_numero:'0020-1'},
    {id:2,fecha:'2026-09-15',categoria:'servicios',proveedor_id:29,neto:100,total:121,afecta_resultado:true},
    {id:3,fecha:'2026-09-20',categoria:'raro',neto:500,total:500,afecta_resultado:true},
    {id:4,fecha:'2026-09-21',categoria:'otros',neto:0,total:300,afecta_resultado:true,observaciones:'algo · EXTRAORDINARIO (13/10)'},
    {id:5,fecha:'2026-10-01',categoria:'multas',neto:999,total:999,afecta_resultado:true},
    {id:6,fecha:'2026-09-10',categoria:'otros',neto:50,total:50,afecta_resultado:true,observaciones:'extraordinario en minúscula no cuenta'},
  ]};

eval(glob(cut('// ===== ⚡ EXTRAORDINARIOS EN EL RESULTADO DEL MES','async function renderResultadoMes')));

const cg=id=>C.compras_gastos.find(c=>c.id===id);
t(_rmEsExtra(cg(1)),'categoría multas es extraordinaria aunque afecta_resultado=false');
t(!_rmEsExtra(cg(2)),'servicios no es extraordinario');
t(_rmEsExtra(cg(3)),'categoría cuyo nombre dice extraordinario');
t(_rmEsExtra(cg(4)),'observación EXTRAORDINARIO');
t(!_rmEsExtra(cg(6)),'"extraordinario" en minúscula en obs no alcanza');
t(!_rmEsExtra(null),'null no rompe');

const ex=_rmExtraDelMes('2026-09-01','2026-09-30');
t(ex.docs.length===3,'septiembre: 3 extraordinarios (no el de octubre) → '+ex.docs.length);
t(ex.total===1800,'neto 1000+500 y total 300 cuando neto es 0 → '+ex.total);
t(_rmExtraDelMes('2026-10-01','2026-10-31').total===999,'octubre aparte');
t(_rmExtraDelMes('2026-08-01','2026-08-31').total===0,'mes sin extraordinarios = 0');

const fila=(lbl,m,sg,det)=>'['+lbl+'|'+m+'|'+sg+'|'+det+']';
t(_rmExtraHtml({total:0,docs:[]},500,fila)==='','sin extraordinarios no se dibuja nada');
const h=_rmExtraHtml(ex,5000,fila);
t(h.includes('[⚡ Extraordinarios|1800|−|'),'fila de extraordinarios');
t(h.includes('Resultado FINAL del mes')&&h.includes('$3.200'),'final = 5000 − 1800 = 3200');
t(h.includes('Multa luz · 0020-1'),'detalle con descripción y comprobante');
const h2=_rmExtraHtml(ex,1000,fila);
t(h2.includes('−$800')&&h2.includes('var(--red)'),'final negativo en rojo con signo');

// el resultado ordinario excluye los extraordinarios (filtro de opMes)
const rm=cut('async function renderResultadoMes','// 2b-bis)');
t(/!_comprasEsDeFijo\(c,vig\)&&!_rmEsExtra\(c\)\)/.test(rm),'opMes excluye extraordinarios');
t(src.includes('+_rmExtraHtml(extraCalcA,resultadoA,filaCasc)'),'cascada dibuja los extraordinarios debajo del resultado');

console.log((bad?'✗':'✓')+' smoke_extraordinarios: '+ok+' OK'+(bad?', '+bad+' FALLAN':''));
process.exit(bad?1:0);
