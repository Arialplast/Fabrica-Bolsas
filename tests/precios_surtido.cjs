// 26c: surtido del cliente, dormidos y bajas
const fs=require('fs');const s=fs.readFileSync(process.argv[2],'utf8');
let ok=true;const t=(n,c)=>{if(!c){ok=false;console.error('✗ '+n);}else console.log('✓ '+n);};
const g=n=>{const i=s.indexOf('function '+n+'(');return s.slice(i,s.indexOf('\n',s.indexOf('\n}',i)+1)>0?s.indexOf('\nfunction ',i+5):undefined);};
const src=['_cpBajaVigente','_cpSurtidoCalc'].map(n=>{const i=s.indexOf('function '+n+'(');let j=s.indexOf('\nfunction ',i+5);return s.slice(i,j);}).join('\n');
const F=new Function(src+';return {_cpBajaVigente,_cpSurtidoCalc};')();
const hoy='2026-11-26';
const ped={1:{ultFecha:'2026-10-01',paq:10},2:{ultFecha:'2026-03-01',paq:5},3:{ultFecha:'2025-06-01',paq:1},4:{ultFecha:'2026-11-20',paq:2}};
const ped6={1:{paq:10},4:{paq:2}};
const L=F._cpSurtidoCalc(ped,ped6,new Set([5]),[{producto_id:2,desde:'2026-11-01'},{producto_id:4,desde:'2026-11-01'}],hoy);const by=k=>L.find(x=>x.pid===k);
t('compró hace 2 meses: en su surtido y activo',by(1).enSurt&&!by(1).dormido);
t('dado de baja y no volvió a pedir: fuera',by(2).bajaVig&&!by(2).enSurt);
t('compró hace más de 12 meses sin especial: fuera',!by(3).enSurt);
t('lo volvió a pedir después de la baja: vuelve solo',!by(4).bajaVig&&by(4).enSurt);
t('precio especial sin pedidos: en el surtido y dormido',by(5).enSurt&&by(5).dormido);
t('la carta y los aumentos respetan las bajas',/function _aumProdsDeCliente\(cliId,meses,conBajas\)/.test(s)&&/_cpBajaVigente\(_cpBajaDe\(cliId,e\.producto_id\)/.test(s));
t('margen global sólo a lo que se ve',/C\.productos\.filter\(p=>_vis\.has\(p\.id\)\)\.forEach/.test(s));
process.exit(ok?0:1);
