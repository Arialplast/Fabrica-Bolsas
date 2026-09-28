// smoke_pallet.cjs — build 2026-09-28b · hoja de pallet de bobinas por OE
// Uso: TZ=America/Argentina/Buenos_Aires node tests/smoke_pallet.cjs fabrica_bolsas_v6.html [outdir]
// Datos reales de ORD-06268 (VEGA) y ORD-06276 (AGUACA MANA) al 28/09/2026 + casos borde inventados.
const fs=require('fs');const src=fs.readFileSync(process.argv[2]||'fabrica_bolsas_v6.html','utf8');
const OUT=process.argv[3]||null;
let ok=0,bad=0;const T=(c,m)=>{if(c)ok++;else{bad++;console.log('✖',m);}};
function fn(name){const i=src.indexOf('function '+name+'(');if(i<0)throw 'no '+name;let j=src.indexOf('{',i),d=0;for(let k=j;k<src.length;k++){if(src[k]==='{')d++;else if(src[k]==='}'){d--;if(!d)return src.slice(src.lastIndexOf('\n',i)+1,k+1);}}}
const a=src.indexOf('// ===== 🧱 HOJA DE PALLET DE BOBINAS');const b=(i=>i>0?i:src.indexOf('function imprimirOrden(id, tipo){'))(src.indexOf('async function imprimirOrden(id, tipo){'));
T(a>0&&b>a,'bloque encontrado');
const blk=src.slice(a,b);
T(!/C\.bobinas_prod/.test(blk.replace(/\/\/.*$/gm,'')),'el bloque NO lee la caché parcial C.bobinas_prod');
const X=n=>({extrusoras:{nombre:n}});
const B=(o,id,nro,m,kg,st,fr,extra)=>Object.assign({orden_id:o,id,numero_bobina:nro,metros_reales:m,kg_reales:kg,fecha_produccion:'2026-09-25',en_stock:st,anulada:false,reasignada:false,fuera_de_rango:fr,reservada_oc_id:null},X(extra||'EXT-03'));
let DB={
 830:[B(830,6277,'BOB-06208',1500,21.86,false,true,'EXT-07'),B(830,6279,'BOB-06210',1500,24,true,false),B(830,6280,'BOB-06211',1500,23.2,false,true,'EXT-07'),B(830,6281,'BOB-06212',1500,24.1,true,false),B(830,6283,'BOB-06214',1500,24.54,true,false,'EXT-07'),B(830,6284,'BOB-06215',1500,25,true,false,'EXT-07'),B(830,6285,'BOB-06216',1400,24.1,true,false),B(830,6287,'BOB-06218',1500,25.1,true,false,'EXT-07'),B(830,6288,'BOB-06219',1500,26.1,true,false)],
 838:[[6297,'BOB-06228',1520,26.5],[6298,'BOB-06229',1500,26.3],[6299,'BOB-06230',1500,25.6],[6300,'BOB-06231',1540,26.8],[6301,'BOB-06232',1500,26.2],[6302,'BOB-06233',1500,26.3],[6303,'BOB-06234',1800,30.6],[6304,'BOB-06235',1600,28],[6305,'BOB-06236',1500,26.4],[6306,'BOB-06237',1500,26.7],[6307,'BOB-06238',1500,26.2],[6308,'BOB-06239',1500,26.7],[6309,'BOB-06240',1500,25.1],[6310,'BOB-06241',1500,25.8]].map(r=>B(838,r[0],r[1],r[2],r[3],true,false)),
};
// Caso borde inventado: OE 999 con 1.005 bobinas (paginación), una reservada a otra OC, una fuera de rango en el piso, una cortada, una anulada
DB[999]=Array.from({length:1005},(_,i)=>B(999,100000+i,'BOB-'+String(90000+i).padStart(5,'0'),1000,10,true,false));
DB[999][3].reservada_oc_id=777;DB[999][4].fuera_de_rango=true;DB[999][5].en_stock=false;DB[999][6].anulada=true;
let calls=0;
global.sb={from:t=>{const q={_eq:null,select(){return q;},eq(c,v){q._eq=v;return q;},order(){return q;},range(f,to){calls++;const rows=(DB[q._eq]||[]).slice(f,to+1);return Promise.resolve({data:rows,error:null});}};return q;}};
global.C={ordenes:[{id:830,numero_orden:'ORD-06268',cliente:'VEGA RODOLFO',estado:'Completada',bobina_id:89,orden_extrusoras:[]},{id:838,numero_orden:'ORD-06276',cliente:'AGUACA MANA SA',estado:'En proceso',bobina_id:89},{id:999,numero_orden:'ORD-09999',cliente:'CLIENTE <PRUEBA> & CO',estado:'Completada',bobina_id:89},{id:555,numero_orden:'ORD-00555',cliente:'PALAZZO',estado:'Completada',bobina_id:89}],
 bobinas:[{id:89,nombre:'157',descripcion:'BOBINA 60 CM 17MIC NEGRA'}],
 productos:[{id:8,codigo:'00010',descripcion:'BOLSA RESIDUO NEGRA 60X90  ARIAL X 10UND'},{id:9,codigo:'00049',descripcion:'BOLSA RESIDUO GRANEL NEGRA 60X90  ARIAL X 1UND'}],
 ord_corte:[{id:916,numero_orden:'OC-1052884',orden_extrusion_id:830,producto_id:8},{id:924,numero_orden:'OC-1052892',orden_extrusion_id:838,producto_id:9},{id:950,numero_orden:'OC-1059999',orden_extrusion_id:999,producto_id:8,fecha_entrega_comprometida:'2026-10-15'},{id:777,numero_orden:'OC-1050777',producto_id:9}],
 pedidos:[{id:400,numero_pedido:'PED-06087',cliente:'VEGA RODOLFO',fecha_entrega_est:'2026-09-29',pedido_ordenes_corte:[{orden_corte_id:916}]},{id:403,numero_pedido:'PED-06090',cliente:'AGUACA MANA SA',fecha_entrega_est:'2026-10-01',pedido_ordenes_corte:[{orden_corte_id:924}]}]};
global.APP_BUILD='test';
let html='';global.window={open:()=>({document:{write(h){html=h;},open(){},close(){},body:{set innerHTML(h){html=h;}}}})};
global.toast=()=>{};
eval([fn('escapeHtml'),'var r1=n=>Math.round(n*10)/10;',fn('localDate'),fn('localTime'),fn('_ocDeOE'),fn('_chIndicePedidos'),blk].join('\n').replace(/\basync function (\w+)/g,'global.$1=async function $1').replace(/^function (_\w+)\(/gm,'global.$1=function $1('));
(async()=>{
 // --- VEGA ORD-06268: 9 bobinas, 2 rechazo fuera de rango ya fuera de stock
 await imprimirPalletOE(830);const h1=html;
 const c1=_palletClasificar(DB[830],916);
 T(c1.pallet.length===7,'VEGA: 7 bobinas al pallet ('+c1.pallet.length+')');
 T(c1.rechazo.length===2&&c1.noEsta.length===0,'VEGA: los 2 RECHAZO fuera de rango NO se leen como "cortadas"');
 T(c1.kg===172.9,'VEGA: kg 172,9 ('+c1.kg+')');T(c1.mts===10400,'VEGA: metros 10.400');
 T(h1.includes('VEGA RODOLFO')&&h1.includes('00010 — BOLSA RESIDUO NEGRA 60X90')&&h1.includes('OC-1052884')&&h1.includes('PED-06087'),'VEGA: cliente, código+descripción, OC y pedido');
 T(h1.includes('29/09/2026'),'VEGA: fecha de entrega del pedido');
 T(!h1.includes('BOB-06208')||h1.indexOf('BOB-06208')>h1.indexOf('</table>'),'VEGA: la bobina rechazada no está en la tabla');
 T(/ya salieron del stock \(rechazo\)/.test(h1),'VEGA: nota de rechazo al pie');
 T(!/var\(--/.test(h1),'hoja sin variables CSS');
 // --- AGUACA ORD-06276 en proceso: 14 bobinas, orden numérico
 await imprimirPalletOE(838);const h2=html;const c2=_palletClasificar(DB[838],924);
 T(c2.pallet.length===14&&c2.kg===373.2,'AGUACA: 14 bobinas / 373,2 kg ('+c2.kg+')');
 T(h2.indexOf('BOB-06228')<h2.indexOf('BOB-06241'),'AGUACA: orden por número de bobina');
 T(h2.includes('00049 — BOLSA RESIDUO GRANEL NEGRA 60X90'),'AGUACA: código con descripción');
 // --- borde: 1.005 bobinas, paginación y separaciones
 calls=0;await imprimirPalletOE(999);const h3=html;
 T(calls===2,'paginación: 2 páginas de la base ('+calls+')');
 const c3=_palletClasificar(DB[999],950);
 T(c3.pallet.length===1002,'borde: 1002 al pallet (1005 − cortada − anulada − fuera)');
 T(c3.otraOC.length===1&&h3.includes('VA PARA OC-1050777'),'borde: reservada a otra OC marcada');
 T(c3.fuera.length===1&&/NO van a este pallet/.test(h3),'borde: fuera de rango en el piso avisada');
 T(c3.noEsta.length===1&&/ya se cortaron o se movieron/.test(h3),'borde: cortada aclarada al pie');
 T(h3.includes('CLIENTE &lt;PRUEBA&gt; &amp; CO')&&!h3.includes('<PRUEBA>'),'borde: nombre escapado');
 T(h3.includes('15/10/2026'),'borde: promesa por etapa de la OC manda sobre el pedido');
 // --- OE sin bobinas en stock
 await imprimirPalletOE(555);T(/No hay bobinas de esta orden en stock/.test(html),'sin bobinas: avisa en vez de tabla vacía');
 T(/Bobina a granel/.test(html),'sin OC: muestra la bobina en vez del producto');
 if(OUT){fs.writeFileSync(OUT+'/pallet_vega.html',h1);fs.writeFileSync(OUT+'/pallet_aguaca.html',h2);}
 console.log((bad?'✖ ':'✓ ')+ok+' ok · '+bad+' fallas');process.exit(bad?1:0);
})();
