// smoke 01a — ventana de gracia: OE recién cerrada vuelve al selector de Carga de bobinas
// uso: TZ=America/Argentina/Buenos_Aires node tests/smoke_gracia_oe.cjs fabrica_bolsas_v6.html
const fs=require('fs');
const src=fs.readFileSync(process.argv[2]||'fabrica_bolsas_v6.html','utf8');
const a=src.indexOf('const _CB_GRACIA_HS=');
const b=src.indexOf('async function poblarCargaSelects(){');
if(a<0||b<0||b<a){console.error('no se encontró el bloque');process.exit(1);}
const C={};
eval(src.slice(a,b).replace('const _CB_GRACIA_HS=','globalThis._CB_GRACIA_HS='));
let ok=0,bad=0;const t=(c,m)=>{if(c){ok++;}else{bad++;console.error('✗ '+m);}};
const ms=(f,h)=>new Date(f+'T'+h+':00').getTime();
// caso real: ORD-06277 cerrada por BOB-06352 a las 06:16; BOB-06361 a las 07:00
const ord=[{id:839,numero_orden:'ORD-06277',estado:'Completada'},
           {id:810,numero_orden:'ORD-06248',estado:'En proceso'},
           {id:700,numero_orden:'ORD-06100',estado:'Completada'},
           {id:701,numero_orden:'ORD-06101',estado:'Cancelada'},
           {id:702,numero_orden:'ORD-06102',estado:'Completada'}];
const bobs=[{orden_id:839,fecha_produccion:'2026-10-01',hora_produccion:'05:15:00'},
            {orden_id:839,fecha_produccion:'2026-10-01',hora_produccion:'06:16:00'},
            {orden_id:810,fecha_produccion:'2026-10-01',hora_produccion:'08:02:00'},
            {orden_id:700,fecha_produccion:'2026-09-28',hora_produccion:'10:00:00'},
            {orden_id:701,fecha_produccion:'2026-10-01',hora_produccion:'06:00:00'},
            {orden_id:702,fecha_produccion:'2026-10-01',hora_produccion:'06:30:00',anulada:true}];
let r=_cbOEsRecienCerradasDe(ord,bobs,ms('2026-10-01','07:00'),3);
t(r.length===1&&r[0].id===839,'a las 07:00 aparece sólo ORD-06277');
t(_cbUltimaBobinaMs(839,bobs)===ms('2026-10-01','06:16'),'última bobina 06:16');
r=_cbOEsRecienCerradasDe(ord,bobs,ms('2026-10-01','09:15'),3);
t(r.length===1,'a las 09:15 (2h59) sigue');
r=_cbOEsRecienCerradasDe(ord,bobs,ms('2026-10-01','09:17'),3);
t(r.length===0,'a las 09:17 (3h01) ya no');
t(!_cbOEsRecienCerradasDe(ord,bobs,ms('2026-10-01','07:00'),3).some(o=>o.id===810),'En proceso no va al grupo de cerradas');
t(!_cbOEsRecienCerradasDe(ord,bobs,ms('2026-10-01','07:00'),3).some(o=>o.id===701),'Cancelada nunca');
t(!_cbOEsRecienCerradasDe(ord,bobs,ms('2026-10-01','07:00'),3).some(o=>o.id===700),'cerrada hace días no');
t(!_cbOEsRecienCerradasDe(ord,bobs,ms('2026-10-01','07:00'),3).some(o=>o.id===702),'bobina anulada no cuenta');
t(_cbOEsRecienCerradasDe(ord,[],ms('2026-10-01','07:00'),3).length===0,'sin bobinas no hay nada');
// medianoche: cerrada 23:30, consulta 01:00 del día siguiente
const b2=[{orden_id:839,fecha_produccion:'2026-09-30',hora_produccion:'23:30:00'}];
t(_cbOEsRecienCerradasDe(ord,b2,ms('2026-10-01','01:00'),3).length===1,'cruza la medianoche');
// bobina con fecha futura (dedazo) no abre la ventana
const b3=[{orden_id:839,fecha_produccion:'2026-10-02',hora_produccion:'06:00:00'}];
t(_cbOEsRecienCerradasDe(ord,b3,ms('2026-10-01','07:00'),3).length===0,'bobina en el futuro no habilita');
t(_cbEsGracia({estado:'Completada'})&&!_cbEsGracia({estado:'En proceso'})&&!_cbEsGracia(null),'_cbEsGracia');
// orden: la más reciente primero
const ord2=[{id:1,estado:'Completada'},{id:2,estado:'Completada'}];
const b4=[{orden_id:1,fecha_produccion:'2026-10-01',hora_produccion:'05:00'},{orden_id:2,fecha_produccion:'2026-10-01',hora_produccion:'06:30'}];
const r4=_cbOEsRecienCerradasDe(ord2,b4,ms('2026-10-01','07:00'),3);
t(r4[0].id===2&&r4[1].id===1,'ordenadas por la más reciente');
// el guardado marca la bobina y no re-cierra
t(src.includes("const _gracia=_cbEsGracia(orden);")&&src.includes("if(_gracia){\n      // ⏱ 01a"),'guardado con rama de gracia');
console.log((bad?'✗':'✓')+' smoke_gracia_oe: '+ok+' OK, '+bad+' fallas');process.exit(bad?1:0);
