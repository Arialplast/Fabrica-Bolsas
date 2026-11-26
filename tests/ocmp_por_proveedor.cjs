// 25i: lo que falta pedir, una orden por proveedor
const fs=require('fs');const s=fs.readFileSync(process.argv[2],'utf8');
let ok=true;const t=(n,c)=>{if(!c){ok=false;console.error('✗ '+n);}else console.log('✓ '+n);};
const i=s.indexOf('function _ocmpAgrupar(');const j=s.indexOf('function ocmpPorProveedor(',i);
const A=new Function(s.slice(i,j)+';return _ocmpAgrupar;')();
const pv={1:10,2:10,3:20,4:null};
const G=A([{tipo:1,kg:100},{tipo:2,kg:5},{tipo:3,kg:50},{tipo:4,kg:7},{tipo:5,kg:0.2}],t=>pv[t]===undefined?null:pv[t]);
t('una orden por proveedor',G.length===3&&G[0].prov===10&&G[0].items.length===2&&G[1].prov===20);
t('sin proveedor habitual va al final',G[2].prov===null&&G[2].items[0].tipo==='4');
t('lo que no llega a medio kilo no se pide',!G.some(g=>g.items.some(x=>x.tipo==='5')));
t('al emitir una vuelve a la lista con las que quedan',/if\(OCMP\.cola&&OCMP\.cola\.length\)setTimeout\(\(\)=>ocmpPorProveedor\(\),400\)/.test(s));
t('la orden respeta el proveedor del grupo',/function ocmpNueva\(pre,provDado\)/.test(s)&&/ocmpNueva\(g\.items,g\.prov\)/.test(s));
process.exit(ok?0:1);
