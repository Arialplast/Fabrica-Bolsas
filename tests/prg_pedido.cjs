// 23h: cada orden con su pedido y regla «terminar el pedido»
const fs=require('fs');const src=fs.readFileSync(process.argv[2],'utf8');let f=0;const A=(c,m)=>{if(!c){f++;console.log('✗ '+m);}};
const g=n=>{const i=src.indexOf('function '+n+'(');const j=src.indexOf('\n',i);const k=src.indexOf('\n}\n',i);const one=src.slice(i,j);return one.trim().endsWith('}')?one:src.slice(i,k+2);};
eval(g('_prgPedCorto'));eval(g('_prgPedEmpezado'));eval(g('_prgPedAvance'));
A(_prgPedCorto('PED-06185')==='P-6185'&&_prgPedCorto('PED-00012')==='P-12','número corto del pedido');
const T=[{oc:{id:1,estado:'Completada'}},{oc:{id:2,estado:'Pendiente'}},{oc:{id:3,estado:'Pendiente'}},{oc:null}];
A(_prgPedEmpezado(T,{})&&!_prgPedEmpezado([{oc:{id:2,estado:'Pendiente'}}],{}),'pedido empezado si alguna medida está hecha');
A(_prgPedEmpezado([{oc:{id:2,estado:'Pendiente'}}],{2:{pctAvance:30}}),'o con avance');
const av=_prgPedAvance(T,{3:{pctAvance:100}});A(av.n===2&&av.tot===3,'2 de 3 medidas cortadas: '+av.n+'/'+av.tot);
// regla: a igual día, primero el pedido ya empezado; las medidas de un pedido, juntas
const D=86400000,t0=Date.UTC(2026,10,30,15);
const C={ord_corte:[10,11,12,13].map(id=>({id})),ordenes:[]};const _cliClase=()=>'B';const _oesDeOC=()=>[];const _ordDuracion=()=>({estHs:2});
eval(g('_prgReglasOrden'));
const pedA={promesa:new Date(t0+10*D),cliId:1,tandas:[{oc:{id:99,estado:'Completada'}},{oc:{id:11,estado:'Pendiente'}},{oc:{id:13,estado:'Pendiente'}}]};
const pedB={promesa:new Date(t0+10*D),cliId:2,tandas:[{oc:{id:10,estado:'Pendiente'}},{oc:{id:12,estado:'Pendiente'}}]};
const far=new Date(Date.now()+20*D);const RC={};[10,11,12,13].forEach((id,i)=>RC[id]={ini:far,fin:far,hs:[1,3,2,4][i]});
const E={RC,R:{},ocEst:{10:{ped:'B'},11:{ped:'A'},12:{ped:'B'},13:{ped:'A'}},ped:{A:pedA,B:pedB}};
const r=_prgReglasOrden(E,[],[10,11,12,13]);
A(r.oc.join()==='11,13,10,12','pedido empezado primero y cada pedido junto: '+r.oc.join());
// la fecha sigue mandando: un pedido sin empezar que vence antes va antes
pedB.promesa=new Date(t0+5*D);const r2=_prgReglasOrden(E,[],[10,11,12,13]);A(r2.oc.join()==='10,12,11,13','la fecha manda sobre «empezado»: '+r2.oc.join());
A(/selPed\.has\(k\)\?' pd':' dim'/.test(src)&&/class="prg-pt"/.test(src)&&/medidas cortadas<\/b>/.test(src),'etiqueta, resaltado y avance en pantalla');
console.log(f?('FALLÓ '+f):'OK prg_pedido');process.exit(f?1:0);
