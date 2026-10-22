// smoke 22b — ✂ Corte en vivo completo: pistas de la máquina, bobinas sacadas, cruce con extrusión, tarjetas
// uso: TZ=America/Argentina/Buenos_Aires node tests/smoke_cvv_completo.cjs fabrica_bolsas_v6.html
const fs=require('fs');const src=fs.readFileSync(process.argv[2]||'fabrica_bolsas_v6.html','utf8');
const a=src.indexOf('// ===== ✂ CORTE EN VIVO (15b) =====');const b=src.indexOf('function _cvvCard(');
const p1=src.indexOf('const PST={'),p2=src.indexOf('function _pstNoTermino(');
if(a<0||b<0||b<a||p1<0||p2<p1||src.indexOf('function _cvvPstMaq(')<a||src.indexOf('function _cvvPstMaq(')>b){console.log('FALTA el bloque');process.exit(1);}
let ok=0,bad=0;const t=(c,m)=>{if(c)ok++;else{bad++;console.log('✗ '+m);}};
global.C={empleados:[{id:1,apellido_nombre:'Araujo Celia'}],maq_corte:[{id:1,nombre:'CORTE-01'},{id:2,nombre:'CORTE-02'},{id:3,nombre:'CORTE-3',linea:'Rollera'}],
  extrusoras:[{id:1,nombre:'EXT-01'},{id:3,nombre:'EXT-03'},{id:7,nombre:'EXT-07'}]};
global.escapeHtml=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
global._evvF=(n,d)=>(n==null||!isFinite(n))?'—':Number(n).toLocaleString('es-AR',{minimumFractionDigits:d||0,maximumFractionDigits:d||0});
global._plcHora=iso=>new Date(iso).toTimeString().slice(0,5);
eval(src.slice(a,b).replace('const CVV=','global.CVV=').replace('const CVV_PAUSA_MIN=3,CVV_LARGA_MIN=20;','global.CVV_PAUSA_MIN=3;global.CVV_LARGA_MIN=20;').replace('const _CVV_OPCOL','global._CVV_OPCOL').replace('const CVV_F_CAMBIO','global.CVV_F_CAMBIO').replace('const CL_UMBRAL','global.CL_UMBRAL'));
eval(src.slice(p1,p2).replace('const PST=','global.PST='));
global.CL_UMBRAL=global.CL_UMBRAL||-0.04;
const T=s=>new Date('2026-10-22T'+s+'-03:00').getTime();
// OC 10: 0,88 m por bolsa. Bobinas de 880 m (1.000 golpes cada una) salvo la 4 (440 m = 500 golpes).
const ocs={10:{id:10,numero_orden:'OC-X',estado:'En proceso',productos:{metros_por_bolsa:0.88}}};
const car=(id,maq,pista,cont,ext,metros,hora)=>({id,orden_corte_id:10,bobina_producida_id:id,maquina_id:maq,metros_usados:metros,pista,pista_contador:cont,
  t:T(hora),fecha_asignacion:new Date(T(hora)).toISOString(),bobinas_producidas:{id:9000+id,numero_bobina:'BOB-'+id,extrusora_id:ext}});
const cargas=[
  car(1,1,1,10000,3,880,'06:00:00'),   // pista 1: termina en 11.000 → 1.000 de 1.000 (0 %)
  car(2,1,4,10000,7,880,'06:00:05'),   // pista 4: siguiente en 10.980 → 980 de 1.000 (−2 %)
  car(3,1,1,11000,3,880,'08:00:00'),   // pista 1, en curso
  car(4,1,4,10980,7,880,'08:00:05'),   // pista 4: sacada en 11.300 → 320 de 1.000 (−68 %)
  car(5,1,4,11300,7,880,'09:00:00'),   // pista 4, en curso
  car(6,2,2,500,1,440,'07:00:00'),     // C2 pista 2: siguiente en 1.010 → 510 de 500 (+2 %)
  car(7,2,2,1010,1,440,'09:30:00')];   // C2 pista 2, en curso
const D={ahora:T('10:00:00'),t0:T('06:00:00'),cargas,tandas:[],ocs,est:[{maquina:1,contador:11500},{maquina:2,contador:1200}],ocsR:[],ops:[],turnos:{},otras:[car(8,3,null,null,null,1000,'07:00:00')]};
// 1) pistas de la máquina
const P=_cvvPstMaq(D,1);
t(P.length===4,'4 pistas');
t(P[0].nro==='BOB-3'&&P[0].g===500&&Math.round(P[0].esp)===1000,'pista 1 = BOB-3, 500 de 1.000 ('+P[0].g+')');
t(P[1].vacia&&P[2].vacia,'pistas 2 y 3 vacías');
t(P[3].nro==='BOB-5'&&P[3].g===200,'pista 4 = BOB-5, 200 golpes');
const h=_cvvPstHTML(P);
t(h.indexOf('BOB-3')>0&&h.indexOf('EXT-03')>0&&h.indexOf('quedan ≈ 440 m')>0,'tarjeta: bobina, extrusora y metros que quedan');
t(h.indexOf('BOB-3')<h.indexOf('vacía')&&h.lastIndexOf('BOB-5')>h.lastIndexOf('vacía'),'orden 1 3 / 2 4 (vista desde atrás)');
t(_cvvPstHTML(_cvvPstMaq(Object.assign({},D,{cargas:[]}),1)).indexOf('ninguna bobina')>0,'sin pistas: aviso');
// ¿terminó? (golpes de más)
const P2=_cvvPstMaq(Object.assign({},D,{est:[{maquina:1,contador:12300}]}),1);
t(P2[0].frac>1.1&&_cvvPstHTML(P2).indexOf('¿TERMINÓ?')>0,'pista con 13 % de más → ¿TERMINÓ?');
// 2) bobinas terminadas, sacadas y cruce
const B=_cvvPstBobinas(D);
t(B.length===4,'4 bobinas terminadas ('+B.length+')');
const s=_cvvSacadas(B,D.t0);
t(s.length===1&&s[0].nro==='BOB-4'&&s[0].g===320&&s[0].sigNro==='BOB-5','BOB-4 sacada con 320 de 1.000, se puso BOB-5');
const X=_cvvCruce(B);
t(X.n===3,'cruce: 3 bobinas limpias (la sacada no cuenta) ('+X.n+')');
const f=e=>X.filas.find(x=>x.ext===e);
t(Math.abs(f(3).med)<1e-9,'EXT-03 0 %');t(Math.abs(f(7).med+0.02)<1e-9,'EXT-07 −2 %');t(Math.abs(f(1).med-0.02)<1e-9,'EXT-01 +2 %');
t(Math.abs(X.total)<1e-9,'total = mediana 0 %');
t(_cvvCrucePos(0)===50&&_cvvCrucePos(0.01)===60&&_cvvCrucePos(-0.2)===2,'posición en la barra (banda ±1 % = 40–60 %)');
const ch=_cvvCruceHTML(X);
t(ch.indexOf('EXT-07')>0&&ch.indexOf('−2,0 %')>0||ch.indexOf('-2,0 %')>0,'sección del cruce con EXT-07 −2 %');
t(_cvvCruceHTML(_cvvCruce([])).indexOf('Todavía no hay')>0,'cruce vacío: aviso');
// factor del cuentametros: bobina vieja del PLC (id ≤ 7306) se lleva al factor nuevo
const vieja=car(9,1,3,0,3,880,'06:00:00');vieja.bobinas_producidas={id:7000,numero_bobina:'BOB-9',extrusora_id:3,plc_cierre_id:55};
const nueva=car(10,1,3,985,3,880,'08:00:00');
const Bv=_cvvPstBobinas(Object.assign({},D,{cargas:[vieja,nueva]}));
t(Bv.length===1&&Math.abs(Bv[0].esp-1000*0.781/0.793)<0.01,'bobina vieja del PLC con el factor nuevo ('+(Bv[0]&&Bv[0].esp.toFixed(1))+')');
// 3) largo por golpe (con las bobinas terminadas de la OC) y golpes contra bobinas
const L=_cvvLargoMaq(B,1,10);
t(L&&L.n===2&&Math.round(L.ficha)===88,'largo: 2 bobinas limpias en C1 (la sacada no cuenta) ('+(L&&L.n)+')');
t(L&&Math.abs(L.cm-88*1000/990)<0.01,'largo = mediana de esperado/golpes × ficha ('+(L&&L.cm.toFixed(2))+')');
t(_cvvLargoMaq(B,1,99)===null,'otra OC: sin dato de largo');
const lh=_cvvLargoHTML({golpes:2000,gEsp:2100},{cm:92,ficha:88,n:5});
t(lh.indexOf('≈ 92 cm · ficha 88 · ¿corta largo?')>0&&lh.indexOf('5 bob.')>0,'largo 92 cm con ficha 88 → ¿corta largo?');
t(lh.indexOf('2.000 de 2.100')>0,'golpes vs bobinas 2.000 de 2.100');
const lh2=_cvvLargoHTML({golpes:2300,gEsp:2100},null);
t(lh2.indexOf('cortó más que lo escaneado')>0&&lh2.indexOf('badTxt')>0&&lh2.indexOf('Largo')<0,'más golpes que bobinas → cortó más; sin largo si no hay bobinas');
t(_cvvLargoHTML(null)===''&&_cvvLargoHTML({golpes:0,gEsp:10})==='','sin OC o sin golpes: nada');
// pista con bobina de otra OC ya pasada → libre
const Pv=_cvvPstMaq(Object.assign({},D,{est:[{maquina:1,contador:40000}]}),1);
const hv=_cvvPstHTML(Pv,77);
t(hv.indexOf('¿TERMINÓ?')<0&&hv.indexOf('libre')>0&&hv.indexOf('otra OC')>0,'bobina vieja de otra OC → pista libre, no ¿TERMINÓ?');
t(_cvvPstHTML(Pv,10).indexOf('¿TERMINÓ?')>0,'misma OC con golpes de más → sigue ¿TERMINÓ?');
// OC a 1 pista con 2 ocupadas: la que se pasó de golpes terminó
const Pf=_cvvPstMaq(Object.assign({},D,{est:[{maquina:1,contador:12300}]}),1);
const hf=_cvvPstHTML(Pf,10,1);
t(hf.indexOf('BOB-3 terminó · la OC va a 1 pista')>0&&hf.indexOf('¿TERMINÓ?')<0,'OC a 1 pista: la pasada de golpes queda libre');
t(_cvvPstHTML(Pf,10,2).indexOf('¿TERMINÓ?')>0,'OC a 2 pistas: sigue ¿TERMINÓ?');
// 4) C3 sin sensor
const oc=_cvvOtrasCards(D);
t(oc.indexOf('CORTE-3')>0&&oc.indexOf('Sin sensor')>0&&oc.indexOf('1 · 1.000 m')>0,'C3: sin sensor, 1 bobina 1.000 m');
t(oc.indexOf('CORTE-01')<0,'C1 no aparece como sin sensor');
console.log((bad?'MAL':'OK')+' smoke_cvv_completo: '+ok+' ok, '+bad+' mal');process.exit(bad?1:0);
