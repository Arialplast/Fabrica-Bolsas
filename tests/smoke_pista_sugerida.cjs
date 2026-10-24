// smoke 24a — pista sugerida, pista ocupada por otra OC en el cierre, pulsador fuera de tiempo por peso
// uso: TZ=America/Argentina/Buenos_Aires node tests/smoke_pista_sugerida.cjs fabrica_bolsas_v6.html
const fs=require('fs');
const src=fs.readFileSync(process.argv[2]||'fabrica_bolsas_v6.html','utf8');
const grab=(a,b)=>{const i=src.indexOf(a),k=src.indexOf(b,i+1);if(i<0||k<0)throw new Error('no está '+a);return src.slice(i,k);};
globalThis.C={maq_corte:[{id:1,nombre:'CORTE-01'},{id:2,nombre:'CORTE-02'}],ord_corte:[{id:990,numero_orden:'OC-990'},{id:991,numero_orden:'OC-991'}]};
globalThis.PLC={cfg:null};globalThis.escapeHtml=s=>String(s);globalThis.CVV={maqs:[1,2]};
eval(grab('function _cvvMaqNom','\n'));
eval(grab('const CVV_F_CAMBIO=','function _cvvTiradas'));
eval(grab('const PST={','// ---- datos del panel ----').replace('const PST=','globalThis.PST='));
eval(grab('const PLS={','async function _plsCargar').replace('const PLS=','globalThis.PLS='));
let ok=0,bad=0;const t=(c,m)=>{if(c)ok++;else{bad++;console.error('✗ '+m);}};
const mpb=0.79;
const b=(id,m,p,cont,oc)=>({id,orden_corte_id:oc||990,bobina_producida_id:id,maquina_id:2,metros_usados:m,pista:p,pista_contador:cont,
  pista_en:'2026-10-24T09:00:00Z',fecha_asignacion:'2026-10-24T09:00:00Z',mpb,bobinas_producidas:{numero_bobina:'BOB-0'+id,extrusora_id:9}});
// Caso Acevedo 24/10 06:11 (C2): p1/p2 terminaron, p3/p4 siguen con 133 y 218 golpes por cortar
const cont=301097;
const E=_pstEstado([b(7231,1366,1,299353),b(7229,1353,2,299353),b(7184,1505,3,299353),b(7163,1574,4,299353)],cont);
const s=_pstSugeridas(E);
t(s.length===2&&s.includes(1)&&s.includes(2),'sugeridas: 1 y 2 (terminaron), no 3 ni 4: '+s);
t(!!_pstNoTermino(E[2])&&!!_pstNoTermino(E[3]),'3 y 4 siguen cortando');
const E2=_pstEstado([b(1,1500,1,1000)],1100);
t(_pstSugeridas(E2).join()==='2,3,4','sin terminadas: las vacías 2,3,4');
// cierre: la pista 4 la ocupa otra OC → no es «sacada con film»
const cs=[b(7152,1013,4,318121,990),b(7304,600,4,319000,991)];
const R=_pstCierre(cs,990,{2:319700},0.64);
const f=R.filas.find(x=>x.nro==='BOB-07152');
t(f.est==='otraOC'&&f.sigOC==='OC-991','pista ocupada por OC-991 → otraOC ('+f.est+')');
t(R.malas.length===0&&R.quedanM===0,'no suma film perdido');
t((R.otras||[]).length===1,'listada aparte');
const R2=_pstCierre([b(1,1013,4,1000,990),b(2,1000,4,1500,990)],990,{2:3100},0.64);
t(R2.filas[0].est==='sacada'&&R2.malas.length===1,'misma OC sigue siendo «sacada»');
// pulsador por peso (BOB-07193 / 07194, EXT-07 20/10)
const sq=(n,m,kg)=>({id:n,nro:'BOB-0'+n,metros:m,kgn:kg,tipo:5});
const seq=[sq(7184,1505,24.71),sq(7190,1504,24.18),sq(7193,1605,24.84),sq(7194,1408,25.13),sq(7201,1512,25.13),sq(7207,1507,25.44),sq(7217,1508,25.12)];
const P=_plsPares(seq);
t(P.length===1&&P[0].tipo==='tarde'&&P[0].a.nro==='BOB-07193','detecta 07193→07194 tarde');
t(P[0].mover>=90&&P[0].mover<=130,'mueve ≈ 110 m ('+P[0].mover+')');
const seq2=seq.map(x=>Object.assign({},x));seq2[3].kgn=23.4;   // la segunda no compensa → no es pulsador
t(_plsPares(seq2).length===0,'sin compensación en la siguiente → nada');
const seq3=[sq(1,1500,25),sq(2,1500,25.1),sq(3,1500,24.9),sq(4,1500,25),sq(5,1500,25.2)];
t(_plsPares(seq3).length===0,'bobinas normales → nada');
const seq4=seq.map(x=>Object.assign({},x));seq4[2]=sq(7193,1400,24.84);seq4[3]=sq(7194,1613,25.13);
t(_plsPares(seq4).length===1&&_plsPares(seq4)[0].tipo==='temprano'&&_plsPares(seq4)[0].mover<0,'temprano: pasa de la 2ª a la 1ª');
t(/⛔ PASASTE/.test(src)&&/cls:p>=1\+_EE_PASADA\?'pasada'/.test(src),'estación: cartel PASASTE');
t(/👉 VA EN LA PISTA/.test(src),'alarma con botón a la pista sugerida');
console.log(ok+' ok, '+bad+' mal');process.exit(bad?1:0);
