// smoke 07b — cartel de guardado global + cartel grande del panel de corte
// uso: TZ=America/Argentina/Buenos_Aires node tests/smoke_guardando.cjs fabrica_bolsas_v6.html [dir_con_node_modules_supabase]
// Con el 2º argumento (un directorio con @supabase/supabase-js instalado) prueba además
// contra la librería REAL que los pedidos salen idénticos y los resultados no cambian.
const fs=require('fs'),path=require('path');
const src=fs.readFileSync(process.argv[2]||'fabrica_bolsas_v6.html','utf8');
const a=src.indexOf('// ===== ⏳ CARTEL DE GUARDADO EN TODA LA APP');const b=src.indexOf('async function conectar(){');
const c=src.indexOf('// ===== 📢 CARTEL GRANDE DEL LECTOR');const d=src.indexOf('// Feedback grande del lector del panel');
if(a<0||b<0||c<0||d<0){console.log('FALTA el bloque');process.exit(1);}
let ok=0,bad=0;const t=(x,m)=>{if(x)ok++;else{bad++;console.log('✗ '+m);}};
// DOM mínimo
const els={};const listeners={};
global.document={
  getElementById:id=>els[id]||null,
  createElement:()=>{const e={style:{},innerHTML:''};return e;},
  body:{appendChild:e=>{els[e.id]=e;}},
  addEventListener:(k,f)=>{(listeners[k]=listeners[k]||[]).push(f);},
  activeElement:null
};
global.window=global;
global.confirm=()=>true;global.alert=()=>{};global.prompt=()=>'x';
global.escapeHtml=s=>String(s).replace(/</g,'&lt;');
eval(src.slice(a,b).replace(/^let /gm,'var ').replace(/^const /gm,'var '));
eval(src.slice(c,d).replace(/^let /gm,'var ').replace(/^const /gm,'var '));
const espera=ms=>new Promise(r=>setTimeout(r,ms));

(async()=>{
  // ── pura
  t(_gsCuenta(10000,9000,false,0)===true,'gesto reciente cuenta');
  t(_gsCuenta(10000,1000,false,0)===false,'sin gesto (fondo) no cuenta');
  t(_gsCuenta(10000,1000,true,0)===true,'con el cartel arriba cuenta');
  t(_gsCuenta(10000,1000,false,1)===true,'encadenada a otra en curso cuenta');
  // confirm marca gesto
  _gsGesto=0;confirm('x');t(Date.now()-_gsGesto<50,'confirm() marca gesto');
  // keydown Enter marca gesto; tipear no
  _gsGesto=0;listeners.keydown.forEach(f=>f({key:'a',target:{tagName:'INPUT',type:'text'}}));t(_gsGesto===0,'tipear no es gesto');
  listeners.keydown.forEach(f=>f({key:'Enter',target:{tagName:'INPUT',type:'text'}}));t(_gsGesto>0,'Enter es gesto');

  // ── cliente falso con la forma de supabase-js (builder perezoso)
  const llamadas=[];
  const mkB=(op,tab,res,ms)=>{const B={op,tab,
    eq(){return this;},select(){return this;},single(){return this;},is(){return this;},
    then(onF,onR){llamadas.push(op+':'+tab);return new Promise(r=>setTimeout(()=>r(res),ms)).then(onF,onR);}};return B;};
  const cli={from(tab){return{
      select:()=>mkB('select',tab,{data:[1],error:null},400),
      insert:()=>mkB('insert',tab,{data:{id:7},error:null},400),
      update:()=>mkB('update',tab,{data:null,error:{message:'boom'}},50),
      upsert:()=>mkB('upsert',tab,{data:null,error:null},50),
      delete:()=>mkB('delete',tab,{data:null,error:null},50)};},
    rpc(n){return mkB('rpc',n,{data:3,error:null},400);},
    functions:{invoke:()=>new Promise(r=>setTimeout(()=>r({data:'ok'}),400))}};
  const sb=_gsInstalar(cli);t(_gsInstalar(sb)===sb,'instalar dos veces no envuelve dos veces');

  // lectura con gesto: nunca muestra
  _gsMarcarGesto();const r0=await sb.from('x').select('*');
  t(r0.data[0]===1&&!_gsVisible&&_gsN===0,'lectura no muestra el cartel');
  // escritura lenta con gesto: muestra y se va
  _gsMarcarGesto();const p1=(async()=>await sb.from('bobinas').insert({a:1}).select().single())(); // el código real siempre hace await
  await espera(340);t(_gsVisible===true&&els['gs-ov']&&els['gs-ov'].style.display==='flex','escritura lenta → cartel arriba');
  const r1=await p1;t(r1.data.id===7,'el resultado no cambia');
  await espera(250);t(!_gsVisible&&els['gs-ov'].style.display==='none','termina → cartel abajo');
  // escritura rápida: no parpadea
  _gsMarcarGesto();await sb.from('x').upsert({});await espera(250);
  t(!_gsVisible,'escritura rápida (<300 ms) no muestra nada');
  // error de la base: se devuelve igual y el cartel se va
  _gsMarcarGesto();const r2=await sb.from('x').update({}).eq('id',1);
  t(r2.error&&r2.error.message==='boom','el error vuelve igual que antes');await espera(250);t(_gsN===0&&!_gsVisible,'error no deja el cartel trabado');
  // escritura de fondo (sin gesto): nada
  _gsGesto=0;const p3=(async()=>await sb.from('x').insert({}))();await espera(340);t(!_gsVisible,'escritura de fondo no muestra');await p3;t(_gsN===0,'fondo no suma');
  // cadena: insert → insert seguidas, sin parpadeo intermedio
  _gsMarcarGesto();const p4=(async()=>{await sb.from('a').insert({});await sb.from('b').insert({});await sb.rpc('ajuste_stock_bolsas');})();
  let bajo=false;const vig=setInterval(()=>{if(_gsVisible===false&&_gsN===0&&Date.now()-_gsDesde>0&&_gsDesde)bajo=true;},20);
  await espera(340);t(_gsVisible,'cadena: arriba');_gsDesde=Date.now();bajo=false;
  await p4;clearInterval(vig);t(!bajo,'cadena: no baja entre una escritura y la siguiente');
  await espera(250);t(!_gsVisible,'cadena: baja al final');
  // promise rechazada (excepción de red)
  const cli2={from(){return{insert:()=>({then(f,r){return Promise.reject(new Error('red')).then(f,r);}})};}};
  _gsInstalar(cli2);_gsMarcarGesto();let ex=null;try{await cli2.from('x').insert({});}catch(e){ex=e;}
  t(ex&&ex.message==='red','la excepción sale igual');await espera(250);t(_gsN===0&&!_gsVisible,'excepción no traba el cartel');
  // functions.invoke
  _gsMarcarGesto();const pf=sb.functions.invoke('arca');await espera(340);t(_gsVisible,'función (ARCA) muestra cartel');t((await pf).data==='ok','función devuelve igual');await espera(250);
  // escape manual
  _gsMarcarGesto();const p5=(async()=>await sb.from('x').insert({}))();await espera(340);_gsOcultarForzado();t(!_gsVisible,'ocultar forzado');await p5;await espera(250);t(_gsN===0,'contador sano después de forzar');
  // Enter sobre botón con cartel arriba: bloqueado; en input de texto: pasa
  _gsVisible=true;let pd=0;const ev=(tag,ty)=>({key:'Enter',target:{tagName:tag,type:ty},preventDefault(){pd++;},stopPropagation(){}});
  listeners.keydown.forEach(f=>f(ev('BUTTON','')));t(pd===1,'Enter en botón bloqueado durante el guardado');
  listeners.keydown.forEach(f=>f(ev('INPUT','text')));t(pd===1,'Enter en la pistola sigue andando');
  _gsVisible=false;

  // ── librería REAL de Supabase (opcional)
  const dir=process.argv[3];
  if(dir&&fs.existsSync(path.join(dir,'node_modules/@supabase/supabase-js'))){
    const {createClient}=require(path.join(dir,'node_modules/@supabase/supabase-js'));
    const vistos=[];
    const fakeFetch=async(url,init)=>{vistos.push({url:String(url),method:(init&&init.method)||'GET',body:init&&init.body||null,h:JSON.stringify(init&&init.headers||{})});
      await espera(350);
      const body=(init&&init.method)==='POST'?JSON.stringify({id:42,n:1}):JSON.stringify([{id:1}]);
      return new Response(body,{status:200,headers:{'content-type':'application/json','content-range':'0-0/*'}});};
    const opts={global:{fetch:fakeFetch},auth:{persistSession:false,autoRefreshToken:false}};
    const crudo=createClient('https://x.supabase.co','k',opts);
    const env=_gsInstalar(createClient('https://x.supabase.co','k',opts));
    const casos=[
      c=>c.from('recibo_valores').insert([{a:1}]),
      c=>c.from('recibo_valores').insert({a:1}).select().single(),
      c=>c.from('bobinas_producidas').update({en_stock:false}).eq('id',5).is('x',null).select('id'),
      c=>c.from('t').upsert({id:1},{onConflict:'id'}),
      c=>c.from('t').delete().eq('id',3),
      c=>c.rpc('ajuste_stock_bolsas',{p:1}),
      c=>c.from('t').select('*').eq('a',1).order('id').range(0,9),
    ];
    for(let i=0;i<casos.length;i++){
      vistos.length=0;const rc=await casos[i](crudo);const vc=vistos.slice();
      vistos.length=0;_gsMarcarGesto();const re=await casos[i](env);const ve=vistos.slice();
      t(JSON.stringify(vc)===JSON.stringify(ve),'real #'+i+': mismo pedido HTTP');
      t(JSON.stringify(rc)===JSON.stringify(re),'real #'+i+': mismo resultado');
    }
    await espera(250);t(_gsN===0&&!_gsVisible,'real: cartel abajo al final');
  } else console.log('(sin librería real: se saltea esa parte)');

  // ── panel de corte (puras)
  const asoc=[{id:1,fecha_asignacion:'2026-10-07T10:00:00-03:00'},{id:3,fecha_asignacion:'2026-10-07T11:00:00-03:00'},{id:2,fecha_asignacion:'2026-10-07T11:00:00-03:00'},{id:9,fecha_asignacion:null}];
  t(_pcorteAsocOrden(asoc).map(x=>x.id).join()==='3,2,1,9','cargadas: la última primero (hora, después id)');
  t(asoc[0].id===1,'no altera el array original');
  t(_pcorteHora('2026-10-07T11:05:00-03:00')==='11:05','hora local de la carga');
  t(_pcorteHora('2026-10-07')===''&&_pcorteHora(null)==='','sin hora → vacío');
  const hOk=_pcorteCartelHtml('ok',{titulo:'✓ BOBINA CARGADA',numero:'BOB-06481',detalle:'Cortadora 2 · OC-1052900 · 1.502 m'},'var(--green)');
  t(/BOB-06481/.test(hOk)&&/pcc-num/.test(hOk)&&/Cortadora 2/.test(hOk),'cartel verde con número grande');
  const hEr=_pcorteCartelHtml('error',{texto:'La bobina BOB-1 ya está en esta orden.'},'var(--amber)');
  t(/NO SE CARGÓ/.test(hEr)&&/ya está/.test(hEr),'cartel de error con el motivo');
  const hYa=_pcorteCartelHtml('error',{titulo:'✓ YA ESTABA CARGADA',numero:'BOB-9',detalle:'en OC-1'},'var(--amber)');
  t(/YA ESTABA CARGADA/.test(hYa)&&/pcc-num/.test(hYa)&&!/NO SE CARGÓ/.test(hYa),'ya estaba cargada: número grande, sin "no se cargó"');
  t(/titulo:'✓ YA ESTABA CARGADA',numero:b\.numero_bobina/.test(src),'el aviso de duplicada usa ese cartel');
  t(!/<script/.test(_pcorteCartelHtml('error',{texto:'<script>'},'x')),'escapa HTML');
  _pcorteCartel('ok',{numero:'BOB-1'},'var(--green)');t(els['pcc-ov']&&els['pcc-ov'].style.display==='flex','cartel aparece');
  // código: el repintado reaplica el último mensaje y el éxito usa el cartel
  t(/root\.innerHTML=html;\n  \/\/ 07b: el último mensaje del lector sobrevive al repintado/.test(src),'repintado reaplica el mensaje');
  t(/window\._pcorteUltBobId=bobId;/.test(src)&&/titulo:'✓ BOBINA CARGADA',numero:b\.numero_bobina/.test(src),'éxito marca la recién cargada y usa el cartel');
  t(/sb=_gsInstalar\(supabase\.createClient\(url,key\)\)/.test(src),'el cliente se envuelve al conectar');
  console.log((bad?'✗ ':'✓ ')+ok+' ok'+(bad?' · '+bad+' FALLAN':''));process.exit(bad?1:0);
})();
