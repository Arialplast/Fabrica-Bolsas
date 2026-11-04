// 04g · Centro de producción · Semana: solape de una orden con los turnos de un día.
const fs=require('fs');const src=fs.readFileSync(process.argv[2]||(__dirname+'/../fabrica_bolsas_v6.html'),'utf8');
function cuerpo(fn){const m=new RegExp('^function '+fn+'\\(','m').exec(src);const j=src.indexOf('\nfunction ',m.index+10);return src.slice(m.index,j);}
eval(cuerpo('_cenHs')+'\n;'+cuerpo('_cenSolape')+'\n;'+cuerpo('_cenPct'));
let ok=0,fail=0;const t=(c,m)=>{if(c)ok++;else{fail++;console.log('FALLA',m);}};
const d0=new Date(2026,10,5,0,0,0);const L=h=>new Date(+d0+h*3600000);
t(_cenHs([{a:6,b:24}])===18,'turno D6 = 18 h');
t(Math.abs(_cenSolape(L(4),L(10),d0,[{a:6,b:24}])-4)<1e-9,'orden 4–10 con turno desde las 6 = 4 h');
t(Math.abs(_cenSolape(L(20),L(30),d0,[{a:0,b:24}])-4)<1e-9,'orden que sigue al otro día: 4 h este día');
t(_cenSolape(L(13),L(14),d0,[{a:0,b:12}])===0,'fuera del turno S12 = 0');
t(_cenPct(5,0)===Infinity&&_cenPct(0,0)===null&&_cenPct(9,18)===0.5,'porcentajes y «sin turno»');
console.log('smoke_centro_semana: '+ok+' ok, '+fail+' fallas');process.exit(fail?1:0);
