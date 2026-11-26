// 25k: páginas en paralelo sin perder ni repetir filas
const fs=require('fs');const s=fs.readFileSync(process.argv[2],'utf8');
let ok=true;const t=(n,c)=>{if(!c){ok=false;console.error('✗ '+n);}else console.log('✓ '+n);};
const i=s.indexOf('async function _traerQ(');const j=s.indexOf('\n}\n',i)+2;
const T=new Function('console',s.slice(i,j)+';return _traerQ;')({warn(){}});
const mk=(N,fallaEn)=>{const D=Array.from({length:N},(_,k)=>({id:k}));let llam=0;const fallas=new Set(fallaEn||[]);
  return {b:()=>({range:async(a,z)=>{llam++;if(fallas.has(a)){fallas.delete(a);return {data:null,error:{message:'timeout'}};}return {data:D.slice(a,z+1),error:null};}}),n:()=>llam};};
(async()=>{
  for(const N of [0,5,250,251,999,1000,1001,2500,25222]){const m=mk(N);const r=await T(m.b,1000);t('N='+N+' trae todo y en orden',!r.error&&r.data.length===N&&r.data.every((x,k)=>x.id===k));}
  const m=mk(5000,[3000]);const r=await T(m.b,1000);t('una página que falla se reintenta sin perder filas',!r.error&&r.data.length===5000&&r.data.every((x,k)=>x.id===k));
  const m2=mk(25222);await T(m2.b,1000);t('25 páginas en pocas tandas (llamadas totales razonables)',m2.n()<=30);
  t('_traerPaginado usa el mismo camino',/return _traerQ\(\(\)=>sb\.from\(tabla\)\.select\(sel\)\.order\(orderCol,\{ascending:true\}\),1000\);/.test(s));
  process.exit(ok?0:1);})();
