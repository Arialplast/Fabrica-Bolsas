// 13b: avance de una meta del mes
const fs=require('fs');const src=fs.readFileSync(process.argv[2],'utf8');
function fn(name){const i=src.indexOf('function '+name+'(');if(i<0)throw new Error('falta '+name);let d=0,j=src.indexOf('{',i);for(let k=j;k<src.length;k++){if(src[k]==='{')d++;else if(src[k]==='}'){d--;if(!d)return src.slice(i,k+1);}}}
eval(fn('_rmMetaAvance'));let fail=0;const ok=(c,m)=>{if(!c){fail++;console.log('✗ '+m);}};const ap=(a,b)=>Math.abs(a-b)<1e-6;
const F={flujo:1},G={menor:1},R={res:1};
let a=_rmMetaAvance(F,40,100,10,15);ok(ap(a.esperado,40)&&ap(a.proy,100)&&a.estado==='ok','flujo: al ritmo justo → ok');
a=_rmMetaAvance(F,37,100,10,15);ok(a.estado==='aviso'&&ap(a.pct,.925),'flujo: 92 % de lo esperado → aviso');
a=_rmMetaAvance(F,20,100,10,15);ok(a.estado==='mal'&&ap(a.proy,50),'flujo: mitad → mal, cierra en 50');
a=_rmMetaAvance(F,90,100,25,0);ok(ap(a.esperado,100)&&ap(a.proy,90)&&a.estado==='aviso','mes cerrado: esperado = meta');
a=_rmMetaAvance(G,95,100,10,15);ok(a.estado==='ok','gastos por debajo → ok');
a=_rmMetaAvance(G,103,100,10,15);ok(a.estado==='aviso','gastos +3 % → aviso');
a=_rmMetaAvance(G,120,100,10,15);ok(a.estado==='mal','gastos +20 % → mal');
a=_rmMetaAvance(R,-50,10,10,15,60,45);ok(ap(a.proy,15)&&a.estado==='ok','resultado: margen proyectado − gastos ≥ meta → ok');
a=_rmMetaAvance(R,-50,10,10,15,40,45);ok(a.estado==='mal','resultado proyectado negativo → mal');
ok(_rmMetaAvance(F,5,null,10,15).estado==='sin','sin meta');
if(fail){console.log('FALLARON '+fail);process.exit(1);}console.log('✓ metas_mes OK');
