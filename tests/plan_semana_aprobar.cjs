// 25h: aprobar el plan de la semana y controlarlo contra lo extruido
const fs=require('fs');const s=fs.readFileSync(process.argv[2],'utf8');
let ok=true;const t=(n,c)=>{if(!c){ok=false;console.error('✗ '+n);}else console.log('✓ '+n);};
const i=s.indexOf('function _ps2Control(');const j=s.indexOf('window._ps2Real={};',i);
const K=new Function(s.slice(i,j)+';return _ps2Control;')();
const foto={oes:[{id:1,num:'ORD-1',kg:1000},{id:2,num:'ORD-2',kg:500},{id:3,num:'ORD-3',kg:200}]};
const a=K(foto,{1:980,2:200,9:300},true);
t('cumplida, a medias y no se hizo',a.filas[0].est==='ok'&&a.filas[1].est==='parcial'&&a.filas[2].est==='no');
t('lo hecho no pasa lo comprometido por orden',a.hecho===1180&&a.comp===1700);
t('lo extruido en órdenes no aprobadas va aparte',a.fuera===300);
t('semana en curso: lo que no arrancó está «todavía no»',K(foto,{},false).filas[2].est==='pend');
const b=K(foto,{1:1500},true);t('si se extruye de más, cuenta hasta lo comprometido',b.hecho===1000&&b.filas[0].real===1500);
t('se guarda en planes_semana (una por semana)',/sb\.from\('planes_semana'\)\.upsert\(\{semana:X\.lunS,foto:X\.foto/.test(s)&&/onConflict:'semana'/.test(s));
t('aprobar pide clave',/pedirAdminYEjecutar\(async\(\)=>\{const\{data,error\}=await sb\.from\('planes_semana'\)/.test(s));
t('semanas pasadas: sólo el control',/if\(_prgSem<0\)\{_ps2RenderPasada\(cont\);return;\}/.test(s)&&/_prgSem=Math\.max\(-8,/.test(s));
t('compra: descuenta lo ya pedido y arma la orden de compra',/Ya pedido/.test(s)&&/const fp=r2\(Math\.max\(0,x\.falta-yp\.kg\)\)/.test(s)&&/🛒 Armar orden de compra/.test(s));
process.exit(ok?0:1);
