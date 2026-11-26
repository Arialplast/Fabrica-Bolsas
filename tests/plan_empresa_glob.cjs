// 25q: objetivos de empresa (G1–G4) con semáforo calculado desde los objetivos de área
const fs=require('fs');const s=fs.readFileSync(process.argv[2],'utf8');
let ok=true;const t=(n,c)=>{if(!c){ok=false;console.error('✗ '+n);}else console.log('✓ '+n);};
const i=s.indexOf('function _peGlobEstado(');const j=s.indexOf('function peGlobProponer(',i);
const {E,P}=new Function(s.slice(i,j)+';return {E:_peGlobEstado,P:PE_GLOB_PROP};')();
const G={id:'G1'};const mk=(st,anc)=>({o:{id:Math.random().toString(36),g:'G1',ancla:!!anc},st});
const run=L=>{const objs=L.map(x=>x.o);const AV={};L.forEach(x=>AV[x.o.id]={estado:x.st});return E(G,objs,AV);};
t('verde: su número y 4 de 5 abajo',run([mk('ok',1),mk('ok'),mk('ok'),mk('ok'),mk('mal')]).estado==='ok');
t('número ok pero abajo flojo = suerte',(r=>r.estado==='aviso'&&r.diag==='suerte')(run([mk('ok',1),mk('ok'),mk('aviso'),mk('mal'),mk('ok')])));
t('abajo cumple y el número no = falta un objetivo',(r=>r.diag==='falta'&&r.estado==='mal')(run([mk('mal',1),mk('ok'),mk('ok'),mk('ok'),mk('ok'),mk('ok')])));
t('menos de la mitad abajo = rojo',run([mk('ok'),mk('mal'),mk('mal')]).estado==='mal');
t('sin datos = sin dato',run([mk('sin',1),mk('sin')]).estado==='sin');
t('sin número propio se juzga por los de abajo',run([mk('ok'),mk('ok'),mk('ok'),mk('ok')]).estado==='ok');
t('propuesta: 4 objetivos de empresa',P.length===4&&P[0].anc.includes('kg_mes')&&P[1].anc.includes('resultado'));
t('cada indicador en un solo objetivo de empresa',(()=>{const a=P.flatMap(g=>g.ind);return a.length===new Set(a).size;})());
t('el plan guarda y lee los objetivos de empresa',/if\(Array\.isArray\(d\.glob\)\)PE\.d\.glob=d\.glob/.test(s));
t('el Resumen los muestra arriba',/if\(d\.obj\.length\)h\+=_peGlobCard\(d,AV\);\s*h\+=_peAprobCard/.test(s));
process.exit(ok?0:1);
