// smoke 19e — pistas elegidas por el operario (OC-1052957 LYME, C2, 19/10, con la pista que se dedujo de la cámara)
// uso: TZ=America/Argentina/Buenos_Aires node tests/smoke_pistas_bobina.cjs fabrica_bolsas_v6.html
const fs=require('fs');
const src=fs.readFileSync(process.argv[2]||'fabrica_bolsas_v6.html','utf8');
const grab=(a,b)=>{const i=src.indexOf(a),k=src.indexOf(b,i+1);if(i<0||k<0)throw new Error('no está '+a);return src.slice(i,k);};
globalThis.C={maq_corte:[{id:1,nombre:'CORTE-01'},{id:2,nombre:'CORTE-02'}],ord_corte:[]};
globalThis.PLC={cfg:null};globalThis.escapeHtml=s=>String(s);globalThis.CVV={maqs:[1,2]};
eval(grab('function _cvvMaqNom','\n'));
eval(grab('const CVV_M_REAL=','function _cvvTiradas'));
eval(grab('const PST={','// ---- datos del panel ----').replace('const PST=','globalThis.PST='));
let ok=0,bad=0;const t=(c,m)=>{if(c)ok++;else{bad++;console.error('✗ '+m);}};
const mpb=0.5,OC=989;
const b=(nro,m,p,cont,oc)=>({orden_corte_id:oc||OC,bobina_producida_id:nro,maquina_id:2,metros_usados:m,pista:p,pista_contador:cont,pista_en:'2026-10-19T'+String(cont).slice(-4),mpb,
  bobinas_producidas:{numero_bobina:'BOB-0'+nro,extrusora_id:1,plc_cierre_id:1}});
const T1=209888,T2=213057,T3=214636,FIN=217636;
const cargas=[b(6882,1590,1,T1),b(6870,1501,2,T1),b(6867,1507,3,T1),b(6876,1500,4,T1),
  b(6885,1592,1,T2),b(6873,1500,2,T2),b(6888,1648,3,T2),b(6879,1601,4,T2),b(6864,1503,4,T3)];
// estado en el panel a las 13:58, justo antes de poner la 06864 (contador 214636)
const E=_pstEstado(cargas.filter(c=>c.bobina_producida_id!==6864),T3);
t(E.map(o=>o.nro).join()==='BOB-06885,BOB-06873,BOB-06888,BOB-06879','pistas actuales = tirada 2');
const nt=_pstNoTermino(E[3]);
t(nt&&nt.g===1579&&Math.round(nt.esp)===3251&&Math.round(nt.quedanM)===836,'pista 4: 06879 no terminó, 1.579 de 3.251, quedan ≈ 836 m: '+JSON.stringify(nt));
t(_pstNoTermino({vacia:true})===null,'pista vacía: sin alarma');
// recién puesta (dos en la misma pista)
const E2=_pstEstado(cargas.filter(c=>c.bobina_producida_id!==6864),T2+5);
t(_pstNoTermino(E2[0]).recien===true,'recién puesta → «¿dos en la misma pista?»');
// bobina que ya terminó: sin alarma
const E3=_pstEstado(cargas.filter(c=>c.pista_contador===T1),T2);
t(E3.every(o=>_pstNoTermino(o)===null),'tirada 1 terminada (3.169 golpes): sin alarma en ninguna');
// cierre
const X=_pstCierre(cargas,OC,{2:FIN},mpb);
const f=n=>X.filas.find(r=>r.nro==='BOB-0'+n);
t(X.malas.length===1&&X.malas[0].nro==='BOB-06879'&&X.malas[0].est==='sacada','cierre: solo la 06879 sacada a medio cortar');
t(f(6879).g===1579&&f(6879).sig==='BOB-06864','06879: 1.579 golpes, en su lugar la 06864');
t(f(6864).g===3000&&f(6864).est==='ok','06864: 3.000 golpes ✓');
t(f(6882).g===3169&&f(6882).est==='ok','06882: 3.169 de 3.229 ✓ (−1,9 %)');
t(f(6888).g===FIN-T2&&f(6888).est==='ok','06888 hasta el fin ✓');
t(Math.round(X.quedanM)===836&&Math.round(X.quedanB)===1672,'quedan ≈ 836 m ≈ 1.672 bolsas');
// OC que termina antes que la bobina (sin siguiente): «quedó sin cortar»
const Y=_pstCierre([b(1,1500,1,1000)],OC,{2:1000+2000},mpb);
t(Y.malas.length===1&&Y.malas[0].est==='sinTerminar','sin siguiente y con golpes de menos → quedó sin cortar');
// bobinas sin pista se listan aparte
const Z=_pstCierre(cargas.concat([{orden_corte_id:OC,bobina_producida_id:1,maquina_id:2,metros_usados:1500,bobinas_producidas:{numero_bobina:'BOB-X'}}]),OC,{2:FIN},mpb);
t(Z.sinPista.length===1&&Z.sinPista[0]==='BOB-X','sin pista: aparte');
t(_pstCierre([b(1,1500,null,null)],OC,{},mpb)===null,'OC sin pistas → null (cierre como antes)');
const html=_pstCierreHTML({pst:X});t(/sacada a medio cortar/.test(html)&&/836/.test(html),'HTML del cierre');
// 20d — OC-1052980 C1: las 4 bobinas terminaron 2–4 % antes, parejo (≈ 1,22 m por golpe, ficha 1,18) → cortó largo
{const m2=1.18,bb=(nro,m,p,cont)=>Object.assign(b(nro,m,p,cont),{maquina_id:1,mpb:m2,bobinas_producidas:{numero_bobina:'BOB-0'+nro,extrusora_id:9}});
 const cs=[bb(7050,1016,4,256712),bb(7037,1021,1,256714),bb(7058,1037,1,257552),bb(7046,1026,4,257552)];
 const L=_pstCierre(cs,OC,{1:258396},m2);
 t(L.malas.length===0&&L.largo&&L.largo[1]&&Math.round(L.largo[1].mpg*100)===122,'C1 2980: cortó largo ≈ 122 cm, ninguna «sin cortar»: '+JSON.stringify(L.largo));
 t(L.filas.every(f=>f.est==='largo'&&f.quedanM===0),'todas marcadas largo sin metros perdidos');
 t(/cortó la bolsa más larga/.test(_pstCierreHTML({pst:L})),'HTML: cartel bolsa larga');
 // una sola sacada muy corta (−30 %) en la misma máquina → NO es bolsa larga
 const cs2=[bb(7050,1016,4,256712),bb(7037,1021,1,256714),bb(7058,1037,1,257200),bb(7046,1026,4,257552)];
 const L2=_pstCierre(cs2,OC,{1:258396},m2);
 t(!Object.keys(L2.largo).length&&L2.malas.some(f=>f.nro==='BOB-07037'),'una sacada a medio cortar entre parejas → sigue ⛔');
 // una bobina completa (golpes de más) en la máquina → no se presume largo
 const cs3=[bb(7050,1016,4,256712),bb(7037,1021,1,256714)];
 t(!Object.keys(_pstCierre(cs3,OC,{1:256712+870},m2).largo).length,'con golpes suficientes no hay largo');}
console.log(ok+' ok, '+bad+' mal');process.exit(bad?1:0);
