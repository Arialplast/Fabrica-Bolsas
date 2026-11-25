// 25a: orden de pago impresa
const fs=require('fs');const s=fs.readFileSync(process.argv[2],'utf8');
let ok=true;const t=(n,c)=>{if(!c){ok=false;console.error('✗ '+n);}else console.log('✓ '+n);};
const i=s.indexOf('function _opDatos(');const j=s.indexOf('function imprimirOrdenPago(',i);
const C={proveedores:[{id:7,nombre:'ACME',cuit:'30-1'}],compras_gastos:[{id:1,comprobante_tipo:'Factura A',comprobante_numero:'0001-5',fecha:'2026-11-01',total:1000,categoria:'mp'},{id:2,fecha:'2026-11-05',total:500,categoria:'mp',descripcion:'film'}],
 pagos_proveedores:[{pago_id:9,compra_gasto_id:1,monto:1000},{pago_id:9,compra_gasto_id:2,monto:200}],cuentas_caja:[{id:2,nombre:'CREDICOOP'},{id:3,nombre:'CAJA1'}],
 movimientos_caja:[{origen_tipo:'pago_efectivo',origen_id:9,cuenta_id:2,monto:600},{origen_tipo:'pago_efectivo',origen_id:9,cuenta_id:3,monto:300}]};
const env={C,r2:x=>Math.round(x*100)/100,cgCatLabel:()=>'🧱 Materia prima',cgSaldoDoc:c=>c.id===2?300:0,_pvLineasDePago:id=>C.pagos_proveedores.filter(l=>l.pago_id===id),
 _pvChequesPago:()=>[{banco:'Galicia',numero_cheque:'123',fecha_vto:'2026-12-05',cliente_id:1,monto:400}],lcCliNombre:()=>'CLIENTE X',_pvRecargoDe:()=>null,escapeHtml:x=>String(x),fmtMoney:v=>'$'+v};
const f=new Function(...Object.keys(env),s.slice(i,j)+';return {_opDatos,_opHtml};')(...Object.values(env));
const D=f._opDatos({id:9,numero:'PAG-000050',fecha:'2026-11-25',plano:'blanco',proveedor_id:7,total:1300,total_cheques:400});
t('comprobantes: dos, con número o categoría sin emoji',D.comps.length===2&&D.comps[0].doc==='Factura A 0001-5'&&D.comps[1].doc==='Materia prima');
t('queda de cada comprobante',D.comps[0].saldo===0&&D.comps[1].saldo===300);
t('efectivo por cuenta (2) y cheque',D.efectivo.length===2&&D.efectivo[0].cuenta==='CREDICOOP'&&D.cheques[0].vto==='05/12/2026');
t('aplicado 1.200, a cuenta 100',D.aplicado===1200&&D.aCuenta===100);
const D1=f._opDatos({id:8,numero:'PAG-1',fecha:'2026-11-25',proveedor_id:7,total:900,total_cheques:400,cuenta_id:3});
t('una sola cuenta: total − cheques desde la cabecera',D1.efectivo.length===1&&D1.efectivo[0].monto===500&&D1.efectivo[0].cuenta==='CAJA1');
const h=f._opHtml(D,{rs:'ARIALPLAST',cuit:'30-9',dir:''},'ORIGINAL');
t('html: título, proveedor, total y a cuenta',/Orden de pago/.test(h)&&/ACME/.test(h)&&/\$1300/.test(h)&&/queda a cuenta/.test(h));
t('negro: documento interno sin CUIT',/DOCUMENTO INTERNO/.test(f._opHtml({...D,plano:'negro'},{rs:'A',cuit:'30-9'},'X'))&&!/CUIT 30-9/.test(f._opHtml({...D,plano:'negro'},{rs:'A',cuit:'30-9'},'X')));
t('al registrar queda la pantalla con imprimir',/_npagHecho\(pg\.id,/.test(s)&&/imprimirOrdenPago\('\+pg\.id\+'\)/.test(s));
process.exit(ok?0:1);
