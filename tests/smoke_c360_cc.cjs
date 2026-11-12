// 12a — Cuenta corriente de Cliente 360: el saldo final = suma de saldos de los comprobantes.
// Uso: node tests/smoke_c360_cc.cjs fabrica_bolsas_v6.html   (datos inventados)
const fs=require('fs');
const src=fs.readFileSync(process.argv[2],'utf8');
let ok=0,bad=0;const t=(c,m)=>{if(c)ok++;else{bad++;console.error('✗ '+m);}};
const cut=(a,b)=>{const i=src.indexOf(a),j=src.indexOf(b,i+1);if(i<0||j<0){console.error('no encontré '+a);process.exit(1);}return src.slice(i,j);};
const glob=s=>s.replace(/^function (\w+)/gm,'global.$1=function $1');
global.r2=x=>Math.round((Number(x)+Number.EPSILON)*100)/100;
global._ndOrigenLbl=()=>'';
const base=()=>({
  clientes:[{id:1,nombre:'PEREZ'},{id:2,nombre:'PEREZ_MARCA'}],
  facturas:[{id:10,cliente_id:1,total:1000,fecha:'2026-01-01'},{id:11,cliente_id:1,total:500,fecha:'2026-01-02'},
            {id:20,cliente_id:2,total:2000,fecha:'2026-01-03'},{id:21,cliente_id:2,total:800,fecha:'2026-01-04'},{id:22,cliente_id:2,total:300,fecha:'2026-01-05'}],
  rvs:[],saldos_iniciales:[],notas_debito:[],
  recibos:[
    {id:1,cliente_id:1,fecha:'2026-02-01',estado:'activo',total_cobrado:950,total_retenciones:50,total_aplicado:1000,recibo_facturas:[{factura_id:10,monto_aplicado:1000}]},
    {id:2,cliente_id:1,fecha:'2026-02-02',estado:'activo',total_cobrado:700,total_retenciones:0,total_aplicado:700,recibo_facturas:[{factura_id:11,monto_aplicado:500},{factura_id:21,monto_aplicado:200}]},
    {id:3,cliente_id:2,fecha:'2026-02-03',estado:'activo',total_cobrado:1500,total_retenciones:0,total_aplicado:1200,recibo_facturas:[{factura_id:20,monto_aplicado:1200}]}],
  compensaciones:[{id:1,cliente_id:2,fecha:'2026-02-04',comp_aplicaciones:[{factura_id:20,monto_aplicado:800}]}],
  notas_credito:[{id:5,cliente_id:1,doc_tipo:'factura',doc_id:10,total:400,estado:'emitida',fecha:'2026-02-05'},
                 {id:6,cliente_id:2,doc_tipo:'factura',doc_id:22,total:100,estado:'anulada',fecha:'2026-02-06'}],
  nc_aplicaciones:[{nc_id:5,doc_tipo:'factura',doc_id:21,monto_aplicado:400}]
});
global.C=base();
eval(glob(cut('function _c360Cli(id)','function _c360Pedidos')));
eval(glob(cut('function _c360SaldosIni','function _kMoney')));
eval(glob(cut('// Movimientos de cuenta corriente','// ---------- Trazabilidad')));
eval(glob(cut('function _aplicadoAFactura','// ============================================================\n//  NOTAS DE CRÉDITO')));
eval(glob(cut('function _ncTotalDe','// Crédito de una NC todavía')));
eval(glob(cut('function _ncAplicadoAOtras','\n}')+'\n}'));
eval(glob(cut('function _ndsCliente','\n}')+'\n}'));
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
console.log((bad?'✗':'✓')+' smoke_c360_cc: '+ok+' ok, '+bad+' fallas');process.exit(bad?1:0);
