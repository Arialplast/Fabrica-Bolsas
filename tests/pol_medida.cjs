// 21a: agrupar por medida (campañas) — política de programación del corte
const fs=require('fs');const src=fs.readFileSync(process.argv[2],'utf8');let n=0;const A=(c,t)=>{if(!c){console.error('✗ '+t);process.exit(1);}n++;};
const ag=eval('('+src.match(/function _polAgrupar\([^)]*\)\{[\s\S]*?\n  return out;\}/)[0]+')');const cam=eval('('+src.match(/function _polCambios\(seq\)\{.*\}/)[0]+')');
const K={1:{cong:true,dia:0},2:{dia:1},3:{dia:1},4:{dia:2},5:{dia:3},6:{dia:6},7:{dia:null}};K[7].dia=Infinity;const F={1:'x',2:'a',3:'b',4:'a',5:'b',6:'a',7:'a'};
let r=ag([1,2,3,4,5,6,7],K,id=>F[id],2);
A(r.join()==='1,2,4,3,5,6,7','junta la misma medida que vence hasta 2 días después; lo más lejano (6) y lo sin fecha (7) no se adelantan');
A(r[0]===1,'las congeladas quedan primero');A(r.length===7&&new Set(r).size===7,'no pierde ni duplica órdenes');
r=ag([2,3,4,5],K,id=>F[id],0);A(r.join()==='2,3,4,5','con ventana 0 no cambia el orden por entrega');
r=ag([3,2,5,4],{2:{dia:1},3:{dia:1},4:{dia:2},5:{dia:3}},id=>F[id],5);A(r.join()==='3,5,2,4','respeta el orden base dentro de cada tanda');
A(cam([{maq:1,ini:1,fam:'a'},{maq:1,ini:2,fam:'b'},{maq:1,ini:3,fam:'a'},{maq:2,ini:1,fam:'a'},{maq:2,ini:2,fam:'a'}])===2,'cuenta cambios por máquina, en orden de arranque');
A(cam([{maq:1,ini:3,fam:'a'},{maq:1,ini:1,fam:'a'},{maq:1,ini:2,fam:'b'}])===2&&cam([])===0,'ordena por arranque antes de contar');
A(/\{k:'medida',n:'Agrupar por medida'/.test(src)&&/k==='medida'\?_polAgrupar\(base\.oc/.test(src)&&!/function _prgSimular[\s\S]{0,6000}_polAgrupar/.test(src),'es una política más: no toca el simulador');
console.log('✓ pol_medida '+n+' ok');
