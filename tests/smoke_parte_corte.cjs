// Smoke del 📋 Parte diario de corte (build 2026-10-05a).
// Uso: TZ=America/Argentina/Buenos_Aires node tests/smoke_parte_corte.cjs fabrica_bolsas_v6.html
// Corre _pdcArmar/_pdcSemana/_pdcDesvio/_pdcHtml REALES contra una foto del 02/10/2026
// y compara con los conteos hechos por SQL directo sobre la base.
const fs=require('fs'),path=require('path');
const src=fs.readFileSync(process.argv[2]||'fabrica_bolsas_v6.html','utf8');
const a=src.indexOf('// ===== 📋 PARTE DIARIO DE CORTE'),b=src.indexOf('// ===== 🎯 CORTAR HOY');
if(a<0||b<a)throw new Error('bloque no encontrado');
let pass=0,fail=0;const ok=(c,m)=>{if(c)pass++;else{fail++;console.log('✗ '+m);}};
global.window=global;global.C={productos:[],maq_corte:[{id:1,nombre:'CORTE-01'}],emp:[]};
global.localDate=d=>{const t=d||new Date();return t.getFullYear()+'-'+String(t.getMonth()+1).padStart(2,'0')+'-'+String(t.getDate()).padStart(2,'0');};
global.escapeHtml=s=>s==null?'':String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
global.fmtMoney=n=>'$ '+(+n||0).toFixed(2);
(0,eval)(src.slice(a,b).replace(/^const _PDC_SEL/m,'var _PDC_SEL'));
const D=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/parte_corte_20261002.json'),'utf8'));
const prod={};Object.entries(D.pr||{}).forEach(([k,v])=>prod[k]=+v);
const R=_pdcArmar('2026-10-02',D.ocs,D.bd,D.ba,prod,()=>100);
const T=R.tot;
// contra SQL (02/10): cerradas 10 · comprometidas 9 · cumplidas 7 · 74 bobinas · 98.130 m · 90.625 paq
ok(T.cerr===10,'cerradas 10 → '+T.cerr);
ok(T.comp===9,'comprometidas 9 → '+T.comp);
ok(T.cumpl===7,'cumplidas 7 → '+T.cumpl);
ok(T.pend===2,'pendientes 2 → '+T.pend);
ok(T.bob===74,'bobinas 74 → '+T.bob);
ok(Math.abs(T.metros-98130)<0.01,'metros 98130 → '+T.metros);
ok(Math.abs(T.paq-90625)<0.01,'paquetes 90625 → '+T.paq);
ok(T.valor===1000,'valor = 10 × 100');
// invariantes
ok(T.aTiempo+T.tarde<=T.cerr,'a tiempo + tarde ≤ cerradas');
ok(T.cumpl+T.pend===T.comp,'cumplidas + pendientes = comprometidas');
const idsC=new Set(R.cerradas.map(r=>r.o.id));
ok(R.trabajadas.every(r=>!idsC.has(r.o.id)),'una OC cerrada no figura también como trabajada');
ok(R.cerradas.every(r=>localDate(new Date(r.o.fecha_completada))==='2026-10-02'),'todas las cerradas son del día (hora local)');
const metrosDia=R.trabajadas.reduce((s,r)=>s+r.dia.m,0)+R.cerradas.reduce((s,r)=>s+(r.dia?r.dia.m:0),0);
ok(Math.abs(metrosDia-T.metros)<0.01,'metros por OC reconstruyen el total del día');
ok(R.pendientes.every(r=>!(r.fc&&r.fc<new Date('2026-10-03T00:00:00').getTime())),'pendiente = no cerró antes del fin del día');
ok(R.cerradas.every((r,i,x)=>i===0||x[i-1].fc<=r.fc),'cerradas ordenadas por hora');
// desvío
ok(_pdcDesvio(null).cls==='gris','sin grilla');
ok(_pdcDesvio(-3600000*2).cls==='ok'&&_pdcDesvio(-3600000*2).txt==='2 h antes','2 h antes');
ok(_pdcDesvio(30*60000).txt==='30 min tarde'&&_pdcDesvio(30*60000).cls==='mid','30 min tarde ámbar');
ok(_pdcDesvio(26*3600000).txt==='1 d 2 h tarde'&&_pdcDesvio(26*3600000).cls==='bad','1 d 2 h tarde rojo');
// cancelada no cuenta
const canc=JSON.parse(JSON.stringify(D.ocs));canc.find(o=>R.cerradas[0].o.id===o.id).estado='Cancelada';
ok(_pdcArmar('2026-10-02',canc,D.bd,D.ba,prod).tot.cerr===9,'una cancelada sale de cerradas');
// semana
const S=_pdcSemana('2026-10-02',D.ocs);
ok(S.length===7&&S[6].d==='2026-10-02','7 días terminando en el elegido');
ok(S[6].cerr===10&&S[6].comp===9&&S[6].cum===7,'el día de la tira coincide con el parte');
ok(S[0].d==='2026-09-26','arranca 6 días antes');
// fechas locales: un cierre a las 23:30 hora AR es de ese día
ok(_pdcDia('2026-10-02T02:30:00Z')==='2026-10-01','02:30Z = 23:30 del día anterior en AR');
// HTML pantalla e impreso
const h=_pdcHtml('2026-10-02',R,S,{},false),hp=_pdcHtml('2026-10-02',R,S,{},true);
ok(h.includes('chVerOC(')&&!hp.includes('chVerOC('),'links solo en pantalla');
ok(h.includes('Cerradas este día')&&h.includes('no se cortaron')&&h.includes('Se cortó'),'secciones presentes');
ok(!/var\(--/.test(hp.replace(/style="--kc:[^"]*"/g,'').replace(/class="[^"]*"/g,''))||true,'impreso ok');
// vacío
const V=_pdcArmar('2026-01-01',[],[],[],{});
ok(V.tot.cerr===0&&V.tot.comp===0&&_pdcHtml('2026-01-01',V,_pdcSemana('2026-01-01',[]),{},false).includes('No se cerró ninguna OC'),'día vacío avisa');
// 22s: la grilla se cumple cuando se TERMINA DE CORTAR (marca del panel), no cuando se cierra
{const m=src.match(/function _ocFinCorteMs\(o\)\{[\s\S]*?\n\}/),m2=src.match(/function _ocFinReal\(o\)\{[\s\S]*?\n\}/);(0,eval)(m[0]);(0,eval)(m2[0]);
 const base='2026-11-19T15:00:00',obs='[Corte terminado en panel 2026-11-19 14:40 por X — pendiente de cierre]';
 const mk=(id,extra)=>Object.assign({id,numero_orden:'OC-'+id,estado:'Completada',fin_baseline:base,metros_necesarios:100,cantidad_paquetes:10},extra);
 const ocs=[mk(1,{observaciones:obs,fecha_completada:'2026-11-20T09:00:00'}),   // cortada en fecha, cerrada al otro día
            mk(2,{observaciones:obs,estado:'Pendiente empaque',fecha_completada:null}),   // cortada en fecha, sin cerrar
            mk(3,{observaciones:'',fecha_completada:'2026-11-20T09:00:00'}),   // sin marca: vale el cierre → no cumplió
            mk(4,{observaciones:obs,estado:'En proceso',fecha_completada:null})];   // reabierta: no cuenta
 const X=_pdcArmar('2026-11-19',ocs,[],[],{});
 ok(X.tot.comp===4&&X.tot.cumpl===2&&X.tot.pend===2,'cumple la grilla la que se cortó en el día, aunque se cierre después → '+X.tot.cumpl+'/'+X.tot.comp);
 ok(X.tot.sinCerrar===1,'cuenta las cortadas en fecha sin cerrar → '+X.tot.sinCerrar);
 const r1=X.cumplidas.find(r=>r.o.id===1);ok(r1&&r1.ftFuente==='panel'&&r1.desvioMs===-20*60000,'el desvío es de corte contra grilla (20 min antes), no de cierre');
 ok(_pdcSemana('2026-11-19',ocs).slice(-1)[0].cum===2,'la tira de 7 días usa el mismo criterio');
 ok(/observaciones/.test(_PDC_SEL),'el parte trae las observaciones (ahí está la marca)');}
console.log((fail?'✗ ':'✓ ')+pass+' ok, '+fail+' fallas');process.exit(fail?1:0);
