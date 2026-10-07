// smoke 07a — valores de contado nacen acreditados; cartera sólo cheques; regularización
// uso: TZ=America/Argentina/Buenos_Aires node tests/smoke_valores_contado.cjs fabrica_bolsas_v6.html
const fs=require('fs');const src=fs.readFileSync(process.argv[2]||'fabrica_bolsas_v6.html','utf8');
const a=src.indexOf('// ===== 💵 VALORES DE CONTADO');const b=src.indexOf('// ==================== CARTERA DE CHEQUES DE TERCEROS');
const c=b;const d=src.indexOf('const CH_ESTADOS=');
const e=src.indexOf('function _chequesCartera(){');const f=src.indexOf('\n',e);
if(a<0||b<0||d<0||e<0){console.log('FALTA el bloque');process.exit(1);}
global.r2=x=>Math.round((+x||0)*100)/100;global.fmtMoney=x=>'$'+x;global.escapeHtml=x=>String(x);global.localDate=()=>'2026-10-07';
global.C={};
eval((src.slice(a,b)+src.slice(c,d)+src.slice(e,f)).replace(/^const /gm,'var ').replace(/^let /gm,'var '));
let ok=0,bad=0;const t=(x,m)=>{if(x)ok++;else{bad++;console.log('✗ '+m);}};
const MET=[{id:1,nombre:'Efectivo'},{id:2,nombre:'Transferencia'},{id:3,nombre:'Cheque'},{id:4,nombre:'E-cheq'}];
const BAN=[{id:7,nombre:'Credicoop'}];

// 1) recibo con efectivo + cheque: efectivo nace acreditado, cheque en cartera (default)
let R=_recValoresParaGuardar([{metodo_id:1,monto:1000},{metodo_id:3,monto:500,numero:'123',vto:'2026-11-01',banco_id:7}],MET,BAN,99,'2026-10-07');
t(!R.error&&R.rows.length===2,'1 dos filas');
t(R.rows[0].estado==='acreditado'&&R.rows[0].fecha_acreditacion==='2026-10-07','1 efectivo acreditado con fecha del recibo');
t(!('estado' in R.rows[1])&&R.rows[1].numero_cheque==='123'&&R.rows[1].fecha_vto==='2026-11-01'&&R.rows[1].banco==='Credicoop','1 cheque sin estado (default en_cartera) y con datos');
t(R.rows.every(r=>r.recibo_id===99),'1 recibo_id');
// 2) transferencia y e-cheq
R=_recValoresParaGuardar([{metodo_id:2,monto:10,detalle:'CBU 123'},{metodo_id:4,monto:20,numero:'E1',vto:'2026-12-01'}],MET,BAN,1,'2026-10-01');
t(R.rows[0].estado==='acreditado'&&R.rows[0].detalle==='CBU 123','2 transferencia acreditada conserva detalle');
t(!('estado' in R.rows[1]),'2 e-cheq a cartera');
// 3) cambió de Cheque a Efectivo con N°/Vto/banco tipeados: se limpian
R=_recValoresParaGuardar([{metodo_id:1,monto:50,numero:'999',vto:'2026-11-01',banco_id:7,es_tercero:true,nombre_emisor:'X'}],MET,BAN,1,'2026-10-07');
const r3=R.rows[0];
t(r3.numero_cheque===null&&r3.fecha_vto===null&&r3.banco===null&&r3.banco_id===null&&r3.es_tercero===false&&r3.nombre_emisor===null,'3 efectivo sin restos de cheque');
t(!chEsCheque(r3),'3 chEsCheque coincide con el método');
// 4) validaciones
t(/método/.test(_recValoresParaGuardar([{metodo_id:null,monto:5}],MET,BAN,1,'x').error||''),'4 sin método frena');
t(/número/.test(_recValoresParaGuardar([{metodo_id:3,monto:5,vto:'2026-11-01'}],MET,BAN,1,'x').error||''),'4 cheque sin número frena');
t(/vencimiento/.test(_recValoresParaGuardar([{metodo_id:4,monto:5,numero:'1'}],MET,BAN,1,'x').error||''),'4 e-cheq sin vto frena');
t(_recValoresParaGuardar([{metodo_id:null,monto:0}],MET,BAN,1,'x').rows.length===0,'4 renglón vacío en monto 0 se ignora');
t(_recValoresParaGuardar([{metodo_id:3,monto:5,numero:'  ',vto:'2026-11-01'}],MET,BAN,1,'x').error,'4 número en blanco frena');

// 5) cartera: sólo cheques; contado viejo en_cartera detectado para regularizar
C.recibos=[
  {id:1,numero:'RECI-1',fecha:'2026-07-14',estado:'activo',cliente_id:1,recibo_valores:[
    {id:11,metodo_nombre:'Efectivo',monto:1000,estado:'en_cartera'},
    {id:12,metodo_nombre:null,metodo_pago_id:null,monto:600,estado:'en_cartera'},
    {id:13,metodo_nombre:'Cheque',numero_cheque:'5',fecha_vto:'2026-11-01',monto:300,estado:'en_cartera'},
    {id:14,metodo_nombre:'Transferencia',monto:50,estado:'acreditado'}]},
  {id:2,numero:'REC-2',fecha:'2026-09-01',estado:'anulado',cliente_id:2,recibo_valores:[
    {id:21,metodo_nombre:'Efectivo',monto:999,estado:'en_cartera'},
    {id:22,metodo_nombre:'Cheque',numero_cheque:'6',fecha_vto:'2026-11-02',monto:777,estado:'en_cartera'}]},
  {id:3,numero:'REC-3',fecha:'2026-09-05',estado:'activo',cliente_id:2,recibo_valores:[
    {id:31,metodo_nombre:'E-cheq',numero_cheque:'7',fecha_vto:'2026-10-20',monto:200}]}, // estado null → en_cartera
];
const cart=_chequesCartera();
t(cart.length===2&&cart.reduce((s,x)=>s+x.monto,0)===500,'5 cartera = sólo cheques vivos (300+200), sin efectivo ni anulados');
t(cart[0].id===31,'5 orden por vencimiento');
const L=_valContadoEnCartera();
t(L.length===2&&L.map(x=>x.id).join()==='11,12','5 contado en cartera: 11 y 12 (no el acreditado, no anulado, no cheques)');
t(L[0].recibo_fecha==='2026-07-14','5 lleva la fecha del recibo');
const B=_valContadoBannerHtml();
t(/<b>2<\/b>/.test(B)&&/\$1600/.test(B)&&/<b>1<\/b> no tiene/.test(B),'5 banner: 2 cobros, $1600, 1 sin método');
// 6) después de regularizar no hay banner
C.recibos[0].recibo_valores[0].estado='acreditado';C.recibos[0].recibo_valores[1].estado='acreditado';
t(_valContadoBannerHtml()==='','6 sin pendientes no hay banner');
t(_chequesCartera().length===2,'6 la cartera no cambia');

console.log((bad?'✗ ':'✓ ')+ok+' ok'+(bad?' · '+bad+' FALLAN':''));process.exit(bad?1:0);
