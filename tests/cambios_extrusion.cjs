// 13d: detección de cambios de tipo de bobina y tiempo perdido
const fs=require('fs');const src=fs.readFileSync(process.argv[2],'utf8');
function fn(name){const i=src.indexOf('function '+name+'(');if(i<0)throw new Error('falta '+name);let d=0,j=src.indexOf('{',i);for(let k=j;k<src.length;k++){if(src[k]==='{')d++;else if(src[k]==='}'){d--;if(!d)return src.slice(i,k+1);}}}
const CAM_COLORES=['NEGRA','NEGRO','BLANCA','BLANCO','VERDE','AZUL','ROJA','ROJO','AMARILLA','AMARILLO','NARANJA','GRIS','CELESTE','ROSA','VIOLETA','MARRON','CRISTAL','NATURAL','TRANSPARENTE'];
eval(fn('_camColor'));eval(fn('_camDetectar'));let fail=0;const ok=(c,m)=>{if(!c){fail++;console.log('✗ '+m);}};
ok(_camColor('BOBINA 60 CM 17MIC VERDE')==='VERDE','color verde');ok(_camColor('BOBINA  45CM  15MIC NEGRO')==='NEGRA','negro → NEGRA');ok(_camColor('BOBINA 80CM 35MIC NEGRA IMPRESA')==='NEGRA','negra impresa');ok(_camColor('BOBINA 50 CM 20MIC')==='NATURAL','sin color → natural');
const T={1:{color:'NEGRA',ancho:60,esp:20},2:{color:'VERDE',ancho:60,esp:20},3:{color:'NEGRA',ancho:80,esp:30}};const m=60000;let t=0;const R=[];
const add=(bob,min,fr)=>{t+=min*m;R.push({ext:1,bob,t,kg:30,fr:!!fr});};
add(1,0);add(1,30);add(1,30);add(1,30);          // tipo 1: ciclo 30
add(2,50,true);add(2,20);add(2,20);add(2,20);    // cambio a 2: 50 min, ciclo normal 20 → perdió 30
add(3,300);add(3,40);add(3,40);add(3,40);        // hueco de 5 h: no es cambio
add(1,35);                                       // vuelve a 1: 35 − 30 = 5
const X=_camDetectar(R,id=>T[id]);
ok(X.length===2,'2 cambios (el hueco de 5 h se descarta) → '+X.length);
ok(X[0].clase==='Solo color'&&Math.abs(X[0].perd-30)<1e-6&&X[0].fr===true,'cambio de color: perdió 30 min, primera fuera de rango');
ok(X[1].clase==='Ancho y espesor'&&Math.abs(X[1].perd-5)<1e-6,'vuelta a tipo 1: 5 min');
ok(X[0].colDe==='NEGRA'&&X[0].colA==='VERDE','colores de/a');
if(fail){console.log('FALLARON '+fail);process.exit(1);}console.log('✓ cambios_extrusion OK');
