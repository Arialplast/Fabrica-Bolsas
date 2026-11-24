// 23n: caja por banco — débitos automáticos contra el saldo de cada banco
const fs=require('fs');const s=fs.readFileSync(process.argv[2],'utf8');
let ok=true;const t=(n,c)=>{if(!c){ok=false;console.error('✗ '+n);}else console.log('✓ '+n);};
const i=s.indexOf('function _c13PorBanco(');const j=s.indexOf('function _c13BancoCard(',i);
const f=new Function(s.slice(i,j)+';return _c13PorBanco;')();
const ctas=[{id:2,nom:'CREDICOOP',tipo:'banco',s:1000},{id:3,nom:'GALICIA',tipo:'banco',s:100},{id:1,nom:'CAJA',tipo:'efectivo',s:5000}];
const deb=[{cta:3,f:'2026-11-16',m:50},{cta:3,f:'2026-11-30',m:200},{cta:2,f:'2026-12-01',m:300}];
const B=f(ctas,deb,{3:100},'2026-11-23','2026-12-21');
const g=B.find(b=>b.id===3),c=B.find(b=>b.id===2);
t('sólo bancos',B.length===2);
t('Galicia: 50 vencido + 200 el 30/11 contra 100 y tope 100 → falta 50 el 30/11',g.venc===50&&g.prox===200&&g.falta&&g.falta.f==='2026-11-30'&&g.falta.m===50);
t('Credicoop alcanza',c.falta===null&&c.fin===700);
t('está en la Proyección',/_c13BancoCard\(D,M\$\)/.test(s));
process.exit(ok?0:1);
