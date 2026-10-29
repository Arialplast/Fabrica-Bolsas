// Turnos fichados (mismas reglas que el MES). Uso: node turnos.cjs <dir_trabajo> <hasta ISO>
const fs=require('fs'),path=require('path');const src=fs.readFileSync(path.join(__dirname,'../../fabrica_bolsas_v6.html'),'utf8');
const i=src.indexOf('function _cvvTs'),j=src.indexOf('function _cvvMaqNom');const k=src.indexOf('function _cvvTurnos'),l=src.indexOf('function _cvvFichado');
eval(src.slice(i,j)+src.slice(k,l));
const D=JSON.parse(fs.readFileSync(path.join(process.argv[2],'datos.json')));
const AJ=JSON.parse(fs.readFileSync(path.join(__dirname,'ajustes.json')));
(AJ.salida_falta||[]).forEach(t=>{if(!D.fich)D.fich=[];if(!D.fich.some(f=>f.empleado_id===t.emp&&f.fecha===t.fecha&&f.tipo==='salida'))D.fich.push({empleado_id:t.emp,fecha:t.fecha,hora:t.hora+':00',tipo:'salida'});});
// entradas que faltan en el reloj (las da German): se agregan si no hay ya un fichaje de ese empleado a esa hora
(AJ.entrada_falta||[]).forEach(t=>{if(!D.fich)D.fich=[];if(!D.fich.some(f=>f.empleado_id===t.emp&&f.fecha===t.fecha&&f.hora.slice(0,5)===t.hora))D.fich.push({empleado_id:t.emp,fecha:t.fecha,hora:t.hora+':00',tipo:'entrada'});});
D.fich&&D.fich.sort((a,b)=>(a.fecha+a.hora).localeCompare(b.fecha+b.hora));
fs.writeFileSync(path.join(process.argv[2],'turnos.json'),JSON.stringify(_cvvTurnos(D.fich||[],new Date(process.argv[3]).getTime())));
