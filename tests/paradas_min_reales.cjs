// 26b: motivo cargado con la máquina parada → los minutos se completan con la duración real del PLC
const fs=require('fs');const s=fs.readFileSync(process.argv[2],'utf8');
let ok=true;const t=(n,c)=>{if(!c){ok=false;console.error('✗ '+n);}else console.log('✓ '+n);};
const i=s.indexOf('function _parMotivoDe(');const j=s.indexOf('function _parSincMin(',i);
const F=new Function(s.slice(i,j)+';return {_parMotivoDe,_parMinCorregir};')();
const T=x=>new Date('2026-11-26T'+x+':00-03:00').toISOString();
const row={id:417,area:'corte',maquina_id:1,desde:T('14:03'),hasta:T('14:12'),minutos:9};
const p={ext:1,k:T('14:03'),desde:T('14:03'),hasta:T('14:22'),min:19};
t('la parada de 19 min corrige la fila de 9',JSON.stringify(F._parMinCorregir([row],'corte',[p]))===JSON.stringify([{id:417,hasta:T('14:22'),minutos:19}]));
t('si sigue parada no toca',F._parMinCorregir([row],'corte',[Object.assign({},p,{sigue:true})]).length===0);
t('nunca acorta',F._parMinCorregir([Object.assign({},row,{minutos:25,hasta:T('14:28')})],'corte',[p]).length===0);
t('otra máquina no',F._parMinCorregir([row],'corte',[Object.assign({},p,{ext:2})]).length===0);
const r2={id:391,area:'extrusion',maquina_id:3,desde:T('13:35'),hasta:T('14:44'),minutos:70};
t('el PLC corrió el comienzo: el motivo sigue siendo de esa parada',!!F._parMotivoDe([r2],'extrusion',{ext:3,k:T('13:45'),desde:T('13:44'),hasta:T('14:44')}));
t('una parada nueva después del toque no hereda el motivo',!F._parMotivoDe([row],'corte',{ext:1,k:T('14:30'),desde:T('14:30'),hasta:T('14:40')}));
t('se sincroniza en estaciones y OEE',(s.match(/_parSincMin\(/g)||[]).length>=5);
process.exit(ok?0:1);
