// smoke 26d — dos órdenes a la vez en una cortadora (C2 26/10: OC-1053011 LYME en 2 pistas + OC-1052976 Muñoz en 2)
// uso: TZ=America/Argentina/Buenos_Aires node tests/smoke_dos_oc_maquina.cjs fabrica_bolsas_v6.html
const fs=require('fs');
const src=fs.readFileSync(process.argv[2]||'fabrica_bolsas_v6.html','utf8');
const grab=(a,b)=>{const i=src.indexOf(a),k=src.indexOf(b,i+1);if(i<0||k<0)throw new Error('no está '+a);return src.slice(i,k);};
globalThis.C={maq_corte:[{id:1,nombre:'CORTE-01'},{id:2,nombre:'CORTE-02'}],ord_corte:[{id:1045,numero_orden:'OC-1053011',producto_id:9},{id:1008,numero_orden:'OC-1052976',producto_id:9}],productos:[{id:9,metros_por_bolsa:'0.5000'}]};
globalThis.PLC={cfg:null};globalThis.escapeHtml=s=>String(s);globalThis.CVV={maqs:[1,2]};
eval(grab('function _cvvMaqNom','\n'));
eval(grab('const CVV_F_CAMBIO=','function _cvvTiradas'));
eval(grab('const PST={','// ---- datos del panel ----').replace('const PST=','globalThis.PST='));
let ok=0,bad=0;const t=(c,m)=>{if(c)ok++;else{bad++;console.error('✗ '+m);}};
const k=(id,oc,bid,nro,m,p,pc,ext,cie)=>({id,orden_corte_id:oc,bobina_producida_id:bid,maquina_id:2,metros_usados:m,pista:p,pista_contador:pc,pista_en:'2026-10-26T15:00:00Z',fecha_asignacion:'2026-10-26T15:00:00Z',bobinas_producidas:{id:bid,numero_bobina:nro,plc_cierre_id:cie,extrusora_id:ext}});
const cs=[k(8061,1045,7397,'BOB-07328',1314,1,310945,1,853),k(8062,1045,7385,'BOB-07316',1507,3,310945,1,841),k(8063,1045,7382,'BOB-07313',1505,4,310945,1,838),k(8064,1045,7388,'BOB-07319',1505,2,310945,1,844),
  k(8069,1045,7400,'BOB-07331',1302,1,313568,1,856),k(8070,1045,7394,'BOB-07325',1310,2,313981,1,850),k(8073,1045,7391,'BOB-07322',1540,3,314667,1,847),k(8074,1045,7403,'BOB-07334',1205,4,314667,1,859),
  k(8079,1008,7123,'BOB-07054',1502,1,316285,7,557),k(8080,1008,7128,'BOB-07059',1501,2,316391,7,565),k(8083,1008,7133,'BOB-07064',1017,4,317392,7,569),k(8084,1008,7130,'BOB-07061',1073,3,317392,7,566)];
const R=_pstCierre(cs,1045,{2:316261},0.5);
t(R.concurrente===true,'LYME: concurrente');
t(R.completa&&Math.round(R.cortP)===21806,'LYME cortadas por pista = 21.806 ('+R.cortP+')');
t(R.filas.filter(f=>f.est==='otraOC').map(f=>f.nro).sort().join()==='BOB-07322,BOB-07325','07325 y 07322 las ocupó otra OC');
const R2=_pstCierre(cs,1008,{2:319000},0.5);
t(R2.concurrente===true,'Muñoz: concurrente (LYME seguía en p3/p4)');
// sin otra OC a la vez: no concurrente
const R3=_pstCierre(cs.filter(c=>c.orden_corte_id===1045),1045,{2:317392},0.5);
t(R3.concurrente===false,'una sola OC: no concurrente');
// traspaso normal: la OC nueva carga todo cuando la anterior terminó
const cs4=[k(1,1045,1,'A',1000,1,1000,1,1),k(2,1045,2,'B',1000,2,1000,1,1),k(3,1008,3,'C',1000,1,3000,1,1),k(4,1008,4,'D',1000,2,3000,1,1)];
t(_pstCierre(cs4,1045,{2:3000},0.5).concurrente===false&&_pstCierre(cs4,1008,{2:5000},0.5).concurrente===false,'traspaso normal: no concurrente');
t(/R\.base=\(R\.pst&&\(R\.pst\.concurrente\|\|R\.pst\.restos\)&&R\.pst\.completa/.test(src),'cierre usa las pistas cuando es concurrente');
console.log(ok+' ok, '+bad+' mal');process.exit(bad?1:0);
