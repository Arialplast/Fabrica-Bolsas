// smoke 20c — golpes después de 3 h del último escaneo: si la OC seguía en marcha en el panel, son de ella
// (OC-1052978: 2.863 golpes de Solbayres 06:00–08:05 se le sumaban a la 2978 por la regla «tarde»)
// uso: TZ=America/Argentina/Buenos_Aires node tests/smoke_en_marcha.cjs fabrica_bolsas_v6.html
const fs=require('fs');const src=fs.readFileSync(process.argv[2]||'fabrica_bolsas_v6.html','utf8');
const a=src.indexOf('// ===== ✂ CORTE EN VIVO (15b) =====');const b=src.indexOf('function _cvvCard(');
if(a<0||b<0||b<a){console.log('FALTA el bloque');process.exit(1);}
let ok=0,bad=0;const t=(c,m)=>{if(c)ok++;else{bad++;console.log('✗ '+m);}};
global.C={empleados:[],maq_corte:[]};
eval(src.slice(a,b).replace('const CVV=','global.CVV=').replace('const CVV_PAUSA_MIN=3,CVV_LARGA_MIN=20;','global.CVV_PAUSA_MIN=3;global.CVV_LARGA_MIN=20;').replace('const _CVV_OPCOL','global._CVV_OPCOL'));
const T=s=>new Date(s+'-03:00').getTime();
const sol={id:958,estado:'Pendiente',observaciones:'[Iniciada en panel 2026-10-19 18:10 por ACEVEDO] [Pausada en panel 2026-10-20 08:05 — Sin bobinas · CELIA]'};
const nueva={id:1010,estado:'En proceso',observaciones:'[Iniciada en panel 2026-10-20 06:10 por GUARAZ]'};
// _cvvEnMarcha
t(_cvvEnMarcha(sol,T('2026-10-20T06:00:00')),'Solbayres en marcha a las 06:00');
t(_cvvEnMarcha(sol,T('2026-10-20T08:05:30')),'en marcha hasta el minuto de la pausa');
t(!_cvvEnMarcha(sol,T('2026-10-20T08:09:00')),'después de la pausa ya no');
t(!_cvvEnMarcha(nueva,T('2026-10-20T07:00:00')),'sin pausa/terminado posterior no hay prueba');
t(!_cvvEnMarcha({observaciones:'[Iniciada en panel 2026-10-20 01:00 por X] [Pausada en panel 2026-10-20 03:00 — Otro · X] [Corte terminado en panel 2026-10-20 09:00 por X]'},T('2026-10-20T06:00:00')),'pausada antes del golpe (sin reanudar) → no');
t(_cvvEnMarcha({observaciones:'[Iniciada en panel 2026-10-20 01:00 por X] [Pausada en panel 2026-10-20 03:00 — Otro · X] [Iniciada en panel 2026-10-20 05:50 por Y] [Corte terminado en panel 2026-10-20 09:00 por X]'},T('2026-10-20T06:00:00')),'reanudada antes del golpe y terminada después → sí');
t(!_cvvEnMarcha(null,T('2026-10-20T06:00:00')),'sin OC → no');
// _cvvAsignar: caso 2978
const cargas=[{t:T('2026-10-20T03:01:06'),maquina_id:1,orden_corte_id:958,empleado_id:2},
  {t:T('2026-10-20T08:08:30'),maquina_id:1,orden_corte_id:1010,empleado_id:1}];
const ocs={958:sol,1010:nueva};
const mk=(h,g)=>({maquina:1,ti:T('2026-10-20T'+h),tf:T('2026-10-20T'+h)+60000,golpes:g});
const tds=_cvvAsignar([mk('03:10:00',25),mk('06:30:00',25),mk('08:04:00',25),mk('08:06:30',3),mk('08:10:00',5)],cargas,ocs,{});
t(tds[0].oc===958&&tds[0].regla==='antes','03:10 → Solbayres (≤ 3 h)');
t(tds[1].oc===958&&tds[1].regla==='antes','06:30 → Solbayres (en marcha en el panel), no la 2978');
t(tds[2].oc===958,'08:04 → Solbayres');
t(tds[3].oc===1010,'08:06:30 (después de la pausa) → la 2978');
t(tds[4].oc===1010&&tds[4].regla==='antes','08:10 → 2978');
// sin evento posterior en el panel sigue la regla «tarde» de siempre
const tds2=_cvvAsignar([mk('06:30:00',25)],cargas,{958:{id:958,observaciones:'[Iniciada en panel 2026-10-19 18:10 por A]'},1010:nueva},{});
t(tds2[0].oc===1010&&tds2[0].regla==='tarde','sin pausa posterior → tarde (como antes)');
// la pausa fue en la otra cortadora DESPUÉS del próximo escaneo en ésta → no prueba nada: regla «tarde»
const tds3=_cvvAsignar([mk('06:30:00',25)],cargas,{958:{id:958,observaciones:'[Iniciada en panel 2026-10-19 18:10 por A] [Pausada en panel 2026-10-20 12:00 — Otro · B]'},1010:nueva},{});
t(tds3[0].oc===1010&&tds3[0].regla==='tarde','pausa posterior al próximo escaneo → tarde');
t(_cvvEnMarcha(sol,T('2026-10-20T06:30:00'),T('2026-10-20T08:08:30')),'pausa 08:05 antes del escaneo 08:08:30 → en marcha');
// 20d — «Corte terminado» 10:09 pero la C1 siguió sin parar hasta 10:31 (OC-1052980): los golpes siguen siendo de la OC
{const oc80={id:1012,observaciones:'[Iniciada en panel 2026-10-20 08:58 por C] [Corte terminado en panel 2026-10-20 10:09 por C]'};
 const cg=[{t:T('2026-10-20T09:57:06'),maquina_id:1,orden_corte_id:1012,empleado_id:1},{t:T('2026-10-20T10:56:33'),maquina_id:1,orden_corte_id:1030,empleado_id:1}];
 const ts=[];for(let h=T('2026-10-20T10:05:00');h<=T('2026-10-20T10:31:00');h+=11500)ts.push({maquina:1,ti:h,tf:h+7000,golpes:5});
 const r=_cvvAsignar(ts,cg,{1012:oc80,1030:{id:1030,observaciones:''}},{});
 t(r.every(x=>x.oc===1012),'sin pausa después de «terminado» → siguen en la 2980 ('+r.filter(x=>x.oc!==1012).length+' afuera)');
 // con pausa de 7 min después de «terminado» (OC-1052984) → ya no
 const r2=_cvvAsignar([{maquina:1,ti:T('2026-10-20T10:08:00'),tf:T('2026-10-20T10:08:07'),golpes:5},{maquina:1,ti:T('2026-10-20T10:19:00'),tf:T('2026-10-20T10:19:07'),golpes:25}],cg,{1012:oc80,1030:{id:1030,observaciones:''}},{});
 t(r2[0].oc===1012&&r2[1].oc===1030,'pausa > 3 min después de «terminado» → el golpe ya no es de la OC terminada');}
console.log((bad?'FALLAN '+bad:'OK')+' — '+ok+' ok');process.exit(bad?1:0);
