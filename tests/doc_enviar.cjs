// 25d: enviar recibo / orden de pago por WhatsApp o mail
const fs=require('fs');const s=fs.readFileSync(process.argv[2],'utf8');
let ok=true;const t=(n,c)=>{if(!c){ok=false;console.error('✗ '+n);}else console.log('✓ '+n);};
const i=s.indexOf('function _waNum(');const j=s.indexOf('let _docEnv=null;',i);
const f=new Function('fmtMoney',s.slice(i,j)+';return {_waNum,_docMensaje};')(v=>'$'+v);
t('221 555-1234 → 5492215551234',f._waNum('221 555-1234')==='5492215551234');
t('0221 15 5551234 → sin 0 ni 15',f._waNum('0221 15 5551234')==='5492215551234');
t('+54 9 221… queda igual',f._waNum('+54 9 221 5551234')==='5492215551234');
t('+54 221… agrega el 9',f._waNum('+54 221 5551234')==='5492215551234');
t('vacío → vacío',f._waNum('')==='');
const m=f._docMensaje({titulo:'Recibo',numero:'REC-1',fecha:'17/11/2026',total:{monto:1000},resumen:[['Queda a cuenta del cliente',100]],secciones:[{t:'Valores recibidos',filas:[['E-cheq','Galicia · N° 1','17/12/2026','$800']]},{t:'Comprobantes que cancela',filas:[['Factura A 1','13/11/2026','$900','<b>$900</b>']]}]},'ARIALPLAST');
t('mensaje: recibo, total, valores, comprobantes sin HTML, a cuenta',/el recibo N° REC-1 de ARIALPLAST/.test(m)&&/\$1000/.test(m)&&/E-cheq · Galicia · N° 1 — \$800/.test(m)&&/Factura A 1 — \$900/.test(m)&&!/<b>/.test(m)&&/Queda a cuenta del cliente: \$100/.test(m));
t('contacto del cliente en configuracion, sin ALTER',/clave:'cli_contacto'/.test(s));
t('botones de enviar en recibos y pagos',(s.match(/docEnviar\(\\'recibo\\'/g)||[]).length>=2&&(s.match(/docEnviar\(\\'pago\\'/g)||[]).length>=2);
t('el PDF no hereda el tema oscuro',/\.dc td\{background:transparent;color:#111;\}/.test(s));
process.exit(ok?0:1);
