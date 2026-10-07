// smoke 07d — cargas de corte en máquina no asignada a la OC (derivado, sin guardar nada)
// uso: TZ=America/Argentina/Buenos_Aires node tests/smoke_maq_no_asignada.cjs fabrica_bolsas_v6.html
const fs=require('fs');const src=fs.readFileSync(process.argv[2]||'fabrica_bolsas_v6.html','utf8');
const a=src.indexOf('// ===== 🔀 CARGAS EN MÁQUINA NO ASIGNADA');const b=src.indexOf('// Panel: pregunta grande, una vez por OC+máquina');
if(a<0||b<0){console.log('FALTA el bloque');process.exit(1);}
let ok=0,bad=0;const t=(x,m)=>{if(x)ok++;else{bad++;console.log('✗ '+m);}};
global.escapeHtml=s=>String(s).replace(/</g,'&lt;');
const box={innerHTML:''};global.document={getElementById:id=>id==='oc-maqna-wrap'?box:null};
eval(src.slice(a,b).replace(/^const /gm,'var '));
const maqs=[{id:1,nombre:'CORTE-01'},{id:2,nombre:'CORTE-02'},{id:3,nombre:'CORTE-03'}];
const emps=[{id:7,apellido_nombre:'ACEVEDO'},{id:8,apellido_nombre:'PEREZ'}];
const ords=[
  {id:1,numero_orden:'OC-A',estado:'En proceso',cliente:'LYME SA',orden_corte_maquinas:[{maquina_id:1}],orden_corte_bobinas:[
    {maquina_id:1,empleado_id:7,metros_usados:1000,fecha_asignacion:'2026-10-06T10:00:00Z'},
    {maquina_id:2,empleado_id:7,metros_usados:1500,fecha_asignacion:'2026-10-06T14:00:00Z'},
    {maquina_id:2,empleado_id:8,metros_usados:1400,fecha_asignacion:'2026-10-06T13:00:00Z'}]},
  {id:2,numero_orden:'OC-B',estado:'Completada',orden_corte_maquinas:[{maquina_id:1}],orden_corte_bobinas:[{maquina_id:3,fecha_asignacion:'2026-10-01T10:00:00Z'}]}, // cerrada: no avisa
  {id:3,numero_orden:'OC-C',estado:'Pendiente',orden_corte_maquinas:[],orden_corte_bobinas:[{maquina_id:3,empleado_id:8,fecha_asignacion:'2026-10-07T09:00:00Z'}]}, // sin máquina asignada
  {id:4,numero_orden:'OC-D',estado:'En proceso',orden_corte_maquinas:[{maquina_id:2}],orden_corte_bobinas:[{maquina_id:2},{maquina_id:null}]}, // todo bien / viejas sin máquina
];
const L=_ocCargasFueraDeMaquina(ords,maqs,emps);
t(L.length===2,'sólo las abiertas con cargas fuera de máquina ('+L.length+')');
t(L[0].oc.numero_orden==='OC-C','la más reciente primero');
const A=L.find(x=>x.oc.numero_orden==='OC-A');
t(A&&A.asignadas.join()==='CORTE-01','OC-A asignada a CORTE-01');
t(A&&A.usadas.length===1&&A.usadas[0].nombre==='CORTE-02'&&A.usadas[0].n===2&&A.usadas[0].metros===2900,'OC-A: 2 bobinas en CORTE-02, 2.900 m');
t(A&&A.usadas[0].ops.sort().join()==='ACEVEDO,PEREZ','OC-A: operarios que cargaron');
t(A&&A.usadas[0].ult==='2026-10-06T14:00:00Z','OC-A: última carga');
t(L.find(x=>x.oc.numero_orden==='OC-C').asignadas.length===0,'OC sin máquinas asignadas también avisa');
// al reasignar la máquina, el aviso se va solo (P1)
ords[0].orden_corte_maquinas.push({maquina_id:2});ords[2].orden_corte_maquinas.push({maquina_id:3});
t(_ocCargasFueraDeMaquina(ords,maqs,emps).length===0,'reasignada → no hay más aviso');
ords[0].orden_corte_maquinas.pop();
t(_ocMaqAsignada(ords[0],1)===true&&_ocMaqAsignada(ords[0],2)===false&&_ocMaqAsignada(null,1)===false,'_ocMaqAsignada');
// render
global.C={ord_corte:ords,maq_corte:maqs,empleados:emps,productos:[]};
ords[0].productos={codigo:'00123',descripcion:'Bolsa 45x60'};
renderMaqNoAsignada();
t(/OC-A/.test(box.innerHTML)&&/Reasignar máquina/.test(box.innerHTML)&&/abrirEditarOrdenCorte\(1\)/.test(box.innerHTML),'pantalla Órdenes de corte: lista con botón Reasignar');
t(/00123/.test(box.innerHTML)&&/Bolsa 45x60/.test(box.innerHTML),'producto con código y descripción');
t(/OC-A en CORTE-02/.test(_ocmnaTableroHTML()),'tablero: aviso con OC y máquina');
C.ord_corte=[ords[3]];renderMaqNoAsignada();t(box.innerHTML===''&&_ocmnaTableroHTML()==='','sin casos no muestra nada');
// integración
t(/<div id="oc-maqna-wrap"><\/div>/.test(src),'contenedor en Órdenes de corte');
t(/try\{renderMaqNoAsignada\(\);\}catch\(e\)\{\}/.test(src),'se pinta con la lista de OC');
t(/wrap\.innerHTML=_ocmnaTableroHTML\(\)\+html;/.test(src),'tablero lo muestra arriba');
const iP=src.indexOf('async function _pcorteCargarBobina(');const iQ=src.indexOf('if(!_ocMaqAsignada(oc,maqId)&&!window._pcorteOkFueraMaq[ocId+\'-\'+maqId])',iP);
const iM=src.indexOf("const maqId=(maquinaId!=null?maquinaId:window._pcorteMaquinaId)||null;",iP);const iE=src.indexOf('const ejecutar=async()=>{',iP);
t(iQ>iM&&iQ>iE,'la pregunta va después de fijar la máquina y antes de grabar');
t(/maquina_id:maqId,origen:origen\|\|'boton'/.test(src),'la carga queda en la máquina que eligió el operario');
t(/document\.getElementById\('pcmna-no'\)\?\.focus\(\)/.test(src),'foco en «No» (la pistola nunca contesta Sí)');
console.log((bad?'✗ ':'✓ ')+ok+' ok'+(bad?' · '+bad+' FALLAN':''));process.exit(bad?1:0);
