// 26a: PDF del comprobante con la página scrolleada + cruce de circuito sin registrar
const fs=require('fs');const s=fs.readFileSync(process.argv[2],'utf8');
let ok=true;const t=(n,c)=>{if(!c){ok=false;console.error('✗ '+n);}else console.log('✓ '+n);};
const i=s.indexOf('async function _docPdfBlob(');const blk=s.slice(i,s.indexOf('\nfunction ',i));
t('el PDF se arma con la página arriba y vuelve',/window\.scrollTo\(0,0\)/.test(blk)&&/finally\{w\.remove\(\);window\.scrollTo\(sx,sy\);\}/.test(blk));
const j=s.indexOf('function _recCruceFalta(');const src=s.slice(j,s.indexOf('\nasync function recRegistrarCruce',j));
const C={movimientos_caja:[{origen_tipo:'cobro_cruce',origen_id:7}]};
const f=new Function('C','_planoNorm','chEsCheque','r2',src+';return _recCruceFalta;')(C,p=>(p==='formal'||p==='blanco')?'blanco':(p==='informal'||p==='negro')?'negro':p,v=>!!(v&&(v.numero_cheque||v.fecha_vto)),x=>Math.round(x*100)/100);
const gal={plano:'blanco'},caja={plano:'negro'};
t('informal al Galicia sin par → falta',f({id:1,plano:'informal',total_cobrado:1000000,recibo_valores:[{monto:1000000}]},gal)===true);
t('con par registrado → no falta',f({id:7,plano:'informal',total_cobrado:1000000,recibo_valores:[]},gal)===false);
t('mismo circuito → no cruza',f({id:2,plano:'informal',total_cobrado:5,recibo_valores:[]},caja)===false);
t('todo en cheques → no cruza acá',f({id:3,plano:'informal',total_cobrado:500,recibo_valores:[{monto:500,numero_cheque:'1'}]},gal)===false);
t('anulado → no',f({id:4,plano:'informal',estado:'anulado',total_cobrado:9,recibo_valores:[]},gal)===false);
t('el alta avisa si falla el cruce',/no se registró el cruce de circuito/.test(s));
process.exit(ok?0:1);
