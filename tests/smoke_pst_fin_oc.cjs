// 04b: el fin de una bobina se corta en el último golpe de su OC si la siguiente en la pista es de otra OC
const fs=require('fs');const src=fs.readFileSync(__dirname+'/../fabrica_bolsas_v6.html','utf8');
let ok=0,mal=0;const t=(c,m)=>{if(c)ok++;else{mal++;console.log('MAL',m);}};
const i=src.indexOf('function _pstCierre(');const j=src.indexOf('\nfunction ',i+10);
const PST={UMB:0.03};const _cvvMetros=c=>c.m;const _pstOcNro=x=>'OC-'+x.orden_corte_id;
const f=new Function('PST','_cvvMetros','_pstOcNro',src.slice(i,j)+';return _pstCierre;')(PST,_cvvMetros,_pstOcNro);
const B=(oc,p,c,m)=>({orden_corte_id:oc,maquina_id:2,pista:p,pista_contador:c,m,bobinas_producidas:{numero_bobina:'B'+oc+p+c}});
const cargas=[B(952,1,444937,1200),B(952,2,444937,1200),B(952,3,444937,1200),B(952,4,444937,1300),
  B(1099,1,446368,1500),B(1099,2,446368,1500),B(1072,3,452949,1500),B(1072,4,452949,1500)];
const r=f(cargas,952,{2:446368},0.88);
const p3=r.filas.find(x=>x.pista===3),p4=r.filas.find(x=>x.pista===4);
t(p3.g===1431,'pista 3 cortada al fin de la OC: '+p3.g);
t(p4.g===1431,'pista 4 cortada al fin de la OC: '+p4.g);
t(Math.abs(r.cortP-5523)<2,'cortadas por pistas 5.523: '+Math.round(r.cortP));
// misma OC sigue: no se corta
const r2=f([B(5,1,100,880),B(5,1,1100,880)],5,{2:2000},0.88);
t(r2.filas[0].g===1000,'sig misma OC usa su contador');
// concurrente: otra OC entra antes del fin → no se corta
const r3=f([B(7,3,1000,1100),B(8,1,1200,880),B(8,3,2500,880)],7,{2:1100},0.88);
t(r3.filas[0].g===1500,'concurrente usa el contador de la siguiente: '+r3.filas[0].g);
console.log(ok+' ok, '+mal+' mal');process.exit(mal?1:0);
