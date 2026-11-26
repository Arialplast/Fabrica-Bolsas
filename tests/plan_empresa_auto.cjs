// 25r: objetivos que se cargaban a mano, medidos por el sistema
const fs=require('fs');const s=fs.readFileSync(process.argv[2],'utf8');
let ok=true;const t=(n,c)=>{if(!c){ok=false;console.error('✗ '+n);}else console.log('✓ '+n);};
const g=n=>{const i=s.indexOf('function '+n+'(');let j=s.indexOf('\nfunction ',i+5);const k=s.indexOf('\nconst ',i+5);if(k>0&&k<j)j=k;return s.slice(i,j);};
const F=new Function('r2',[g('_peCuotasVenc'),g('_peCuotasMes'),g('_peVariacion'),g('_peParadasMot')].join('\n')+';return {_peCuotasVenc,_peCuotasMes,_peVariacion,_peParadasMot};')(x=>Math.round(x*100)/100);
const D=[{estado:'activo',cuotas:[{vencimiento:'2026-11-16',estado:'pendiente',monto:100},{vencimiento:'2026-11-01',estado:'pagada',monto:50},{vencimiento:'2026-10-01',estado:'pendiente',refinanciada:true,monto:70},{vencimiento:'2026-12-16',estado:'pendiente',monto:80}]},{estado:'cancelado',cuotas:[{vencimiento:'2026-01-01',estado:'pendiente',monto:9}]}];
const q=F._peCuotasVenc(D,'2026-11-25');t('cuenta sólo vencidas sin pagar ni refinanciar',q.n===1&&q.m===100);
t('cuotas del mes sin refinanciadas',F._peCuotasMes(D,'2026-11-01','2026-11-30')===150);
t('variación: serie pareja = 0 %',F._peVariacion([10,10,10,10])===0);
t('variación: desvío ÷ promedio',Math.abs(F._peVariacion([5,15,5,15])-50)<1e-9);
t('variación: con menos de 3 semanas no hay dato',F._peVariacion([1,2])===null);
const P=F._peParadasMot([{min:20,mot:true},{min:30,mot:false},{min:10,mot:false}],15);t('paradas ≥ 15 min con motivo',P.pct===50&&P.n===2&&P.sin===1);
t('indicadores nuevos en la lista',['cuotas_venc','cobertura','caja2','cheq_cartera','var_sem','kwh_kg','paradas_mot'].every(k=>new RegExp(k+":\\{n:'").test(s)));
t('el botón no cambia nada sin confirmar',/function peObjAuto\(\)\{const L=_peAutoCand\(PE\.d\);if\(!L\.length\)return;if\(!confirm\(/.test(s));
t('energía sólo se lee',!/sb\.from\('energia_[a-z]+'\)\.(insert|update|upsert|delete)/.test(s));
process.exit(ok?0:1);
