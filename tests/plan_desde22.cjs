// 23l: extrusión «desde las 22» sin tocar la estructura de plan_recursos
const fs=require('fs');const src=fs.readFileSync(process.argv[2],'utf8');let f=0;const A=(c,m)=>{if(!c){f++;console.log('✗ '+m);}};
const one=n=>{const i=src.indexOf('function '+n+'(');return src.slice(i,src.indexOf('\n',i));};
const blk=n=>{const i=src.indexOf('function '+n+'(');return src.slice(i,src.indexOf('\n  return {eD,eN,otros,dels};}',i)+31);};
eval(one('_planNorm'));eval(blk('_planUps'));
let N=_planNorm([{recurso:'e:1',turno:'D6',nota:'desde:22'},{recurso:'e:2',turno:'D6',nota:null},{recurso:'p:2',turno:'M',nota:'impresion'},{recurso:'e:3',turno:'24'}]);
A(N[0].turno==='D22'&&N[1].turno==='D6'&&N[2].turno==='M'&&N[3].turno==='24','al leer: D6 + nota «desde:22» → D22; lo demás igual');
const U=_planUps({'e:1|2026-11-23':'D22','e:2|2026-11-23':'24','p:2|2026-11-23':'M','e:3|2026-11-22':null},'T');
A(U.eD.length===1&&U.eD[0].turno==='D6'&&U.eD[0].nota==='desde:22','al guardar: D22 va como D6 + nota (la base lo acepta)');
A(U.eN.length===1&&U.eN[0].turno==='24'&&U.eN[0].nota===null,'cambiar a otro turno de extrusión limpia la nota');
A(U.otros.length===1&&!('nota' in U.otros[0]),'a las personas no se les toca la nota (impresión, feriado)');
A(U.dels.length===1&&U.dels[0].rk==='e:3','borrados');
const PERM=['24','D6','S12','M','L','T','N','M12','0'];A([...U.eD,...U.eN,...U.otros].every(r=>PERM.includes(r.turno)),'todo lo que se guarda está en la lista que admite la tabla');
A(/'D22':\{l:'22→'[^}]*tr:\[\[22,24\]\]/.test(src)&&/\['24','D6','D22','S12'\]\.map\(pin\)/.test(src),'el turno existe y está en la paleta');
A((src.match(/select\('fecha,recurso,turno'\)/g)||[]).length===0,'todas las lecturas traen la nota');
console.log(f?('FALLÓ '+f):'OK plan_desde22');process.exit(f?1:0);
