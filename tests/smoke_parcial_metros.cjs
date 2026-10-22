// smoke 22a — carga parcial: bloquea sólo si no entra SIN merma; dentro de la merma avisa
// uso: node tests/smoke_parcial_metros.cjs fabrica_bolsas_v6.html
const fs=require('fs');const src=fs.readFileSync(process.argv[2]||'fabrica_bolsas_v6.html','utf8');
const a=src.indexOf('// ===== 📏 PARCIAL: METROS SIN MERMA');const b=src.indexOf('// ===== CARGA PARCIAL DE OC (entrega antes de cerrar)');
if(a<0||b<0||b<a){console.log('FALTA el bloque');process.exit(1);}
let ok=0,bad=0;const t=(x,m)=>{if(x)ok++;else{bad++;console.log('✗ '+m);}};
global.r2=n=>Math.round((+n+Number.EPSILON)*100)/100;
eval(src.slice(a,b).replace(/^function (\w+)/gm,'global.$1=function $1'));
// OC-1053011 real: granel x1, 0,50 m/bolsa, merma 3 %, 4 bobinas = 6.044 m, nada cargado antes
const ctx={uniPaq:1,mtsPorBolsa:0.5,mermaPct:3,mtsDisponibles:6044};
let k=_parcMetrosChequeo(12000,ctx);
t(k.neto===6000&&k.conMerma===6180,'12 bultos: 6.000 netos / 6.180 con merma ('+k.neto+'/'+k.conMerma+')');
t(k.nivel==='justo','12 bultos en 6.044 m → justo, NO bloquea ('+k.nivel+')');
t(Math.abs(k.margenPct-0.73)<0.01,'margen para merma 0,73 % ('+k.margenPct+')');
t(/Entra justo/.test(_parcMetrosTexto(k))&&/cerrar la OC/.test(_parcMetrosTexto(k)),'texto ámbar');
k=_parcMetrosChequeo(11000,ctx);t(k.nivel==='ok'&&_parcMetrosTexto(k)==='','11 bultos → ok sin aviso');
k=_parcMetrosChequeo(13000,ctx);t(k.nivel==='excede','13 bultos (6.500 m) → bloquea');
t(/Asociá más bobinas/.test(_parcMetrosTexto(k))&&/6\.500/.test(_parcMetrosTexto(k)),'texto rojo con metros');
// paquetes x20 (00009): 400 paq = 8.000 bolsas × 0,68 = 5.440 m netos
k=_parcMetrosChequeo(400,{uniPaq:20,mtsPorBolsa:0.68,mermaPct:3,mtsDisponibles:6000});
t(k.neto===5440&&k.nivel==='ok','00009 400 paq en 6.000 m → ok');
// borde exacto: neto == disponible → justo, no excede
k=_parcMetrosChequeo(100,{uniPaq:1,mtsPorBolsa:1,mermaPct:5,mtsDisponibles:100});t(k.nivel==='justo','neto = disponible → justo');
// sin bobinas asociadas → bloquea
k=_parcMetrosChequeo(1,{uniPaq:1,mtsPorBolsa:0.5,mermaPct:3,mtsDisponibles:0});t(k.nivel==='excede','sin metros → bloquea');
// el modal descuenta parciales previos SIN merma
t(/const mtsUsadosNeto=r2\(yaCargadoParcial\*uniPaq\*mtsPorBolsa\);/.test(src)&&!/mtsUsadosTeorico/.test(src),'disponible descuenta parciales sin merma');
t(/const chk=_parcMetrosChequeo\(paqEsta,ctx\)/.test(src)&&/if\(btn\)btn\.disabled=!!problema;/.test(src),'recalcParcial usa el chequeo y sólo deshabilita con problema');
console.log(ok+' OK, '+bad+' mal');process.exit(bad?1:0);
