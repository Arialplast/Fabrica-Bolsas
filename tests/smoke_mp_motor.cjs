// 04l · Materia prima en el motor único (interruptor «Respetar MP» de Planificar).
const fs=require('fs');const src=fs.readFileSync(process.argv[2]||(__dirname+'/../fabrica_bolsas_v6.html'),'utf8');
let ok=0,fail=0;const t=(c,m)=>{if(c)ok++;else{fail++;console.log('FALLA',m);}};
function cuerpo(fn){const m=new RegExp('^function '+fn+'\\(','m').exec(src);if(!m)return null;const j=src.indexOf('\nfunction ',m.index+10);return src.slice(m.index,j<0?undefined:j);}
const eng=cuerpo('calcScheduleReal');
t(/const mpOn=_mpPlanOn\(\);\s*if\(!mpOn\)\{activas\.forEach\(o=>planear\(o\)\);return sched;\}/.test(eng),'apagado → cascada de siempre');
t(/_mpAsignar\(activas\)/.test(eng)&&/backfilling/.test(eng),'prendido → asigna MP y rellena huecos');
global.J_INI=6;global.cfg={plan_mp:'respetar',plan_mp_lead_dias:4,plan_mp_llegadas:JSON.stringify({'2':'2026-11-12','3':'2026-11-01'})};
global.C={bobinas_prod:[],formulas:[{bobina_id:10,tipo_mp_id:1,porcentaje:90},{bobina_id:10,tipo_mp_id:2,porcentaje:10},{bobina_id:11,tipo_mp_id:3,porcentaje:100}],tipos_mp:[],lotes_mp:[]};
['_mpPlanOn','_mpLeadDias','_mpLlegadasCfg','_mpLlegada','_mpAsignar','_prgMPRequiere'].forEach(f=>eval.call(global,cuerpo(f).replace('function '+f,'global.'+f+'=function')));
t(_mpPlanOn(),'interruptor lee cfg.plan_mp');
const L2=_mpLlegada('2','2026-11-04'),L3=_mpLlegada('3','2026-11-04'),L9=_mpLlegada('9','2026-11-04');
t(!L2.estimado&&L2.fecha.getDate()===12,'fecha cargada → confirmada');
t(L3.estimado&&L3.vencida&&L3.fecha.getDate()===8,'fecha cargada vencida → hoy + plazo, estimada');
t(L9.estimado&&!L9.vencida&&L9.fecha.getDate()===8,'sin fecha → hoy + plazo');
const A=[{id:1,bobina_id:10,kg_totales:1000},{id:2,bobina_id:10,kg_totales:500},{id:3,bobina_id:11,kg_totales:50}];
const R=_mpAsignar(A,{1:1200,2:100,3:80},'2026-11-04');
t(!R[1].llega&&R[1].pct===1,'la primera de la cola se queda con la MP');
t(R[2].llega&&Math.round(R[2].falta[1])===150&&Math.round(R[2].falta[2])===50&&R[2].estimado&&R[2].llega.getDate()===12,'la segunda espera lo que falta; llega con la última de sus MP (estimada si alguna no tiene fecha)');
t(!R[3].llega,'otra MP no se ve afectada');
console.log('smoke_mp_motor: '+ok+' ok, '+fail+' fallas');process.exit(fail?1:0);
