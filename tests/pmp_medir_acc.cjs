// 23n: medición automática de acciones de clientes y horas del plan de 8 semanas
const fs=require('fs');const s=fs.readFileSync(process.argv[2],'utf8');
let ok=true;const t=(n,c)=>{if(!c){ok=false;console.error('✗ '+n);}else console.log('✓ '+n);};
const i=s.indexOf('function _pmpMedirAcc(');const j=s.indexOf('// Las fuentes reales de la medición',i);
const localDate=d=>{const z=new Date(d);return z.getFullYear()+'-'+String(z.getMonth()+1).padStart(2,'0')+'-'+String(z.getDate()).padStart(2,'0');};
const addDays=(d,n)=>{const z=new Date(d);z.setDate(z.getDate()+n);return z;};
const M=new Function('localDate','addDays','C',s.slice(i,j)+';return _pmpMedirAcc;')(localDate,addDays,{clientes:[]});
const F={kgCli:(c,a,z)=>a>='2026-11-02'?2100:800*8,hCorte:(a,z)=>a>='2026-11-02'?{t:300,extra:30,sab:20,fer:0}:{t:600,extra:8,sab:24,fer:0},kgExt:(a,z)=>a>='2026-11-02'?24000:40000,desdeExt:'2026-09-01'};
const x={hoy:'2026-11-23',hSemC:45,M:2,rE:20,cliFc:{9:700},fers:[{f:'2026-11-20',hC:16}]};
const r1=M({t:'cli_rec',cli:'9',v:600,cursoEl:'2026-11-02'},x,F);t('recuperar cliente: 700 kg/sem ≥ 600 ✓',r1.ok===true&&/700 kg/.test(r1.txt));
const r2=M({t:'cli_mas',cli:'9',v:20,cursoEl:'2026-11-02'},x,F);t('venderle más: contra el pronóstico ×1,2 (840) ✗',r2.ok===false&&/840 kg/.test(r2.txt));
const r3=M({t:'hx_corte',v:12,cursoEl:'2026-11-02'},x,F);t('horas extra: 10 h/sem < 12 ✗',r3.ok===false&&/10 h/.test(r3.txt));
const r4=M({t:'cortador',v:45,cursoEl:'2026-11-02'},x,F);t('cortador: 100 h vs base 150 + 45 ✗',r4.ok===false&&/195 h/.test(r4.txt));
const r5=M({t:'ext_horas',v:18,cursoEl:'2026-11-02'},x,F);t('horas extrusión: base 10.000 + 18×20',r5.ok===false&&/10\.360 kg/.test(r5.txt));
t('menos de 5 días: no opina',M({t:'cli_rec',cli:'9',v:1,cursoEl:'2026-11-21'},x,F).ok===null);
t('sin «en marcha»: no opina',M({t:'hx_corte',v:1},x,F).ok===null);
const r6=M({t:'feriado',f:'2026-11-20',sec:'corte'},x,F);t('feriado: horas de ese día contra lo previsto',r6.ok===true&&/16 h/.test(r6.txt));
t('dar de baja: objetivo 0 ✗ si sigue pidiendo',M({t:'cli_baja',cli:'9',cursoEl:'2026-11-02'},x,F).ok===false);
process.exit(ok?0:1);
