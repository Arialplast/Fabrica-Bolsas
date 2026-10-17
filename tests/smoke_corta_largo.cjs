// smoke 17e — 📏 corta largo: golpes de las tiradas terminadas contra las bobinas; nivel del aviso con
// las medidas escritas en la OC. Y ✋ carga a mano en la impresora (qué bobina y qué acción).
// uso: TZ=America/Argentina/Buenos_Aires node tests/smoke_corta_largo.cjs fabrica_bolsas_v6.html
const fs=require('fs');const src=fs.readFileSync(process.argv[2]||'fabrica_bolsas_v6.html','utf8');
let ok=0,bad=0;const t=(c,m)=>{if(c)ok++;else{bad++;console.log('✗ '+m);}};
const a=src.indexOf('// ===== ✂ CORTE EN VIVO (15b) =====');const b=src.indexOf('function _cvvCard(');
global.C={empleados:[],maq_corte:[{id:1,nombre:'CORTE-01'}],productos:[]};global.escapeHtml=x=>String(x==null?'':x);global._plcHora=s=>'';
eval(src.slice(a,b).replace('const CVV=','global.CVV=').replace('const CVV_PAUSA_MIN=3,CVV_LARGA_MIN=20;','global.CVV_PAUSA_MIN=3;global.CVV_LARGA_MIN=20;').replace('const _CVV_OPCOL','global._CVV_OPCOL').replace('const CL_UMBRAL=','global.CL_UMBRAL='));
const i=src.indexOf('// ===== 📏 CORTA LARGO: AVISO EN VIVO (17e) =====');const j=src.indexOf('async function _clCargar(',i);
eval(src.slice(i,j).replace('const CL=','global.CL='));
const T=s=>new Date('2026-10-17T'+s+'-03:00').getTime();
const bob=(m,ts)=>({maquina_id:1,t:T(ts),metros_usados:m,bobinas_producidas:{}});
const td=(ts,g)=>({ti:T(ts),tf:T(ts)+g*1600,golpes:g,sin_hora:false});
// caso OC-1052961: primer par de 1.420 m a 0,88 → tenía que hacer 1.614 golpes; hizo 1.542
const tds=[];for(let k=0;k<1542/5;k++)tds.push({ti:T('04:31:00')+k*12000,tf:T('04:31:00')+k*12000+8000,golpes:5,sin_hora:false});
tds.push(td('05:41:00',300));
const o={cargas:[bob(1420,'04:27:38'),bob(1420,'04:27:41'),bob(1405,'05:37:50'),bob(1174,'05:38:00')],tds};
const ev=_clEvaluar(o,0.88);
t(ev&&ev.n===1&&ev.golpes===1545,'sólo la tirada terminada ('+(ev&&ev.golpes)+')');
t(ev&&Math.round(ev.esp)===1614&&ev.dev<-0.04,'tenía que hacer 1.614 → −4,6 % ('+(ev&&(ev.dev*100).toFixed(1))+')');
t(ev&&Math.round(ev.lEst*100)===92,'bolsa estimada ≈ 92 cm ('+(ev&&ev.lEst)+')');
t(_clNivel(ev,[],0.88).nivel==='rojo','sin medida → rojo con alarma');
t(_clNivel(ev,[{t:'2026-10-17 05:45',quien:'X',cm:92}],0.88).porMedida,'medida 92 cm → rojo «corregí la máquina»');
t(_clNivel(ev,[{t:'2026-10-17 05:45',quien:'X',cm:92},{t:'2026-10-17 06:10',quien:'X',cm:88}],0.88).nivel==='ambar','corrigió y midió 88 → ámbar sin alarma');
t(_clNivel({dev:-0.02,golpes:1500},[],0.88)===null,'−2 % (enhebrado) → sin aviso');
t(_clNivel({dev:-0.06,golpes:200},[],0.88)===null,'pocos golpes → sin aviso');
t(_clNivel(null,[{t:'x',quien:'y',cm:93}],0.88).nivel==='rojo','medida larga aunque no haya tirada terminada → rojo');
t(_clEvaluar({cargas:[bob(1420,'04:27:38'),bob(1420,'04:27:41')],tds},0.88)===null,'una sola tirada (en curso) → no evalúa');
const m=_clMedidas('x [📏 Bolsa medida 2026-10-17 05:45 por GUARAZ SERGIO: 92,5 cm (ficha 88)] y');
t(m.length===1&&m[0].cm===92.5&&m[0].quien==='GUARAZ SERGIO','lee la medida de la OC');
// ✋ impresora a mano
const k=src.indexOf('function _impmBuscar(');eval(src.slice(k,src.indexOf('function _impmPreview(',k)));
global._repNormNro=x=>{const s=String(x||'').trim().toUpperCase();const mm=s.match(/(\d+)\s*$/);return mm?'BOB-'+mm[1].replace(/^0+/,'').padStart(5,'0'):s;};
global.IMP={rows:[{bobina_producida_id:2,estado:'imprimiendo'},{bobina_producida_id:3,estado:'impresa'}]};
C.bobinas_prod=[{id:1,numero_bobina:'BOB-07104',en_stock:true,orden_id:500},{id:2,numero_bobina:'BOB-07105',en_stock:true},{id:3,numero_bobina:'BOB-07106',en_stock:true},{id:4,numero_bobina:'BOB-07107',en_stock:true,orden_id:501}];
global._bobDuenaViva=b=>b.orden_id===500?{numero_orden:'OC-1052958',cliente:'SOLBAYRES',producto_id:1}:b.orden_id===501?{numero_orden:'OC-X',producto_id:2}:null;
global._impEsImpresa=oc=>oc.producto_id===1;
t(_impmBuscar('7104').accion==='entrada'&&_impmBuscar('7104').oc.numero_orden==='OC-1052958','7104 → entra (Solbayres)');
t(_impmBuscar('7105').accion==='salida','7105 está en la impresora → sale');
t(/ya se imprimió/.test(_impmBuscar('7106').err),'7106 ya impresa → no');
t(/no lleva impresión/.test(_impmBuscar('7107').err),'7107 de OC sin impresión → no');
t(/No encuentro/.test(_impmBuscar('9999').err),'número inexistente');
console.log((bad?'FALLA':'OK')+' smoke_corta_largo: '+ok+' ok, '+bad+' mal');process.exit(bad?1:0);
