// 22r: el fin real del corte es «Terminó de cortar» (marca del panel), no el cierre de la orden
const fs=require('fs');const src=fs.readFileSync(process.argv[2],'utf8');let n=0;const A=(c,t)=>{if(!c){console.error('✗ '+t);process.exit(1);}n++;};
const g=re=>{const m=src.match(re);if(!m)throw new Error('falta '+re);return m[0];};
eval(g(/function _ocFinCorteMs\(o\)\{[\s\S]*?\n\}/));eval(g(/function _ocFinReal\(o\)\{[\s\S]*?\n\}/));eval(g(/function _adhCierre\(L\)\{[\s\S]*?\n\}/));
const T=s=>new Date(s).getTime();
// marca del panel
A(_ocFinCorteMs({observaciones:'[Iniciada panel …] [Corte terminado en panel 2026-11-19 16:22 por GUARAZ — pendiente de cierre]'})===T('2026-11-19T16:22:00'),'lee la hora de «Corte terminado en panel»');
A(_ocFinCorteMs({observaciones:'[Corte terminado en panel 2026-11-19 9:05 — pendiente de cierre]'})===T('2026-11-19T09:05:00'),'hora de un dígito');
A(_ocFinCorteMs({observaciones:'[Corte terminado en panel 2026-11-18 10:00] [REABIERTA …] [Corte terminado en panel 2026-11-19 11:30]'})===T('2026-11-19T11:30:00'),'con dos marcas vale la última');
A(_ocFinCorteMs({observaciones:'[Terminó en CORTE-01 panel 2026-11-19 10:00]'})===null,'«terminó sólo en una máquina» no es el fin de la orden');
A(_ocFinCorteMs({observaciones:null})===null&&_ocFinCorteMs(null)===null,'sin observaciones');
// fin real
const obs='[Corte terminado en panel 2026-11-19 16:22 — pendiente de cierre]';
let F=_ocFinReal({estado:'Completada',observaciones:obs,fecha_completada:'2026-11-20T08:00:00'});A(F.fuente==='panel'&&F.t===T('2026-11-19T16:22:00'),'cerrada al otro día: el fin es el del corte, no el del cierre');
F=_ocFinReal({estado:'Pendiente empaque',observaciones:obs,fecha_completada:null});A(F.fuente==='panel'&&F.t===T('2026-11-19T16:22:00'),'cortada y sin cerrar: ya cuenta como cortada');
F=_ocFinReal({estado:'Completada',observaciones:'',fecha_completada:'2026-11-20T08:00:00'});A(F.fuente==='cierre'&&F.t===T('2026-11-20T08:00:00'),'sin marca: queda el cierre, marcado como tal');
F=_ocFinReal({estado:'En proceso',observaciones:obs});A(F.t===null,'REABIERTA (En proceso): la marca vieja no cuenta');
F=_ocFinReal({estado:'Completada',observaciones:'[Corte terminado en panel 2026-11-21 10:00]',fecha_completada:'2026-11-20T08:00:00'});A(F.fuente==='cierre','marca posterior al cierre: manda el cierre');
// demora del cierre
const H=3600000;let C=_adhCierre([{corte:0,cierre:5*H},{corte:1,cierre:1+2*H},{corte:1,cierre:1+4*H},{corte:1,cierre:1+30*H},{corte:null,cierre:9}]);
A(C.n===3&&Math.abs(C.med-4)<1e-9&&Math.abs(C.prom-12)<1e-9&&C.mas24===1,'mediana, promedio y cuántas tardan más de un día; ignora las sin marca');
A(_adhCierre([]).med===null&&_adhCierre([{corte:5,cierre:2}]).n===0,'vacío / cierre anterior al corte no cuenta');
// cableado
A(/const F=_ocFinReal\(o\);R\.oc\[o\.id\]=\{ini,fin:F\.t,fuente:F\.fuente\}/.test(src),'lo real de corte sale de _ocFinReal');
A(/const LC=LCtodas\.filter\(x=>x\.fuente==='panel'\)/.test(src),'el % de corte sólo cuenta las que tienen la marca');
A(/if\(o\.estado==='Completada'\)x\.fin=x\.ult;/.test(src),'extrusión: fin = última bobina');
A(/\{t:'adherencia',i:'✅ ¿Se cumple\?'/.test(src)&&!/onclick="goAdmin\('adherencia'\)"><div class="nav-dot"/.test(src),'una sola entrada: pestaña del Programa');
console.log('✓ adherencia_fin_corte '+n+' ok');
