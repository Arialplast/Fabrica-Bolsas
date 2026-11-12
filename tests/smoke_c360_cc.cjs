// 12a/12b — Cuenta corriente (Cliente 360 y 💳 Cuenta corriente): saldo = suma de saldos de los comprobantes.
// Uso: node tests/smoke_c360_cc.cjs fabrica_bolsas_v6.html   (datos inventados)
const fs=require('fs');
const src=fs.readFileSync(process.argv[2],'utf8');
let ok=0,bad=0;const t=(c,m)=>{if(c)ok++;else{bad++;console.error('✗ '+m);}};
const cut=(a,b)=>{const i=src.indexOf(a),j=src.indexOf(b,i+1);if(i<0||j<0){console.error('no encontré '+a);process.exit(1);}return src.slice(i,j);};
const glob=s=>s.replace(/^function (\w+)/gm,'global.$1=function $1');
global.r2=x=>Math.round((Number(x)+Number.EPSILON)*100)/100;
global._ndOrigenLbl=()=>'';global._ncMotivoLbl=()=>'Devolución';
const base=()=>({
  clientes:[{id:1,nombre:'PEREZ'},{id:2,nombre:'PEREZ_MARCA'}],
  facturas:[{id:10,cliente_id:1,total:1000,fecha:'2026-01-01'},{id:11,cliente_id:1,total:500,fecha:'2026-01-02'},
            {id:20,cliente_id:2,total:2000,fecha:'2026-01-03'},{id:21,cliente_id:2,total:800,fecha:'2026-01-04'},{id:22,cliente_id:2,total:300,fecha:'2026-01-05'}],
  rvs:[],saldos_iniciales:[],notas_debito:[],
  recibos:[
    {id:1,cliente_id:1,plano:'formal',fecha:'2026-02-01',estado:'activo',total_cobrado:950,total_retenciones:50,total_aplicado:1000,recibo_facturas:[{factura_id:10,monto_aplicado:1000}]},
    {id:2,cliente_id:1,plano:'formal',fecha:'2026-02-02',estado:'activo',total_cobrado:700,total_retenciones:0,total_aplicado:700,recibo_facturas:[{factura_id:11,monto_aplicado:500},{factura_id:21,monto_aplicado:200}]},
    {id:3,cliente_id:2,plano:'formal',fecha:'2026-02-03',estado:'activo',total_cobrado:1500,total_retenciones:0,total_aplicado:1200,recibo_facturas:[{factura_id:20,monto_aplicado:1200}]}],
  compensaciones:[{id:1,cliente_id:2,fecha:'2026-02-04',comp_aplicaciones:[{factura_id:20,monto_aplicado:800}]}],
  notas_credito:[{id:5,cliente_id:1,doc_tipo:'factura',doc_id:10,total:400,estado:'emitida',fecha:'2026-02-05'},
                 {id:6,cliente_id:2,doc_tipo:'factura',doc_id:22,total:100,estado:'anulada',fecha:'2026-02-06'}],
  nc_aplicaciones:[{nc_id:5,doc_tipo:'factura',doc_id:21,monto_aplicado:400}]
});
global.C=base();
eval(glob(cut('function _c360Cli(id)','function _c360Pedidos')));
eval(glob(cut('function _c360SaldosIni','function _kMoney')));
eval(glob(cut('// ===== 💳 HABER DE CUENTA CORRIENTE','// ---------- Trazabilidad')));
eval(glob(cut('function _aplicadoAFactura','// ============================================================\n//  NOTAS DE CRÉDITO')));
eval(glob(cut('function _ncTotalDe','// Crédito de una NC todavía')));
eval(glob(cut('function _ncAplicadoAOtras','\n}')+'\n}'));
eval(glob(cut('function _ndsCliente','\n}')+'\n}'));
eval(glob(cut('function _facEsFinanciera','\n')));
eval(glob(cut('// 12c: cobros y deuda','function _c360TopProductos')));
global._notasCreditoDe=(tp,id)=>C.notas_credito.filter(n=>n.doc_tipo===tp&&n.doc_id===id&&n.estado!=='anulada');
const fin=id=>{const m=_c360MovsCC(id);return m.length?m[m.length-1].saldo:0;};
const suma=id=>r2(C.facturas.filter(f=>f.cliente_id===id).reduce((s,f)=>s+f.total-_aplicadoAFactura(f.id),0));
// cuenta 1: todo saldado (retención incluida; la NC se aplicó entera a la cuenta 2)
t(fin(1)===0,'cuenta 1 en 0 (es '+fin(1)+')');
// cuenta 2: 3100 − 1200 − 800 − 200 (recibo de la cuenta 1) − 400 (NC de la cuenta 1) = 500; menos 300 libres del recibo 3 = 200
t(fin(2)===200,'cuenta 2 = 200 (es '+fin(2)+')');
t(r2(suma(2)-300)===fin(2),'cuenta 2 = suma de saldos − crédito libre');
const m2=_c360MovsCC(2);
t(m2.some(m=>/REC|Recibo/.test(m.ref)&&/cuenta PEREZ\)/.test(m.ref)&&m.haber===200),'recibo de la otra cuenta aparece con su parte');
t(m2.some(m=>m.tipo==='nc'&&m.haber===400),'crédito de NC de la otra cuenta aparece');
t(m2.some(m=>/Compensación/.test(m.ref)&&m.haber===800),'compensación aplicada aparece');
t(!m2.some(m=>m.tipo==='nc'&&m.docId===6),'NC anulada no aparece');
t(!_c360MovsCC(1).some(m=>m.tipo==='nc'),'NC aplicada entera a otra cuenta no figura en la propia');
C.recibos[0].estado='anulado';
t(fin(1)===1000,'recibo anulado no resta');

// ---- 💳 Cuenta corriente por plano (12b) ----
C=base();
C.rvs=[{id:50,cliente_id:2,total:600,estado:'pendiente',fecha:'2026-01-06'}];
C.recibos.push({id:4,cliente_id:2,plano:'informal',fecha:'2026-02-07',estado:'activo',total_cobrado:1000,total_retenciones:0,total_aplicado:600,recibo_rvs:[{rv_id:50,monto_aplicado:600}]});
const porPlano=(id,pl)=>{
  let d=0;C.facturas.filter(f=>f.cliente_id===id).forEach(f=>{if(pl==='formal')d+=f.total;});
  C.rvs.filter(r=>r.cliente_id===id).forEach(r=>{if(pl==='informal')d+=r.total;});
  const h=_ccHaberAplicado(id).filter(x=>x.plano===pl).reduce((s,x)=>s+x.haber,0);
  return r2(d-h);
};
t(porPlano(2,'formal')===200,'formal cuenta 2 = 200 (es '+porPlano(2,'formal')+')');
t(porPlano(2,'informal')===-400,'informal cuenta 2 = −400 de crédito (es '+porPlano(2,'informal')+')');
const recInf=_ccHaberAplicado(2).find(x=>x.tipo==='RECIBO'&&x.id===4);
t(recInf&&recInf.plano==='informal'&&recInf.haber===1000&&recInf.disponible===400,'recibo informal con crédito disponible');
t(_ccHaberAplicado(2).filter(x=>x.tipo==='COMP').every(x=>x.plano==='formal'),'compensación sin doble asiento entre planos');
// recibo propio aplicado entero a otra cuenta: igual aparece (en 0) para no perder sus botones
C.recibos.push({id:5,cliente_id:1,plano:'formal',fecha:'2026-02-08',estado:'activo',total_cobrado:100,total_retenciones:0,total_aplicado:100,recibo_facturas:[{factura_id:22,monto_aplicado:100}]});
const r5=_ccHaberAplicado(1).find(x=>x.id===5&&x.tipo==='RECIBO');
t(r5&&r5.haber===0,'recibo propio aplicado a otra cuenta aparece en 0');
t(!_c360MovsCC(1).some(m=>m.tipo==='recibo'&&m.docId===5),'en el resumen del cliente no van filas en cero');
const nc5=_ccHaberAplicado(1).find(x=>x.tipo==='NC'&&x.id===5);
t(nc5&&nc5.haber===0,'NC propia aplicada a otra cuenta aparece en 0 (botones)');

// ---- 📊 Gráficos de Cliente 360 (12c): la deuda del último mes = saldo de la cuenta ----
C=base();
const hoy=new Date();const mes=hoy.getFullYear()+'-'+String(hoy.getMonth()+1).padStart(2,'0');
C.facturas.forEach(f=>f.fecha=mes+'-01');C.recibos.forEach(r=>r.fecha=mes+'-02');C.compensaciones.forEach(c=>c.fecha=mes+'-03');C.notas_credito.forEach(n=>n.fecha=mes+'-04');
C.facturas.push({id:30,cliente_id:2,total:9999,fecha:mes+'-01',observaciones:'ADELANTO FINANCIERO A CUENTA'});
C.recibos.push({id:9,cliente_id:2,plano:'formal',fecha:mes+'-02',estado:'activo',total_cobrado:9999,total_retenciones:0,total_aplicado:9999,recibo_facturas:[{factura_id:30,monto_aplicado:9999}]});
const S2=_c360Series(2);
t(S2.deuda[mes]===200,'deuda del mes cuenta 2 = 200 (es '+S2.deuda[mes]+')');
t(S2.fac[mes]===3100,'facturación sin el adelanto financiero (es '+S2.fac[mes]+')');
t(S2.cob[mes]===1200+300+800+200,'cobros = recibos (con lo libre) + compensación + recibo de la otra cuenta, sin el del adelanto (es '+S2.cob[mes]+')');
t(_c360Series(1).deuda[mes]===0,'deuda del mes cuenta 1 = 0');
console.log((bad?'✗':'✓')+' smoke_c360_cc: '+ok+' ok, '+bad+' fallas');process.exit(bad?1:0);
