// 23k: fecha de cobro según cómo cobra el cliente
const fs=require('fs');const src=fs.readFileSync(process.argv[2],'utf8');let f=0;const A=(c,m)=>{if(!c){f++;console.log('✗ '+m);}};
const one=n=>{const i=src.indexOf('function '+n+'(');return src.slice(i,src.indexOf('\n',i));};
const blk=n=>{const i=src.indexOf('function '+n+'(');return src.slice(i,src.indexOf('\n}\n',i)+2);};
const CLI_MENSUAL_DIA=5;eval(one('_cliCobroMensual'));eval(blk('_cobroFechaRegimen'));
const D=(y,m,d)=>new Date(y,m-1,d);const s=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const hoy=D(2026,11,21);
A(s(_cliCobroMensual(D(2026,11,3)))==='2026-12-05'&&s(_cliCobroMensual(D(2026,11,30)))==='2026-12-05','lo entregado en noviembre se cobra el 5/12');
A(s(_cliCobroMensual(D(2026,12,15)))==='2027-01-05','diciembre → 5 de enero');
// por cada entrega: nada cambia (incluso con fecha pasada)
let q=_cobroFechaRegimen('entrega',D(2026,11,16),D(2026,11,27),30,hoy);A(s(q.fechaCobro)==='2026-12-16'&&s(q.fechaEntrega)==='2026-11-16','por cada entrega: como siempre');
// pedido completo: BIO-LIMP PED-06164, escrito 16/11 (pasado), el Programa lo termina el 27/11, 0 días de crédito
q=_cobroFechaRegimen('completo',D(2026,11,16),D(2026,11,27),0,hoy);A(s(q.fechaCobro)==='2026-11-27','pedido completo: se cobra cuando el Programa lo termina');
// sin fecha del Programa y fecha escrita en el pasado: no antes de hoy
q=_cobroFechaRegimen('completo',D(2026,11,13),null,0,hoy);A(s(q.fechaCobro)==='2026-11-21','un pedido atrasado sin entregar no es una factura vencida');
q=_cobroFechaRegimen('completo',D(2026,12,10),null,30,hoy);A(s(q.fechaCobro)==='2027-01-09','sin Programa y fecha futura: fecha escrita + plazo');
// mensual: el plazo no cuenta, manda el mes de entrega
q=_cobroFechaRegimen('mensual',D(2026,11,10),D(2026,12,2),30,hoy);A(s(q.fechaCobro)==='2027-01-05','mensual: entrega en diciembre → 5 de enero');
A(/const _reg=\(cli&&typeof _cliRegimen==='function'\)\?_cliRegimen\(cli\.id\):'entrega';/.test(src)&&/if\(reg==='mensual'\)return dStr\(_cliCobroMensual/.test(src),'los dos derivadores de caja usan el régimen');
console.log(f?('FALLÓ '+f):'OK cobro_regimen');process.exit(f?1:0);
