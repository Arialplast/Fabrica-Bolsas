// smoke 26a — plano habitual del cliente en el pedido nuevo
// uso: TZ=America/Argentina/Buenos_Aires node tests/smoke_plano_habitual.cjs fabrica_bolsas_v6.html
const fs=require('fs');
const src=fs.readFileSync(process.argv[2]||'fabrica_bolsas_v6.html','utf8');
const a=src.indexOf('function _cliPlanoHabitual'),b=src.indexOf('// Tipo de venta',a);if(a<0)throw new Error('no está');
eval(src.slice(a,b));
let ok=0,bad=0;const t=(c,m)=>{if(c)ok++;else{bad++;console.error('✗ '+m);}};
const P=(id,cli,tv,f,est)=>({id,cliente_id:cli,tipo_venta:tv,fecha_pedido:f,estado:est||'Entregado'});
const ps=[P(1,51,'negro','2026-09-01'),P(2,51,'negro','2026-09-10'),P(3,51,'negro','2026-09-20'),P(4,51,'negro','2026-10-01'),P(5,51,'negro','2026-10-13'),
  P(6,1,'blanco','2026-10-01'),P(7,1,'negro','2026-10-02'),P(8,1,'blanco','2026-10-03'),P(9,1,'negro','2026-10-04'),
  P(10,9,'negro','2026-10-01'),P(11,9,'blanco','2026-10-02','Cancelado'),P(12,9,'blanco','2026-10-03','Cancelado')];
let H=_cliPlanoHabitual(51,ps);t(H&&H.tipo==='negro'&&H.n===5&&H.tot===5,'Muñoz: habitual negro 5/5');
t(_cliPlanoHabitual(1,ps)===null,'cliente mitad y mitad → sin habitual');
t(_cliPlanoHabitual(9,ps)===null,'un solo pedido no cancelado → sin habitual');
t(_cliPlanoHabitual(77,ps)===null,'cliente nuevo → sin habitual');
const ps2=ps.concat([P(13,51,'blanco','2026-10-20')]);H=_cliPlanoHabitual(51,ps2);t(H&&H.tipo==='negro'&&H.n===5&&H.tot===6,'5 de 6 sigue negro');
t(_cliPlanoHabitual(51,ps2,13).tot===5,'excluye el pedido indicado');
t(/window\._v2TvManual=true;onV2TipoVentaChange\(\)/.test(src),'radio marca toque manual');
t(/compra '\+H\.tipo\.toUpperCase\(\)/.test(src),'pregunta al grabar');
console.log(ok+' ok, '+bad+' mal');process.exit(bad?1:0);
