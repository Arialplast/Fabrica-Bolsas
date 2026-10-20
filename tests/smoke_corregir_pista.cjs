// smoke 20f — ✏ corregir máquina/pista (BOB-06877: escaneada en C1 16:06, iba en C2 pista 1)
// uso: TZ=America/Argentina/Buenos_Aires node tests/smoke_corregir_pista.cjs fabrica_bolsas_v6.html
const fs=require('fs');
const src=fs.readFileSync(process.argv[2]||'fabrica_bolsas_v6.html','utf8');
const grab=(a,b)=>{const i=src.indexOf(a),k=src.indexOf(b,i+1);if(i<0||k<0)throw new Error('no está '+a);return src.slice(i,k);};
eval(grab('function _pstContadorEn','const PSTC={};'));
let ok=0,bad=0;const t=(c,m)=>{if(c)ok++;else{bad++;console.error('✗ '+m);}};
// C2 el 20/10: última tanda antes de la parada 15:57:17 (contador 229763), vuelve 16:14
const tandas=[
  {fin:'2026-10-20T18:55:40Z',contador_fin:229738},
  {fin:'2026-10-20T18:57:17Z',contador_fin:229763},
  {fin:'2026-10-20T19:15:21Z',contador_fin:229783},
  {fin:null,contador_fin:229790},{fin:'2026-10-20T18:50:00Z',contador_fin:null}];
const T=new Date('2026-10-20T19:06:24Z').getTime();
t(_pstContadorEn(tandas,T)===229763,'16:06 → 229763 (última tanda antes de la parada)');
t(_pstContadorEn(tandas,new Date('2026-10-20T19:20:00Z').getTime())===229783,'16:20 → 229783');
t(_pstContadorEn(tandas,new Date('2026-10-20T18:00:00Z').getTime())===null,'antes de toda tanda → null');
t(_pstContadorEn([],T)===null&&_pstContadorEn(null,T)===null,'sin tandas → null');
// hora → fecha
const ahora=new Date(2026,9,20,16,20,0);
const d=_pstHoraADate('16:06',ahora);
t(d.getDate()===20&&d.getHours()===16&&d.getMinutes()===6,'16:06 hoy');
const d2=_pstHoraADate('23:50',ahora);
t(d2.getDate()===19&&d2.getHours()===23,'23:50 a las 16:20 → ayer');
t(_pstHoraADate('xx',ahora)===null&&_pstHoraADate('',ahora)===null,'hora inválida → null');
// texto
const m=_pstMarcaCorreccion({fecha:'2026-10-20',hora:'16:25',quien:'German',nro:'BOB-06877',maqAntes:'CORTE-01',pistaAntes:null,maqNueva:'CORTE-02',pista:1,desde:'16:06',cont:229763,motivo:'La escaneé en la otra máquina'});
t(m==='[✏ Corrección 2026-10-20 16:25 por German: BOB-06877 de CORTE-01 sin pista → CORTE-02 pista 1 desde las 16:06 (contador 229763) — La escaneé en la otra máquina]','marca: '+m);
t(/sin contador/.test(_pstMarcaCorreccion({fecha:'x',hora:'y',quien:'q',nro:'B',maqAntes:'C1',pistaAntes:3,maqNueva:'C2',pista:2,desde:'10:00',cont:null,motivo:'m'})),'sin contador avisado');
// el botón está en la tarjeta y debajo del «SIN PISTA»
t((src.match(/_pstCorregir\('\+/g)||[]).length>=2,'botones ✏ en la tarjeta');
console.log(ok+' ok, '+bad+' mal');process.exit(bad?1:0);
