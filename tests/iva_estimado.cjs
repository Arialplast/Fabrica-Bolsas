// 23n: IVA de los meses sin DDJJ, estimado, en la Proyección de caja
const fs=require('fs');const s=fs.readFileSync(process.argv[2],'utf8');
let ok=true;const t=(n,c)=>{if(!c){ok=false;console.error('✗ '+n);}else console.log('✓ '+n);};
const i=s.indexOf('function _ivaEstimado(');const j=s.indexOf('function _ivaEstimadoHoy(',i);
const f=new Function(s.slice(i,j)+';return _ivaEstimado;')();
const dj=[{periodo:'2026-07',debito_fiscal:100,credito_fiscal:40,retenciones_percepciones:0,saldo_a_pagar:60},{periodo:'2026-08',debito_fiscal:100,credito_fiscal:40,retenciones_percepciones:0,saldo_a_pagar:60},{periodo:'2026-09',debito_fiscal:200,credito_fiscal:80,retenciones_percepciones:0,saldo_a_pagar:120}];
const facs=[{fecha:'2026-10-05',iva_monto:1000},{fecha:'2026-10-20',iva_monto:500,estado:'anulada'},{fecha:'2026-11-03',iva_monto:600},{fecha:'2026-11-04',iva_monto:999,ambiente:'homologacion'}];
const ncs=[{fecha:'2026-10-10',iva_monto:100}];
const E=f(dj,facs,ncs,'2026-11-15','2027-01-31',20);
const oct=E.find(x=>x.per==='2026-10'),nov=E.find(x=>x.per==='2026-11'),dic=E.find(x=>x.per==='2026-12');
t('octubre: (1000 − 100) × 60 % = 540, vence 20/11',oct&&oct.m===540&&oct.vto==='2026-11-20'&&oct.tipo==='real');
t('noviembre en curso: 600 × 30/15 × 60 % = 720',nov&&nov.m===720&&nov.tipo==='curso');
t('diciembre: promedio de las últimas 3 DDJJ (80)',dic&&dic.m===80&&dic.tipo==='futuro');
t('enero vence 20/02: fuera del horizonte',!E.some(x=>x.per==='2027-01'));
t('un mes con DDJJ no se estima',!f(dj.concat([{periodo:'2026-10',debito_fiscal:1,credito_fiscal:0,saldo_a_pagar:1}]),facs,ncs,'2026-11-15','2027-01-31',20).some(x=>x.per==='2026-10'));
t('va a la Proyección como ARCA',/const ivaE=_ivaEstimadoHoy\(finS\)/.test(s));
process.exit(ok?0:1);
