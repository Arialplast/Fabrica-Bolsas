// 13e: adherencia al programa (ejecución contra baseline y cumplimiento de la foto del día)
const fs=require('fs');const src=fs.readFileSync(process.argv[2],'utf8');
function fn(name){const i=src.indexOf('function '+name+'(');if(i<0)throw new Error('falta '+name);let d=0,j=src.indexOf('{',i);for(let k=j;k<src.length;k++){if(src[k]==='{')d++;else if(src[k]==='}'){d--;if(!d)return src.slice(i,k+1);}}}
eval(fn('_adhEjec'));eval(fn('_adhDia'));let fail=0;const ok=(c,m)=>{if(!c){fail++;console.log('✗ '+m);}};const H=3600000;const b=1e12;
const S=_adhEjec([{base:b,fin:b+1*H},{base:b,fin:b+2*H},{base:b,fin:b+10*H},{base:b,fin:b-5*H},{base:0,fin:b}],2);
ok(S.n===4&&S.ok===3&&S.tarde===1&&S.antes===1,'en fecha hasta 2 h tarde → '+JSON.stringify(S));ok(Math.abs(S.atrProm-10)<1e-9,'atraso promedio de las tardías = 10 h');
ok(_adhEjec([],2).pct===null,'sin datos');
const dia=new Date('2026-11-13T23:59:59').getTime();const iso=t=>new Date(t).toISOString();const t=h=>new Date('2026-11-13T00:00:00').getTime()+h*H;
const rows=[{tipo:'oc',orden_id:1,estado:'En proceso',ini:iso(t(-5)),fin:iso(t(10))},   // debía terminar, terminó
            {tipo:'oc',orden_id:2,estado:'Pendiente',ini:iso(t(8)),fin:iso(t(14))},      // arrancar y terminar: arrancó, no terminó
            {tipo:'oe',orden_id:3,estado:'Pendiente',ini:iso(t(20)),fin:iso(t(40))},     // debía arrancar, no arrancó
            {tipo:'oe',orden_id:4,estado:'En proceso',ini:iso(t(-2)),fin:iso(t(30))}];   // sigue mañana: no cuenta
const R={oc:{1:{ini:t(-5),fin:t(11)},2:{ini:t(9),fin:null}},oe:{3:{ini:null,fin:null},4:{ini:t(-2),fin:null}}};
const D=_adhDia(rows,dia,(tp,id)=>R[tp][id]);
ok(D.debTerm===2&&D.term===1,'debían terminar 2, terminó 1');ok(D.debArr===2&&D.arr===1,'debían arrancar 2, arrancó 1');ok(Math.abs(D.pct-.5)<1e-9,'cumplimiento 50 %');
ok(D.det.length===3&&D.det.find(x=>x.r.orden_id===2).est==='en curso'&&D.det.find(x=>x.r.orden_id===3).est==='sin arrancar','estados');
if(fail){console.log('FALLARON '+fail);process.exit(1);}console.log('✓ adherencia_programa OK');
