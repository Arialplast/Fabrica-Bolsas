// 09g — Cada deuda dice de qué banco se debita (deudas_financieras.cuenta_debito_id).
// Uso: node tests/smoke_banco_debito.cjs fabrica_bolsas_v6.html [fixture_deudas.json]
// Sin fixture usa datos inventados (el repo es público: no se commitean montos reales).
const fs=require('fs');
const src=fs.readFileSync(process.argv[2],'utf8');
let ok=0,bad=0;const t=(c,m)=>{if(c)ok++;else{bad++;console.error('✗ '+m);}};
const cut=(a,b)=>{const i=src.indexOf(a),j=src.indexOf(b,i+1);if(i<0||j<0){console.error('no encontré '+a);process.exit(1);}return src.slice(i,j);};
const glob=s=>s.replace(/^function (\w+)/gm,'global.$1=function $1');

global.r2=x=>Math.round(x*100)/100;
global.fmtMoney=x=>Number(x).toLocaleString('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2});
global.escapeHtml=s=>String(s).replace(/</g,'&lt;');
global.localDate=d=>{const dt=d||new Date('2026-10-09T12:00:00');return dt.getFullYear()+'-'+String(dt.getMonth()+1).padStart(2,'0')+'-'+String(dt.getDate()).padStart(2,'0');};
global.dfTipoIc=t=>t==='plan_arca'?'🏛':'🏦';
global.dfSaldoDeuda=d=>(d.cuotas||[]).filter(c=>c.estado!=='pagada').reduce((s,c)=>s+(+c.monto||0),0);
global.CC={cuenta:null};

const CRED=['T757395','W725608','W703625','V938074','W451625','W240247','W303682','W393352','W717249'];
const GAL=['W186314','W557348','V898262'];
const cuentas=[{id:1,nombre:'CAJA1',tipo:'efectivo',plano:'negro',activa:true},{id:2,nombre:'CREDICOOP',tipo:'banco',plano:'blanco',activa:true},
  {id:3,nombre:'GALICIA',tipo:'banco',plano:'blanco',activa:true},{id:4,nombre:'CONCILIACIÓN',tipo:'conciliacion',activa:true},
  {id:7,nombre:'FCI Credicoop',tipo:'fci',activa:true,plano:'blanco'}];
let deudas;
if(process.argv[3]){deudas=JSON.parse(fs.readFileSync(process.argv[3],'utf8'));}
else{
  let id=100;const mk=(cod,cta,m)=>({id:++id,tipo:'plan_arca',acreedor:'ARCA',descripcion:'Plan '+cod+' · prueba',estado:'activo',cuenta_debito_id:cta,
    cuotas:[{nro:1,monto:m,vencimiento:'2026-09-16',estado:'pagada',cuenta_id:cta},{nro:2,monto:m,vencimiento:'2026-10-16',estado:'pendiente'},{nro:3,monto:m,vencimiento:'2026-11-16',estado:'pendiente'}]});
  deudas=[...CRED.map(c=>mk(c,2,1000)),...GAL.map(c=>mk(c,3,500)),
    {id:200,tipo:'plan_arca',acreedor:'ARCA',descripcion:'Anticipos Ganancias',estado:'activo',cuotas:[{nro:1,monto:300,vencimiento:'2026-10-13',estado:'pendiente'}]},
    {id:201,tipo:'prestamo',acreedor:'Banco Credicoop',descripcion:'CP0BI1',estado:'activo',cuotas:[{nro:1,monto:9999,vencimiento:'2026-10-20',estado:'pendiente'}]},
    {id:202,tipo:'plan_arca',acreedor:'ARCA',descripcion:'Plan V726771',estado:'activo',cuenta_debito_id:2,cuotas:[{nro:1,monto:50,vencimiento:'2026-08-16',estado:'pagada'}]}];
}
global.C={cuentas_caja:cuentas,deudas_financieras:deudas};

eval(glob(cut('// ===== 🏦 BANCO DE DÉBITO DE CADA DEUDA','// RENDER principal')));

// --- helpers
const dCod=cod=>deudas.find(d=>_dfPlanCod(d)===cod);
t(CRED.every(c=>dCod(c)),'todos los planes de Credicoop están cargados');
t(GAL.every(c=>dCod(c)),'todos los planes de Galicia están cargados');
t(CRED.every(c=>_dfCtaDebitoNom(dCod(c))==='CREDICOOP'),'los 9 planes de Credicoop dicen CREDICOOP');
t(GAL.every(c=>_dfCtaDebitoNom(dCod(c))==='GALICIA'),'los 3 planes de Galicia dicen GALICIA');
t(_dfPlanCod({descripcion:'Plan W303682 — consolidado 13/07/2026'})==='W303682','lee el código del plan de la descripción');
t(_dfPlanCod({descripcion:'Anticipos Ganancias 2026'})===null,'sin código → null, no inventa');
t(_dfCtaDebito({cuenta_debito_id:null})===null&&_dfCtaDebito({})===null,'sin banco → null');
t(_dfCtaDebito({cuenta_debito_id:99})._falta===true,'cuenta borrada → marcada inexistente, no rompe');
const deb=_dfCtasDebitables().map(x=>x.id);
t(deb.includes(2)&&deb.includes(3)&&deb.includes(1),'bancos y cajas son debitables');
t(!deb.includes(4)&&!deb.includes(7),'ni la cuenta puente ni el FCI aparecen como cuenta de débito');

// --- chip de la tarjeta
const chipC=_dfChipBanco(dCod('W240247')),chipG=_dfChipBanco(dCod('V898262'));
t(chipC.includes('Se debita de CREDICOOP')&&chipG.includes('Se debita de GALICIA'),'chip grande con el banco');
t(chipC.includes(_dfBancoColor('CREDICOOP'))&&chipG.includes(_dfBancoColor('GALICIA'))&&_dfBancoColor('CREDICOOP')!==_dfBancoColor('GALICIA'),'cada banco con su color');
const anticipos=deudas.find(d=>/Anticipos/.test(d.descripcion||''));
if(anticipos&&anticipos.cuenta_debito_id==null)t(_dfChipBanco(anticipos).includes('sin asignar'),'plan ARCA vivo sin banco → aviso');
const prest=deudas.find(d=>d.tipo==='prestamo'&&d.cuenta_debito_id==null);
if(prest)t(_dfChipBanco(prest)==='','préstamo sin banco no grita');

// --- resumen por banco (conservación: la suma de los grupos = todas las cuotas ARCA impagas + préstamos asignados)
const g=_dfDebitosPorBanco('2026-10-09');
const gC=g.find(x=>x.cta&&x.cta.nombre==='CREDICOOP'),gG=g.find(x=>x.cta&&x.cta.nombre==='GALICIA');
t(gC&&gG,'hay grupo Credicoop y grupo Galicia');
t(g[g.length-1].key==='_sin'||!g.some(x=>x.key==='_sin'),'«sin asignar» va al final');
const sumaPend=pred=>r2(deudas.filter(d=>d.estado!=='cancelado'&&pred(d)).reduce((s,d)=>s+(d.cuotas||[]).filter(c=>c.estado!=='pagada'&&c.vencimiento&&+c.monto>0&&c.vencimiento<='2026-11-08').reduce((a,c)=>a+(+c.monto),0),0));
const h=x=>r2(x.d30+x.venc);
t(Math.abs(h(gC)-sumaPend(d=>String(d.cuenta_debito_id)==='2'))<0.01,'Credicoop: 30 días + vencidas = cuotas impagas de sus planes');
t(Math.abs(h(gG)-sumaPend(d=>String(d.cuenta_debito_id)==='3'))<0.01,'Galicia: 30 días + vencidas = cuotas impagas de sus planes');
t(!gG.planes.some(p=>CRED.includes(p.cod))&&!gC.planes.some(p=>GAL.includes(p.cod)),'ningún plan aparece en el banco equivocado');
t(GAL.every(c=>gG.planes.some(p=>p.cod===c)),'Galicia lista W186314, W557348 y V898262');
t(!g.some(x=>x.planes.some(p=>p.d.tipo==='prestamo'&&p.d.cuenta_debito_id==null)),'préstamos sin banco no entran al resumen');
t(!g.some(x=>x.planes.some(p=>(p.d.cuotas||[]).every(c=>c.estado==='pagada'))),'planes ya pagados no aparecen');
if(!process.argv[3]){
  t(gC.prox.fecha==='2026-10-16'&&gC.prox.monto===9000&&gC.prox.n===9,'Credicoop: próximo débito 16/10 por 9 cuotas de 1.000');
  t(gG.prox.monto===1500&&gG.d30===1500,'Galicia: 16/10 por 1.500');
}
const panel=_dfPanelBancos();
t(panel.includes('CREDICOOP')&&panel.includes('GALICIA')&&panel.includes('Próximo débito'),'panel con los dos bancos');

// --- modal de pago: propone la cuenta de débito
const iP=src.indexOf('function dfMarcarPagada('),jP=src.indexOf('function dfPgMotivoCambio(');
let modal='';global.document={getElementById:()=>null,body:{insertAdjacentHTML:(_,h)=>{modal=h;}}};
global.dfCuotaLbl=c=>String(c.nro);
eval(glob(src.slice(iP,jP)));
const dg=dCod('V898262');dfMarcarPagada(dg.id,(dg.cuotas.find(c=>c.estado!=='pagada')||{}).nro,null);
t(/<option value="3" selected>GALICIA/.test(modal),'pagar un plan de Galicia propone GALICIA');
t(modal.includes('se debita de GALICIA')&&modal.includes('dfpg-ctawarn')&&modal.includes('dfPgCtaCambio('),'el modal muestra el banco y avisa si lo cambiás');
const dc=dCod('W717249');dfMarcarPagada(dc.id,(dc.cuotas.find(c=>c.estado!=='pagada')||{}).nro,null);
t(/<option value="2" selected>CREDICOOP/.test(modal),'pagar un plan de Credicoop propone CREDICOOP');
// aviso al elegir otra cuenta
const warn={style:{display:'none'},innerHTML:''};let sel='2';
global.document={getElementById:id=>id==='dfpg-ctawarn'?warn:id==='dfpg-cuenta'?{value:sel}:null};
dfPgCtaCambio(dg.id);t(warn.style.display===''&&warn.innerHTML.includes('GALICIA'),'eligiendo Credicoop en un plan de Galicia aparece el aviso');
sel='3';dfPgCtaCambio(dg.id);t(warn.style.display==='none','volviendo a Galicia el aviso se va');

// --- importador del extracto: un débito de Galicia no salda una cuota de Credicoop
eval(glob(cut('function _ccDeudaOtroBanco','// ¿este débito ya corresponde a una cuota PAGADA?')));
const cg=dg.cuotas.find(c=>c.estado!=='pagada'),ccq=dc.cuotas.find(c=>c.estado!=='pagada');
CC.cuenta=3;let q=ccImpBuscarCuota({monto:+ccq.monto,fecha:ccq.vencimiento});
t(!q||String(q.deuda.cuenta_debito_id)!=='2','extracto de Galicia: nunca propone un plan de Credicoop');
q=ccImpBuscarCuota({monto:+cg.monto,fecha:cg.vencimiento});
t(q&&String(q.deuda.cuenta_debito_id)==='3','extracto de Galicia: encuentra un plan de Galicia');
CC.cuenta=2;q=ccImpBuscarCuota({monto:+cg.monto,fecha:cg.vencimiento});
t(!q||String(q.deuda.cuenta_debito_id)!=='3','extracto de Credicoop: nunca propone un plan de Galicia');
CC.cuenta=null;q=ccImpBuscarCuota({monto:+cg.monto,fecha:cg.vencimiento});
t(!!q,'sin cuenta elegida no filtra (comportamiento de siempre)');

// --- costuras en el resto del archivo
t(/ref:dfTipoIc\(d\.tipo\)\+' '\+\(d\.acreedor\|\|'Deuda'\)\+\(_dfPlanCod\(d\)/.test(src)&&src.includes("' → 🏦 '+_dfCtaDebitoNom(d)"),'el flujo de caja nombra plan y banco');
t(src.includes("html+=_dfPanelBancos();"),'el resumen por banco está en la pantalla de Deudas');
t(src.includes("cuenta_debito_id:_dfLeerCtaDebito('df-ed-ctadeb')")&&src.includes("_dfLeerCtaDebito('df-i-ctadeb')"),'editar e importar guardan el banco');
t((src.match(/_dfErrSinColDebito\(error\)/g)||[]).length>=2,'sin el ALTER el guardado reintenta sin la columna');
console.log((bad?'✗':'✓')+' smoke_banco_debito: '+ok+' OK, '+bad+' fallas');process.exit(bad?1:0);
