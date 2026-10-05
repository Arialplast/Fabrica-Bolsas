// smoke 05c — anticipo de pedido: renglones anticipados, cobertura de remitos y totales
// uso: node tests/smoke_anticipo.cjs fabrica_bolsas_v6.html
const fs=require('fs');const src=fs.readFileSync(process.argv[2]||'fabrica_bolsas_v6.html','utf8');
const a=src.indexOf('// ===== 📦 ANTICIPO DE PEDIDO (05c)');const b=src.indexOf('// ---- Facturar un anticipo (Nueva factura) ----');
const c=src.indexOf('// Pura: totales de un anticipo.');const d=src.indexOf('function _antCalc(){');
if(a<0||b<0||c<0||d<0){console.log('FALTA el bloque');process.exit(1);}
global.r2=x=>Math.round((x+Number.EPSILON)*100)/100;
global._ncTotalDe=()=>0;
eval(src.slice(a,b)+src.slice(c,d));
let ok=0,bad=0;const t=(c,m)=>{if(c)ok++;else{bad++;console.log('✗ '+m);}};
// Factura DAG 136: 500 de la línea 648 (00119) y 182 de la 650 (00123)
const F136={id:136,numero:'0001-00000042',arca_numero:'0005-00000007',total:8157250.19,estado:'pendiente',
  factura_lineas:[{id:395,cantidad:500,pedido_linea_id:648,descripcion:'00119'},{id:396,cantidad:182,pedido_linea_id:650,descripcion:'00123'}]};
const FN={id:120,total:100,estado:'pendiente',factura_lineas:[{id:1,cantidad:10}]}; // factura normal: no es anticipo
let flr=[];
let ant=_antLineas([F136,FN],flr);
t(ant.length===2&&ant[0].resto===500&&ant[1].resto===182,'renglones de anticipo y resto inicial');
const rem=(id,ls)=>({id:id,numero_remito:'REM-'+id,estado:'emitido',remito_lineas:ls.map((x,i)=>({id:id*10+i,pedido_linea_id:x[0],cantidad_paquetes:x[1]}))});
// 1) entrega de lo que hay: 212 blanca + 182 amarilla → entra
let c1=_antCobertura(rem(700,[[648,212],[650,182]]),ant);
t(c1&&c1.ok&&c1.fac.id===136&&c1.asign.length===2,'remito 212+182 se aplica al anticipo');
flr=c1.asign.map(x=>({factura_linea_id:x.fl.id,cantidad_paquetes:x.cant}));
ant=_antLineas([F136,FN],flr);
t(ant.find(x=>x.fl.id===395).resto===288&&ant.find(x=>x.fl.id===396).resto===0,'resto tras aplicar: 288 blanca, 0 amarilla');
// 2) siguiente remito 288 blanca → entra justo
t(_antCobertura(rem(701,[[648,288]]),ant).ok,'288 blanca entra justo');
// 3) remito 300 blanca → se pasa 12: no se aplica a medias
const c3=_antCobertura(rem(702,[[648,300]]),ant);
t(c3&&!c3.ok&&/se pasa en 12 paq/.test(c3.msg),'300 blanca: avisa que se pasa en 12');
// 4) amarilla ya consumida → se pasa
t(!_antCobertura(rem(703,[[650,10]]),ant).ok,'amarilla consumida: no se aplica');
// 5) remito mezclado con producto sin anticipo
const c5=_antCobertura(rem(704,[[648,100],[999,50]]),ant);
t(c5&&!c5.ok&&/no tienen anticipo/.test(c5.msg),'mezclado con línea sin anticipo: avisa');
// 6) remito de otro pedido / sin pedido → null (factura normal)
t(_antCobertura(rem(705,[[999,50]]),ant)===null&&_antCobertura(rem(706,[[null,5]]),ant)===null,'sin anticipo: null (se factura normal)');
// 7) factura anulada o con NC total → no cuenta
t(_antLineas([Object.assign({},F136,{estado:'anulada'})],[]).length===0,'factura anulada no es anticipo');
global._ncTotalDe=()=>8157250.19;t(_antLineas([F136],[]).length===0,'con NC total no es anticipo');global._ncTotalDe=()=>0;
// 8) totales del caso DAG
const filas=[{pend:828,pu:9884.94},{pend:182,pu:9884.94}];
const tt=_antTotales(filas,['500','182'],'A');
t(tt.neto===6741529.08&&tt.iva===1415721.11&&tt.total===8157250.19,'totales DAG: '+tt.neto+' / '+tt.iva+' / '+tt.total);
t(_antTotales(filas,['900','0'],'A').lin[0].q===828,'no deja facturar más que lo pendiente');
// 10) pendiente sin doble descuento (remito sin aplicar que el anticipo va a consumir)
{const e=src.indexOf('function _antPendLinea(');const f=src.indexOf('function _antRender(){');eval(src.slice(e,f).replace('function _antPendLinea','global._antPendLinea=function'));
 const P={id:329},L={id:648,cantidad:1200,cantidad_cancelada:0};const A=[{pl:648,resto:500}];
 global.C={remitos:[{pedido_id:329,estado:'facturado',factura_id:115,remito_lineas:[{pedido_linea_id:648,cantidad_paquetes:372}]}]};
 t(_antPendLinea(P,L,A).pend===328,'pendiente 1200-372-500 = 328');
 C.remitos.push({pedido_id:329,estado:'emitido',factura_id:null,remito_lineas:[{pedido_linea_id:648,cantidad_paquetes:212}]});
 t(_antPendLinea(P,L,A).pend===328,'con remito sin aplicar de 212 sigue 328 (no descuenta dos veces)');}
// 9) enganches
t(src.includes('_antDeRemito(r)')&&src.includes('ya está facturado por adelantado: usá ↪ Aplicar al anticipo')&&src.includes('<div id="nf-anticipo"></div>'),'enganchado en listas, guardarFactura y Nueva factura');
console.log(ok+' ok · '+bad+' fallas');process.exit(bad?1:0);
