// Smoke del remito en blanco formato ARIALPLAST (30b).
// Uso: TZ=America/Argentina/Buenos_Aires node tests/smoke_remito_formal.cjs fabrica_bolsas_v6.html [salida.html]
const fs = require('fs');
const src = fs.readFileSync(process.argv[2] || 'fabrica_bolsas_v6.html', 'utf8');
const ini = src.indexOf('// ===== 🧾 REMITO EN BLANCO');
const fin = src.indexOf('// ===== CORREGIR PRECIOS DE UN REMITO');
if (ini < 0 || fin < ini) { console.error('No encontré el bloque'); process.exit(1); }
let ok = 0, mal = 0; const t = (c, m) => { if (c) ok++; else { mal++; console.log('✗ ' + m); } };

let cfg = {};
globalThis.getCfg = (k, d) => cfg[k] !== undefined ? cfg[k] : d;
globalThis.escapeHtml = s => s == null ? '' : String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let impreso = null;
globalThis._imprimirHTML = (h) => { impreso = h; };
globalThis.planoRemito = r => r.plano;
globalThis.getPaqBolsonAplicable = () => null;
const cli = { id: 47, nombre: 'LYME SA', razon_social: 'LYME S. A.', condicion_iva: 'con_iva', cuit: '30-63935839-5', direccion: 'MONTES DE OCA MANUEL 1764 Piso:9 Dpto:B', localidad: 'LA PLATA', provincia: 'CIUDAD AUTONOMA DE BUENOS AIRES', codigo_postal: 'CP: 1270' };
globalThis.C = {
  productos: [{ id: 19, codigo: '00408', descripcion: 'BOLSA RESIDUO GRANEL NEGRA 45X50  POLIPLAST X 1UND', paquetes_por_bolson: 1000 },
              { id: 20, codigo: '00409', descripcion: 'BOLSA RESIDUO GRANEL NEGRA 60X80  POLIPLAST X 1UND', paquetes_por_bolson: 500 },
              { id: 21, codigo: '00123', descripcion: 'BOLSA 40X50 X 50', paquetes_por_bolson: 10 }],
  pedidos: [{ id: 355, numero_pedido: 'PED-06042', cliente_id: 47, pedido_ordenes_corte: [] }],
  clientes: [cli],
  remitos: [
    { id: 602, numero_remito: 'REM-00597', pedido_id: 355, cliente_id: 47, cliente: 'LYME SA', fecha: '2026-09-29', plano: 'formal',
      remito_lineas: [{ producto_id: 19, cantidad_paquetes: 11000, cantidad_unidades: 11000 }, { producto_id: 20, cantidad_paquetes: 7500, cantidad_unidades: 7500 }] },
    { id: 700, numero_remito: 'REM-00700', pedido_id: null, cliente_id: 47, cliente: 'LYME SA', fecha: '2026-09-30', plano: 'informal',
      remito_lineas: [{ producto_id: 21, cantidad_paquetes: 40, cantidad_unidades: 2000 }] },
    { id: 701, numero_remito: 'REM-00701', pedido_id: null, cliente_id: 47, cliente: 'LYME SA', fecha: '2026-09-30', plano: 'formal', observaciones: 'Entregar <por> portón',
      remito_lineas: [{ producto_id: 21, cantidad_paquetes: 40, cantidad_unidades: 2000 }] },
  ],
};
eval(src.slice(ini, fin));

// formal real
imprimirRemito(602);
const h = impreso;
t(h.includes('REMITO&nbsp; REM-00597'), 'sin PV configurado: número del sistema');
t(h.includes('Fecha:&nbsp;&nbsp; 29/09/2026'), 'fecha dd/mm/aaaa');
t(h.includes('CODIGO Nº91') && h.includes('>R<'), 'letra R código 91');
t(h.includes('30-71415773-2') && h.includes('EXENTO') && h.includes('07/2015'), 'datos fiscales de la empresa');
t(h.includes('LYME S. A.') && h.includes('RESPONSABLE INSCRIPTO') && h.includes('30-63935839-5'), 'datos del cliente');
t(h.includes('1270 LA PLATA') && !h.includes('CP: 1270'), 'CP limpio');
t(h.includes('>11.000<') && h.includes('>7.500<'), 'cantidades');
t(/c-bul">11</.test(h) && /c-bul">15</.test(h) && /c-bul">26</.test(h), 'bultos 11 + 15 = 26');
t(h.includes('data:image/jpeg;base64,/9j/'), 'logo embebido');
t(h.includes('RECIBI CONFORME') && h.includes('Documento No Válido como Factura'), 'pie y leyenda');
t(h.includes('Pedido PED-06042'), 'pedido asociado');
if (process.argv[3]) fs.writeFileSync(process.argv[3], h);

// PV configurado
cfg.remito_formal_pv = '2';
imprimirRemito(602);
t(impreso.includes('REMITO&nbsp; 0002-00000597'), 'con PV: PPPP-NNNNNNNN');
cfg = {};

// paquetes ≠ unidades, escape y entrega propia
cli.direccion_entrega = '3 E44 Y45\n(1900) LA PLATA';
imprimirRemito(701);
t(impreso.includes('>2.000<') && impreso.includes('40 paq'), 'cantidad en unidades + paquetes');
t(impreso.includes('Entregar &lt;por&gt; portón'), 'observaciones escapadas');
t(impreso.includes('3 E44 Y45<br>(1900) LA PLATA'), 'lugar de entrega propio');

// informal no cambia
impreso = null; imprimirRemito(700);
t(impreso && !impreso.includes('CODIGO Nº91') && impreso.includes('Firma y sello empresa'), 'informal sigue con el formato viejo');

console.log((mal ? '✗ ' : '✓ ') + ok + ' ok, ' + mal + ' mal'); process.exit(mal ? 1 : 0);
