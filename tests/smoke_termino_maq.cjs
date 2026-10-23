// smoke 20e — «Terminó de cortar» por máquina cuando la OC corre en dos cortadoras (OC-1052980, 20/10)
// uso: TZ=America/Argentina/Buenos_Aires node tests/smoke_termino_maq.cjs fabrica_bolsas_v6.html
const fs=require('fs');const src=fs.readFileSync(process.argv[2]||'fabrica_bolsas_v6.html','utf8');
let ok=0,bad=0;const t=(c,m)=>{if(c)ok++;else{bad++;console.log('✗ '+m);}};
const grab=(a,b)=>{const i=src.indexOf(a),k=src.indexOf(b,i+1);if(i<0||k<0)throw new Error('no está '+a);return src.slice(i,k);};
const M1={id:1,nombre:'CORTE-01'},M2={id:2,nombre:'CORTE-02'};
let modal='',upd=null;
global.C={maq_corte:[M1,M2],ord_corte:[]};global.escapeHtml=x=>String(x);global.localDate=()=>'2026-10-20';global.fmtHora=()=>'10:09';
global.document={getElementById:()=>null,body:{insertAdjacentHTML:(w,h)=>{modal=h;}}};
// 23a: el panel escribe con _ocAnotar (lee la OC fresca y actualiza condicionado al estado)
const _q=(res)=>{const q={eq:()=>q,neq:()=>q,is:()=>q,in:()=>q,select:()=>q,single:()=>q,then:(ok,ko)=>Promise.resolve(res()).then(ok,ko)};return q;};
global.sb={from:()=>({select:()=>_q(()=>{const o=C.ord_corte[0];return{data:{id:o.id,estado:o.estado,observaciones:o.observaciones,fecha_completada:null},error:null};}),update:o=>{upd=o;return _q(()=>({data:[{id:1}],error:null}));}})};
global.reload=async()=>{};global._pcorteFeedback=()=>{};global._pintarPanelCorte=()=>{};global.confirm=()=>true;
let todo=null;
eval(grab('async function _ocFresca','// ===== FIN 🔒 OC FRESCA'));
eval(grab('function _pcorteTerminoEnMaq','// Terminó de cortar: marca'));
global._pcorteTerminoTodo=id=>{todo=id;};
const oc={id:1012,numero_orden:'OC-1052980',estado:'En proceso',observaciones:'[Iniciada en panel 2026-10-20 08:58 por C]',orden_corte_maquinas:[{maquina_id:1},{maquina_id:2}]};
C.ord_corte=[oc];
t(_pcorteEnMaq(oc,M1)&&_pcorteEnMaq(oc,M2),'en proceso en las dos');
t(_pcorteOtrasMaqs(oc,2).map(m=>m.id).join()==='1','otra máquina = C1');
panelcTerminoCorte(1012,2);
t(/Terminó sólo en CORTE-02/.test(modal)&&/CORTE-01 sigue cortando/.test(modal)&&/TODA la OC/.test(modal),'pregunta sólo acá / toda');
t(todo===null,'no terminó todo sin preguntar');
(async()=>{
  window={};global.window=window;window._pcorteOperario='GUARAZ SERGIO';window._pcorteOCobjetivo=1012;window._pcorteMaquinaId=2;
  await _pcorteTerminoSoloMaq(1012,2);
  t(upd&&!('estado' in upd)&&/\[Terminó en CORTE-02 panel 2026-10-20 10:09 por GUARAZ SERGIO — CORTE-01 sigue\]$/.test(upd.observaciones),'marca sólo C2, estado igual: '+(upd&&upd.observaciones));
  t(window._pcorteOCobjetivo===null,'C2 queda libre (objetivo borrado)');
  oc.observaciones=upd.observaciones;
  t(!_pcorteEnMaq(oc,M2)&&_pcorteEnMaq(oc,M1),'tarjeta C2 sin la OC, C1 la sigue mostrando');
  todo=null;panelcTerminoCorte(1012,1);t(todo===1012,'en C1 (la última) → termina toda la OC como antes');
  oc.observaciones+=' [Retomada en CORTE-02 panel 2026-10-20 11:00 por G]';t(_pcorteEnMaq(oc,M2),'retomada en C2 → vuelve');
  t(_pcorteTerminoEnMaq({observaciones:'[Terminó en CORTE-02 panel 2026-10-20 10:09 por G — CORTE-01 sigue] [REABIERTA en panel 2026-10-21 08:00 por X]'},'CORTE-02')===false,'reabierta → vale para todas');
  todo=null;panelcTerminoCorte(1012);t(todo===1012,'sin máquina (otro lugar) → como antes');
  // golpes: Terminó en CORTE-02 corta sólo los de C2
  eval(grab('function _cvvTs','function _cvvMaqNom').replace(/^/,'')+grab('function _cvvMaqNom','function _cvvEmpNom')+grab('function _cvvTerminada','function _cvvEnMarcha'));
  const o2={observaciones:'[Iniciada en panel 2026-10-20 08:58 por C] [Terminó en CORTE-02 panel 2026-10-20 10:09 por G — CORTE-01 sigue]'};
  const T=s=>new Date('2026-10-20T'+s+'-03:00').getTime();
  t(_cvvTerminada(o2,T('10:20:00'),2)===true,'golpe C2 10:20 → terminada en C2');
  t(_cvvTerminada(o2,T('10:20:00'),1)===false,'golpe C1 10:20 → sigue (C1)');
  t(_cvvTerminada({observaciones:'[Iniciada en panel 2026-10-20 08:58 por C] [Corte terminado en panel 2026-10-20 10:09 por C — pendiente de cierre]'},T('10:20:00'),1)===true,'«Corte terminado» de toda la OC vale para cualquier máquina');
  console.log((bad?'FALLAN '+bad:'OK')+' — '+ok+' ok');process.exit(bad?1:0);
})();
