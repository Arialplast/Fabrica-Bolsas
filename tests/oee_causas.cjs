// 20b: lo que cuesta cada causa de parada
const fs=require('fs');const src=fs.readFileSync(process.argv[2],'utf8');let n=0;const A=(c,t)=>{if(!c){console.error('✗ '+t);process.exit(1);}n++;};const nr=(a,b,e)=>Math.abs(a-b)<(e||1e-6);
eval(src.match(/const OEE_COMO=\{.*\};\n/)[0]+src.match(/function _oeeCostoCausas\(PL,o\)\{[\s\S]*?\n\}/)[0]+';globalThis.f=_oeeCostoCausas;');
const K=f([['Cambio de pedido o de medida',600],['Sin clasificar',480],['Descanso o comida',300],['Cambio de bobina',240],['Rotura o ajuste de máquina',120]],{dias:7,kgHora:60,mkg:1300,pres:6000,cut:4000});
A(nr(K.filas[0].hSem,10)&&nr(K.filas[0].kgSem,600)&&nr(K.filas[0].pSem,780000),'horas → kilos → margen por semana');
A(K.filas[2].evitable===false&&K.filas[1].gris===true,'descanso no es evitable; sin clasificar se marca');
A(K.metaPct===Math.round((4000+(600+480+240)/2)/6000*100)&&nr(K.A,4000/6000),'meta = bajar a la mitad las tres causas evitables más grandes');
A(nr(K.kgMeta,(600+480+240)/60*60/2)&&nr(K.sinClasPct,480/1740*100),'kilos que se ganan y % sin clasificar');
const K2=f([['Otro',140]],{dias:14,kgHora:50,mkg:0,pres:1000,cut:800});A(nr(K2.filas[0].hSem,140/60/2),'período de 14 días se lleva a una semana');
A(/function oeeAlPlan\(\)/.test(src)&&/t:'paradas',desde:1/.test(src),'la meta se puede llevar al plan');
console.log('✓ oee_causas '+n+' ok');
{const K=f([['Cambio de bobina',600]],{dias:7,kgHora:60,mkg:0,pres:6000,cut:4000,A:0.5});if(K.metaPct!==Math.round((4000+300)/8000*100)||K.A!==0.5){console.error('✗ usa la disponibilidad del OEE como base');process.exit(1);}console.log('✓ oee_causas base OEE ok');}
