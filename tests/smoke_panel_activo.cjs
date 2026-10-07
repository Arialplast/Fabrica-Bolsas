// smoke 07c — panel de corte: quién carga y en qué máquina
// uso: TZ=America/Argentina/Buenos_Aires node tests/smoke_panel_activo.cjs fabrica_bolsas_v6.html
const fs=require('fs');const src=fs.readFileSync(process.argv[2]||'fabrica_bolsas_v6.html','utf8');
const a=src.indexOf('// ===== 👷 QUIÉN CARGA Y EN QUÉ MÁQUINA');const b=src.indexOf('function _pcorteAsocOrden(');
if(a<0||b<0){console.log('FALTA el bloque');process.exit(1);}
let ok=0,bad=0;const t=(x,m)=>{if(x)ok++;else{bad++;console.log('✗ '+m);}};
global.escapeHtml=s=>String(s).replace(/</g,'&lt;');
global.C={empleados:[{id:3,apellido_nombre:'Perez Juan',activo:true}],maq_corte:[{id:1,nombre:'Cortadora 1'},{id:2,nombre:'Cortadora 2'}],
  productos:[{id:1,descripcion:'Bolsa 45x60'}],ord_corte:[{id:900,numero_orden:'OC-1052900',producto_id:1,cliente:'DAG SRL',estado:'En proceso'}]};
eval(src.slice(a,b));
const oc={id:900};
t(_pcorteMaqActiva(2,oc,900,2)===true,'máquina fijada + OC objetivo cortando en ella → activa');
t(_pcorteMaqActiva(1,oc,900,2)===false,'otra máquina → no');
t(_pcorteMaqActiva(2,oc,900,null)===false,'sin máquina fijada → ninguna activa');
t(_pcorteMaqActiva(2,null,900,2)===false,'máquina sin orden en proceso → no');
t(_pcorteMaqActiva(2,{id:901},900,2)===false,'otra OC en esa máquina → no');
let h=_pcorteActivoHTML({ocId:900,maqId:2,empId:3,enProcCount:1});
t(/PEREZ JUAN/.test(h)&&/CORTADORA 2/.test(h)&&/OC-1052900/.test(h)&&/DAG SRL/.test(h)&&/Bolsa 45x60/.test(h),'todo elegido: nombre y máquina grandes, con OC/cliente/producto');
t(!/ELEGÍ/.test(h),'todo elegido: sin avisos');
h=_pcorteActivoHTML({ocId:900,maqId:null,empId:null,enProcCount:1});
t(/ELEGÍ TU NOMBRE/.test(h)&&/ELEGÍ LA MÁQUINA/.test(h)&&/OC-1052900/.test(h),'sin operario ni máquina: dos avisos rojos');
h=_pcorteActivoHTML({ocId:null,maqId:2,empId:3,enProcCount:3});
t(/hay 3 órdenes cortando/.test(h),'varias OC sin elegir: lo dice');
h=_pcorteActivoHTML({ocId:null,maqId:null,empId:3,enProcCount:0});
t(/NINGUNA ORDEN CORTANDO/.test(h),'nada en proceso: lo dice');
// código: integración
t(/_pcorteActivoHTML\(\{ocId:_ocObjetivo,maqId:window\._pcorteMaquinaId\|\|null,empId:window\._pcorteEmpleadoId\|\|null/.test(src),'el panel usa el recuadro grande');
t(/const esObjetivo=_act;/.test(src),'«Bobinas acá» sólo con máquina fijada');
t(/try\{_pintarPanelCorte\(\);\}catch\(e\)\{\} \/\/ 07c/.test(src),'al elegir operario se repinta');
t(/\(opNom\?' · '\+opNom:''\)\}\);/.test(src),'el cartel de cargada dice el operario');
console.log((bad?'✗ ':'✓ ')+ok+' ok'+(bad?' · '+bad+' FALLAN':''));process.exit(bad?1:0);
