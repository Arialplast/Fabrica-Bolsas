// smoke 22p — 🎈 Inflador EXT-03 (estado, sincronía con el PLC, perillas, resumen)
// uso: TZ=America/Argentina/Buenos_Aires node tests/smoke_inflador.cjs fabrica_bolsas_v6.html
const fs=require('fs');const src=fs.readFileSync(process.argv[2]||'fabrica_bolsas_v6.html','utf8');
const a=src.indexOf('// ===== 🎈 INFLADOR EXT-03 (22p) =====');const b=src.indexOf('function _ifxKnobPinta(');
if(a<0||b<a){console.log('FALTA el bloque');process.exit(1);}
let ok=0,bad=0;const t=(c,m)=>{if(c)ok++;else{bad++;console.log('✗ '+m);}};
eval(src.slice(a,b).replace('const IFX=','global.IFX=').replace('const IFX_K=','global.IFX_K=').replace('const IFX_VIEJO_S=','global.IFX_VIEJO_S='));
const T=s=>new Date('2026-11-20T'+s+'-03:00').getTime();
const ahora=T('10:00:00');
const E=o=>Object.assign({actualizado_en:new Date(ahora-2000).toISOString(),habilitado:1,t_inflar_ds:50,t_pausa_ds:50,max_ciclos:6,seguidas:0,alarma:false,total:40,sensor:1,valvula:0,cfg_version:1,cfg_estado:'ok'},o||{});
const Cf=o=>Object.assign({maquina:'EXT-03',habilitado:true,t_inflar_ds:50,t_pausa_ds:50,max_ciclos:6,version:1},o||{});
// estado
t(_ifxSt(null,ahora).k==='sin','sin registrador = sin datos');
t(_ifxSt(E({actualizado_en:new Date(ahora-60000).toISOString()}),ahora).k==='sin','dato de hace 1 min = sin datos');
t(_ifxSt(E(),ahora).k==='ok'&&_ifxSt(E(),ahora).t==='VIGILANDO','con film = vigilando');
t(_ifxSt(E({sensor:0}),ahora).k==='warn','sin film = ámbar');
t(_ifxSt(E({sensor:0,valvula:1,seguidas:2}),ahora).t==='INFLANDO'&&/intento 3 de 6/.test(_ifxSt(E({sensor:0,valvula:1,seguidas:2}),ahora).d),'válvula abierta = inflando, intento 3 de 6');
t(_ifxSt(E({sensor:0,alarma:true,seguidas:6}),ahora).k==='bad','alarma');
t(_ifxSt(E({sensor:0,alarma:true,valvula:1}),ahora).k==='bad','la alarma gana a todo');
t(_ifxSt(E({habilitado:0,sensor:0}),ahora).k==='off','deshabilitado');
t(_ifxSt(E({sensor:null,valvula:null}),ahora).k==='ok','sin luces X10/Y0 no rompe');
// sincronía
t(_ifxSync(Cf(),E(),ahora).k==='ok','PLC = ajuste → ok');
t(_ifxSync(Cf({max_ciclos:12,version:2}),E(),ahora).k==='pend','distinto → pendiente');
t(_ifxSync(Cf({max_ciclos:12,version:2}),E({cfg_estado:'error: el PLC 2 no tomo el ajuste (3 intentos)'}),ahora).k==='bad','error del registrador');
t(_ifxSync(Cf({habilitado:false}),E(),ahora).k==='pend'&&_ifxSync(Cf({habilitado:false}),E({habilitado:0}),ahora).k==='ok','habilitado se compara como sí/no');
t(_ifxSync(Cf(),null,ahora).k==='sin'&&_ifxSync(Cf(),E({actualizado_en:new Date(ahora-90000).toISOString()}),ahora).k==='sin','sin datos → no dice ok');
t(_ifxSync(null,E(),ahora).k==='sin','sin config');
// perillas
t(_ifxAj('ti',52)===50&&_ifxAj('ti',53)===55&&_ifxAj('ti',3)===10&&_ifxAj('ti',999)===200,'infla: pasos de 0,5 s, 1 a 20 s');
t(_ifxAj('tp',601)===600&&_ifxAj('tp',0)===10,'pausa: 1 a 60 s');
t(_ifxAj('mx',2)===3&&_ifxAj('mx',31)===30&&_ifxAj('mx',11.6)===12,'intentos: 3 a 30');
t(_ifxAng('mx',3)===-135&&_ifxAng('mx',30)===135&&Math.abs(_ifxAng('ti',105))<1e-9,'ángulos de extremo a extremo');
t(_ifxValDeAng('mx',-135)===3&&_ifxValDeAng('mx',135)===30&&_ifxValDeAng('mx',0)===17,'ángulo → valor ('+_ifxValDeAng('mx',0)+')');
t(_ifxValDeAng('ti',170)===200&&_ifxValDeAng('ti',-170)===10,'zona muerta de abajo se pega al extremo');
['ti','tp','mx'].forEach(k=>{const K=IFX_K[k];let bien=true;for(let v=K.min;v<=K.max;v+=K.step)if(_ifxValDeAng(k,_ifxAng(k,v))!==v)bien=false;t(bien,'ida y vuelta '+k);});
t(_ifxTxt('ti',50)==='5,0'&&_ifxTxt('ti',45)==='4,5'&&_ifxTxt('mx',12)==='12','texto de las perillas');
// resumen
t(_ifxHastaAlarma(50,50,6)===2+30+25,'6 × 5 s + 5 pausas de 5 s + 2 s = 57 s');
t(_ifxHastaAlarma(50,50,12)===117&&_ifxDur(117)==='1 min 57 s'&&_ifxDur(60)==='1 min'&&_ifxDur(45)==='45 s','12 intentos = 1 min 57 s');
// histograma
const H=[{hora:new Date(T('09:00:00')).toISOString(),infladas:7,min_alarma:2,min_sin_film:5},{hora:new Date(T('10:00:00')).toISOString(),infladas:'3',min_alarma:0,min_sin_film:1},
         {hora:new Date(T('05:00:00')).toISOString(),infladas:4,min_alarma:0,min_sin_film:0}];
const B=_ifxBarras(H,T('10:20:00'));
t(B.length===24&&B[23].n===3&&B[22].n===7&&B[22].al===2&&B[18].n===4&&B[0].dato===false,'24 barras, la última es la hora en curso');
t(_ifxHoy0(T('10:20:00'))===T('06:00:00')&&_ifxHoy0(T('03:00:00'))===T('06:00:00')-86400000,'hoy = desde las 06:00');
const s=_ifxSuma(H,_ifxHoy0(T('10:20:00')));t(s.n===10&&s.al===2,'hoy: 10 infladas, 2 min en alarma (la de las 05 no cuenta)');
// dibujo
t((_ifxAnilloSVG(2,6,false).match(/class="on"/g)||[]).length===2&&(_ifxAnilloSVG(2,6,false).match(/<path/g)||[]).length===6,'anillo: 2 de 6 encendidos');
t((_ifxAnilloSVG(6,6,true).match(/on bad/g)||[]).length===6&&(_ifxAnilloSVG(9,6,false).match(/<path/g)||[]).length===6,'anillo en alarma, y no se pasa del máximo');
t((_ifxAnilloSVG(0,30,false).match(/<path/g)||[]).length===30&&!/NaN/.test(_ifxAnilloSVG(0,30,false)+_ifxKnobSVG('mx',3)+_ifxKnobSVG('tp',600)),'30 segmentos y perillas sin NaN');
t(!/class="va"/.test(_ifxKnobSVG('mx',3))&&/class="va"/.test(_ifxKnobSVG('mx',4)),'en el mínimo no hay arco');
console.log(ok+' bien, '+bad+' mal');process.exit(bad?1:0);
