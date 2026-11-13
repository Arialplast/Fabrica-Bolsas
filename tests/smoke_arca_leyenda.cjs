// smoke 13/11 — Edge Function ARCA: leyenda del pie (remitos · OC del cliente · observaciones · motivo de NC)
// uso: node tests/smoke_arca_leyenda.cjs [supabase/functions/arca/index.ts]
const fs=require('fs');const src=fs.readFileSync(process.argv[2]||'supabase/functions/arca/index.ts','utf8');
const a=src.indexOf('function armarLeyenda('),b=src.indexOf('async function postTF(');
if(a<0||b<0){console.log('FALTA armarLeyenda');process.exit(1);}
eval(src.slice(a,b).replace('remitos: string[], ocs: string[], libres: unknown[]): string','remitos, ocs, libres)').replace('const txt: string[] = []','const txt = []').replace('(oc: string)','(oc)'));
const viejo=(rem,obs)=>[rem.length?(rem.length===1?'Remito ':'Remitos ')+rem.join(', '):'',String(obs||'').trim()].filter(Boolean).join(' · ').slice(0,500);
let ok=0,bad=0;const t=(x,m)=>{if(x)ok++;else{bad++;console.log('✗ '+m);}};
// sin OC ni motivo: idéntico a lo que salía antes del cambio
[[[],''],[['REM-1'],''],[['REM-1','REM-2'],'Pedido PED-1'],[[],'Pedido PED-06016'],[[],null]].forEach(([r,o])=>t(armarLeyenda(r,[],[o,''])===viejo(r,o),'regresión '+JSON.stringify([r,o])));
t(armarLeyenda([],['2353'],['Pedido PED-06016','orden de compra 2353'])==='Pedido PED-06016 · orden de compra 2353','NC DAG: el motivo sale y la OC no se repite');
t(armarLeyenda(['REM-00400'],['2353'],['Pedido PED-06016'])==='Remito REM-00400 · Orden de compra: 2353 · Pedido PED-06016','factura DAG: OC automática');
t(armarLeyenda([],['23'],['Pedido PED-06023'])==='Orden de compra: 23 · Pedido PED-06023','OC 23 no se confunde con PED-06023');
t(armarLeyenda([],['BIO 9633','BIO 9632','BIO 9633'],[''])==='Orden de compra: BIO 9633, BIO 9632','varias OC, sin repetir');
t(armarLeyenda([],['A+B (1)'],['x'])==='Orden de compra: A+B (1) · x','caracteres especiales no rompen');
t(armarLeyenda([],[],['igual','igual'])==='igual','texto libre duplicado sale una vez');
t(armarLeyenda([],['x'.repeat(600)],[]).length===500,'tope de 500 caracteres');
t(/leyenda_gral: armarLeyenda\(remitos, ocCliente, \[/.test(src),'el payload usa armarLeyenda');
t(/docTipo === "nc" && \(lineas \|\| \[\]\)\.length \? doc\.motivo_detalle : ""/.test(src),'motivo solo en NC con líneas');
console.log((bad?'✗ ':'✓ ')+ok+' ok · '+bad+' fallas');process.exit(bad?1:0);
