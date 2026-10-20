// Turnos fichados (mismas reglas que el MES). Uso: node turnos.cjs <dir_trabajo> <hasta ISO>
const fs=require('fs'),path=require('path');const src=fs.readFileSync(path.join(__dirname,'../../fabrica_bolsas_v6.html'),'utf8');
const i=src.indexOf('function _cvvTs'),j=src.indexOf('function _cvvMaqNom');const k=src.indexOf('function _cvvTurnos'),l=src.indexOf('function _cvvFichado');
eval(src.slice(i,j)+src.slice(k,l));
const D=JSON.parse(fs.readFileSync(path.join(process.argv[2],'datos.json')));
fs.writeFileSync(path.join(process.argv[2],'turnos.json'),JSON.stringify(_cvvTurnos(D.fich||[],new Date(process.argv[3]).getTime())));
