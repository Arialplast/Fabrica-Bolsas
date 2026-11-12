// 07w: puesto «en la impresora» en el rol y ciclos de la impresora
const fs=require('fs');const src=fs.readFileSync(process.argv[2],'utf8');
function fn(name){const i=src.indexOf('function '+name+'(');if(i<0)throw new Error('falta '+name);let d=0,j=src.indexOf('{',i);for(let k=j;k<src.length;k++){if(src[k]==='{')d++;else if(src[k]==='}'){d--;if(!d)return src.slice(i,k+1);}}}
eval(fn('_oeePct'));eval(fn('_rolV'));eval(fn('_rolEsFeriado'));eval(fn('_rolEsImpresion'));eval(fn('_rolDeFila'));eval(fn('_impCiclos'));eval(fn('_impIntervalos'));
let fail=0;const ok=(c,m)=>{if(!c){fail++;console.log('✗ '+m);}};
ok(_rolV('x').k==='x'&&_rolV('').k==='x','no viene');
ok(_rolV('3').k==='T'&&_rolV('3').tid===3,'turno');
ok(_rolV('F|4').k==='F'&&_rolV('F|4').tid===4,'feriado');
ok(_rolV('I|3').k==='I'&&_rolV('I|3').tid===3,'impresión');
ok(_rolDeFila({turno_id:3,no_viene:false,nota:'impresion'})==='I|3','fila impresión → I|3');
ok(_rolDeFila({turno_id:3,no_viene:false,nota:null})==='3','fila normal');
ok(_rolDeFila({turno_id:4,no_viene:true,nota:'feriado'})==='F|4','fila feriado');
ok(_rolDeFila({turno_id:3,no_viene:true,nota:'impresion'})==='x','no viene gana a impresión');
ok(!_rolEsImpresion({turno_id:3,no_viene:false,nota:'feriado'}),'feriado no es impresión');
// ciclos: 10 bobinas de 900 m en 30 min y una que quedó abierta 20 h
const t0=Date.UTC(2026,10,5,12,0,0);const rows=[];
for(let i=0;i<10;i++)rows.push({id:i,empleado_id:2,inicio:new Date(t0+i*30*60000).toISOString(),fin:new Date(t0+(i+1)*30*60000).toISOString(),metros:900,estado:'impresa'});
rows.push({id:99,empleado_id:2,inicio:new Date(t0+300*60000).toISOString(),fin:new Date(t0+300*60000+20*3600000).toISOString(),metros:900,estado:'impresa'});
rows.push({id:100,empleado_id:2,inicio:new Date(t0).toISOString(),fin:null,metros:900,estado:'anulada'});
const IC=_impCiclos(rows,t0+40*3600000);
ok(IC.L.length===11,'anulada no cuenta');
ok(Math.abs(IC.med-30)<.01,'ritmo típico 30 m/min → '+IC.med);
const c=IC.L.find(x=>x.id===99);ok(c.sinSalida&&Math.abs(c.min-30)<.01,'sin salida escaneada: se le pone el tiempo típico → '+c.min);
const I=_impIntervalos(IC.L);ok(I[2].length===11&&Math.abs((I[2][10][1]-I[2][10][0])/60000-30)<.01,'intervalos por persona');
if(fail){console.log('FALLARON '+fail);process.exit(1);}console.log('✓ impresion_rol OK');
