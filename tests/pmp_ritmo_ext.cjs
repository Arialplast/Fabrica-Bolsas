// 23e: arrancar una extrusora tiene que SUMAR capacidad al plan
const fs=require('fs');const src=fs.readFileSync(process.argv[2],'utf8');let f=0;const A=(c,m)=>{if(!c){f++;console.log('✗ '+m);}};
const i=src.indexOf('function _pmpRitmoExt(');eval(src.slice(i,src.indexOf('\n}\n',i)+2));
const H=480;   // horas de jornada por máquina en 28 días
const tres=[{id:1,nom:'EXT-01',kg:9600,dias:20,ficha:30},{id:3,nom:'EXT-03',kg:10400,dias:20,ficha:40},{id:7,nom:'EXT-07',kg:11200,dias:20,ficha:40}];
const a=_pmpRitmoExt(tres,H,5);
A(Math.abs(a.rE-31200/(480*3))<1e-9&&a.nuevas.length===0,'tres máquinas con historia: ritmo medido');
// caso real 20/11: arranca EXT-02 (ficha 18) con 3 bobinas en un día
const b=_pmpRitmoExt(tres.concat([{id:2,nom:'EXT-02',kg:150,dias:1,ficha:18,desde:'2026-11-20'}]),H,5);
A(b.nEst===3&&b.nuevas.length===1&&b.nuevas[0].id===2,'EXT-02 es nueva');
A(Math.abs(b.rEst-a.rE)<1e-9,'el ritmo de las que tienen historia NO se diluye');
A(b.rE*4>a.rE*3+1,'la capacidad total sube al arrancar: '+(b.rE*4).toFixed(1)+' > '+(a.rE*3).toFixed(1)+' kg/h');
A(Math.abs(b.nuevas[0].r-18*b.ratio)<1e-9&&b.ratio>0.5&&b.ratio<0.7,'estimada = ficha × rendimiento de las otras ('+b.ratio.toFixed(2)+')');
// a los 5 días con producción pasa a medida
const c=_pmpRitmoExt(tres.concat([{id:2,kg:1300,dias:5,ficha:18}]),H,5);A(c.nEst===4&&c.nuevas.length===0,'con 5 días ya es medida');
// sin historia de nadie no rompe
const d=_pmpRitmoExt([{id:2,kg:100,dias:1,ficha:18}],H,5);A(d.rE>0&&isFinite(d.rE),'sin máquinas con historia: cae al cálculo simple');
A(/const hExt28=hMaq28\*Math\.max\(1,RX\.nEst\);const rE=RX\.rE;/.test(src),'el plan usa el ritmo nuevo');
A(/✅ hecha · en marcha/.test(src)&&/ya está hecha<\/b>: esa extrusora está en marcha/.test(src),'la acción ejecutada se muestra como hecha');
A(/usoTxt='estimada'/.test(src),'el Plan de recursos estima la recién arrancada');
console.log(f?('FALLÓ '+f):'OK pmp_ritmo_ext');process.exit(f?1:0);
