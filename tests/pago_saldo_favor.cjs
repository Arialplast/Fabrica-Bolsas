// 25i: saldo a favor dentro del pago a proveedor
const fs=require('fs');const s=fs.readFileSync(process.argv[2],'utf8');
let ok=true;const t=(n,c)=>{if(!c){ok=false;console.error('✗ '+n);}else console.log('✓ '+n);};
t('un solo camino para imputar créditos (Prov 360 y pago)',/async function _pvImputarCredito\(c,base,items,tot\)/.test(s)&&/const\{error\}=await _pvImputarCredito\(_pvImp,base,items,tot\)/.test(s)&&/await _pvImputarCredito\(\{tipo:c\.tipo,id:c\.id,disp:c\.disp,pid:_pagCtx\.proveedor_id\},base,usa/.test(s));
t('el saldo a favor suma para cerrar pero no es plata entregada',/const aCuenta=r2\(entregado\+credUso-tot\)/.test(s)&&/const entregado=r2\(totEf\+totCh\+totPr\);/.test(s));
t('el saldo cubre primero lo más viejo y el pago nuevo lleva el resto',/for\(const \[key,mont\] of Object\.entries\(impNuevo\)\)/.test(s));
t('sólo con saldo a favor no crea pago',/if\(entregado<=0\.009\)\{   \/\/ sólo saldo a favor/.test(s));
t('estado del comprobante leído de la base',/async function _cgRecalcEstado\(cid\)/.test(s));
t('repartir cuenta propios y saldo a favor',/function _npagEntregado\(\)\{ return r2\(_npagEfTotal\(\)\+_npagTotCheques\(\)\+_npagPropTotal\(\)\+_npagCredUso\(\)\); \}/.test(s));
process.exit(ok?0:1);
