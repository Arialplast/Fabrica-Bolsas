// smoke 27c — resto de bobina en otra pista (OC-1053017, C1 27/10: 07384 y 07376 sacadas de p4, restos a p3)
// uso: TZ=America/Argentina/Buenos_Aires node tests/smoke_restos.cjs fabrica_bolsas_v6.html
const fs=require('fs');
const src=fs.readFileSync(process.argv[2]||'fabrica_bolsas_v6.html','utf8');
const grab=(a,b)=>{const i=src.indexOf(a),k=src.indexOf(b,i+1);if(i<0||k<0)throw new Error('no está '+a);return src.slice(i,k);};
globalThis.C={maq_corte:[{id:1,nombre:'CORTE-01'}],ord_corte:[{id:1049,numero_orden:'OC-1053017',producto_id:9,estado:'En proceso'}],productos:[{id:9,metros_por_bolsa:'1.0800'}]};
globalThis.PLC={cfg:null};globalThis.escapeHtml=s=>String(s);globalThis.CVV={maqs:[1,2]};
eval(grab('function _cvvMaqNom','\n'));
eval(grab('const CVV_F_CAMBIO=','function _cvvTiradas'));
eval(grab('const PST={','// ---- datos del panel ----').replace('const PST=','globalThis.PST='));
eval(grab('const PST_FIX=','function _pstDestinos'));
let ok=0,bad=0;const t=(c,m)=>{if(c)ok++;else{bad++;console.error('✗ '+m);}};
const k=(id,bid,nro,m,p,pc)=>({id,orden_corte_id:1049,bobina_producida_id:bid,maquina_id:1,metros_usados:m,pista:p,pista_contador:pc,mpb:1.08,pista_en:'2026-10-27T10:00:00Z',fecha_asignacion:'2026-10-27T10:00:00Z',bobinas_producidas:{id:bid,numero_bobina:nro,extrusora_id:1}});
const cs=[k(8114,7449,'BOB-07380',751,3,345055),k(8115,7453,'BOB-07384',1005,4,345055),k(8116,7450,'BOB-07381',415,4,345760),k(8117,7446,'BOB-07377',1007,3,345988),
  k(8118,7455,'BOB-07386',1000,4,346148),k(8119,7452,'BOB-07383',1007,3,346951),k(8120,7456,'BOB-07387',1004,4,347080),k(8121,7448,'BOB-07379',1004,4,348032),
  k(8122,7454,'BOB-07385',1005,3,348032),k(8124,7458,'BOB-07389',1068,3,348974),k(8125,7445,'BOB-07376',1005,4,348974),k(8130,7457,'BOB-07388',1125,4,349566)];
// sin restos: el cierre ve dos bobinas sacadas
const R0=_pstCierre(cs,1049,{1:350620},1.08);
t(R0.malas.length===2&&!R0.restos,'sin restos: 07384 y 07376 sacadas ('+R0.malas.map(f=>f.nro)+')');
// posibles restos
const pos=_pstRestosPosibles(cs);
t(pos.map(x=>x.nro).sort().join()==='BOB-07376,BOB-07384','restos posibles: 07384 y 07376');
const p76=pos.find(x=>x.nro==='BOB-07376');t(Math.round(p76.golpesResto)===339&&Math.round(p76.quedanM)===366,'07376: 339 golpes ≈ 366 m ('+p76.golpesResto+')');
const p84=pos.find(x=>x.nro==='BOB-07384');
const restos=[{id:1,ocb_id:8115,pista:3,pista_contador:345760,pista_en:'2026-10-27T09:43:00Z',golpes_resto:Math.round(p84.golpesResto),maquina_id:1},
  {id:2,ocb_id:8125,pista:3,pista_contador:349963,pista_en:'2026-10-27T13:05:00Z',golpes_resto:Math.round(p76.golpesResto),maquina_id:1}];
const cr=_pstConRestos(cs,restos);
t(cr.length===14&&cr.filter(c=>c.resto).every(c=>Math.abs(_cvvMetros(c)/1.08-c.restoId*0)>0),'cargas + 2 restos');
t(_pstRestosPosibles(cr).length===0,'con los restos cargados ya no hay posibles');
const R=_pstCierre(cr,1049,{1:350620},1.08);
t(R.malas.length===0,'con restos: ninguna bobina sin cortar ('+R.malas.map(f=>f.nro+':'+f.est)+')');
t(R.restos===2&&R.completa,'2 restos, cadena completa');
t(R.filas.filter(f=>f.est==='movida').map(f=>f.nro+'>'+f.pistaResto).sort().join()==='BOB-07376>3,BOB-07384>3','07384 y 07376 «el resto siguió en la pista 3»');
t(Math.abs(R.cortP-10546)<=15,'cortadas por pista ≈ 10.546 ('+Math.round(R.cortP)+')');
// estado del panel: la pista 3 muestra el resto
const E=_pstEstado(cr,350100);t(E[2].c.resto&&/♻ resto BOB-07376/.test(E[2].nro)&&Math.round(E[2].esp)===339,'pista 3 = ♻ resto BOB-07376 (339 golpes)');
t(!_pstPuedeCorregir(E[2]),'un resto no se corrige con «me equivoqué»');
t(/R\.base=\(R\.pst&&\(R\.pst\.concurrente\|\|R\.pst\.restos\)/.test(src),'cierre cuenta por pistas con restos');
t(/_pstRestoPorEscaneo\(b\.id\)/.test(src),'escanear una bobina sacada (fuera de stock) abre el resto');
// 27d: el resto se termina en la misma orden
t(_pstRestoDescartado('[🧵 Pista 4 2026-10-27 06:43 por X: BOB-07384 sacada con 705 de 925 golpes (≈ 237 m) — se terminó o se rompió]','BOB-07384'),'nota «se terminó o se rompió» = al scrap');
t(!_pstRestoDescartado('[🧵 Pista 4 2026-10-27 09:47 por X: BOB-07376 sacada con 592 de 930 golpes (≈ 366 m) — sacada, el resto va a otra pista]','BOB-07376'),'«el resto va a otra pista» sigue pendiente');
t(_pstRestoDescartado('[♻ Resto al scrap 2026-10-27 11:00 por X: BOB-07376 (≈ 366 m) — se rompió]','BOB-07376'),'«resto al scrap» descartado');
t(!_pstRestoDescartado('[♻ Resto al scrap 2026-10-27 11:00 por X: BOB-07376 (≈ 366 m) — se rompió]','BOB-07384'),'el scrap de otra bobina no cuenta');
C.ord_corte[0].observaciones='[🧵 Pista 4 x: BOB-07384 sacada con 705 de 925 golpes (≈ 237 m) — se terminó o se rompió]';
PST.est={1:{restosPos:_pstRestosPosibles(cs)}};
t(_pcorteRestosPend(1049).map(x=>x.nro).join()==='BOB-07376','pendiente al terminar: sólo 07376 (07384 fue al scrap)');
t(_pcorteRestosPend(999).length===0,'otra OC: nada pendiente');
t(src.includes('_pcorteRestosBloquean(id,()=>_pcorteTerminoTodo(id))')&&src.includes('_pcorteRestosBloquean(id,()=>_pcorteTerminoSoloMaq(id,maqId))'),'«Terminó de cortar» revisa los restos');
t(!/'sacada con film','#7c2d12'/.test(src),'la alarma ya no ofrece «la saqué con film y la dejo aparte»');
t(/es un RESTO de/.test(src),'escanear el resto con otra OC lo bloquea');
console.log(ok+' ok, '+bad+' mal');process.exit(bad?1:0);
