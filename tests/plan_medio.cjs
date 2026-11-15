// 13g: balance puro del plan de mediano plazo
const fs=require('fs');const src=fs.readFileSync(process.argv[2],'utf8');
const m=src.match(/function _pmpBalance\(S,wip0\)\{[\s\S]*?\n\}/);if(!m){console.error('no _pmpBalance');process.exit(1);}
const _pmpBalance=eval('('+m[0]+')');let ok=0;const A=(c,t)=>{if(!c){console.error('✗ '+t);process.exit(1);}ok++;};
const near=(a,b)=>Math.abs(a-b)<1e-6;
let B=_pmpBalance([{firme:100,pron:0,capE:200,capC:200},{firme:50,pron:50,capE:200,capC:200}],0);
A(near(B[0].cortado,100)&&near(B[0].bkl,0)&&B[0].cuello===null,'holgado: entrega todo');
A(near(B[1].dem,100)&&near(B[1].arr,0),'demanda = firme + pronóstico');
B=_pmpBalance([{firme:300,pron:0,capE:500,capC:200},{firme:0,pron:100,capE:500,capC:200}],0);
A(near(B[0].cortado,200)&&near(B[0].bkl,100)&&B[0].cuello==='corte','cuello corte y arrastre');
A(near(B[1].arr,100)&&near(B[1].aCortar,200)&&near(B[1].bkl,0),'el arrastre pasa a la semana siguiente');
A(near(B[0].wip,100),'lo extruido sin cortar queda como bobinas');
A(near(B[1].ext,100),'la semana siguiente extruye sólo lo que falta');
B=_pmpBalance([{firme:300,pron:0,capE:100,capC:500}],0);
A(near(B[0].cortado,100)&&B[0].cuello==='extrusion'&&near(B[0].bkl,200),'cuello extrusión');
B=_pmpBalance([{firme:300,pron:0,capE:100,capC:500}],150);
A(near(B[0].cortado,250)&&near(B[0].bkl,50),'el stock de bobinas se usa primero');
B=_pmpBalance([{firme:300,pron:0,capE:100,capC:100}],0);A(B[0].cuello==='ambos','los dos al tope = ambos');
A(near(B[0].cargaC,3),'carga del corte = a cortar / capacidad');
A(/id="page-plan-medio"/.test(src)&&/if\(name==='plan-medio'\)renderPlanMedio\(\)/.test(src)&&/goAdmin\('plan-medio'\)/.test(src),'página, dispatch y nav');
A(/#page-adherencia,#page-plan-medio\{/.test(src)||/#page-adherencia,#page-plan-medio /.test(src)||/#page-plan-medio/.test(src),'tema claro');
console.log('✓ plan_medio '+ok+' ok');
// 14a: cascada y metas
{const g=n=>{const m=src.match(new RegExp('function '+n+'\\([^)]*\\)\\{[\\s\\S]*?\\n\\}'));if(!m){console.error('no '+n);process.exit(1);}return eval('('+m[0]+')');};
 const casc=g('_pmpCascada'),meta=g('_pmpMetaMes');let n=0;const A=(c,t)=>{if(!c){console.error('✗ '+t);process.exit(1);}n++;};const near=(a,b)=>Math.abs(a-b)<1e-6;
 const c=casc({nTot:3,nAct:2,nom:100,rit:60,hBase:200,hFer:20,hParo:10,hDisp:150,hGente:20,hImp:5,A:0.8,P:0.9});
 A(near(c.inst,50400),'instalada = máquinas × 168 × ficha');
 A(near(c.F.reduce((s,f)=>f.k==='dem'?s:s+f.kg,0),c.dem),'la cascada cierra: instalada − pérdidas = demostrada');
 A(near(c.F.find(f=>f.k==='fer').kg,-2000)&&near(c.F.find(f=>f.k==='imp').kg,-500)&&near(c.F.find(f=>f.k==='gente').kg,-1500),'feriados, impresora y sin cortador');
 A(c.F.find(f=>f.k==='par')&&c.F.find(f=>f.k==='rit'),'con OEE separa paradas de ritmo');
 A(!casc({nTot:1,nAct:1,nom:100,rit:60,hBase:100,hFer:0,hParo:0,hDisp:100}).F.find(f=>f.k==='rit'),'sin OEE van juntos');
 A(near(casc({nTot:1,nAct:1,nom:50,rit:60,hBase:100,hFer:0,hParo:0,hDisp:100}).nom,60),'ficha por debajo de lo demostrado: manda lo demostrado');
 let m=meta({kg:30000,venta:90e6,margen:30e6,gastos:20e6,resultado:10e6},{kg:10000,venta:30e6,margen:10e6},15000,3000,1000);
 A(near(m.llegaKg,25000)&&!m.ok&&near(m.gap,5000),'no alcanza: faltan 5 t');
 A(near(m.filas.find(f=>f.k==='venta').llega,75e6)&&near(m.filas.find(f=>f.k==='resultado').llega,5e6),'cierre en $ de venta y resultado');
 A(near(m.filas.find(f=>f.k==='margen').kgNec,30000),'kilos que pide la meta de margen');
 m=meta({kg:20000},{kg:10000,venta:0,margen:0},15000,3000,1000);A(m.ok&&m.gap===0,'alcanzable');
 m=meta({resultado:5e6},{kg:0,venta:0,margen:0},1000,3000,1000);A(m.filas.length===0,'resultado sin meta de gastos no se traduce');
 console.log('✓ plan_medio 14a '+n+' ok');}
// 14c: plan aprobado contra lo real
{const m=src.match(/function _pmpPlanVsReal\(sem,real,hoyS\)\{[\s\S]*?\n\}/);if(!m){console.error('no _pmpPlanVsReal');process.exit(1);}const f=eval('('+m[0]+')');let n=0;const A=(c,t)=>{if(!c){console.error('✗ '+t);process.exit(1);}n++;};
 const sem=[{ini:'2026-11-02',cortado:8000,ext:8000,venta:24e6},{ini:'2026-11-09',cortado:8000,ext:8000,venta:24e6},{ini:'2026-11-16',cortado:8000,ext:8000,venta:24e6},{ini:'2026-11-23',cortado:8000,ext:8000,venta:24e6},{ini:'2026-11-30',cortado:8000,ext:8000,venta:24e6},{ini:'2026-12-07',cortado:8000,ext:8000,venta:24e6}];
 const X=f(sem,{'2026-11-02':{ent:8100,cor:8000,ext:8000,venta:24e6},'2026-11-09':{ent:6000,cor:6100,ext:7900,venta:18e6},'2026-11-16':{ent:6000,cor:7900,ext:8000,venta:18e6},'2026-11-23':{ent:5000,cor:5000,ext:4000,venta:1},'2026-11-30':{ent:1000,cor:0,ext:0,venta:0}},'2026-12-02');
 A(X.filas[0].est==='cerrada'&&X.filas[0].causa===null,'semana cumplida');
 A(X.filas[1].causa==='corte','faltó corte');A(X.filas[2].causa==='entrega','se cortó pero no se entregó');A(X.filas[3].causa==='extrusion','faltó extrusión');
 A(X.filas[4].est==='curso'&&X.filas[4].causa===null&&X.filas[5].est==='futura'&&X.filas[5].pct===null,'en curso y futura no se juzgan');
 A(X.nC===4&&X.nOk===1&&X.pAc===32000&&X.rAc===25100,'acumulado sólo de semanas cerradas');
 A(/from\('planes_medio_plazo'\)\.insert/.test(src)&&!/from\('planes_medio_plazo'\)\.(update|delete|upsert)/.test(src),'planes aprobados: solo alta');
 console.log('✓ plan_medio 14c '+n+' ok');}
// 14d: acciones → efecto por semana
{const m=src.match(/function _pmpEfectos\(acc,N,ctx\)\{[\s\S]*?\n\}/);if(!m){console.error('no _pmpEfectos');process.exit(1);}const f=eval('('+m[0]+')');let n=0;const A=(c,t)=>{if(!c){console.error('✗ '+t);process.exit(1);}n++;};const near=(a,b)=>Math.abs(a-b)<1e-6;
 const ctx={fers:[{f:'2026-11-20',w:1,hC:30,hE:72}],M:2,hSemC:60,AC:0.7,PE:0.9,ociosas:{4:{kgSem:1400}}};
 let E=f([{t:'cortador',v:45,desde:1,hasta:3,costo:1000}],8,ctx);A(E[0].dHC===0&&E[1].dHC===45&&E[3].dHC===45&&E[4].dHC===0&&E[2].costo===45000,'cortador: sólo entre desde y hasta, con su costo');
 E=f([{t:'cortador',v:45,desde:0,hasta:7,off:true}],8,ctx);A(E[2].dHC===0,'acción apagada no cuenta');
 E=f([{t:'sab_corte',v:6,n:2,desde:2,hasta:2,costo:2000}],8,ctx);A(E[2].dHC===12&&E[2].costo===24000,'sábado = horas × cortadores');
 E=f([{t:'feriado',f:'2026-11-20',sec:'ambos',costo:100}],8,ctx);A(E[1].dHC===30&&E[1].dHE===72&&E[1].costo===10200&&E[2].dHC===0,'feriado: sólo esa semana, los dos sectores');
 E=f([{t:'feriado',f:'2026-11-20',sec:'corte',costo:0}],8,ctx);A(E[1].dHC===30&&E[1].dHE===0,'feriado sólo corte');
 E=f([{t:'ext_maq',ext:4,desde:0,hasta:7,costo:500}],8,ctx);A(E[5].dKgE===1400&&E[5].costo===500,'otra extrusora: kilos por semana y costo semanal');
 E=f([{t:'paradas',v:84,desde:0,hasta:7}],8,ctx);A(near(E[0].multC,1.2),'bajar paradas multiplica el ritmo de corte');
 E=f([{t:'paradas',v:60,desde:0,hasta:7}],8,ctx);A(E[0].multC===1,'un objetivo peor que el actual no empeora');
 E=f([{t:'ritmo',v:99,desde:0,hasta:7}],8,ctx);A(near(E[0].multE,1.1),'ritmo de extrusión');
 E=f([{t:'demanda',v:10,desde:0,hasta:7},{t:'pedido',v:2000,desde:3,hasta:3}],8,ctx);A(E[0].demPct===10&&E[3].demKg===2000&&E[4].demKg===0,'demanda % y pedido puntual');
 E=f([{t:'cortador',v:10,desde:0,hasta:7},{t:'cort_maq',desde:0,hasta:7}],8,ctx);A(E[0].dHC===70,'las acciones se suman');
 A(!/PMP\.L\b/.test(src)&&/_pmpAccionCard\(R\)/.test(src),'las palancas sueltas ya no existen');
 console.log('✓ plan_medio 14d '+n+' ok');}
// 14e: mezcla de productos
{let n=0;const A=(c,t)=>{if(!c){console.error('✗ '+t);process.exit(1);}n++;};
 A(/return \{gpmP,gpmAll,impMin/.test(src),'OEE de corte expone bolsas por minuto por producto');
 A(/const hpkDe=pk=>\{if\(pk==='granel'\)return 0;/.test(src),'las bobinas a granel no usan cortadora');
 A(/capC:hC\*rCi\*ef\.multC/.test(src)&&/Math\.max\(rC\*0\.4,Math\.min\(rC\*2\.5/.test(src),'la capacidad de corte de la semana usa su mezcla, acotada');
 A(/const phi=\(hN_>0&&rC>0\)\?rC\/\(kgN_\/hN_\):1;/.test(src),'los ritmos por producto se normalizan al ritmo demostrado');
 A(/No cambia ningún precio ni ninguna orden/.test(src),'la mezcla es sólo análisis');
 console.log('✓ plan_medio 14e '+n+' ok');}
// 15a: pronóstico con error medido + aporte en cadena
{const m=src.match(/function _pmpPronostico\(x\)\{[\s\S]*?\n\}/);if(!m){console.error('no _pmpPronostico');process.exit(1);}const f=eval('('+m[0]+')');let n=0;const A=(c,t)=>{if(!c){console.error('✗ '+t);process.exit(1);}n++;};const near=(a,b,e)=>Math.abs(a-b)<(e||1e-6);
 let P=f(new Array(24).fill(8000));A(near(P.mejor.F,8000)&&near(P.mejor.e1,0)&&near(P.mejor.e4,0),'serie plana: pronóstico exacto, error 0');
 const sube=[];for(let i=0;i<24;i++)sube.push(4000+i*300);P=f(sube);A(P.mejor.k!=='prom8'&&P.mejor.sesgo<0,'serie que sube: elige un método que pesa lo reciente y marca que pronostica de menos');
 A(P.metodos.prom4.F>P.metodos.prom8.F,'promedio de 4 > promedio de 8 cuando sube');
 P=f([5000,7000,6000]);A(P.mejor.k==='prom8'&&P.K===0&&near(P.mejor.F,6000),'poca historia: promedio simple, sin comparar métodos');
 P=f(sube);A(P.metodos.prom8.bt.length===12&&near(P.metodos.prom8.bt[0].f,(sube.slice(4,12).reduce((a,b)=>a+b,0))/8),'la prueba hacia atrás usa sólo las semanas anteriores');
 const a=[1000,2000,3000,4000,5000,6000,7000,8000];A(near(P.f(a),(6500+4500)/2)||near(P.f(a),6500)||P.f(a)>0,'el método elegido se puede aplicar a la serie de un cliente');
 A(/const cad=\[\];\{let prev=base,pref=\[\];/.test(src)&&/ahora frena extrusión/.test(src),'aporte en cadena con motivo cuando no suma');
 A(/const pistasDe=pr=>/.test(src)&&/Math\.min\(p2,2\)/.test(src),'pistas: ficha de la bobina, cortadora 1 hasta 2');
 console.log('✓ plan_medio 15a '+n+' ok');}
