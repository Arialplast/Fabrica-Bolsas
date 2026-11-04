// 04f · Etapa 3: motor único de material de una OC (_materialOC).
const fs=require('fs');const src=fs.readFileSync(process.argv[2]||(__dirname+'/../fabrica_bolsas_v6.html'),'utf8');
function cuerpo(fn){const mm=new RegExp('^function '+fn+'\\(','m').exec(src);const i=mm?mm.index:-1;const j=src.indexOf('\nfunction ',i+10);return src.slice(i,j);}
global.C={};eval(cuerpo('_balOEdeOC')+'\n;'+cuerpo('_oesDeOC')+'\n;'+cuerpo('_materialOC').replace(/\/\/ ¿La OC tiene una reposición[\s\S]*$/,''));
global._ocDesalineo=()=>null;global._bobEsDeSuOEDesalineada=()=>false;
let ok=0,fail=0;const t=(c,m)=>{if(c)ok++;else{fail++;console.log('FALLA',m);}};
const B=(id,orden_id,m,x)=>Object.assign({id,orden_id,bobina_tipo_id:7,metros_reales:m,en_stock:true},x||{});
C.productos=[{id:1,bobina_id:7}];
C.ordenes=[{id:10,estado:'En proceso',metros:5000},{id:11,estado:'Pendiente',metros:2000},{id:20,estado:'Completada',metros:900}];
const oc={id:100,producto_id:1,orden_extrusion_id:10,metros_necesarios:6000,resolucion_robo:[{tipo:'oe_complementaria',ord_id:11}],orden_corte_bobinas:[{bobina_producida_id:1}]};
const otra={id:200,producto_id:1,orden_corte_bobinas:[{bobina_producida_id:3}]};
C.ord_corte=[oc,otra];
C.bobinas_prod=[
  B(1,10,1000,{en_stock:false}),          // consumida por esta OC
  B(2,10,1500),                           // propia libre
  B(3,10,800,{en_stock:false}),           // robada (asociada a otra OC)
  B(4,10,400,{reservada_oc_id:200}),      // robada (reservada a otra OC)
  B(5,11,600),                            // propia de la OE de reposición
  B(6,20,700,{reservada_oc_id:100}),      // repuesta (otra OE, reservada a esta)
  B(7,20,300),                            // stock libre de otra OE
  B(8,10,500,{estado_calidad:'rechazada'}),// rechazada: no cuenta
];
const M=_materialOC(oc);
t(M.consumidos===1000,'consumidos 1000: '+M.consumidos);
t(M.propias===2100,'propias = OE principal + reposición: '+M.propias);
t(M.repuestas===700,'repuestas 700');
t(M.disponibles===2800,'disponibles 2800');
t(M.robadas===1200,'robadas 800 asociada + 400 reservada: '+M.robadas);
t(M.stockLibre===300,'stock libre 300');
// en producción: OE10 5000 − (1000+1500+800+400+500) = 800 ; OE11 2000 − 600 = 1400
t(M.enProduccion===2200,'en producción 800 + 1400: '+M.enProduccion);
t(M.faltaHoy===2200,'falta hoy = 6000 − 1000 − 2800: '+M.faltaHoy);
t(M.falta===0&&M.cubre&&!M.cubreHoy,'con lo que viene se cubre');
console.log('smoke_material_oc: '+ok+' ok, '+fail+' fallas');process.exit(fail?1:0);
