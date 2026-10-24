// smoke 24b — turnos en ✂ Corte en vivo
// uso: TZ=America/Argentina/Buenos_Aires node tests/smoke_cvv_turnos.cjs fabrica_bolsas_v6.html
const fs=require('fs');const src=fs.readFileSync(process.argv[2]||'fabrica_bolsas_v6.html','utf8');
const a=src.indexOf('// ===== ✂ CORTE EN VIVO (15b) =====');const b=src.indexOf('function _cvvCard(');
if(a<0||b<a||src.indexOf('function _cvvPorTurno(')<a||src.indexOf('function _cvvPorTurno(')>b){console.log('FALTA el bloque');process.exit(1);}
let ok=0,bad=0;const t=(c,m)=>{if(c)ok++;else{bad++;console.log('✗ '+m);}};
global.C={empleados:[{id:1,apellido_nombre:'Araujo Celia'},{id:2,apellido_nombre:'Pavoni Mauro'}],maq_corte:[{id:1,nombre:'CORTE-01'},{id:2,nombre:'CORTE-02'}]};
global.escapeHtml=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
global._evvF=(n,d)=>(n==null||!isFinite(n))?'—':Number(n).toLocaleString('es-AR',{minimumFractionDigits:d||0,maximumFractionDigits:d||0});
global._plcHora=iso=>new Date(iso).toTimeString().slice(0,5);
eval(src.slice(a,b).replace('const CVV=','global.CVV=').replace('const CVV_PAUSA_MIN=3,CVV_LARGA_MIN=20;','global.CVV_PAUSA_MIN=3;global.CVV_LARGA_MIN=20;').replace('const _CVV_OPCOL','global._CVV_OPCOL').replace('const CVV_F_CAMBIO','global.CVV_F_CAMBIO').replace('const CL_UMBRAL','global.CL_UMBRAL'));
const T=s=>new Date('2026-10-'+s+'-03:00').getTime();
// cortes de turno
t(_cvvTurnoIni(T('23T10:30:00'))===T('23T06:00:00'),'10:30 → mañana 06');
t(_cvvTurnoIni(T('23T14:00:00'))===T('23T14:00:00'),'14:00 → tarde 14');
t(_cvvTurnoIni(T('23T23:10:00'))===T('23T22:00:00'),'23:10 → noche 22');
t(_cvvTurnoIni(T('24T03:00:00'))===T('23T22:00:00'),'03:00 → noche del día anterior');
t(_cvvTurnoNom(T('23T06:00:00'))==='Mañana'&&_cvvTurnoNom(T('23T14:00:00'))==='Tarde'&&_cvvTurnoNom(T('23T22:00:00'))==='Noche','nombres');
t(_cvvT0('H',T('24T03:00:00'))===T('23T06:00:00')&&_cvvT0('H',T('23T09:00:00'))===T('23T06:00:00'),'hoy = desde las 06');
t(_cvvT0(8,T('23T09:00:00'))===T('23T01:00:00'),'8 h siguen igual');
t(_cvvTurnosEntre(T('23T07:00:00'),T('23T23:00:00')).map(x=>x.nom).join()==='Mañana,Tarde,Noche','turnos entre 07 y 23');
// resumen por turno
const td=(maq,ini,min,g,emp,oc)=>({maquina:maq,ti:T(ini),tf:T(ini)+min*60000,golpes:g,emp,oc,sin_hora:false});
const tandas=[
  td(1,'23T07:00:00',60,1000,1,10),td(1,'23T08:30:00',60,1000,1,10),   // mañana: C1 2 h, parada 30 min
  td(2,'23T13:50:00',20,300,1,null),                                    // mañana (antes de las 14): sin escanear
  td(1,'23T15:00:00',120,2000,2,10)];                                   // tarde
const cargas=[{t:T('23T06:55:00'),maquina_id:1,empleado_id:1,orden_corte_id:10},{t:T('23T14:50:00'),maquina_id:1,empleado_id:2,orden_corte_id:10}];
const turnos={1:[[T('23T06:00:00'),T('23T15:00:00')]],2:[[T('23T14:30:00'),T('23T18:00:00')]]};
global.CVV.maqs=[1,2];
const D={ahora:T('23T18:00:00'),t0:T('23T10:00:00'),tandas,cargas,turnos,ocsR:[{id:10,pistas:2}]};
const L=_cvvPorTurno(D);
t(L.length===2&&L[0].nom==='Tarde'&&L[1].nom==='Mañana','2 turnos, el más nuevo arriba ('+L.map(x=>x.nom)+')');
const M=L[1],Ta=L[0];
t(M.golpes===2300&&M.maq[0].golpes===2000&&M.maq[1].golpes===300,'mañana: 2.000 C1 + 300 C2 (turno entero aunque el período empiece 10:00)');
t(M.bolsas===4000,'mañana: bolsas = golpes con OC × pistas ('+M.bolsas+')');
t(M.sinEsc===300,'mañana: 300 sin escanear');
t(M.nL===1&&Math.round(M.mL/60000)===30,'mañana: 1 parada > 20 min de 30 min');
t(Math.abs(M.maq[0].uso-(120*60000+4000)/(8*3600000))<1e-9,'uso C1 mañana = cortando ÷ 8 h');
t(M.fich===8*3600000&&M.ops.join()==='Araujo Celia','fichado: Celia 06–14 dentro del turno');
t(Ta.enCurso&&Ta.golpes===2000&&Ta.fich===3.5*3600000&&Ta.ops.join()==='Pavoni Mauro','tarde en curso, Pavoni fichado 3 h 30');
const h=_cvvPorTurnoHTML(D);
t(h.indexOf('en curso')>0&&h.indexOf('Mañana')>0&&h.indexOf('4.000')>0,'tabla por turno');
// turno sin nadie no aparece
t(_cvvPorTurno(Object.assign({},D,{ahora:T('24T02:00:00')})).every(r=>r.nom!=='Noche'),'noche sin actividad: no aparece');
console.log((bad?'MAL':'OK')+' smoke_cvv_turnos: '+ok+' ok, '+bad+' mal');process.exit(bad?1:0);
