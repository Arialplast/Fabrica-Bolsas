// 22p: el motor fino respeta dónde está cada cortador
const fs=require('fs');const src=fs.readFileSync(process.argv[2],'utf8');let n=0;const A=(c,t)=>{if(!c){console.error('✗ '+t);process.exit(1);}n++;};
const i=src.indexOf('function _corteMotorFino(');const j=src.indexOf('\n}\n',i);eval(src.slice(i,j+2));
const paso=1800000,t0=Date.UTC(2026,10,19,12,0);const G={t0,paso,p:Array.from({length:8},()=>['A','B'])};
const ocs=[{id:1,rest:20000,rel:0,maqs:[{id:1,bph:4000}]},{id:2,rest:20000,rel:0,maqs:[{id:2,bph:5000}]}];
let S=_corteMotorFino(ocs,G,{},{});const e1=S[1].seg[0].emp;
S=_corteMotorFino(ocs,G,{},{prevIni:{1:'B',2:'A'}});A(S[1].seg[0].emp==='B'&&S[2].seg[0].emp==='A','arranca con cada uno en la máquina donde está');
A(S[1].seg.every(x=>x.emp==='B'),'no lo rota sin motivo');
S=_corteMotorFino(ocs,G,{},{prevIni:{1:'Z'}});A(S[1].seg[0].emp!=='Z','si el que estaba no está en el Rol, no lo inventa');
A(/prevIni=_corteDondeEstan\(\)\.porMaq/.test(src),'se alimenta de las cargas del panel');
console.log('✓ motor_fino_donde '+n+' ok');
