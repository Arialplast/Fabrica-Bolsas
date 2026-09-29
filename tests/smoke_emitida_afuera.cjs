// Smoke 28h — comprobantes emitidos en Flexxus no ofrecen CAE
const fs=require('fs');const src=fs.readFileSync(process.argv[2]||'fabrica_bolsas_v6.html','utf8');
const cut=(a,b)=>{const i=src.indexOf(a),j=src.indexOf(b,i);if(i<0||j<0)throw new Error('no encontré '+a);return src.slice(i,j);};
global.escapeHtml=s=>String(s??'');global._estadoFactura=f=>f.estado||'pendiente';global._arcaEsProd=()=>true;
(0,eval)(cut('function _caeEstado(','// Pie fiscal'));
(0,eval)(cut('function _arcaAplica(','// El ambiente tiene que estar'));
let ok=0,mal=0;const t=(n,c)=>{if(c)ok++;else{mal++;console.log('✗',n);}};
const ext={id:1,cae:null,cae_estado:'externo'},sin={id:2,cae:null,cae_estado:null},aut={id:3,cae:'123',cae_estado:'autorizado'};
t('estado externo',_caeEstado(ext).cod==='externo');
const bE=_caeBotones('factura',ext);
t('externo sin boton CAE',!bE.includes('solicitarCAE'));
t('externo muestra Flexxus',bE.includes('📄 Flexxus')&&bE.includes('desmarcarEmitidaAfuera'));
const bS=_caeBotones('factura',sin);
t('sin CAE ofrece CAE y marcar',bS.includes('solicitarCAE')&&bS.includes('marcarEmitidaAfuera'));
t('autorizada no ofrece marcar',!_caeBotones('factura',aut).includes('marcarEmitidaAfuera'));
t('NC externa sin boton',!_caeBotones('nc',{id:4,cae:null,cae_estado:'externo',doc_tipo:'factura'}).includes('solicitarCAE'));
t('informal sigue sin ir',_caeBotones('nc',{id:5,cae:null,cae_estado:null,plano:'informal'}).includes('no va a ARCA'));
console.log((mal?'✗ ':'✓ ')+ok+' OK, '+mal+' fallas');process.exit(mal?1:0);
