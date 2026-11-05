// 05a · Ninguna función de primer nivel definida dos veces: en un HTML de un solo archivo la segunda pisa a la
// primera en silencio (04t: _cenPct de «Hoy» pisó a la de «Semana» y la grilla mostró NaN%).
const fs=require('fs');const src=fs.readFileSync(process.argv[2]||(__dirname+'/../fabrica_bolsas_v6.html'),'utf8');
const conocidas=new Set(['_empNombre']);   // duplicado previo (2026-10), anotado para revisar aparte
const n={};for(const m of src.matchAll(/^(?:async )?function ([A-Za-z_$][\w$]*)\(/gm))n[m[1]]=(n[m[1]]||0)+1;
const dup=Object.keys(n).filter(k=>n[k]>1&&!conocidas.has(k));
if(dup.length)console.log('FALLA funciones definidas dos veces: '+dup.join(', '));
console.log('smoke_funciones_unicas: '+(dup.length?0:1)+' ok, '+(dup.length?1:0)+' fallas');process.exit(dup.length?1:0);
