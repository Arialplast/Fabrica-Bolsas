// 26e: camino del mes, tasa desde descuentos de cheques, prioridades kilos × margen
const fs=require('fs');const s=fs.readFileSync(process.argv[2],'utf8');
let ok=true;const t=(n,c)=>{if(!c){ok=false;console.error('✗ '+n);}else console.log('✓ '+n);};
const fn=n=>{const i=s.indexOf('function '+n+'(');return s.slice(i,s.indexOf('\nfunction ',i+5));};
const F=new Function(['_pcamMeses','_pcamCalc','_tasaDescCalc','_prioCalc'].map(fn).join('\n')+';return {_pcamMeses,_pcamCalc,_tasaDescCalc,_prioCalc};')();
t('antes de arrancar la política: 0 meses',F._pcamMeses('2026-12-01','2026-11-26')===0);
t('diciembre es el mes 1, enero el 2',F._pcamMeses('2026-12-01','2026-12-15')===1&&F._pcamMeses('2026-12-01','2027-01-03')===2);
const c=F._pcamCalc(3000,3800,2,2);t('camino = base × 1,02^n',Math.abs(c.cam-3121.2)<0.01);
t('nunca pasa el objetivo',F._pcamCalc(3000,3050,5,2).cam===3050);
t('meses que faltan al 2 %',F._pcamCalc(3000,3800,0,2).falta===12);
const T=F._tasaDescCalc([{fecha_descuento:'2026-11-01',monto:1000,neto_descuento:980,dias_descuento:30},{fecha_descuento:'2026-11-01',monto:1000,neto_descuento:500,dias_descuento:30}],'2026-10-01');
t('tasa = costo ÷ (monto × días/30), sin datos absurdos',Math.abs(T.tasa-2)<1e-9&&T.n===1);
const P=F._prioCalc([{id:1,kg:100,v:400000,c:200000,bol:400000},{id:2,kg:10000,v:30000000,c:20000000,bol:29000000}],731,1);
t('el de 10.000 kg a $ 3.000 pesa más que el de 100 kg a $ 4.000',P[0].id===2&&P[0].peso>P[1].peso);
t('cuadrantes: grande arriba del equilibrio = cuidar · chico = mantener',P[0].cuad==='cuidar'&&P[1].cuad==='mantener');
process.exit(ok?0:1);
