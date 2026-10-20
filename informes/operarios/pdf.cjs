// HTML -> PDF A4. Uso: node pdf.cjs <entrada.html> <salida.pdf>
let pw;try{pw=require('playwright');}catch(e){pw=require(require('child_process').execSync('npm root -g').toString().trim()+'/playwright');}
(async()=>{const b=await pw.chromium.launch();const p=await b.newPage({viewport:{width:726,height:1000}});
const html=require('fs').readFileSync(process.argv[2],'utf8');
await p.setContent('<!doctype html><meta charset="utf-8">'+html,{waitUntil:'networkidle'}).catch(()=>p.setContent('<!doctype html><meta charset="utf-8">'+html));
await p.pdf({path:process.argv[3],format:'A4',printBackground:true,preferCSSPageSize:true});await b.close();})();
