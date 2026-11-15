// 16a: proyección de caja de 13 semanas — motor puro
const fs=require('fs');const src=fs.readFileSync(process.argv[2],'utf8');
const m=src.match(/function _c13Proyectar\(base,esc\)\{[\s\S]*?\n\}/);if(!m){console.error('no _c13Proyectar');process.exit(1);}const f=eval('('+m[0]+')');let n=0;const A=(c,t)=>{if(!c){console.error('✗ '+t);process.exit(1);}n++;};const near=(a,b)=>Math.abs(a-b)<1e-6;
const plan=[];for(let i=0;i<13;i++)plan.push({cobNueva:i>=2?100:0,mp:60,ener:5,otros:10,retiros:2,acc:0});
const base={N:13,saldo0:50,cob:[{w:0,g:'doc',m:40},{w:1,g:'doc',m:30},{w:1,g:'chq',m:20},{w:12,g:'ped',m:10}],pag:[{w:0,g:'suel',m:30},{w:1,g:'arca',m:25}],vencCob:[{m:80}],vencPag:[{g:'mp',p:3,m:90},{g:'suel',p:1,m:30},{g:'arca',p:2,m:60}],plan};
let P=f(base,{atraso:0,cobVenc:0,cobVencSem:4,venta:0,regSem:0});
A(near(P.sem[0].ing,40)&&near(P.sem[0].egr,30+60+5+10+2)&&near(P.sem[0].saldo,50+40-107),'semana 0: entra lo documentado, sale lo documentado + lo del plan');
A(near(P.sem[1].cob.doc,30)&&near(P.sem[1].cob.chq,20),'cada cobro en su semana');
A(near(P.vencSinPagar,180)&&P.sem.every(s=>s.reg===0),'sin regularización lo vencido queda afuera');
A(near(P.sem[12].saldo,P.fin)&&P.min.v<=Math.min(...P.sem.map(s=>s.saldo))+1e-9,'saldo final y punto más bajo');
P=f(base,{atraso:1,cobVenc:0,cobVencSem:4,venta:0,regSem:0});
A(!P.sem[0].cob.doc&&near(P.sem[1].cob.doc,40)&&near(P.sem[2].cob.doc,30),'la cobranza se corre una semana');
A(near(P.sem[1].cob.chq,20),'el cheque no se atrasa: tiene fecha');
A(!P.sem[12].cob.ped,'lo que se corre fuera del horizonte no entra');A(near(P.sem[3].cob.nueva,100)&&!P.sem[2].cob.nueva,'la venta nueva también se atrasa');
P=f(base,{atraso:0,cobVenc:50,cobVencSem:4,venta:0,regSem:0});A(near(P.sem[0].cob.venc,10)&&near(P.sem[3].cob.venc,10)&&!P.sem[4].cob.venc&&near(P.vencCobrado,40),'recupero de lo vencido: % en N semanas');
P=f(base,{atraso:0,cobVenc:0,cobVencSem:4,venta:-50,regSem:0});A(near(P.sem[2].cob.nueva,50)&&near(P.sem[0].pag.mpN,30)&&near(P.sem[0].pag.est,10),'menos venta: baja cobranza nueva, materia prima y energía; la estructura no');
P=f(base,{atraso:0,cobVenc:0,cobVencSem:4,venta:0,regSem:3});
A(near(P.sem[0].reg,60)&&near(P.sem[1].reg,60)&&near(P.sem[2].reg,60)&&near(P.vencSinPagar,0),'regularización en cuotas iguales');
A(near(P.sem[0].pag.suel,30+30)&&near(P.sem[0].pag.arca,30)&&near(P.sem[1].pag.arca,25+30)&&near(P.sem[1].pag.mp,30)&&near(P.sem[2].pag.mp,60),'se paga primero sueldos, después ARCA, después materia prima');
P=f(base,{atraso:0,cobVenc:0,cobVencSem:4,venta:0,regSem:20});A(near(P.vencSinPagar,180-13*9),'lo que no entra en 13 semanas queda para después');
A(/fcItemsProyectados\(finS\)/.test(src)&&/_pmpCaja\(R\)/.test(src),'usa el derivador de Flujo de caja y el plan de mediano plazo');
const seg=src.slice(src.indexOf('const C13='),src.indexOf('function oeeDias'));const w=(seg.match(/sb\.from\('([a-z_]+)'\)\.(insert|update|upsert|delete)/g)||[]);A(w.length===2&&w.some(x=>/configuracion/.test(x))&&w.some(x=>/caja_proyecciones'\)\.insert/.test(x)),'sólo escribe su configuración y la foto semanal');
A(/id="page-caja-13"/.test(src)&&/if\(name==='caja-13'\)renderCaja13\(\)/.test(src)&&/goAdmin\('caja-13'\)/.test(src),'página, dispatch y menú');
console.log('✓ caja_13 '+n+' ok');
// 16b: acciones financieras y proyectado contra real
{const g=n=>{const mm=src.match(new RegExp('function '+n+'\\([^)]*\\)\\{[\\s\\S]*?\\n\\}'));if(!mm){console.error('no '+n);process.exit(1);}return eval('('+mm[0]+')');};const ap=g('_c13Aplicar'),cmp=g('_c13Comparar');let k=0;const A=(c,t)=>{if(!c){console.error('✗ '+t);process.exit(1);}k++;};const near=(a,b)=>Math.abs(a-b)<1e-6;
 const plan=[];for(let i=0;i<13;i++)plan.push({cobNueva:i>=2?100:0,mp:60,ener:5,otros:10,retiros:2,acc:0});
 const base={N:13,saldo0:50,cob:[{w:1,g:'doc',m:30},{w:4,g:'chq',m:200},{w:8,g:'chq',m:100}],pag:[{w:1,g:'arca',p:2,m:25},{w:2,g:'mp',p:3,m:40},{w:12,g:'mp',p:3,m:10}],vencCob:[{m:80}],vencPag:[{g:'mp',p:3,m:90},{g:'suel',p:1,m:30}],plan};
 let R=ap(base,[{t:'cobrar_venc',pct:25,w:2}]);A(near(R.base.vencCob[0].m,60)&&R.base.cob.some(x=>x.g==='venc'&&x.w===2&&near(x.m,20)),'campaña de cobranza: cobra una parte y la descuenta de lo vencido');
 A(base.vencCob[0].m===80&&base.cob.length===3,'no modifica la base original');
 R=ap(base,[{t:'desc_chq',w:0,monto:250,tasa:3}]);const fin=R.base.cob.find(x=>x.g==='fin');const c=200*0.03*(4*7/30)+50*0.03*(8*7/30);
 A(near(R.costo,c)&&near(fin.m,250-c)&&fin.w===0,'descontar cheques: entra hoy menos el interés');A(near(R.base.cob.find(x=>x.g==='chq'&&x.w===4).m,0)&&near(R.base.cob.find(x=>x.g==='chq'&&x.w===8).m,50),'toma primero los cheques más cercanos');
 R=ap(base,[{t:'prestamo',w:0,monto:120,cuotas:3,cada:4,tasa:3}]);const cu=R.base.pag.filter(x=>x.g==='banc');A(R.base.cob.some(x=>x.g==='fin'&&near(x.m,120))&&cu.length===3&&cu[0].w===4&&cu[2].w===12,'préstamo: entra el monto y se devuelve en cuotas');
 A(near(cu.reduce((a,x)=>a+x.m,0),120+R.costo)&&R.costo>0,'las cuotas devuelven capital + interés');
 R=ap(base,[{t:'prestamo',w:10,monto:100,cuotas:2,cada:4,tasa:0}]);A(near(R.despues,100),'lo que vence después de las 13 semanas se informa aparte');
 R=ap(base,[{t:'estirar',g:'mp',sem:2,desde:0}]);A(R.base.pag.find(x=>x.g==='mp'&&near(x.m,40)).w===4&&near(R.base.plan[0].mp,0)&&near(R.base.plan[2].mp,60),'más plazo con proveedores corre las facturas y la materia prima del plan');A(near(R.despues,10+120),'lo corrido fuera del horizonte queda para después');
 R=ap(base,[{t:'pagar_venc',g:'mp',sem:3,desde:1}]);A(R.base.vencPag.length===1&&R.base.vencPag[0].g==='suel'&&R.base.pag.filter(x=>near(x.m,30)&&x.g==='mp').length===3,'plan de pagos: saca lo vencido de ese tipo y lo pone en cuotas');
 R=ap(base,[{t:'post_cuota',g:'arca',w:1,sem:4,rec:10}]);A(R.base.pag.find(x=>x.g==='arca').w===5&&near(R.base.pag.find(x=>x.g==='arca').m,27.5)&&near(R.costo,2.5),'postergar una cuota: se corre con recargo');
 R=ap(base,[{t:'sin_retiros',desde:0,hasta:3}]);A(R.base.plan[3].retiros===0&&R.base.plan[4].retiros===2,'suspender retiros en un período');
 R=ap(base,[{t:'cobrar_antes',sem:1}]);A(R.base.cob.find(x=>x.g==='doc').w===0&&near(R.base.plan[1].cobNueva,100)&&R.base.cob.find(x=>x.g==='chq').w===4,'acortar el plazo adelanta facturas y venta nueva, no los cheques');
 R=ap(base,[{t:'ingreso',w:3,monto:70,off:true}]);A(R.base.cob.length===3,'acción apagada no cuenta');
 const X=cmp([{semana:'2026-11-02',semanas:[{i:0,saldo:100},{i:1,saldo:120},{i:2,saldo:90}]}],f=>f==='2026-11-08'?80:f==='2026-11-15'?130:0,'2026-11-16');
 A(X.length===2&&X[0].fin==='2026-11-15'&&X[0].ade===2&&X[0].dif===10&&X[1].dif===-20,'compara sólo semanas cerradas: real − proyectado');
 A(/from\('caja_proyecciones'\)\.insert/.test(src)&&!/from\('caja_proyecciones'\)\.(update|delete|upsert)/.test(src),'las fotos de la proyección son solo alta');
 console.log('✓ caja_13 16b '+k+' ok');}
// 16c: materia prima que rota + pagar un documento
{const g=n=>{const mm=src.match(new RegExp('function '+n+'\\([^)]*\\)\\{[\\s\\S]*?\\n\\}'))||src.match(new RegExp('function '+n+'\\([^)]*\\)\\{.*\\}'));if(!mm){console.error('no '+n);process.exit(1);}return eval('('+mm[0]+')');};const rot=eval('('+src.match(/function _c13Rotar\(.*\}/)[0]+')'),ap=g('_c13Aplicar');let k=0;const A=(c,t)=>{if(!c){console.error('✗ '+t);process.exit(1);}k++;};
 const V=[{g:'mp',m:10,f:'2026-10-01'},{g:'mp',m:14,f:'2026-11-06'},{g:'mp',m:8,f:'2026-10-30'},{g:'suel',m:5,f:'2026-11-01'}];
 let r=rot(V,true,0);A(r.rot.length===3&&r.venc.length===1&&r.venc[0].g==='suel','sin tope toda la materia prima rota');
 r=rot(V,true,22);A(r.rot.length===2&&r.venc.some(x=>x.g==='mp'&&x.m===10),'con tope, lo más viejo que lo excede queda vencido');
 r=rot(V,false,0);A(r.rot.length===0&&r.venc.length===4,'apagado: todo vencido como antes');
 const base={N:13,saldo0:0,cob:[],pag:[],vencCob:[],vencPag:[{g:'arca',p:2,m:40,k:'a|x|40'},{g:'suel',p:1,m:30,k:'s|y|30'}],plan:Array.from({length:13},()=>({cobNueva:0,mp:0,ener:0,otros:0,retiros:0,acc:0}))};
 const R=ap(base,[{t:'pagar_doc',k:'a|x|40',w:3},{t:'pagar_doc',k:'no-existe',w:2}]);A(R.base.vencPag.length===1&&R.base.pag.length===1&&R.base.pag[0].w===3&&R.base.pag[0].m===40&&R.base.pag[0].g==='arca','pagar un documento: sale de lo vencido y entra en su semana');
 console.log('✓ caja_13 16c '+k+' ok');}
