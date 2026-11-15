// 16d: horario libre en el rol + planes en la nube
const fs=require('fs');const src=fs.readFileSync(process.argv[2],'utf8');let k=0;const A=(c,t)=>{if(!c){console.error('✗ '+t);process.exit(1);}k++;};
const one=n=>eval('('+src.match(new RegExp('function '+n+'\\(.*\\}'))[0]+')');const multi=n=>eval('('+src.match(new RegExp('function '+n+'\\([^)]*\\)\\{[\\s\\S]*?\\n\\}'))[0]+')');
const H=one('_rolHorario'),HH=one('_rolHH'),HM=one('_rolHM'),U=multi('_pmpEscUnir');
let r=H(15,0);A(r.hs===9&&r.ex===0&&r.cruza===true,'15 a 24 son 9 horas normales');
r=H(6,17);A(r.hs===11&&r.n===9&&r.ex===2&&!r.cruza,'6 a 17 = 9 normales + 2 extra');
r=H(18,6);A(r.hs===12&&r.ex===3&&r.cruza,'18 a 6 cruza la medianoche: 9 + 3');
A(HH(15)==='15:00'&&HH(6.5)==='06:30'&&HH(24)==='00:00','formato de hora');
A(HM({hora_entrada:'15:00:00',hora_salida:'00:00:00'})==='15–24'&&HM({hora_entrada:'06:00:00',hora_salida:'15:00:00'})==='6–15','se muestra 15–24');
const a=[{t:'feriado'}];
A(U({sel:'A',A:a,B:[],C:[]},null).subir===true,'plan solo en el navegador: se sube');
A(U(null,{sel:'A',A:a,B:[],C:[],ts:5}).esc.A.length===1,'plan solo en la base: se lee');
let u=U({sel:'A',A:a,B:[],C:[]},{sel:'A',A:[],B:[],C:[],ts:9});A(u.esc.A.length===1&&u.subir,'un escenario vacío no pisa uno con acciones');
u=U({sel:'A',A:a,B:[],C:[],ts:3},{sel:'B',A:[{t:'x'},{t:'y'}],B:[],C:[],ts:9});A(u.esc.A.length===2&&!u.subir,'gana lo más nuevo');
u=U({sel:'A',A:a,B:[],C:[],ts:12},{sel:'B',A:[{t:'x'},{t:'y'}],B:[],C:[],ts:9});A(u.esc.A.length===1&&u.subir,'si el navegador es más nuevo, se sube');
A(U(null,null).esc.sel==='A','sin nada: plan vacío');
A(/value="H">⏱ Otro horario/.test(src)&&/from\('turnos'\)\.insert/.test(src),'opción en el rol');
console.log('✓ rol_horario '+k+' ok');
