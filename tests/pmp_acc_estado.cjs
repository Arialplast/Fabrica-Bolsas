// 23f: estado de las acciones del plan de 8 semanas y cuándo dejan de sumarse
const fs=require('fs');const src=fs.readFileSync(process.argv[2],'utf8');let f=0;const A=(c,m)=>{if(!c){f++;console.log('✗ '+m);}};
const cut=(a,b)=>{const i=src.indexOf(a);return src.slice(i,src.indexOf(b,i));};
eval(cut('const PMP_EST=','// Pura: acciones → efecto por semana'));
const i=src.indexOf('function _pmpEfectos(');eval(src.slice(i,src.indexOf('\n}\n',i)+2));
const hoy='2026-11-20';
A(_pmpAccCuenta({t:'paradas'},hoy).cuenta&&_pmpAccCuenta({t:'paradas',est:'curso'},hoy).cuenta,'propuesta y en marcha suman');
A(!_pmpAccCuenta({t:'cortador',est:'cancel'},hoy).cuenta,'descartada no suma');
A(!_pmpAccCuenta({t:'cortador',est:'hecha',hechaEl:hoy},hoy).cuenta,'cortador hecho: ya está en el Rol, no suma dos veces');
A(!_pmpAccCuenta({t:'ext_maq',est:'hecha',hechaEl:hoy},hoy).cuenta,'extrusora hecha: ya está en la base');
A(_pmpAccCuenta({t:'paradas',est:'hecha',hechaEl:'2026-11-10'},hoy).cuenta,'paradas hecha hace 10 días: sigue sumando');
A(!_pmpAccCuenta({t:'paradas',est:'hecha',hechaEl:'2026-10-20'},hoy).cuenta,'paradas hecha hace 31 días: ya es base');
A(_pmpDias('2026-10-23','2026-11-20')===28,'28 días justos');
// historial
A(!_pmpAccArchivable({t:'ext_maq',est:'hecha',hechaEl:hoy},hoy,false),'extrusora recién arrancada: todavía no se archiva');
A(_pmpAccArchivable({t:'ext_maq',est:'hecha',hechaEl:hoy},hoy,true),'extrusora con historia propia: es una máquina más');
A(_pmpAccArchivable({t:'cli_rec',est:'hecha',hechaEl:'2026-10-01'},hoy)&&!_pmpAccArchivable({t:'cli_rec',est:'hecha',hechaEl:'2026-11-15'},hoy),'las demás, a los 28 días');
A(!_pmpAccArchivable({t:'paradas',est:'curso'},hoy),'en marcha no se archiva');
// los efectos respetan el estado
const ctx={hoy,ociosas:{4:{kgSem:1000}},fers:[],M:2,hSemC:100};
const e1=_pmpEfectos([{t:'ext_maq',ext:4,desde:0,hasta:3}],4,ctx);A(e1[0].dKgE===1000,'propuesta: suma');
const e2=_pmpEfectos([{t:'ext_maq',ext:4,desde:0,hasta:3,est:'cancel'}],4,ctx);A(e2[0].dKgE===0,'descartada: no suma');
const e3=_pmpEfectos([{t:'ext_maq',ext:4,desde:0,hasta:3,est:'hecha',hechaEl:hoy}],4,ctx);A(e3[0].dKgE===0,'hecha: no suma dos veces');
A(/pmpAccEst\('\+i\+',/.test(src)&&/_peTacPmpHtml\(t\.id\)/.test(src)&&/Sin acciones nuevas/.test(src),'estado en pantalla, vínculo con el Plan de empresa y redacción');
A(!/contra no hacer nada|sin hacer nada quedaban/.test(src),'ya no dice «no hacer nada»');
console.log(f?('FALLÓ '+f):'OK pmp_acc_estado');process.exit(f?1:0);
