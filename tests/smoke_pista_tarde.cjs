// smoke 21b — escaneo después de arrancar a cortar: la pista arranca en el «terminó» de la OC anterior (OC-1053012)
// uso: TZ=America/Argentina/Buenos_Aires node tests/smoke_pista_tarde.cjs fabrica_bolsas_v6.html
const fs=require('fs');const src=fs.readFileSync(process.argv[2]||'fabrica_bolsas_v6.html','utf8');
const grab=(a,b)=>{const i=src.indexOf(a),j=src.indexOf(b,i);if(i<0||j<0)throw new Error('falta '+a);return src.slice(i,j);};
let ok=0,bad=0;const t=(c,m)=>{if(c)ok++;else{bad++;console.log('✗ '+m);}};
global.C={maq_corte:[{id:1,nombre:'CORTE-01'},{id:2,nombre:'CORTE-02'}],ord_corte:[
  {id:1034,observaciones:'[Iniciada en panel 2026-10-21 07:28 por X] [Corte terminado en panel 2026-10-21 09:23 por X — pendiente de cierre]'},
  {id:1028,observaciones:''},{id:900,observaciones:'[Iniciada en panel 2026-10-21 07:28 por X]'}]};
eval(grab('function _cvvTs(','\n')+'\n'+grab('function _cvvMaqNom(','\n')+'\n');
eval(grab('async function _pstContInicio(','async function _pstElegir('));
const TAN=[{inicio:'2026-10-21T12:15:23Z',contador_fin:267096},{inicio:'2026-10-21T12:31:27Z',contador_fin:267097}];
let pedido=null;
global.sb={from:()=>{const api={select(){return api;},eq(){return api;},lte(k,v){pedido=v;return api;},order(){return api;},
  limit(){return Promise.resolve({data:TAN.filter(x=>x.inicio<=pedido).sort((a,b)=>b.inicio.localeCompare(a.inicio)).slice(0,1),error:null});}};return api;}};
global.PST={est:{}};
(async()=>{
  t(_cvvTerminoTs(C.ord_corte[0],1)===new Date('2026-10-21T09:23:00-03:00').getTime(),'hora del terminó');
  t(_cvvTerminoTs(C.ord_corte[2],1)===null,'OC en marcha: sin terminó');
  t(_cvvTerminoTs({observaciones:'[Corte terminado en panel 2026-10-21 09:23 por X] [REABIERTA en panel 2026-10-21 09:40 por X]'},1)===null,'reabierta: sin terminó');
  PST.est[1]={cargas:[{orden_corte_id:1034,maquina_id:1,fecha_asignacion:'2026-10-21T11:44:01Z',pista:1,pista_contador:266266},
    {orden_corte_id:1028,maquina_id:1,fecha_asignacion:'2026-10-21T12:55:32Z',pista:null,pista_contador:null}]};
  t(await _pstContInicio(1028,1,267747)===267096,'primera bobina escaneada tarde: arranca en 267.096 (09:15), no en 267.747');
  PST.est[1].cargas[1].pista=1;PST.est[1].cargas[1].pista_contador=267096;
  t(await _pstContInicio(1028,1,267880)===null,'la OC ya tenía pista arrancada: desde ahora');
  PST.est[1]={cargas:[{orden_corte_id:900,maquina_id:1,fecha_asignacion:'2026-10-21T11:44:01Z',pista:1,pista_contador:266266}]};
  t(await _pstContInicio(1028,1,267747)===null,'la OC anterior no terminó: desde ahora');
  t(await _pstContInicio(1028,1,null)===null,'sin contador: nada');
  console.log((bad?'':'OK ')+'smoke_pista_tarde: '+ok+' ok, '+bad+' mal');process.exit(bad?1:0);
})();
