// 22z: la orden de corte que se corta en partes se dibuja en partes
const fs=require('fs');const src=fs.readFileSync(process.argv[2],'utf8');let f=0;const A=(c,m)=>{if(!c){f++;console.log('✗ '+m);}};
const i=src.indexOf('function _prgPartes(');eval(src.slice(i,src.indexOf('\n}\n',i)+2));
const m=x=>x*60000;
// caso real 20/11 CORTE-02: OC-1053158 17:12–17:36 y 21:36–23:24
let P=_prgPartes([{a:m(0),z:m(24),maq:2,emp:5},{a:m(264),z:m(372),maq:2,emp:2}],2,m(0),m(372));
A(P.length===2&&P[0].z===m(24)&&P[1].a===m(264),'dos partes separadas');
// tramos pegados (cambia el cortador) = una sola parte
P=_prgPartes([{a:m(0),z:m(30),maq:2,emp:5},{a:m(30),z:m(60),maq:2,emp:2}],2,m(0),m(60));A(P.length===1&&P[0].z===m(60),'cambio de cortador no parte la barra');
// tramos de otra cortadora no cuentan; sin tramos = barra corrida
P=_prgPartes([{a:m(0),z:m(30),maq:1,emp:5}],2,m(5),m(50));A(P.length===1&&P[0].a===m(5)&&P[0].z===m(50),'sin tramos propios: ini→fin');
A(/bars2\.sort\(\(a,b\)=>a\.ini-b\.ini\)\.forEach/.test(src)&&/sinCerrar\.add/.test(src)&&/↪/.test(src),'el Programa dibuja por partes');
console.log(f?('FALLÓ '+f):'OK prg_partes');process.exit(f?1:0);
