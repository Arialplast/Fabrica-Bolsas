const fs=require('fs');
const src=fs.readFileSync((process.argv[2]||'fabrica_bolsas_v6.html'),'utf8');
const i0=src.indexOf('let _facGuardando=false;'), i1=src.indexOf('// ===== 📦 ANTICIPO DE PEDIDO');
let blk=src.slice(i0,i1).replace('let _facGuardando=false;','globalThis._facGuardando=false;');
// in-memory db
const DB={facturas:[],factura_lineas:[],factura_linea_remitos:[],factura_remitos:[],remitos:[{id:661,numero_remito:'REM-00656',estado:'emitido',factura_id:null,rv_id:null}]};
let seq=200;const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function q(t){const st={t,op:'select',f:[],sel:false,single:false};
 const b={select(){st.sel=true;return b},insert(v){st.op='insert';st.v=v;return b},update(v){st.op='update';st.v=v;return b},delete(){st.op='delete';return b},
  in(c,a){st.f.push(r=>a.includes(r[c]));return b},eq(c,v){st.f.push(r=>r[c]===v);return b},is(c,v){st.f.push(r=>(r[c]??null)===v);return b},single(){st.single=true;return b},
  then(res,rej){return (async()=>{await sleep(5);const T=DB[st.t];let data;
   if(st.op==='insert'){const arr=(Array.isArray(st.v)?st.v:[st.v]).map(x=>({id:++seq,...x}));T.push(...arr);data=st.single?arr[0]:arr;}
   else if(st.op==='update'){data=T.filter(r=>st.f.every(f=>f(r)));data.forEach(r=>Object.assign(r,st.v));}
   else if(st.op==='delete'){const k=T.filter(r=>st.f.every(f=>f(r)));DB[st.t]=T.filter(r=>!k.includes(r));if(st.t==='facturas'){DB.factura_lineas=DB.factura_lineas.filter(l=>!k.some(f=>f.id===l.factura_id));DB.factura_remitos=DB.factura_remitos.filter(l=>!k.some(f=>f.id===l.factura_id));}data=k;}
   else data=T.filter(r=>st.f.every(f=>f(r))).map(r=>({...r}));
   return {data,error:null};})().then(res,rej);}};return b;}
global.sb={from:q};
const els={};const el=id=>els[id]||(els[id]={id,value:'',style:{},textContent:'',innerHTML:'',disabled:false,blur(){}});
global.document={getElementById:id=>el(id)};
global.C={remitos:[{id:661,numero_remito:'REM-00656',remito_lineas:[{id:1,cantidad_paquetes:10,precio_paquete:5}]}],facturas:[],productos:[]};
global.r2=x=>Math.round(x*100)/100;global.localDate=()=>'2026-10-19';global._antDeRemito=()=>null;global.toast=()=>{};global.go=()=>{};global.imprimirFactura=()=>{};
global.reload=async()=>{await sleep(200);};  // reload lento
global._facConsolidarRemitos=()=>[{producto_id:1,desc:'x',cant:10,pu:5,sub:50,remLineas:[{id:1,cantidad_paquetes:10}]}];
const reset=()=>{global._facCtx={cliente:{id:43,nombre:'ICM'},remitosSel:[661],tipo:'A',subtotal:50,iva:10.5,total:60.5};DB.facturas=[];DB.factura_lineas=[];DB.factura_remitos=[];DB.remitos[0].factura_id=null;DB.remitos[0].estado='emitido';};
eval(blk);
(async()=>{
 // 1) doble Emitir: inmediato y a los 100ms (durante el reload)
 reset();el('nf-num').value='';
 const p1=guardarFactura();await sleep(100);const p2=guardarFactura();await Promise.all([p1,p2]);
 console.log('1 doble click durante reload → facturas:',DB.facturas.length,'remito→',DB.remitos[0].factura_id,'ok=',DB.facturas.length===1&&DB.remitos[0].factura_id===DB.facturas[0].id);
 // 2) otro Emitir después de terminar (form todavía abierto)
 await guardarFactura();
 console.log('2 tercer Emitir tras terminar → facturas:',DB.facturas.length,'msg:',el('msg-nf').textContent);
 // 3) dos guardados que se SALTEAN el candado, en carrera
 reset();
 await Promise.all([_guardarFacturaCore(),_guardarFacturaCore()]);
 console.log('3 carrera sin candado → facturas:',DB.facturas.length,'lineas:',DB.factura_lineas.length,'remito→',DB.remitos[0].factura_id,'ok=',DB.facturas.length===1&&DB.remitos[0].factura_id===DB.facturas[0].id&&DB.factura_lineas.length===1);
 console.log('   msg:',el('msg-nf').textContent);
 // 4) remito ya facturado en la base pero C viejo
 reset();DB.remitos[0].factura_id=999;
 await guardarFactura();
 console.log('4 remito ya facturado en base → facturas:',DB.facturas.length,'msg:',el('msg-nf').textContent);
 console.log('botón final disabled=',el('btn-nf-emitir').disabled,'candado=',_facGuardando);
})();
