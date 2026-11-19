// 22m: Gantt pro — funciones puras y que use los motores de siempre
const fs=require('fs');const src=fs.readFileSync(process.argv[2],'utf8');let n=0;const A=(c,t)=>{if(!c){console.error('✗ '+t);process.exit(1);}n++;};
const g=re=>{const m=src.match(re);if(!m)throw new Error('falta '+re);return m[0];};
eval(g(/function _gpLanes\(bars\)\{.*\}/));eval(g(/function _gpUnir\(segs\)\{.*\}/));
const H=3600000;let b=[{a:0,z:10*H},{a:5*H,z:15*H},{a:10*H,z:20*H},{a:30*H,z:40*H}];A(_gpLanes(b)===2&&b.find(x=>x.a===5*H).lane===1&&b.find(x=>x.a===10*H).lane===0,'carriles: no se pisan y reusan el libre');
let u=_gpUnir([{a:0,z:10*H,k:'1|5'},{a:10*H,z:20*H,k:'1|5'},{a:20*H,z:30*H,k:'1|2'}]);A(u.length===2&&u[0].z===20*H,'une tramos seguidos del mismo cortador');
const ge=g(/function _gpExt\(\)\{[\s\S]*?\n\}/),gc=g(/function _gpCorte\(\)\{[\s\S]*?\n\}/);
A(/calcScheduleReal\(\)/.test(ge)&&/calcScheduleCorteReal\(\)/.test(gc),'dibuja con los motores de siempre');
A(/_gpPromesa\(/.test(gc)&&/fecha_entrega_est/.test(src),'compara contra la fecha prometida del pedido');
A(/if\(on\)\{try\{_gpExt\(\)/.test(src)&&/if\(on\)\{try\{_gpCorte\(\)/.test(src),'los dos Gantt usan la vista nueva');
console.log('✓ gantt_pro '+n+' ok');
