// 12h: estadística de la carta de control de individuales (I-MR) y capacidad Cp/Cpk
const fs=require('fs');const src=fs.readFileSync(process.argv[2],'utf8');
function fn(name){const i=src.indexOf('function '+name+'(');if(i<0)throw new Error('falta '+name);let d=0,j=src.indexOf('{',i);for(let k=j;k<src.length;k++){if(src[k]==='{')d++;else if(src[k]==='}'){d--;if(!d)return src.slice(i,k+1);}}}
eval(fn('_spcStats'));let fail=0;const ok=(c,m)=>{if(!c){fail++;console.log('✗ '+m);}};const ap=(a,b,e)=>Math.abs(a-b)<(e||1e-6);
// serie alternada 1,-1: media 0, rango móvil 2 → σ = 2/1.128
const xs=[];for(let i=0;i<20;i++)xs.push(i%2?-1:1);const S=_spcStats(xs,-10,8);
ok(ap(S.media,0),'media');ok(ap(S.sigma,2/1.128),'σ = MR̄/1,128 → '+S.sigma);
ok(ap(S.lcs,3*2/1.128)&&ap(S.lci,-3*2/1.128),'límites ±3σ');
ok(ap(S.cp,18/(6*S.sigma)),'Cp');ok(ap(S.cpk,8/(3*S.sigma)),'Cpk usa el límite más cercano (+8)');
ok(S.fuera.length===0&&S.racha.length===0&&S.fEsp===0,'sin señales');
// punto fuera de control y fuera de especificación
const S2=_spcStats([...xs,15],-10,8);ok(S2.fuera.includes(20),'punto fuera de ±3σ');ok(S2.fEsp===1&&S2.pes===1&&S2.liv===0,'fuera de especificación: pesada');
// racha de 8 del mismo lado
const r=[-3,3,-3,3,-3,3, 1,1.2,1,1.3,1,1.1,1,1.2,1];const S3=_spcStats(r,-10,8);ok(S3.racha.length>0,'racha de 8 del mismo lado');
ok(_spcStats([1],-10,8).sigma===null,'una sola bobina: sin σ');
if(fail){console.log('FALLARON '+fail);process.exit(1);}console.log('✓ spc_peso OK');
