// 25l: Plan de la semana con el formato del Plan de 8 semanas, sólo trabajo firme
const fs=require('fs');const s=fs.readFileSync(process.argv[2],'utf8');
let ok=true;const t=(n,c)=>{if(!c){ok=false;console.error('✗ '+n);}else console.log('✓ '+n);};
const i=s.indexOf('function _ps3PorDia(');const j=s.indexOf('function _ps3Datos(',i);
const PD=new Function(s.slice(i,j)+';return _ps3PorDia;')();
const d0=Date.UTC(2026,10,23),H=3600000,dias=[0,1,2].map(k=>({a:d0+k*24*H,b:d0+(k+1)*24*H}));
const r=PD([{ini:new Date(d0+12*H),fin:new Date(d0+36*H),kg:1000,pct:0.5},{ini:new Date(d0+60*H),fin:new Date(d0+96*H),kg:300,pct:null}],dias);
t('reparte por día según el tramo',r[0].kg===500&&r[1].kg===500&&r[0].kgMP===250);
t('la parte fuera de la semana no cuenta',r[2].kg===100&&r[2].kgMP===100);
const k=s.indexOf('function _ps3Firme(');const F=new Function('C',s.slice(k,s.indexOf('\n',k))+';return _ps3Firme;');
const C={pedidos:[{estado:'Borrador'},{estado:'Confirmado'}]};const f=F(C);const n=f(()=>C.pedidos.length);
t('sólo pedidos firmes y después se restablece',n===1&&C.pedidos.length===2);
t('cuatro solapas como el Plan de 8 semanas',/\['res','🧭 Resumen'/.test(s)&&/\['pro','🏭 Producción'/.test(s)&&/\['mat','🧪 Materiales'/.test(s)&&/\['ctl','✅ Control'/.test(s));
t('borradores aparte, fuera del plan',/function _ps3Borr\(D\)/.test(s)&&/fuera del plan/.test(s));
t('mismos componentes que el Plan de 8 semanas',/let h=_dkKpis\(\[/.test(s)&&/card vel-c/.test(s));
t('la pantalla usa el render nuevo',/_ps3Render\(cont\);   \/\/ 25l/.test(s));
process.exit(ok?0:1);
