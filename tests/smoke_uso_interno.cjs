// smoke 02a — bobinas para fundas / uso interno
// uso: TZ=America/Argentina/Buenos_Aires node tests/smoke_uso_interno.cjs fabrica_bolsas_v6.html
const fs=require('fs');
const src=fs.readFileSync(process.argv[2]||'fabrica_bolsas_v6.html','utf8');
const a=src.indexOf('const _UI_MOTIVOS=');const b=src.indexOf('let _uiBob=null;');
if(a<0||b<a){console.error('bloque no encontrado');process.exit(1);}
globalThis.r2=x=>Math.round(x*100)/100;
eval(src.slice(a,b).replace('const _UI_MOTIVOS=','globalThis._UI_MOTIVOS='));
let ok=0,bad=0;const t=(c,m)=>{if(c)ok++;else{bad++;console.error('✗ '+m);}};
// rechazo en el panel (caso BOB-03458)
const rech={id:3510,en_stock:false,fuera_de_rango:true,anulada:false,observaciones:null};
let e=_uiPuedeUsar(rech,0);t(e.ok&&e.esRechazo,'rechazo se puede usar');
let u=_uiCambiosBobina(rech,'fundas_bultos','','2026-10-02','X');
t(u.anulada===true&&/SÍ se consumió/.test(u.anulada_motivo)&&u.anulada_fecha==='X','rechazo queda anulado sin reverso');
t(u.en_stock===false&&u.reservada_oc_id===null,'rechazo sin stock ni reserva');
t(!('fuera_de_rango' in u),'no toca fuera_de_rango (sigue sin contar en la OE)');
// buena en stock
const buena={id:1,en_stock:true,fuera_de_rango:false,anulada:false,observaciones:'previa'};
e=_uiPuedeUsar(buena,0);t(e.ok&&!e.esRechazo,'buena se puede usar');
u=_uiCambiosBobina(buena,'otro','para probar','2026-10-02','X');
t(!u.anulada&&u.en_stock===false,'buena: sale de stock, no se anula');
t(u.observaciones==='previa | 2026-10-02: usada para otro uso interno — para probar','nota agregada a la observación previa');
t(_uiCambiosBobina({},'fundas_bultos','','2026-10-02','X').observaciones==='2026-10-02: usada para fundas para bultos','nota sin observación previa');
// bloqueos
t(!_uiPuedeUsar(null,0).ok,'inexistente');
t(!_uiPuedeUsar({anulada:true,anulada_motivo:'dup'},0).ok&&/dup/.test(_uiPuedeUsar({anulada:true,anulada_motivo:'dup'},0).msg),'anulada con motivo');
t(!_uiPuedeUsar(buena,1).ok,'ya cortada');
t(!_uiPuedeUsar({en_stock:false,fuera_de_rango:false,anulada:false},0).ok,'sin stock');
// resumen por mes
const r=_uiResumenMeses([{fecha:'2026-10-02T14:45:00Z',kg:'38.00',metros:'750'},{fecha:'2026-10-02T14:46:00Z',kg:'19.46',metros:'400'},{fecha:'2026-09-30T10:00:00Z',kg:'10',metros:'100'},{fecha:null,kg:5}]);
t(r['2026-10'].n===2&&r['2026-10'].kg===57.46&&r['2026-10'].m===1150,'octubre 57,46 kg');
t(r['2026-09'].n===1&&Object.keys(r).length===2,'septiembre aparte, sin fecha ignorado');
// enganches
t(src.includes(".eq('fuera_de_rango',true).eq('anulada',false)"),'panel fuera de rango sin anuladas');
t(src.includes("if(name==='uso-interno')renderUsoInterno();")&&src.includes('id="page-uso-interno"')&&src.includes("go('uso-interno')"),'página, nav y dispatch');
t(src.includes("tipo:'consumo_interno'"),'movimiento con tipo propio');
console.log((bad?'✗':'✓')+' smoke_uso_interno: '+ok+' OK, '+bad+' fallas');process.exit(bad?1:0);
