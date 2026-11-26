// 22t: el aviso de bultos sin cargar dice hace cuánto se terminó de cortar, y sube al Tablero
const fs=require('fs');const src=fs.readFileSync(process.argv[2],'utf8');let n=0;const A=(c,t)=>{if(!c){console.error('✗ '+t);process.exit(1);}n++;};
const g=re=>{const m=src.match(re);if(!m)throw new Error('falta '+re);return m[0];};
eval(g(/const SB_H_AMBAR=8,SB_H_ROJO=24;/).replace('const','var'));
eval(g(/function _sbEspera\(d,ahora,finDe\)\{[\s\S]*?\n\}/));eval(g(/function _sbHsTxt\(hs\)\{.*\}/));eval(g(/function _sbResumenEspera\(L\)\{[\s\S]*?\n\}/));
const H=3600000,now=1000*H;const fin=oc=>oc.t;
A(_sbEspera({oc:{t:now-3*H}},now,fin).nivel==='ok','3 h: dentro del turno');
A(_sbEspera({oc:{t:now-12*H}},now,fin).nivel==='ambar','12 h: más de un turno');
let e=_sbEspera({oc:{t:now-30*H}},now,fin);A(e.nivel==='rojo'&&Math.abs(e.hs-30)<1e-9,'30 h: más de un día');
e=_sbEspera({oc:{t:null}},now,fin);A(e.hs===null&&e.nivel===null,'todavía en corte: sin espera');
A(_sbHsTxt(0.5)==='30 min'&&_sbHsTxt(12.34)==='12,3 h'&&_sbHsTxt(72)==='3 días'&&_sbHsTxt(null)==='—','texto de la espera');
const R=_sbResumenEspera([{falta:100,esp:{hs:3,nivel:'ok'}},{falta:200,esp:{hs:12,nivel:'ambar'}},{falta:300,esp:{hs:30,nivel:'rojo'}},{falta:999,esp:{hs:null,nivel:null}}]);
A(R.n===2&&R.paq===500&&R.maxHs===30&&R.rojas===1,'el Tablero sólo cuenta las que esperan más de un turno');
A(_sbResumenEspera([]).n===0,'sin nada no avisa');
// no se duplicó el derivador ni se creó otro aviso
A((src.match(/function _sbPendientes\(\)/g)||[]).length===1&&/const pend=_sbConEspera\(\)\.sort/.test(src),'usa el mismo derivador del aviso que ya existía');
A(/return F\.fuente==='panel'\?F\.t:null;/.test(src),'la espera se cuenta desde «Terminó de cortar» (mismo derivador que la adherencia)');
A(/_ocmnaTableroHTML\(\)\+_sbTableroHTML\(\)\+/.test(src),'está en el Tablero de Dirección');
const k=g(/function _ocAvisosConteo\(\)\{[\s\S]*?\n\}/);A(!/cierre|espera/i.test(k),'el contador de avisos no suma un tipo nuevo (sería contar dos veces)');
console.log('✓ sb_espera '+n+' ok');
