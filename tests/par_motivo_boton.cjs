// 07v: el botón de motivo de parada tiene que tener un onclick válido (en 07t salió con comilla doble de más)
const fs=require('fs');const src=fs.readFileSync(process.argv[2],'utf8');
function fn(name){const i=src.indexOf('function '+name+'(');if(i<0)throw new Error('falta '+name);let d=0,j=src.indexOf('{',i);for(let k=j;k<src.length;k++){if(src[k]==='{')d++;else if(src[k]==='}'){d--;if(!d)return src.slice(i,k+1);}}}
const OEE_MOTIVOS=['Pinchadura de globo','Otro'],OEE_MOTIVOS_C=['Cambio de bobina','Otro'];
const escapeHtml=s=>String(s);
eval(fn('_parHora'));eval(fn('_oeePinchSensor'));eval(fn('_parPregHtml'));
let fail=0;const ok=(c,m)=>{if(!c){fail++;console.log('✗ '+m);}};
const now=new Date().toISOString();
for(const [area,p] of [['extrusion',{nom:'EXT-01',desde:now,hasta:now,min:12,e0:'F',f0:3}],['extrusion',{nom:'EXT-01',desde:now,hasta:now,min:12,e0:'S',f0:0,sigue:true}],['corte',{nom:'CORTE-01',desde:now,hasta:now,min:9}]]){
  const h=_parPregHtml(area,7,[p]);
  const m=h.match(/onclick="([^"]*)"/g)||[];
  ok(m.length===2,area+': 2 botones con onclick');
  ok(!/onclick=""/.test(h),area+': sin comilla doble de más');
  ok(m.every(x=>/^onclick="parResp\('(extrusion|corte)',7,\d+\)"$/.test(x)),area+': onclick llama a parResp → '+m[0]);
}
ok(/ prim/.test(_parPregHtml('extrusion',7,[{nom:'E',desde:now,hasta:now,min:12,e0:'F',f0:3}])),'resalta pinchadura con firma del sensor');
ok(_parPregHtml('corte',1,[])==='','sin pendientes no pinta nada');
if(fail){console.log('FALLARON '+fail);process.exit(1);}console.log('✓ par_motivo_boton OK');
