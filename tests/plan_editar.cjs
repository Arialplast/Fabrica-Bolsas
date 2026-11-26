// 25n: editar la orden desde la tarjeta de Planificar
const fs=require('fs');const s=fs.readFileSync(process.argv[2],'utf8');
let ok=true;const t=(n,c)=>{if(!c){ok=false;console.error('✗ '+n);}else console.log('✓ '+n);};
const i=s.indexOf('function planEditar(');const F=new Function('abrirEditarOrdenCorte','abrirEditarOrdenExtrusion',s.slice(i,s.indexOf('\n',i))+';return planEditar;');
let q=[];const pe=F(id=>q.push('oc'+id),id=>q.push('oe'+id));pe('oc',5);pe('oe',7);
t('corte abre el editor de corte y extrusión el de extrusión',q.join()==='oc5,oe7');
t('el botón está en las tarjetas (las dos variantes usan _planBtnsImprimir)',/plan-btn-edit" onclick="event\.stopPropagation\(\);planEditar\(/.test(s));
t('los editores piden clave',/function abrirEditarOrdenExtrusion\(id\)\{\n  pedirAdminYEjecutar/.test(s)&&/function abrirEditarOrdenCorte\(id\)\{\n  pedirAdminYEjecutar/.test(s));
t('al guardar se repinta Planificar',(s.match(/_planRefrescar\(\);   \/\/ 25n/g)||[]).length===2);
t('descripción completa',/#page-planificar \.plan-producto,#page-planificar \.plan-compact \.plan-producto\{white-space:normal !important/.test(s));
process.exit(ok?0:1);
