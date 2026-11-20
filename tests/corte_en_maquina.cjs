// 22y: lo que está puesto en la cortadora la ocupa hasta que se termine de cortar
const fs=require('fs');const src=fs.readFileSync(process.argv[2],'utf8');let f=0;const A=(c,m)=>{if(!c){f++;console.log('✗ '+m);}};
const fn=n=>{const i=src.indexOf('function '+n+'(');const j=src.indexOf('\n}\n',i);return src.slice(i,j+2);};
eval(fn('_corteCargaEnCurso'));eval(fn('_corteMarcarEnCurso'));eval(fn('_corteMotorFino'));
const H=3600000,t0=Date.UTC(2026,10,20,18,0);  // "ahora"
// caso real C2 20/11: 4 bobinas cargadas juntas 54 min antes, ~27 min cada una → 106 min: quedan ~52
let X=_corteCargaEnCurso([0,0,0,0].map((_,i)=>({t:t0-54*60000,maq:2,emp:5,oc:158,h:[27,27,26,26][i]/60,viva:true})),t0);
A(X[2]&&X[2].oc===158&&Math.abs((X[2].hasta-t0)/60000-52)<1,'quedan ~52 min de corte en C2: '+(X[2]?(X[2].hasta-t0)/60000:'nada'));
// ya se gastó → libre
X=_corteCargaEnCurso([{t:t0-2*H,maq:1,emp:1,oc:9,h:0.4,viva:true}],t0);A(!X[1],'bobina vieja: máquina libre');
// la última orden ya no está viva (terminó el corte / cerrada) → libre
X=_corteCargaEnCurso([{t:t0-10*60000,maq:1,emp:1,oc:9,h:1,viva:false}],t0);A(!X[1],'orden con corte terminado no ocupa');
// encadena: cargas separadas no se superponen
X=_corteCargaEnCurso([{t:t0-90*60000,maq:3,emp:1,oc:7,h:0.5,viva:true},{t:t0-20*60000,maq:3,emp:1,oc:7,h:0.5,viva:true}],t0);
A(X[3]&&Math.abs((X[3].hasta-t0)/60000-10)<0.01,'la segunda arranca cuando se cargó: quedan 10 min');
// marcar: la orden en máquina arranca ahora y no termina antes de gastar lo puesto
const S={158:{ini:new Date(t0+2*H),fin:new Date(t0+3*H),seg:[]},141:{ini:new Date(t0),fin:new Date(t0),seg:[]}};
_corteMarcarEnCurso(S,{2:{hasta:t0+52*60000,oc:158,emp:5,desde:t0-54*60000},1:{hasta:t0+30*60000,oc:141,emp:1,desde:t0}},t0);
A(+S[158].ini===t0&&+S[158].fin===t0+3*H&&S[158].seg[0].maq===2,'158 arranca ahora y conserva su fin');
A(+S[141].fin===t0+30*60000,'orden sin resto termina cuando gasta lo puesto');
// motor: con la máquina ocupada 52 min, la orden siguiente NO arranca ahora
const grid={t0,paso:30*60000,p:Array.from({length:20},()=>['c5'])};
const R=_corteMotorFino([{id:155,rest:1500,maqs:[{id:2,bph:5000}],rel:t0}],grid,{2:t0+52*60000},{});
A(R[155].ini>=t0+52*60000-1,'la siguiente arranca cuando se libera: +'+Math.round((R[155].ini-t0)/60000)+' min');
A(Math.abs((R[155].fin-R[155].ini)/60000-18)<0.5,'y dura lo suyo (18 min)');
A(/_corteMarcarEnCurso\(F,_enMaq,ahora\.getTime\(\)\)/.test(src)&&/_finoLibre\[m\]=Math\.max\(_finoLibre\[m\]\|\|0,x\.hasta\)/.test(src),'el cronograma usa la ocupación');
console.log(f?('FALLÓ '+f):'OK corte_en_maquina');process.exit(f?1:0);
