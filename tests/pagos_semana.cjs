// 25c: Pagos de la semana — propuesta de pagos
const fs=require('fs');const s=fs.readFileSync(process.argv[2],'utf8');
let ok=true;const t=(n,c)=>{if(!c){ok=false;console.error('✗ '+n);}else console.log('✓ '+n);};
const i=s.indexOf('function _psGrupos(');const j=s.indexOf('function _psDocs(',i);
const f=new Function(s.slice(i,j)+';return {_psGrupos,_psMas};')();
const D=[{id:1,prov:7,plano:'blanco',saldo:100,vence:'2026-11-20',fecha:'2026-11-01'},{id:2,prov:7,plano:'blanco',saldo:50,vence:'2026-11-28',fecha:'2026-11-10'},{id:3,prov:7,plano:'negro',saldo:30,vence:null,fecha:'2026-10-01'},{id:4,prov:9,plano:'blanco',saldo:500,vence:'2026-12-20',fecha:'2026-11-20'}];
const hoy='2026-11-25';
t('sumar días cruza el mes',f._psMas('2026-11-28',7)==='2026-12-05');
const V=f._psGrupos(D,hoy,'venc');t('vencido: 2 grupos (7 blanco y 7 negro), el más atrasado primero',V.length===2&&V[0].plano==='negro'&&V[1].docs.length===1&&V[1].total===100);
const S=f._psGrupos(D,hoy,'v7');t('7 días: suma el que vence el 28',S.find(g=>g.plano==='blanco'&&g.prov===7).total===150&&S.find(g=>g.plano==='blanco').venc===100&&!S.some(g=>g.prov===9));
t('todo: 3 grupos',f._psGrupos(D,hoy,'todo').length===3);
t('sin fecha de pago: usa la del comprobante y cuenta los días',V[0].docs[0].dias===55);
t('recorre con el guardado de siempre',/function _psAbrir\(\)\{[\s\S]{0,400}initNuevoPago\(\)/.test(s)&&/psSiguiente\(\)/.test(s)&&!/function psGuardar/.test(s));
t('está en el menú',/go\('pagos-semana'\)/.test(s)&&/id="page-pagos-semana"/.test(s));
process.exit(ok?0:1);
