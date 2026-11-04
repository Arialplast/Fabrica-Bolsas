// 04p · Compras y Gastos pro: comprobante (tipo → plano/IVA), duplicados, vencimiento, montos.
const fs=require('fs');const src=fs.readFileSync(process.argv[2]||(__dirname+'/../fabrica_bolsas_v6.html'),'utf8');
let ok=0,fail=0;const t=(c,m)=>{if(c)ok++;else{fail++;console.log('FALLA',m);}};
function cuerpo(fn){const m=new RegExp('^function '+fn+'\\(','m').exec(src);if(!m)return null;const j=src.indexOf('\nfunction ',m.index+10);return src.slice(m.index,j<0?undefined:j);}
const tipos=/const CG_TIPOS=\[[\s\S]*?\];/.exec(src);t(!!tipos,'CG_TIPOS existe');
global.localDate=d=>{const x=d||new Date();return x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0');};
eval.call(global,tipos[0].replace('const CG_TIPOS','global.CG_TIPOS'));
global.C={compras_gastos:[{id:1,proveedor_id:5,comprobante_tipo:'Factura A',comprobante_numero:'0003-00059136',fecha:'2026-10-28',total:100}],proveedores:[{id:5,dias_pago:15}],pagos_proveedores:[]};
['_cgTipo','_cgNroFmt','_cgNroKey','_cgDuplicado','_cgDiasA','cgAddDays','_cgVence','_cgEsBanco'].forEach(f=>{const b=cuerpo(f);if(!b){t(false,'falta '+f);return;}eval.call(global,b.replace('function '+f,'global.'+f+'=function'));});
t(_cgTipo('Factura A').plano==='blanco'&&_cgTipo('Factura A').disc&&_cgTipo('Sin comprobante').plano==='negro'&&!_cgTipo('Factura B').disc,'tipo → plano e IVA discriminado');
t(_cgNroFmt('3','59136')==='0003-00059136'&&_cgNroFmt('','')===null,'número con formato PV-número');
t(!!_cgDuplicado(5,'Factura A','3-59136')&&!_cgDuplicado(5,'Factura B','3-59136')&&!_cgDuplicado(6,'Factura A','3-59136')&&!_cgDuplicado(5,'Factura A','3-59136',1),'duplicado: mismo proveedor + tipo + número (sin importar ceros)');
t(_cgVence({fecha:'2026-10-28',proveedor_id:5})==='2026-11-12'&&_cgVence({fecha:'2026-10-28',fecha_estimada_pago:'2026-11-01',proveedor_id:5})==='2026-11-01','vencimiento: el cargado o emisión + días de pago del proveedor');
t(_cgEsBanco({proveedor_id:null})&&!_cgEsBanco({proveedor_id:5}),'débito del banco = sin proveedor');
// la pantalla no recalcula deuda ni resultado por su cuenta: usa los derivadores de siempre
const r=cuerpo('renderComprasGastos');t(/cgSaldoProv\(/.test(r)&&/cgEstadoPago\(/.test(src.slice(src.indexOf('function _cgPill('),src.indexOf('function _cgPill(')+400)),'deuda y estado salen de cgSaldoProv / cgEstadoPago');
t(/cgRegistrarPago\(/.test(cuerpo('_cgTabPagar')),'el pago va por el camino de siempre (mueve la caja)');
t(/factura_compra_id/.test(cuerpo('cgxGuardar')),'factura de MP: vincula las recepciones al guardar');
// 04q: el gasto del Resultado es el neto (IVA en blanco = crédito fiscal); deuda y caja siguen con el total
global.r2=n=>Math.round(n*100)/100;
['cgCostoResultado','gfIvaMonto','gfCostoResultado'].forEach(f=>{const b=cuerpo(f);if(!b){t(false,'falta '+f);return;}eval.call(global,b.replace('function '+f,'global.'+f+'=function'));});
t(cgCostoResultado({plano:'blanco',total:121,iva_monto:21})===100&&cgCostoResultado({plano:'negro',total:121,iva_monto:0})===121&&cgCostoResultado({plano:'blanco',total:100,iva_monto:0})===100,'Factura A al resultado por el neto; negro / sin IVA por el total');
t(gfCostoResultado({plano:'blanco',monto_mensual:121,iva_porcentaje:21})===100&&gfCostoResultado({plano:'negro',monto_mensual:121,iva_porcentaje:21})===121,'gasto fijo presupuestado: neto si es blanco');
['renderResultadoMes','_resultadoRangoSync','_margenDisponibleMes','_snapCalcular','renderTablero','_dgCalc','_gastoFijoRealMes'].forEach(fn=>{const b=cuerpo(fn)||(()=>{const m=new RegExp('^async function '+fn+'\\(','m').exec(src);if(!m)return null;const j=src.indexOf('\nfunction ',m.index+10);return src.slice(m.index,j);})();
  t(b&&/cgCostoResultado\(|gfCostoResultado\(/.test(b)&&!/afecta_resultado[^;]*reduce\(\(s,c\)=>s\+\(parseFloat\(c\.total\)/.test(b),fn+' suma gastos por el derivador canónico');});
t(/cgSaldoProv\(provId\)\{[\s\S]{0,200}parseFloat\(c\.total\)/.test(src),'la deuda con el proveedor sigue con el total');
console.log('smoke_compras_gastos_pro: '+ok+' ok, '+fail+' fallas');process.exit(fail?1:0);
