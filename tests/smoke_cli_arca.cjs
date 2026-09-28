// Smoke test 28g — padrón ARCA de clientes (helpers puros + render de la lista)
// Uso: node tests/smoke_cli_arca.cjs fabrica_bolsas_v6.html
const fs = require('fs');
const src = fs.readFileSync(process.argv[2] || 'fabrica_bolsas_v6.html', 'utf8');
const ini = src.indexOf('// ===== 🏛 PADRÓN ARCA DE CLIENTES');
const fin = src.indexOf('async function delCliente(');
if (ini < 0 || fin < 0) { console.error('no encontré el bloque'); process.exit(1); }
let bloque = src.slice(ini, fin);
// el bloque incluye renderClientes/addCliente/editarCliente/guardarEdicionCliente
global.escapeHtml = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
global.condIvaLabel = v => ({ con_iva: 'Resp. Inscripto', monotributo: 'Monotributo', consumidor_final: 'Cons. Final', exento: 'Exento' }[v] || v || '—');
const els = {};
global.document = { getElementById: id => els[id] || null, body: { insertAdjacentHTML: (p, h) => { global._modal = h; } } };
global.C = {
  listas_precios: [{ id: 1, nombre: 'General' }],
  clientes: [
    { id: 1, codigo: '3', nombre: 'PAPELERA FENIX', razon_social: 'SERGIO SEBASTIAN CODAGNONE', cuit: '20-25993104-6', condicion_iva: 'monotributo', arca_verificado_el: '2026-09-28T20:00:00Z', arca_estado: 'ACTIVO', provincia: 'BUENOS AIRES', lista_precio_id: 1 },
    { id: 2, codigo: '9', nombre: 'ROMERO', razon_social: 'ROMERO', cuit: null, condicion_iva: 'con_iva' },
    { id: 3, codigo: '48', nombre: 'STENDEL', razon_social: 'STENDEL', cuit: '23366871349', condicion_iva: 'consumidor_final', arca_verificado_el: '2026-09-28T20:00:00Z', arca_estado: 'SIN INSCRIPCION EN IVA' },
    { id: 4, codigo: '50', nombre: 'NUEVO', razon_social: 'NUEVO SA', cuit: '30-71748066-6', condicion_iva: 'con_iva' },
  ],
};
(0, eval)(bloque);
let ok = 0, mal = 0;
const t = (n, c) => { if (c) ok++; else { mal++; console.log('✗', n); } };

// CUIT
t('cuit valido', _cliCuitValido('20-25993104-6'));
t('cuit valido 30', _cliCuitValido('30714157732'));
t('cuit invalido', !_cliCuitValido('20-13026284-4'));
t('cuit corto', !_cliCuitValido('2013026284'));
t('generico 99 pasa dv pero se trata aparte', _cliCuitValido('99999999995'));
t('digitos', _cliCuitDig('20-25.993.104-6') === '20259931046');

// Badge
t('badge ok verde', /var\(--green\)/.test(_cliArcaBadge(C.clientes[0])));
t('badge raro ambar', /var\(--amber\)/.test(_cliArcaBadge(C.clientes[2])) && /⚠/.test(_cliArcaBadge(C.clientes[2])));
t('badge sin verificar', /sin verificar/.test(_cliArcaBadge(C.clientes[3])));
t('badge sin cuit vacio', _cliArcaBadge(C.clientes[1]) === '');
t('badge largo con fecha', /28\/09\/2026/.test(_cliArcaBadge(C.clientes[0], true)));

// Provincias
const po = _cliProvOpts('CORDOBA');
t('prov seleccionada', /value="CORDOBA" selected/.test(po));
t('caba se muestra corta', />CABA</.test(po));
t('prov desconocida se conserva', /value="PCIA RARA" selected/.test(_cliProvOpts('pcia rara')));
t('sin prov', /— sin provincia —<\/option>/.test(_cliProvOpts(null)) && !/selected/.test(_cliProvOpts(null)));

// Render lista
els['cli-tbl'] = { innerHTML: '' };
renderClientes();
const h = els['cli-tbl'].innerHTML;
t('lista muestra nombre de planta', h.includes('>PAPELERA FENIX'));
t('lista muestra razón social abajo', h.includes('SERGIO SEBASTIAN CODAGNONE'));
t('lista no repite razón = nombre', !h.includes('ROMERO</div>'));
t('boton verificar 1 pendiente', h.includes('Verificar 1 en ARCA'));
t('aviso sin cuit 1', h.includes('1 sin CUIT'));
t('iva legible', h.includes('Monotributo') && h.includes('Cons. Final'));

// Modal de edición
editarCliente(1);
const m = global._modal || '';
t('modal nombre planta', m.includes('id="ecli-nom"') && m.includes('value="PAPELERA FENIX"'));
t('modal razon social', m.includes('value="SERGIO SEBASTIAN CODAGNONE"'));
t('modal boton arca', m.includes('cliTraerArca(1)'));
t('modal provincia', m.includes('id="ecli-prov"') && m.includes('value="BUENOS AIRES" selected'));
t('modal monotributo seleccionado', /value="monotributo" selected/.test(m));

// Todos verificados → mensaje verde
C.clientes[3].arca_verificado_el = '2026-09-28T21:00:00Z';
renderClientes();
t('todos verificados', els['cli-tbl'].innerHTML.includes('Todos los clientes con CUIT están verificados'));

console.log((mal ? '✗ ' : '✓ ') + ok + ' OK, ' + mal + ' fallas');
process.exit(mal ? 1 : 0);
