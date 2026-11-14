// 13g: balance puro del plan de mediano plazo
const fs=require('fs');const src=fs.readFileSync(process.argv[2],'utf8');
const m=src.match(/function _pmpBalance\(S,wip0\)\{[\s\S]*?\n\}/);if(!m){console.error('no _pmpBalance');process.exit(1);}
const _pmpBalance=eval('('+m[0]+')');let ok=0;const A=(c,t)=>{if(!c){console.error('✗ '+t);process.exit(1);}ok++;};
const near=(a,b)=>Math.abs(a-b)<1e-6;
let B=_pmpBalance([{firme:100,pron:0,capE:200,capC:200},{firme:50,pron:50,capE:200,capC:200}],0);
A(near(B[0].cortado,100)&&near(B[0].bkl,0)&&B[0].cuello===null,'holgado: entrega todo');
A(near(B[1].dem,100)&&near(B[1].arr,0),'demanda = firme + pronóstico');
B=_pmpBalance([{firme:300,pron:0,capE:500,capC:200},{firme:0,pron:100,capE:500,capC:200}],0);
A(near(B[0].cortado,200)&&near(B[0].bkl,100)&&B[0].cuello==='corte','cuello corte y arrastre');
A(near(B[1].arr,100)&&near(B[1].aCortar,200)&&near(B[1].bkl,0),'el arrastre pasa a la semana siguiente');
A(near(B[0].wip,100),'lo extruido sin cortar queda como bobinas');
A(near(B[1].ext,100),'la semana siguiente extruye sólo lo que falta');
B=_pmpBalance([{firme:300,pron:0,capE:100,capC:500}],0);
A(near(B[0].cortado,100)&&B[0].cuello==='extrusion'&&near(B[0].bkl,200),'cuello extrusión');
B=_pmpBalance([{firme:300,pron:0,capE:100,capC:500}],150);
A(near(B[0].cortado,250)&&near(B[0].bkl,50),'el stock de bobinas se usa primero');
B=_pmpBalance([{firme:300,pron:0,capE:100,capC:100}],0);A(B[0].cuello==='ambos','los dos al tope = ambos');
A(near(B[0].cargaC,3),'carga del corte = a cortar / capacidad');
A(/id="page-plan-medio"/.test(src)&&/if\(name==='plan-medio'\)renderPlanMedio\(\)/.test(src)&&/goAdmin\('plan-medio'\)/.test(src),'página, dispatch y nav');
A(/#page-adherencia,#page-plan-medio\{/.test(src)||/#page-adherencia,#page-plan-medio /.test(src)||/#page-plan-medio/.test(src),'tema claro');
console.log('✓ plan_medio '+ok+' ok');
// 14a: cascada y metas
{const g=n=>{const m=src.match(new RegExp('function '+n+'\\([^)]*\\)\\{[\\s\\S]*?\\n\\}'));if(!m){console.error('no '+n);process.exit(1);}return eval('('+m[0]+')');};
 const casc=g('_pmpCascada'),meta=g('_pmpMetaMes');let n=0;const A=(c,t)=>{if(!c){console.error('✗ '+t);process.exit(1);}n++;};const near=(a,b)=>Math.abs(a-b)<1e-6;
 const c=casc({nTot:3,nAct:2,nom:100,rit:60,hBase:200,hFer:20,hParo:10,hDisp:150,hGente:20,hImp:5,A:0.8,P:0.9});
 A(near(c.inst,50400),'instalada = máquinas × 168 × ficha');
 A(near(c.F.reduce((s,f)=>f.k==='dem'?s:s+f.kg,0),c.dem),'la cascada cierra: instalada − pérdidas = demostrada');
 A(near(c.F.find(f=>f.k==='fer').kg,-2000)&&near(c.F.find(f=>f.k==='imp').kg,-500)&&near(c.F.find(f=>f.k==='gente').kg,-1500),'feriados, impresora y sin cortador');
 A(c.F.find(f=>f.k==='par')&&c.F.find(f=>f.k==='rit'),'con OEE separa paradas de ritmo');
 A(!casc({nTot:1,nAct:1,nom:100,rit:60,hBase:100,hFer:0,hParo:0,hDisp:100}).F.find(f=>f.k==='rit'),'sin OEE van juntos');
 A(near(casc({nTot:1,nAct:1,nom:50,rit:60,hBase:100,hFer:0,hParo:0,hDisp:100}).nom,60),'ficha por debajo de lo demostrado: manda lo demostrado');
 let m=meta({kg:30000,venta:90e6,margen:30e6,gastos:20e6,resultado:10e6},{kg:10000,venta:30e6,margen:10e6},15000,3000,1000);
 A(near(m.llegaKg,25000)&&!m.ok&&near(m.gap,5000),'no alcanza: faltan 5 t');
 A(near(m.filas.find(f=>f.k==='venta').llega,75e6)&&near(m.filas.find(f=>f.k==='resultado').llega,5e6),'cierre en $ de venta y resultado');
 A(near(m.filas.find(f=>f.k==='margen').kgNec,30000),'kilos que pide la meta de margen');
 m=meta({kg:20000},{kg:10000,venta:0,margen:0},15000,3000,1000);A(m.ok&&m.gap===0,'alcanzable');
 m=meta({resultado:5e6},{kg:0,venta:0,margen:0},1000,3000,1000);A(m.filas.length===0,'resultado sin meta de gastos no se traduce');
 console.log('✓ plan_medio 14a '+n+' ok');}
