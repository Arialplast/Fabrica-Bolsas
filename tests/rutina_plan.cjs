// 25j: rutina de planificación
const fs=require('fs');const s=fs.readFileSync(process.argv[2],'utf8');
let ok=true;const t=(n,c)=>{if(!c){ok=false;console.error('✗ '+n);}else console.log('✓ '+n);};
const i=s.indexOf('function _rpMesAnt(');const j=s.indexOf('function _rpChequeos(',i);
const F=new Function(s.slice(i,j)+';return {_rpMesAnt,_rpDdjjEsperada};')();
t('mes anterior cruza el año',F._rpMesAnt('2026-01',1)==='2025-12'&&F._rpMesAnt('2026-02',2)==='2025-12');
t('DDJJ esperada: antes del 25 la de hace dos meses',F._rpDdjjEsperada('2026-11-20')==='2026-09');
t('DDJJ esperada: desde el 25 la del mes pasado',F._rpDdjjEsperada('2026-11-25')==='2026-10');
t('página, menú y enganche',/id="page-rutina-plan"/.test(s)&&/go\('rutina-plan'\)/.test(s)&&/if\(name==='rutina-plan'\)renderRutinaPlan\(\)/.test(s));
t('los cuatro momentos y los datos',/'Todos los días, al arrancar'/.test(s)&&/'Los lunes'/.test(s)&&/'Los viernes'/.test(s)&&/'Cada mes'/.test(s)&&/'Datos que tienen que estar cargados'/.test(s));
t('usa las funciones de cada pantalla',/_ps2Aprobado\(lun\)/.test(s)&&/_ps2Rol\(lunSig\)/.test(s)&&/_recDifLista\(\)/.test(s)&&/_psDocs\(\)/.test(s));
process.exit(ok?0:1);
