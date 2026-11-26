// 22d: luz por mes de consumo
const fs=require('fs');const src=fs.readFileSync(process.argv[2],'utf8');let n=0;const A=(c,t)=>{if(!c){console.error('✗ '+t);process.exit(1);}n++;};
const localDate=d=>{d=d||new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
const grab=re=>{const m=src.match(re);if(!m)throw new Error('no '+re);return m[0];};
eval(grab(/function _eneMasDias\(fs,n\)\{.*\}/));eval(grab(/function _dgFmtDia\(f\)\{.*\}/));
eval(grab(/function _devTramos\(d,h\)\{[\s\S]*?\n  return out;\}/));eval(grab(/function _devPartir\(c,P\)\{[\s\S]*?\n\}/));
let T=_devTramos('2026-10-06','2026-11-05');A(T.length===2&&T[0].dias===26&&T[1].dias===4&&T[0].h==='2026-11-01','tramos por mes, fin excluido');
A(_devTramos('2026-12-20','2027-01-10').length===2,'cruza el año');A(_devTramos('2026-11-05','2026-11-05').length===0,'vacío');
const c={id:9,fecha:'2026-11-06',total:'6411944.15',iva_monto:'1348168.26',neto:'5063775.89',descripcion:'EDELAP'};
const P=_devPartir(c,{d:'2026-10-06',h:'2026-11-05'});
A(P.length===2&&P[0].fecha==='2026-10-31'&&P[1].fecha==='2026-11-04','cada porción cae en su mes');
A(Math.abs(P[0].total+P[1].total-6411944.15)<0.001&&Math.abs(P[0].iva_monto+P[1].iva_monto-1348168.26)<0.001,'las porciones suman exacto la factura');
A(Math.abs(P[0].total/6411944.15-26/30)<1e-6,'reparto por días');A(P[0].id===9&&P[0]._dev.diasTot===30,'conserva el documento');
// período desde la descripción
const per=grab(/function _eneFacturaPeriodo\(c\)\{[\s\S]*?return \{d,h,kwh:[^\n]*\}/);
const f=eval('(()=>{const _eneFacturasCfg=()=>({});'+per+';return _eneFacturaPeriodo;})()');
let q=f({id:1,fecha:'2026-11-06',fecha_estimada_pago:'2026-11-16',descripcion:'EDELAP ciclo 2026-11 · consumo 07/09–06/10 · 17.075 kWh'});
A(q.d==='2026-09-07'&&q.h==='2026-10-06'&&!q.estimado&&q.kwh===17075,'lee período y kWh de la descripción');
q=f({id:2,fecha:'2027-01-06',descripcion:'consumo 05/12–04/01'});A(q.d==='2026-12-05'&&q.h==='2027-01-04','período que cruza el año');
q=f({id:3,fecha:'2026-09-15',fecha_estimada_pago:'2026-10-16',descripcion:null});A(q.estimado&&q.h==='2026-09-06'&&q.d==='2026-08-07','sin descripción: vencimiento − 40 días');
// consumidores del resultado usan los documentos devengados
['function _dgComprasOp','function _rmResumenMes','async function renderResultadoMes','function _resultadoRangoSync','function _margenDisponibleMes','function _snapCalcular','async function renderTablero'].forEach(fn=>{const i=src.indexOf(fn);A(i>0&&src.slice(i,i+8000).indexOf('_cgResDocs()')>0,fn+' usa la luz por consumo');});
A(/const ENE_AUTO_KEY='ene_auto_v2'/.test(src)&&/prov\.push\(\{d:t\.d,h:t\.h,kwh/.test(src),'provisión del medidor desde la última factura');
console.log('✓ devengado_luz '+n+' ok');
