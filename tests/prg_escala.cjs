// 23b: escala plegada del Programa
const fs=require('fs');const src=fs.readFileSync(process.argv[2],'utf8');let f=0;const A=(c,m)=>{if(!c){f++;console.log('✗ '+m);}};
const g=n=>{const i=src.indexOf('function '+n+'(');return src.slice(i,src.indexOf('\n}\n',i)+2);};
eval(src.slice(src.indexOf('function _prgInter('),src.indexOf('\n',src.indexOf('function _prgInter('))));eval(g('_prgEscala'));
const H=3600000;
// 96 h; planta parada de la hora 14 a la 56 (42 h) → se pliega a 1,5 h
const E=_prgEscala(0,96*H,[{a:14*H,z:56*H}],1.5*H);
A(Math.abs(E.horas-(96-42+1.5))<1e-9,'horas en pantalla: '+E.horas);
A(Math.abs(E.X(14*H)-14/55.5*100)<1e-6&&Math.abs(E.X(56*H)-15.5/55.5*100)<1e-6,'el fin de semana ocupa 1,5 h de ancho');
A(E.X(0)===0&&E.X(96*H)===100&&E.X(-5)===0,'extremos');
[5,14,30,56,70,96].forEach(h=>A(Math.abs(E.inv(E.X(h*H)/100)-h*H)<2,'ida y vuelta '+h+' h'));
A(E.X(20*H)<E.X(40*H),'monótona dentro del pliegue');
// sin paradas = lineal
const L=_prgEscala(0,10*H,[],1.5*H);A(Math.abs(L.X(5*H)-50)<1e-9&&Math.abs(L.inv(0.5)-5*H)<1,'lineal sin paradas');
// parada corta no se pliega
A(_prgEscala(0,10*H,[{a:2*H,z:4*H}],1.5*H).cortes.length===0,'parada corta no se pliega');
// intersección
const I=_prgInter([{a:0,z:10},{a:20,z:30}],[{a:5,z:25}]);A(I.length===2&&I[0].a===5&&I[0].z===10&&I[1].a===20&&I[1].z===25,'intersección');
A(/PRG\.inv\?PRG\.inv\(xPct\)/.test(src)&&/--prgw:/.test(src)&&/position:sticky;left:0/.test(src),'arrastre con la escala nueva, ancho fijo y nombres fijos');
console.log(f?('FALLÓ '+f):'OK prg_escala');process.exit(f?1:0);
