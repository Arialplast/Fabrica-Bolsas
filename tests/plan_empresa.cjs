// 17a: Plan de empresa — números, avance y coherencia
const fs=require('fs');const src=fs.readFileSync(process.argv[2],'utf8');let k=0;const A=(c,t)=>{if(!c){console.error('✗ '+t);process.exit(1);}k++;};
const cst=n=>src.match(new RegExp('const '+n+'=[\\s\\S]*?;\\n'))[0];const fn=n=>{const m=src.match(new RegExp('function '+n+'\\([^)]*\\)\\{[\\s\\S]*?\\n\\}'))||src.match(new RegExp('function '+n+'\\(.*\\}'));if(!m)throw new Error('no '+n);return m[0];};
const one=n=>src.match(new RegExp('function '+n+'\\(.*\\}'))[0];
eval(cst('PE_AREAS')+cst('PE_IND')+cst('PE_K')+one('_peMeses')+fn('_peNumeros')+fn('_peAvance')+fn('_peCoherencia')+one('_peRepartir')+fn('_peBaseDe').replace(/_rmMesAnterior/g,'_ma')+';globalThis._peBaseDe=_peBaseDe;globalThis.PE_AREAS=PE_AREAS');
const near=(a,b,e)=>Math.abs(a-b)<(e||1e-6);
const metas=[];_peMeses(2026).forEach(m=>{[['kg',30000],['venta',90e6],['margen',30e6],['gastos',25e6],['resultado',5e6],['cobranza',90e6]].forEach(x=>metas.push({mes:m,clave:x[0],valor:x[1]}));});
const rm={};['2026-01','2026-02','2026-03'].forEach(m=>{rm[m]={kg:27000,venta:80e6,margen:24e6,gastos:25e6,resultado:-1e6,cobranza:70e6};});
const N=_peNumeros(2026,metas,rm,'2026-03-31');
A(N.nPres===12&&near(N.presAnio.kg,360000)&&near(N.presYtd.kg,90000)&&near(N.ytd.kg,81000)&&near(N.frac,0.25),'suma presupuesto del año, a hoy y real acumulado');
let a=_peAvance({ind:'kg',meta:360000},N);A(near(a.real,81000)&&near(a.esperado,90000)&&near(a.proy,81000+270000)&&a.estado==='aviso','kilos: 90 % de lo que debería llevar = atrasado; cierre = real + presupuesto que falta');
a=_peAvance({ind:'resultado',meta:60e6},N);A(a.estado==='mal'&&near(a.real,-3e6),'resultado negativo contra presupuesto positivo = lejos');
a=_peAvance({ind:'gastos',meta:300e6},N);A(a.estado==='ok'&&a.menor,'gastos: menos es mejor');
a=_peAvance({ind:'margen_pct',meta:31},N);A(near(a.real,30)&&a.estado==='aviso','margen % acumulado contra la meta');
a=_peAvance({ind:'manual',meta:9,base:7,act:8},N);A(near(a.pct,0.5)&&a.estado==='ok','manual: mitad del camino con un cuarto del año = en camino');
a=_peAvance({ind:'manual',meta:9,base:7,act:7.1},N);A(a.estado==='mal','manual: casi sin avance = lejos');
a=_peAvance({ind:'kg',meta:''},N);A(a.estado==='sin','sin meta no hay estado');
const N27=_peNumeros(2027,[],rm,'2026-03-31');A(N27.frac===0&&_peAvance({ind:'kg',meta:1},N27).estado==='sin','año que no empezó: sin medición');
const d={rumbo:'',obj:[{id:'o1',area:'com',n:'Kilos',ind:'kg',meta:400000},{id:'o2',area:'eco',n:'Res',ind:'resultado',meta:60e6}],est:[{id:'e1',obj:'o1',n:'x',tac:[{id:'t1',n:'llamar',resp:'G',fecha:'2026-02-01',estado:'pend'},{id:'t2',n:'otra',resp:'',fecha:'',estado:'pend'},{id:'t3',n:'hecha',resp:'G',fecha:'2026-01-01',estado:'hecha'}]}]};
const CO=_peCoherencia(d,N,{hoy:'2026-03-31',anio:2026,capMes:27000});const has=(niv,re)=>CO.some(c=>c.niv===niv&&re.test(c.t));
A(has('mal',/no tiene ninguna estrategia/),'objetivo sin estrategia');A(has('mal',/venció el 01\/02/),'táctica vencida');A(has('aviso',/1 táctica<\/b> sin responsable/),'tácticas sin responsable o fecha, agrupadas por área');A(!CO.some(c=>/«hecha»/.test(c.t)),'una táctica hecha no figura vencida');
A(has('mal',/objetivo de kilos[\s\S]*No dicen lo mismo/),'objetivo de kilos ≠ suma del presupuesto');A(has('mal',/No hay ninguna estrategia de Producción/),'kilos por encima de lo demostrado sin estrategia de Producción');
A(CO.filter(c=>/no tiene ningún objetivo/.test(c.t)).length===3,'áreas sin objetivo');
const ok=_peCoherencia({rumbo:'',obj:Object.keys(PE_AREAS).map((a,i)=>({id:'o'+i,area:a,n:'x',ind:a==='com'?'kg':'manual',meta:a==='com'?360000:1})),est:Object.keys(PE_AREAS).map((a,i)=>({id:'e'+i,obj:'o'+i,n:'e',tac:[{id:'t',n:'t',resp:'G',fecha:'2026-12-01',estado:'pend'}]}))},N,{hoy:'2026-03-31',anio:2026,capMes:40000});
A(ok.length===0,'plan completo y coherente: sin observaciones');
globalThis._ma=m=>{const y=parseInt(m.slice(0,4)),k=parseInt(m.slice(5,7));return k===1?(y-1)+'-12':y+'-'+String(k-1).padStart(2,'0');};
const BB=_peBaseDe({'2026-08':{kg:28000,venta:82e6,margen:35e6,gastos:45e6},'2026-09':{kg:32000,venta:93e6,margen:36e6,gastos:49e6},'2026-10':{kg:36000,venta:115.2e6,margen:48e6,gastos:44e6}},'2026-11');
A(BB.ult==='2026-10'&&near(BB.precio,3200)&&BB.precio3<3050&&near(BB.gastosMes,46e6),'precio del último mes cerrado, no el promedio de 3 (que queda más bajo); gastos sí promediados');
a=_peAvance({ind:'precio_kg',meta:3450},_peNumeros(2027,[],{'2026-10':{kg:36000,venta:115.2e6,margen:48e6}},'2026-11-16'));A(near(a.real,3200)&&a.estado==='mal'&&a.ult==='2026-10','precio por kilo: último mes cerrado contra la meta, aunque el año del plan no haya empezado');
const Rp=_peRepartir(['2027-01','2027-02'],{'2027-01':20,'2027-02':10},{kg:72000,precio:3000,margenKg:1000,gastosMes:8e6,plano:true});A(Rp['2027-01'].kg===36000&&Rp['2027-02'].kg===36000,'reparto parejo: los mismos kilos cada mes');
const R=_peRepartir(['2027-01','2027-02'],{'2027-01':20,'2027-02':10},{kg:30000,precio:3000,margenKg:1000,gastosMes:8e6});
A(R['2027-01'].kg===20000&&R['2027-02'].kg===10000&&R['2027-01'].venta===60e6&&R['2027-01'].resultado===12e6&&R['2027-02'].resultado===2e6,'reparte por días hábiles; resultado = margen − gastos');
A(/from\('plan_empresa'\)\.upsert/.test(src)&&/goAdmin\('plan-empresa'\)/.test(src)&&/id="page-plan-empresa"/.test(src)&&/#page-plan-empresa \.card/.test(src),'pantalla registrada y en claro');
console.log('✓ plan_empresa '+k+' ok');
// 17c: política de precios
{const src2=src;const f=src2.match(/function _pePolCalc\([^)]*\)\{[\s\S]*?\n\}/)[0];eval(src2.match(/function _pePolEsc\(.*\}/)[0]+src2.match(/function _pePolFechas\(.*\}/)[0]+';globalThis._pePolEsc=_pePolEsc;globalThis._pePolFechas=_pePolFechas;');const calc=eval('('+f+')');let n=0;const B=(c,t)=>{if(!c){console.error('✗ '+t);process.exit(1);}n++;};const nr=(a,b,e)=>Math.abs(a-b)<(e||1e-6);
 const base=[{id:1,nom:'A',venta:12e6,kg:4000},{id:2,nom:'B',venta:6e6,kg:2000},{id:3,nom:'L',venta:6e6,kg:2000},{id:4,nom:'cero',venta:0,kg:0}];const pol={desde:'2026-12-01',gen:6,exc:{1:5,3:0}};
 let K=calc(base,[],pol,'2026-11-16',30);B(!K.rige&&K.filas.length===3&&K.filas.every(x=>x.est==='espera'),'antes de la vigencia: todos en espera; sin ventas no figura');
 B(nr(K.pkBase,3000)&&nr(K.filas[0].pct,5)&&nr(K.filas[0].obj,3150)&&nr(K.filas.find(x=>x.id===2).pct,6)&&nr(K.filas.find(x=>x.id===3).mas,0),'aumento propio del cliente o el general');
 B(nr(K.masMes,12e6*0.05+6e6*0.06)&&nr(K.pctProm,(0.6+0.36)/24*100)&&nr(K.pkObj,3000*(1+0.04)),'promedio ponderado y lo que deja por mes');
 K=calc(base,[{id:1,venta:3.15e6,kg:1000},{id:2,venta:3.09e6,kg:1000},{id:3,venta:3e6,kg:1000}],pol,'2026-12-20',30);const e=id=>K.filas.find(x=>x.id===id).est;
 B(K.rige&&e(1)==='ok'&&e(2)==='parcial'&&e(3)==='na'&&K.nOk===1&&K.nNo===1,'después: aplicado, a medias, sin aumento');B(K.atraso<0&&nr(K.pkVig,3000*1.04),'total: por debajo de lo que debería llevar');
 K=calc(base,[{id:1,venta:3e6,kg:1000}],pol,'2026-12-20',30);B(K.filas.find(x=>x.id===1).est==='no'&&K.filas.find(x=>x.id===2).est==='sin','sin aplicar / sin compras todavía');
 K=calc(base,[],pol,'2026-11-16',60);B(nr(K.filas[0].vMes,6e6),'período base de 60 días se lleva a un mes');
 B(!/from\('(listas_precios|lista_precios_items|cliente_precios_especiales)'\)\.(insert|update|upsert|delete)[\s\S]{0,400}pePol/.test(src)&&!/function pePol[A-Za-z]*\([^)]*\)\{[^\n]*from\('(listas_precios|lista_precios_items|cliente_precios_especiales)'\)/.test(src),'la política no escribe precios');
 // 17d: escalones
 let E=_pePolEsc(6,2);B(E.length===3&&nr(E[0],2)&&nr(E[1],4.04)&&nr(E[2],6),'6 % en pasos de 2 %: tres escalones, el último completa');B(_pePolEsc(5,2).length===3&&_pePolEsc(6,0).length===1&&_pePolEsc(0,2).length===0&&_pePolEsc(1.5,2).length===1,'casos borde de escalones');
 B(_pePolFechas('2026-12-01',1,3).join()==='2026-12-01,2027-01-01,2027-02-01'&&_pePolFechas('2026-11-15',2,2)[1]==='2027-01-15','fechas de los escalones cruzan de año');
 const pe={desde:'2026-12-01',gen:6,exc:{1:5,3:0},paso:2,cada:1};
 K=calc(base,[],pe,'2026-11-16',30);B(K.nMax===3&&K.cron.length===3&&nr(K.cron[0].pct,2*18/24)&&nr(K.cron[2].mas,K.masMes)&&K.fin==='2027-02-01','cronograma: el primer escalón no toca al cliente sin aumento; el último llega al total');
 B(nr(K.costoEsc,(K.masMes-K.cron[0].mas)+(K.masMes-K.cron[1].mas)),'lo que cuesta ir de a poco = lo que se deja de cobrar hasta completar');
 K=calc(base,[{id:1,venta:3.06e6,kg:1000},{id:2,venta:3e6,kg:1000}],pe,'2026-12-20',30);B(K.kHoy===1&&K.filas.find(x=>x.id===1).est==='ok'&&nr(K.filas.find(x=>x.id===1).vig,2)&&K.filas.find(x=>x.id===2).est==='no','en el primer escalón se exige 2 %, no el 5 % final');
 K=calc(base,[{id:1,venta:3.06e6,kg:1000}],pe,'2027-01-10',30);B(K.kHoy===2&&K.filas.find(x=>x.id===1).est==='no'&&nr(K.filas.find(x=>x.id===1).vig,4.04),'en el segundo escalón ya debería llevar 4 %');
 console.log('✓ plan_empresa 17c+17d '+n+' ok');}
// 18a: indicadores a hoy y acta
{let n=0;const B=(c,t)=>{if(!c){console.error('✗ '+t);process.exit(1);}n++;};const nr=(a,b,e)=>Math.abs(a-b)<(e||1e-6);
 const cs=eval('('+src.match(/function _peCorteSem\(.*\}/)[0]+')');
 B(nr(cs([{estado:'Completada',fecha_completada:'2026-11-10T10:00:00',unidades_reales:100000,peso:0.02},{estado:'Completada',fecha_completada:'2026-10-01',unidades_reales:9e6,peso:1},{estado:'En curso',fecha_completada:'2026-11-10',unidades_reales:9e6,peso:1}],'2026-11-16'),500),'kilos cortados por semana: solo completadas de los últimos 28 días, dividido 4');
 eval(src.match(/const PE_IND=[\s\S]*?;\n/)[0]+src.match(/function _peAvance\([^)]*\)\{[\s\S]*?\n\}/)[0]+';globalThis._av=_peAvance;');
 const N={frac:0,nReal:0,ult:{ym:'2026-10',kg:36000,venta:1,margen:1,clientes:26,top3:48},hoy:{corte_sem:7700,caja_min:-1e6,venc_pagar:29e6,otif:96}};
 let a=_av({ind:'corte_sem',meta:8300},N);B(a.estado==='aviso'&&a.hoy&&nr(a.real,7700),'corte 7,7 de 8,3 t = atrasado');
 a=_av({ind:'caja_min',meta:3e6},N);B(a.estado==='mal','caja que queda en rojo contra un piso de 3 M = lejos');
 a=_av({ind:'venc_pagar',meta:0},N);B(a.estado==='mal'&&a.menor,'vencido a pagar con meta 0');a=_av({ind:'otif',meta:95},N);B(a.estado==='ok','entregas a tiempo sobre la meta');
 a=_av({ind:'top3',meta:45},N);B(a.estado!=='ok'&&a.menor&&nr(a.real,48),'concentración: menos es mejor');a=_av({ind:'clientes',meta:25},N);B(a.estado==='ok','clientes del último mes cerrado');
 a=_av({ind:'dso',meta:20},N);B(a.estado==='sin','indicador sin dato todavía');
 eval(src.match(/const PE_K=.*;\n/)[0]+';globalThis.PE_K=PE_K;');const foto=eval('('+src.match(/function _peActaFoto\([^)]*\)\{[\s\S]*?\n\}/)[0]+')');
 const F=foto({obj:[{id:'o',n:'Kilos',area:'com',meta:36000}],est:[{tac:[{n:'a',estado:'hecha'},{n:'b',estado:'pend',fecha:'2026-10-01',resp:'G'},{n:'c',estado:'cancel'}]}]},{pres:{'2026-10':{kg:36000}}},{o:{real:36700,u:'kg',estado:'ok'}},'2026-10',{'2026-10':{kg:36700,venta:1,margen:1,gastos:1,resultado:0,cobranza:1}},'2026-11-16');
 B(F.pres.kg===36000&&F.real.kg===36700&&F.obj[0].estado==='ok'&&F.tac.total===2&&F.tac.hechas===1&&F.tac.venc.length===1,'acta: foto del mes, objetivos y tácticas (sin las descartadas)');
 console.log('✓ plan_empresa 18a '+n+' ok');}
// 18b: scrap, gente y versión aprobada
{let n=0;const B=(c,t)=>{if(!c){console.error('✗ '+t);process.exit(1);}n++;};const nr=(a,b,e)=>Math.abs(a-b)<(e||1e-6);const one=k=>eval('('+src.match(new RegExp('function '+k+'\\(.*\\}'))[0]+')');
 const sc=one('_peScrap'),ge=one('_peGente');
 B(nr(sc([{estado:'Completada',fecha_completada:'2026-11-10',unidades_reales:1000,peso:0.097,scrap:3},{estado:'Completada',fecha_completada:'2026-11-11',unidades_reales:1000,peso:1,scrap:null},{estado:'Completada',fecha_completada:'2026-09-01',unidades_reales:1,peso:1,scrap:50}],'2026-11-16'),3),'scrap = scrap ÷ (buenos + scrap), solo OC con scrap pesado de los últimos 28 días');
 B(sc([],'2026-11-16')===null,'sin OC pesadas no hay dato');
 let g=ge([{esp:9,trab:9,extra:2},{esp:9,trab:0,extra:0},{esp:9,trab:11,extra:0},{esp:0,trab:0,extra:6}],4);B(nr(g.ausent,100/3)&&nr(g.hs_extra,2),'ausentismo = horas normales no trabajadas ÷ esperadas; horas extra por semana');
 const cm=eval('('+src.match(/function _peCambios\([^)]*\)\{[\s\S]*?\n\}/)[0]+')');const ap={obj:[{id:'a',n:'Kilos',meta:36000},{id:'b',n:'Viejo',meta:1}],pres:{kg:432000,venta:0,margen:0,gastos:0,resultado:0,cobranza:0}};
 let c=cm(ap,{obj:[{id:'a',n:'Kilos',meta:34000},{id:'c',n:'Nuevo',meta:5}]},{kg:400000});
 B(c.some(x=>x.t==='meta'&&x.de===36000&&x.a===34000)&&c.some(x=>x.t==='nuevo')&&c.some(x=>x.t==='quitado')&&c.some(x=>x.t==='pres'&&x.k==='kg')&&c.length===4,'cambios desde la aprobación: meta, objetivo nuevo, quitado y presupuesto');
 B(cm(ap,{obj:[{id:'a',n:'Kilos',meta:'36000'},{id:'b',n:'Viejo',meta:1}]},{kg:432000}).length===0&&cm(null,{obj:[]},{}).length===0,'sin cambios / sin aprobación');
 console.log('✓ plan_empresa 18b '+n+' ok');}
// 18c: OEE como objetivo, un solo cálculo
{let n=0;const B=(c,t)=>{if(!c){console.error('✗ '+t);process.exit(1);}n++;};
 globalThis._oeeMaq=(D,g)=>g;const tot=eval('('+src.match(/function _oeeExtTotal\(D\)\{[\s\S]*?\n[^\n]*\}/)[0]+')');
 const T=tot({grupos:[{plan:600,run:480,runExtra:0,kg:1000,kgOK:980,stdH:7},{plan:400,run:320,runExtra:0,kg:500,kgOK:500,stdH:5}]});
 B(Math.abs(T.A-0.8)<1e-9&&Math.abs(T.P-12/(800/60))<1e-9&&Math.abs(T.Q-1480/1500)<1e-9&&Math.abs(T.O-0.8*0.9*(1480/1500))<1e-9,'OEE de extrusión = disponibilidad × rendimiento × calidad de toda la planta');
 B((src.match(/A\*Math\.min\(1,P\)\*Q/g)||[]).length<=3&&/_oeeExtTotal\(D\);\n  const T=/.test(src),'la pantalla OEE usa el mismo cálculo');
 const N={hoy:{oee_ext:61,oee_corte:48}};B(_av({ind:'oee_ext',meta:65},N).estado==='aviso'&&_av({ind:'oee_corte',meta:65},N).estado==='mal','OEE contra la meta');
 console.log('✓ plan_empresa 18c '+n+' ok');}
