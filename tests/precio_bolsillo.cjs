// 26d: precio de bolsillo, objetivo anual y escalón explícito
const fs=require('fs');const s=fs.readFileSync(process.argv[2],'utf8');
let ok=true;const t=(n,c)=>{if(!c){ok=false;console.error('✗ '+n);}else console.log('✓ '+n);};
const fn=n=>{const i=s.indexOf('function '+n+'(');return s.slice(i,s.indexOf('\nfunction ',i+5));};
const F=new Function(['_bolsilloCalc','_bolsilloListaPara','_precioEvalCon'].map(fn).join('\n')+';return {_bolsilloCalc,_bolsilloListaPara,_precioEvalCon};')();
const b=F._bolsilloCalc(3000,5,2.5,30,40);
t('bolsillo = lista − comisión − cobro − flete',Math.abs(b.neto-(3000-150-75-40))<1e-9);
t('lista que hace falta para un bolsillo dado',Math.abs(F._bolsilloListaPara(b.neto,{com:5,tasa:2.5,dias:30,flete:40})-3000)<1e-6);
const R={pisoPct:20,estKg:731,gan:300,objPlan:{mkg:1620,anio:2027}};
const E=F._precioEvalCon(2000,2700,R);
t('objetivo = estándar + margen por kilo del plan anual',E.obj===3620);
t('escalones: piso y equilibrio',E.piso===2500&&E.eq===2731);
t('2.700 cae entre piso y equilibrio',E.col==='naranja');
const E2=F._precioEvalCon(2000,2700,{pisoPct:20,estKg:731,gan:300,objPlan:null});
t('sin plan anual: equilibrio + ganancia del mes',E2.obj===3031);
t('el chip dice el escalón',/Escalón 2 · entre piso y equilibrio/.test(s));
process.exit(ok?0:1);
