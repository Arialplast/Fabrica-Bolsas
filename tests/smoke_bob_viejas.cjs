// smoke_bob_viejas.cjs — build 2026-09-28c · bobinas viejas a demanda
// Uso: TZ=America/Argentina/Buenos_Aires node tests/smoke_bob_viejas.cjs fabrica_bolsas_v6.html
// Caso real: ORD-05574 (VAZQUEZ, creada 19/05/2026, 45 bobinas, todas cortadas → 0 en la caché).
const fs=require('fs');const src=fs.readFileSync(process.argv[2]||'fabrica_bolsas_v6.html','utf8');
let ok=0,bad=0;const T=(c,m)=>{if(c)ok++;else{bad++;console.log('✖',m);}};
const a=src.indexOf('// ===== 📜 BOBINAS VIEJAS A DEMANDA');const b=src.indexOf('// Trae bobinas en chunks de 1000',a);
T(a>0&&b>a,'bloque encontrado');
function fn(name){const i=src.indexOf('function '+name+'(');let j=src.indexOf('{',i),d=0;for(let k=j;k<src.length;k++){if(src[k]==='{')d++;else if(src[k]==='}'){d--;if(!d)return src.slice(i,k+1);}}}
global.window={};global.toast=(m)=>{global._toast=m;};
global.C={ordenes:[],bobinas_prod:[],_historicasCargadas:false};
const hoy=new Date();const iso=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const hace=n=>{const d=new Date();d.setDate(d.getDate()-n);return iso(d);};
// base simulada: OE 140 vieja con 45 bobinas cortadas hace >60d; OE 900 nueva
const DB=[];for(let i=0;i<45;i++)DB.push({id:1000+i,orden_id:140,metros_reales:494.9,kg_reales:8,en_stock:false,fecha_produccion:'2026-05-20',fuera_de_rango:false,anulada:false});
for(let i=0;i<2500;i++)DB.push({id:5000+i,orden_id:300+(i%50),metros_reales:1500,kg_reales:25,en_stock:false,fecha_produccion:'2026-07-01',fuera_de_rango:false,anulada:false});
DB.push({id:9001,orden_id:140,metros_reales:1,kg_reales:1,en_stock:false,fecha_produccion:'2026-05-20',fuera_de_rango:true,anulada:false});
DB.push({id:9002,orden_id:140,metros_reales:1,kg_reales:1,en_stock:false,fecha_produccion:'2026-05-20',fuera_de_rango:false,anulada:true});
let reqs=0,fallar=false;
global.sb={from:()=>{const f={};const q={select(){return q;},eq(c,v){f[c]=v;return q;},lt(c,v){f.lt=v;return q;},in(c,v){f.in=v;return q;},order(){return q;},
  range(x,y){reqs++;if(fallar)return Promise.resolve({data:null,error:{message:'red'}});
    const r=DB.filter(b=>b.fuera_de_rango===f.fuera_de_rango&&b.anulada===f.anulada&&b.en_stock===f.en_stock&&b.fecha_produccion<f.lt&&(!f.in||f.in.includes(b.orden_id)));
    return Promise.resolve({data:r.slice(x,y+1),error:null});}};return q;}};
eval([fn('localDate'),src.slice(a,b)].join('\n').replace(/^(async )?function (\w+)/gm,(m,as,n)=>'global.'+n+'='+(as||'')+'function '+n).replace(/^const (_\w+)=/gm,'global.$1=').replace(/^let (_\w+)=/gm,'global.$1='));
(async()=>{
 C.ordenes=[{id:140,numero_orden:'ORD-05574',created_at:'2026-05-19T12:00:00Z'},{id:900,numero_orden:'ORD-09000',created_at:hace(3)+'T10:00:00Z'},{id:901,numero_orden:'ORD-09001',created_at:hace(61)+'T10:00:00Z'}];
 T(_bobCorteISO()===hace(60),'fecha de corte = la de _traerBobinasRecientes (60 días)');
 T(src.includes("const hace60d=new Date(Date.now()-60*24*3600*1000);"),'la carga inicial sigue usando 60 días');
 T(_oeBobCompleta(C.ordenes[1]),'OE nueva: completa sin consultar');
 T(!_oeBobCompleta(C.ordenes[0]),'ORD-05574: incompleta en la caché');
 T(!_oeBobCompleta(C.ordenes[2]),'OE de hace 61 días: incompleta');
 T(C.bobinas_prod.filter(x=>x.orden_id===140).length===0,'antes: 0 bobinas de ORD-05574 en la caché (lo que imprimía el 🖨️)');
 reqs=0;T(await _completarBobinasDeOEs([140,900]),'completar devuelve ok');
 const b140=C.bobinas_prod.filter(x=>x.orden_id===140);
 T(b140.length===45,'después: las 45 bobinas ('+b140.length+')');
 T(Math.round(b140.reduce((s,x)=>s+x.metros_reales,0))===22271,'metros ≈ 22.270');
 T(!b140.some(x=>x.fuera_de_rango||x.anulada),'no trae fuera de rango ni anuladas (mismos filtros que la carga)');
 T(reqs===1,'una sola consulta, sólo por la OE vieja ('+reqs+')');
 T(_oeBobCompleta(C.ordenes[0]),'queda marcada completa');
 reqs=0;await _completarBobinasDeOEs([140]);T(reqs===0,'segunda vez: no vuelve a consultar');
 await _completarBobinasDeOEs([140]);T(C.bobinas_prod.filter(x=>x.orden_id===140).length===45,'sin duplicados');
 // reload invalida
 window._bobGen=(window._bobGen||0)+1;C.bobinas_prod=[];
 T(!_oeBobCompleta(C.ordenes[0]),'después de un reload vuelve a estar incompleta');
 T(src.includes("window._bobGen=(window._bobGen||0)+1;")&&src.indexOf("window._bobGen=(window._bobGen||0)+1;")<src.indexOf("const results=await Promise.allSettled(["),'reload incrementa _bobGen antes de cargar');
 // reload en el medio: no marca completo sobre una caché que ya no es la suya
 const p=_completarBobinasDeOEs([140]);window._bobGen++;const r=await p;
 T(r===false&&!_oeBobCompleta(C.ordenes[0]),'reload en el medio: no marca completa');
 // períodos
 T(_bobPeriodoIncompleto(new Date('2026-07-01T00:00:00')),'julio: período incompleto');
 T(!_bobPeriodoIncompleto(hace(10)),'últimos 10 días: completo');
 C.bobinas_prod=[];reqs=0;const n=await _traerBobinasHistoricas();
 T(n===2545&&C._historicasCargadas,'histórico completo paginado ('+n+' en '+reqs+' consultas)');
 T(reqs===3,'3 páginas de 1000');
 T(!_bobPeriodoIncompleto(new Date('2026-05-01T00:00:00'))&&_oeBobCompleta(C.ordenes[0]),'con histórico: todo completo');
 reqs=0;await _traerBobinasHistoricas();T(reqs===0,'no lo vuelve a bajar');
 // repintar: una sola vez, y nunca en bucle
 C._historicasCargadas=false;C.bobinas_prod=[];window._bobGen++;
 let pint=0;const rep=()=>{pint++;_bobAsegurarYRepintar('x',_bobPeriodoIncompleto('2026-07-01'),_traerBobinasHistoricas,rep);};
 _bobAsegurarYRepintar('x',true,_traerBobinasHistoricas,rep);_bobAsegurarYRepintar('x',true,_traerBobinasHistoricas,rep);
 await new Promise(r=>setTimeout(r,30));
 T(pint===1,'repinta UNA vez aunque se pida dos ('+pint+')');
 // error de red: avisa y no repinta en bucle
 C._historicasCargadas=false;window._bobGen++;fallar=true;global._toast=null;let p2=0;
 _bobAsegurarYRepintar('y',true,_traerBobinasHistoricas,()=>p2++);await new Promise(r=>setTimeout(r,30));
 T(p2===0&&/incompletos/.test(global._toast||''),'si falla la red avisa y no repinta');
 fallar=false;
 // enganches en el HTML
 const has=(re,m)=>T(re.test(src),m);
 has(/async function imprimirOrden\(id, tipo\)\{[\s\S]{0,400}_completarBobinasDeOEs\(\[id\]\)/,'🖨️ de la OE completa antes de imprimir');
 has(/async function verDetalleOrden\(id\)\{[\s\S]{0,200}_completarBobinasDeOEs\(\[id\]\)/,'📊 Detalle completa antes de mostrar');
 has(/async function verLotesDeOE[\s\S]{0,300}_completarBobinasDeOEs\(\[oeId\]\)/,'📦 Lotes de la OE');
 has(/async function verLotesDePedido[\s\S]{0,900}_completarBobinasDeOEs\(/,'📦 Lotes del pedido');
 has(/renderResumenOE\(\);\n  \/\/ 28c[\s\S]{0,300}_bobAsegurarYRepintar\('ordenes'/,'lista de OE');
 has(/function renderHistorial\(\)\{\n  \/\/ 28c[\s\S]{0,300}_bobAsegurarYRepintar\('historial'/,'Historial');
 has(/_bobAsegurarYRepintar\('costos'[^\n]*comp\.ini[^\n]*renderCostos\)/,'Costos, con la comparación');
 has(/_bobAsegurarYRepintar\('rent'[^\n]*comp\.ini[^\n]*renderRentabilidad\)/,'Rentabilidad, con la comparación');
 has(/async function cargarBobinasHistoricas\(\)\{[\s\S]{0,400}await _traerBobinasHistoricas\(\)/,'el botón de Stock usa la misma descarga');
 console.log((bad?'✖ ':'✓ ')+ok+' ok · '+bad+' fallas');process.exit(bad?1:0);
})();
