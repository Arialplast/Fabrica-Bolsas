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
