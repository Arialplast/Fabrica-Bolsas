// smoke 30a — NC/ND: factura asociada desde el número + traba de aumento repetido
// uso: node tests/smoke_arca_asociada.cjs fabrica_bolsas_v6.html
const fs=require('fs');const src=fs.readFileSync(process.argv[2]||'fabrica_bolsas_v6.html','utf8');
const grab=(i,f)=>{const a=src.indexOf(i),b=src.indexOf(f,a);if(a<0||b<0){console.log('FALTA '+i);process.exit(1);}return src.slice(a,b);};
eval(grab('function _arcaAsociada(','async function solicitarCAE('));
eval(grab('const AUM_REPETIDO_DIAS=','async function _aumGuardar(').replace('const AUM_REPETIDO_DIAS','var AUM_REPETIDO_DIAS'));
let ok=0,bad=0;const t=(x,m)=>{if(x)ok++;else{bad++;console.log('✗ '+m);}};
const F=[{id:160,cliente_id:19,tipo:'A',numero:'0005-00000026',arca_numero:'0005-00000026',punto_venta:'1',fecha:'2026-10-27',cae:'x',total:905660.8},
         {id:114,cliente_id:77,tipo:'A',numero:'0001-00000026',fecha:'2026-09-07',cae:null,total:1}];
const CL=[{id:19,razon_social:'ROBERTO HECTOR COLLINET'}];
let r=_arcaAsociada('nc',{cliente_id:19,doc_tipo:'factura',doc_id:160},F,CL);
t(r.pv===5&&r.nro===26&&/0005-00000026/.test(r.txt)&&/COLLINET/.test(r.txt),'Collinet: PV 5 Nº 26 aunque punto_venta=1 → '+r.txt);
t(_arcaAsociada('nc',{cliente_id:77,doc_tipo:'factura',doc_id:160},F,CL).error,'otro cliente → error');
t(_arcaAsociada('nd',{entidad_id:19,doc_tipo:'factura',doc_id:160},F,CL).pv===5,'ND con entidad_id → ok');
t(_arcaAsociada('nc',{cliente_id:77,doc_tipo:'factura',doc_id:114},F,CL).error,'factura sin CAE → error');
t(_arcaAsociada('nc',{cliente_id:19,doc_tipo:'rv',doc_id:1},F,CL).error,'no corrige factura → error');
t(_arcaAsociada('nc',{cliente_id:19,doc_tipo:'factura',doc_id:160},[{...F[0],numero:'26',arca_numero:null}],CL).error,'número ilegible → error');
// aumento repetido
t(_aumRecienteDesde('2026-08-20',30)==='2026-07-21','ventana 30 días');
const hist=[{producto_id:37,fecha:'2026-08-18',precio_paquete_ant:554.43,precio_paquete_nuevo:598.78,origen:'aumento'},
            {producto_id:50,fecha:'2026-08-11',precio_paquete_ant:718.7,precio_paquete_nuevo:718.7,origen:'aumento'},
            {producto_id:99,fecha:'2026-08-18',precio_paquete_ant:900,precio_paquete_nuevo:850,origen:'aumento'}];
const sube=[{pid:37,prod:{descripcion:'45X60'},hoyPaq:598.78,nuevoPaq:646.68},{pid:50,prod:{descripcion:'50X70'},hoyPaq:718.7,nuevoPaq:776.2},{pid:99,prod:{},hoyPaq:850,nuevoPaq:900}];
const rep=_aumRepetidos(sube,hist);
t(rep.length===1&&rep[0].pid===37&&rep[0].fecha==='2026-08-18','el caso Collinet 20/08 se detecta (solo el que ya subió)');
t(_aumRepetidos(sube,[]).length===0,'sin aumentos previos → no traba');
console.log((bad?'✗ ':'✓ ')+ok+' ok · '+bad+' fallas');process.exit(bad?1:0);
