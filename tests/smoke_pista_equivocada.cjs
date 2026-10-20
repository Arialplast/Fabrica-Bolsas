// smoke 20h — ↩ me equivoqué de pista (sólo recién puesta, misma máquina, destino vacío o terminado)
// uso: TZ=America/Argentina/Buenos_Aires node tests/smoke_pista_equivocada.cjs fabrica_bolsas_v6.html
const fs=require('fs');
const src=fs.readFileSync(process.argv[2]||'fabrica_bolsas_v6.html','utf8');
const grab=(a,b)=>{const i=src.indexOf(a),k=src.indexOf(b,i+1);if(i<0||k<0)throw new Error('no está '+a);return src.slice(i,k);};
globalThis.C={maq_corte:[{id:1,nombre:'CORTE-01'},{id:2,nombre:'CORTE-02'}],ord_corte:[]};
globalThis.PLC={cfg:null};globalThis.escapeHtml=s=>String(s);globalThis.CVV={maqs:[1,2]};
eval(grab('function _cvvMaqNom','\n'));
eval(grab('const CVV_F_CAMBIO=','function _cvvTiradas'));
eval(grab('const PST={','// ---- datos del panel ----').replace('const PST=','globalThis.PST='));
eval(grab('const PST_FIX=','function _pstCambiarPista(').replace('const PST_FIX=','globalThis.PST_FIX='));
let ok=0,bad=0;const t=(c,m)=>{if(c)ok++;else{bad++;console.error('✗ '+m);}};
const mpb=1.0,now=Date.parse('2026-10-20T21:00:00Z');
const b=(id,m,p,cont,enMin)=>({id,orden_corte_id:990,bobina_producida_id:id,maquina_id:2,metros_usados:m,pista:p,pista_contador:cont,
  pista_en:new Date(now-enMin*60000).toISOString(),mpb,bobinas_producidas:{numero_bobina:'BOB-0'+id,extrusora_id:9}});
// pista 1: recién puesta (3 min, 40 golpes) · 2: cortando hace 30 min · 3: terminada · 4: vacía
const cont=10000;
const E=_pstEstado([b(1,800,1,cont-40,3),b(2,900,2,cont-500,30),b(3,300,3,cont-400,40)],cont);
t(_pstPuedeCorregir(E[0],now),'recién puesta (3 min) → se puede');
t(!_pstPuedeCorregir(E[1],now),'30 min y 500 golpes → no');
t(_pstPuedeCorregir(Object.assign({},E[1],{g:30}),now),'≤ 50 golpes aunque hayan pasado > 10 min → se puede');
t(!_pstPuedeCorregir(E[3],now)&&!_pstPuedeCorregir(null,now),'vacía / nada → no');
const d=_pstDestinos(E,1);
t(d.join()==='3,4','destinos: 3 (terminó) y 4 (vacía), no la 2 que está cortando: '+d);
t(!_pstDestinos(E,1).includes(1),'nunca la propia');
t(/me equivoqué de pista/.test(src)&&/_pstCambiarPista\('\+maqId/.test(src),'botón en la tarjeta');
console.log(ok+' ok, '+bad+' mal');process.exit(bad?1:0);
