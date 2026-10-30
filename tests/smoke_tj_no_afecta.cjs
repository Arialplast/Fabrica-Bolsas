// 30d: tjGastoDelMes excluye consumos de categorías que no afectan resultado
const fs=require('fs');const src=fs.readFileSync(__dirname+'/../fabrica_bolsas_v6.html','utf8');
function bloque(ini,fin){const i=src.indexOf(ini);const j=src.indexOf(fin,i);if(i<0||j<0)throw new Error('no encuentro '+ini);return src.slice(i,j);}
global.r2=x=>Math.round(x*100)/100;
global.cfg={tarjeta_dia_cierre:22,tarjeta_dia_vencimiento:4};
global.C={categorias_gasto:[{codigo:'insumos',nombre:'Insumos',afecta_resultado:true},{codigo:'bienes_de_uso___mejoras',nombre:'Bienes de uso',afecta_resultado:false},{codigo:'retiro_socios',nombre:'Retiro',afecta_resultado:true}],
 tarjeta_consumos:[{id:1,fecha:'2026-09-10',categoria:'bienes_de_uso___mejoras',monto_total:866421.72,cuotas:6},
                   {id:2,fecha:'2026-09-12',categoria:'insumos',monto_total:1000,cuotas:1},
                   {id:3,fecha:'2026-09-14',categoria:'retiro_socios',monto_total:500,cuotas:1,personal:true},
                   {id:4,fecha:'2026-10-01',categoria:'insumos',monto_total:7,cuotas:1}],
 tarjeta_resumenes:[{id:9,periodo:'2026-09',fecha_cierre:'2026-09-24',impuestos_cargos:48445.40}]};
eval(bloque('function cgCats(){','function cgCatLabel'));
eval(bloque('function tjYmAdd(','function tjTitulares'));
eval(bloque('function tjPeriodoBase(','function tjCierreDePeriodo'));
eval(bloque('function tjCierreDePeriodo(','function tjVtoDePeriodo'));
eval(bloque('function tjGastoDelMes(','function tjRetirosDelMes'));
let ok=0,fail=0;const t=(c,m)=>{if(c)ok++;else{fail++;console.log('FALLA',m);}};
const g=tjGastoDelMes('2026-09-01','2026-09-30');
t(Math.abs(g.total-(1000+500+48445.40))<0.01,'sep = insumo+retiro+cargos, sin bien de uso: '+g.total);
t(!g.docs.some(d=>d.consumo&&d.consumo.id===1),'PLC fuera de docs');
t(tjGastoDelMes('2026-10-01','2026-10-31').total===7,'oct solo id4');
C.categorias_gasto=[];  // sin maestro → CG_CATS fallback: no rompe
global.CG_CATS=[{v:'insumos',l:'x',afecta:true}];
t(tjGastoDelMes('2026-09-01','2026-09-30').total>0,'fallback sin categorias');
console.log('smoke_tj_no_afecta: '+ok+' ok, '+fail+' fallas');process.exit(fail?1:0);
