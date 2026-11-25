// 24b: la pantalla nueva de Pago a proveedor conserva todos los ids que usan guardarPago / recalcPago / initNuevoPago
const fs=require('fs');const s=fs.readFileSync(process.argv[2],'utf8');
let ok=true;const t=(n,c)=>{if(!c){ok=false;console.error('✗ '+n);}else console.log('✓ '+n);};
const i=s.indexOf('<div class="page" id="page-nuevo-pago">');const j=s.indexOf('id="page-nuevo-recibo"',i);const h=s.slice(i,j);
['npag-prov','npag-plano','npag-fecha','npag-wrap','npag-docs','npag-efectivo','npag-cheques','npag-tot','npag-tot-efectivo','npag-tot-cheques','npag-entregado','npag-resto','npag-warn','npag-hint','npag-rec-w','npag-rec','npag-rec-txt','npag-obs','msg-npag'].forEach(id=>t('id '+id,h.includes('id="'+id+'"')));
t('resumen dice qué es la diferencia',/Falta entregar/.test(s)&&/Cierra justo/.test(s));
t('completar con lo que falta',/function npagEfCompletar\(i\)/.test(s));
t('comprobantes tildables',/function npagDocToggle\(key,on\)/.test(s)&&/function npagDocAll\(on\)/.test(s));
t('estilo claro scoped',/#page-nuevo-pago\{--bg:#f6f7f9/.test(s));
process.exit(ok?0:1);
