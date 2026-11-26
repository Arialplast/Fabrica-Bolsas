// smoke 23n — 🧵 Pistas medidas (Panel corte) y Control de corte (dueño)
// uso: TZ=America/Argentina/Buenos_Aires node tests/pistas_medidas.cjs fabrica_bolsas_v6.html
const fs=require('fs');const src=fs.readFileSync(process.argv[2]||'fabrica_bolsas_v6.html','utf8');
const a=src.indexOf('// ===== 🧵 PISTAS MEDIDAS (23n)'),b=src.indexOf('// ===== 🎈 INFLADOR EXT-03 (22p) =====');
if(a<0||b<a){console.log('FALTA el bloque');process.exit(1);}
let ok=0,bad=0;const t=(c,m)=>{if(c)ok++;else{bad++;console.log('✗ '+m);}};
global.PST={UMB:0.03,SOBRA:0.10,est:{}};global.CVV={maqs:[1,2]};
global._cvvHM=min=>{min=Math.round(min);return min>=60?Math.floor(min/60)+' h '+String(min%60).padStart(2,'0'):min+' min';};
global._plcHora=iso=>{const d=new Date(iso);return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');};
global._cvvMaqNom=id=>'CORTE-0'+id;global._evvF=n=>n==null?'—':Math.round(n).toLocaleString('es-AR');
eval(src.slice(a,b).replace('const SNS=','global.SNS=').replace('const SNS_E=','global.SNS_E=').replace('const SNS_AL=','global.SNS_AL=').replace('const CTL=','global.CTL='));
const T=s=>new Date('2026-11-24T'+s+'-03:00').getTime(),I=s=>new Date(T(s)).toISOString();
const ahora=T('10:00:00');
const E=(m,p,e,desde,g,act)=>({maquina:m,pista:p,estado:e,desde:I(desde),actualizado_en:act||new Date(ahora-3000).toISOString(),golpes:g,golpes_desde:g-50,cortina:0});
// dato vivo / viejo
t(_snsVivo([E(1,3,'C','09:50:00',5000)],1,3,ahora)!=null,'dato de hace 3 s = vivo');
t(_snsVivo([E(1,3,'C','09:50:00',5000,I('09:57:00'))],1,3,ahora)===null,'dato de hace 3 min = sin datos');
t(_snsFresco([E(1,3,'C','09:50:00',5000)],1,ahora)&&!_snsFresco([E(1,3,'C','09:50:00',5000)],2,ahora),'fresco por máquina');
// bolsas: vista por minuto, vivo adelante sólo si corta y está en curso
const B={ocb_id:7,golpes_carga:4000,bolsas_sensor:950,estado:'en_curso'};
t(_snsBolsas(B,E(1,3,'C','09:50:00',5000))===1000,'cortando: vivo (golpes − carga) adelante de la vista');
t(_snsBolsas(B,E(1,3,'Q','09:50:00',5600))===950,'quieta: vale la vista (hasta el último movimiento), no los golpes');
t(_snsBolsas(Object.assign({},B,{estado:'ok'}),E(1,3,'C','09:50:00',9000))===950,'bobina terminada: no suma lo que corta la siguiente');
t(_snsBolsas({estado:'sin_sensor',bolsas_sensor:0},null)===null&&_snsBolsas(null,null)===null,'sin sensor = null (cae a golpes)');
// pista del panel
const o={p:3,c:{id:7},esp:2000},S={est:[E(1,3,'Q','09:55:00',5600)],bob:[B]};
let r=_snsPista(o,1,S,ahora);t(r.quieta&&r.g===950&&Math.abs(r.frac-0.475)<1e-9,'pista con bobina quieta 5 min = quieta, con las bolsas del sensor');
S.est=[E(1,3,'Q','09:59:00',5600)];t(!_snsPista(o,1,S,ahora).quieta,'quieta 1 min todavía no avisa');
S.est=[E(1,3,'Q','09:40:00',5600)];S.bob=[Object.assign({},B,{bolsas_sensor:1990})];t(!_snsPista(o,1,S,ahora).quieta,'quieta con la bobina ya terminada no es alarma');
t(_snsPista({p:1,vacia:true},1,{est:[E(1,1,'Q','09:00:00',5600)],bob:[]},ahora).sinBob===false,'pista sin uso (golpes sin cortina, sin bobina) no avisa');
t(_snsPista({p:1,vacia:true},1,{est:[E(1,1,'C','09:59:00',5600)],bob:[]},ahora).sinBob===true,'pista vacía cortando = sin bobina escaneada');
t(_snsPista(o,2,S,ahora)===null,'otra máquina sin datos = null');
// alarmas del operario
const AL=[{maquina:1,pista:4,tipo:'CAMBIO_SIN_ESCANEO',severidad:'alta',desde:I('09:40:00'),activa:true},{maquina:1,pista:3,tipo:'PISTA_NO_ALIMENTA',severidad:'media',desde:I('09:58:00'),activa:true},
  {maquina:1,pista:2,tipo:'ENGANCHE',severidad:'info',desde:I('09:30:00'),activa:false},{maquina:1,pista:1,tipo:'BOBINA_PASADA',severidad:'alta',desde:I('09:00:00'),activa:true}];
t(_snsAlarmaMaq(AL,1,[],{}).tipo==='CAMBIO_SIN_ESCANEO','gana la alta');
t(_snsAlarmaMaq(AL,1,[{pista:4,pista_en:I('09:52:00')}],{}).tipo==='PISTA_NO_ALIMENTA','escaneo posterior en esa pista la apaga');
t(_snsAlarmaMaq(AL,1,[{pista:4,pista_en:I('09:30:00')}],{}).tipo==='PISTA_NO_ALIMENTA','escaneo hasta 15 min antes también cuenta (escaneó y después enhebró)');
t(_snsAlarmaMaq(AL,1,[{pista:4,pista_en:I('09:10:00')}],{}).tipo==='CAMBIO_SIN_ESCANEO','escaneo viejo no la apaga');
t(_snsAlarmaMaq(AL,2,[],{})===null,'otra máquina: nada');
t(_snsAlarmaMaq(AL,1,[],{[_snsAlKey(AL[0])]:1,[_snsAlKey(AL[1])]:1})===null,'reconocidas: nada (bobina pasada y enganche no van al cartel)');
// tramos y huecos
const ev=(m,p,e,i,f,gi,gf)=>({maquina:m,pista:p,estado:e,inicio:I(i),fin:I(f),golpes_ini:gi,golpes_fin:gf});
const EV=[ev(1,3,'C','06:30:00','07:30:00',100,1900),ev(1,3,'P','07:30:00','07:40:00',1900,1900),ev(1,3,'C','08:10:00','09:00:00',1900,3400),ev(1,3,'C','09:30:00','09:50:00',3700,4300),
  ev(1,4,'C','06:30:00','07:00:00',100,1000),ev(1,4,'Q','07:00:00','07:02:00',1000,1060),ev(1,4,'C','07:02:00','07:30:00',1060,1900),ev(1,4,'Q','08:10:00','09:00:00',1900,3400),
  ev(1,1,'Q','06:30:00','07:30:00',100,1900)];
const t0=T('06:00:00'),L=_ctlTramos(EV,[E(1,3,'C','09:50:00',4600)],t0,ahora,[1],{1:{3:100,4:100}});
const l3=L[1][3].map(s=>s.e).join('');
t(l3==='PCPPCXCC','pista 3: hueco inicial sin golpes = parada, hueco con golpes = sin datos, tramo vivo al final ('+l3+')');
t(L[1][3][L[1][3].length-1].vivo&&Math.round(L[1][3][L[1][3].length-1].g)===50,'tramo vivo con sus golpes');
t(_ctlTramos(EV,[],t0,ahora,[1],{})[1][3][0].e==='X','sin contador previo el hueco inicial es sin datos');
t(_ctlTramos([ev(1,3,'C','05:00:00','07:00:00',0,1200)],[],t0,ahora,[1],{})[1][3][0].g===600,'tramo recortado en t0: golpes prorrateados');
t(_ctlTramos([ev(1,3,'P','00:00:00','00:10:00',5,5),ev(1,3,'P','09:00:00','09:10:00',5,5)],[],T('00:00:00'),ahora,[1],{})[1][3][1].e==='X','hueco de más de 6 h = sin datos aunque no haya golpes');
// resumen de máquina
const R=_ctlMaq(L[1],t0,ahora);
t(R.act.join()==='3,4','pistas en uso: las que cortaron 5 min o más (la 1, sólo golpes, no)');
t(R.porPista[4].b===1800,'pista 4: tramos cortando + enganche de 2 min entre dos tramos (1.800), no la hora quieta');
t(R.porPista[3].b===1800+1500+600+50,'pista 3: suma de sus tramos cortando');
t(Math.round(R.media/60000)===82,'a media máquina: la 3 corta y la 4 no (2 min de enganche + 50 quieta + 30 sin cortar) → '+Math.round(R.media/60000));
t(Math.round(R.sinDatos/60000)===30,'sin datos 30 min (09:00–09:30)');
t(Math.round(R.cort/60000)===60+50+20+10,'cortando 140 min');
t(Math.round((R.cort+R.parada+R.sinDatos+R.vacio)/60000)===240,'cortando + parada + sin datos + golpes sin alimentar = período');
// bobinas, exceso, semáforo, resolución
const BO=[{maquina:1,pista:3,carga_en:I('05:00:00'),prox_carga_en:I('05:30:00'),estado:'ok',bolsas_sensor:1000,bolsas_esperadas:1000},
  {maquina:1,pista:3,carga_en:I('05:30:00'),prox_carga_en:I('07:00:00'),estado:'alto',bolsas_sensor:1700,bolsas_esperadas:1000},
  {maquina:1,pista:3,carga_en:I('07:00:00'),prox_carga_en:null,estado:'en_curso',bolsas_sensor:1040,bolsas_esperadas:1000},
  {maquina:1,pista:4,carga_en:I('09:45:00'),prox_carga_en:null,estado:'en_curso',bolsas_sensor:10,bolsas_esperadas:1000}];
const BP=_ctlBobinas(BO,t0);
t(BP.length===3,'bobinas del período: las cargadas desde t0 y las que venían corriendo');
t(_ctlExceso(BP)===700,'sin bobina escaneada = lo medido de más sobre los metros (sólo las que pasan de 105 %)');
t(_ctlSem(0.8)==='ok'&&_ctlSem(-2.5)==='warn'&&_ctlSem(3.4)==='bad','semáforo de OC: 1 % / 3 %');
t(/escaneo 09:45 · 5 min después/.test(_ctlResol(AL[0],BO).t),'cambio sin escanear resuelto por el escaneo siguiente ('+_ctlResol(AL[0],BO).t+')');
t(_ctlResol({tipo:'CAMBIO_SIN_ESCANEO',maquina:2,pista:1,desde:I('09:00:00'),activa:false},BO).t==='sin escaneo','sin escaneo');
t(_ctlResol({tipo:'ENGANCHE',desde:I('09:00:00'),hasta:I('09:00:21')},BO).t==='sola, a los 21 s','enganche');
console.log(ok+' ok, '+bad+' fallas');process.exit(bad?1:0);
