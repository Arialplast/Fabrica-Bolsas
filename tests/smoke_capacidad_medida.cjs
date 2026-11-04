// 02n: ⚙ capacidad medida — simulación de una OE en varias máquinas con calendario por máquina.
const fs=require('fs');const src=fs.readFileSync(process.argv[2]||(__dirname+'/../fabrica_bolsas_v6.html'),'utf8');
function bloque(ini,fin){const i=src.indexOf(ini);const j=src.indexOf(fin,i);if(i<0||j<0)throw new Error('no encuentro '+ini);return src.slice(i,j);}
eval(bloque('function _capSimular(','// Pura: factor por máquina'));
let ok=0,fail=0;const t=(c,m)=>{if(c)ok++;else{fail++;console.log('FALLA',m);}};
const L=(y,m,d,h)=>new Date(y,m-1,d,h||0,0,0);
const cal24=()=>[{a:0,b:24}];
// 1 máquina 30 kg/h, 24 h, 300 kg → 10 h
let r=_capSimular([{id:1,kgh:30,desde:L(2026,11,2,6)}],300,cal24);
t(r&&r.fin.getTime()===L(2026,11,2,16).getTime(),'1 máq: 6+10 h = 16:00 → '+(r&&r.fin));
// 2 máquinas juntas 30 + 20 → 300 kg en 6 h
r=_capSimular([{id:1,kgh:30,desde:L(2026,11,2,6)},{id:2,kgh:20,desde:L(2026,11,2,6)}],300,cal24);
t(r&&r.fin.getTime()===L(2026,11,2,12).getTime(),'2 máq: 12:00');
t(r&&Math.abs(r.porMaq[1].kg-180)<1e-6&&Math.abs(r.porMaq[2].kg-120)<1e-6,'reparto 180/120');
// la 2ª se suma cuando se libera (10:00): 4 h × 30 = 120; quedan 180 a 50 kg/h = 3,6 h → 13:36
r=_capSimular([{id:1,kgh:30,desde:L(2026,11,2,6)},{id:2,kgh:20,desde:L(2026,11,2,10)}],300,cal24);
t(r&&Math.abs(r.fin-L(2026,11,2,13).getTime()-36*60000)<1000,'se suma al liberarse: 13:36 → '+(r&&r.fin));
// calendario por máquina: la 2 sólo de 6 a 12 el día 2
const calM=(id,d)=>id===2?(d.getDate()===2?[{a:6,b:12}]:[]):[{a:0,b:24}];
r=_capSimular([{id:1,kgh:10,desde:L(2026,11,2,6)},{id:2,kgh:10,desde:L(2026,11,2,6)}],200,calM);
// 6–12: 20 kg/h × 6 = 120; luego 80 kg a 10 kg/h = 8 h → 20:00
t(r&&r.fin.getTime()===L(2026,11,2,20).getTime(),'calendario por máquina → 20:00 · '+(r&&r.fin));
// fin de semana sin horas: viernes 20 h, salta al lunes 6
const calSem=(id,d)=>{const w=d.getDay();return w===0?[]:w===6?[{a:0,b:12}]:w===1?[{a:6,b:24}]:[{a:0,b:24}];};
r=_capSimular([{id:1,kgh:10,desde:L(2026,11,6,20)}],40+120+20,calSem);   // vie 20–24 (40) + sáb 0–12 (120) + lun 6–8 (20)
t(r&&r.fin.getTime()===L(2026,11,9,8).getTime(),'cruza el fin de semana → lun 8:00 · '+(r&&r.fin));
t(_capSimular([{id:1,kgh:0,desde:L(2026,11,2)}],10,cal24)===null,'sin kg/h → null');
console.log('smoke_capacidad_medida: '+ok+' ok, '+fail+' fallas');process.exit(fail?1:0);
