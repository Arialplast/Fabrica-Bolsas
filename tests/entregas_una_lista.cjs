// 22v: Entregas = sólo Cumplido; nada del menú ni de las pantallas lleva a la Torre ni a «Plata por pedido»
const fs=require('fs');const s=fs.readFileSync(process.argv[2],'utf8');let f=0;const ok=(c,m)=>{if(!c){f++;console.log('✗ '+m);}};
const ent=s.match(/const ENT_TABS=\[(.*?)\];/)[1];
ok(/cumplimiento/.test(ent)&&!/torre-entregas|programacion/.test(ent),'ENT_TABS sólo con Cumplido');
ok(!/go\(\\?'torre-entregas\\?'\)/.test(s),'no quedan enlaces go(torre-entregas)');
ok(/function irCompromisos\(\)\{try\{CEN\.tab='compromisos';\}catch\(e\)\{\}go\('centro'\);\}/.test(s),'irCompromisos existe');
ok((s.match(/irCompromisos\(\)/g)||[]).length>=6,'los enlaces van a Compromisos');
ok(/G\.tabs\.length<2/.test(s),'un grupo de una sola pestaña no dibuja barra');
const prog=s.match(/tit:'📅 Programa de producción'.*?\]\}/s)[0];
ok(/t:'programacion',i:'🧮 Qué producir y comprar'/.test(prog),'Qué producir vive en Programa de producción');
ok(!/data-tab="grilla"/.test(s)&&/let _prgTab='producir'/.test(s),'la grilla de plata ya no es pestaña');
ok(!/Plata por pedido<\/div>|💰 Plata por pedido'/.test(s),'no queda el título Plata por pedido');
console.log(f?('FALLÓ '+f):'OK entregas_una_lista');process.exit(f?1:0);
