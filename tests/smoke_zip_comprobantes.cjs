// Smoke del respaldo de comprobantes (30a).
// Uso: TZ=America/Argentina/Buenos_Aires node tests/smoke_zip_comprobantes.cjs fabrica_bolsas_v6.html
const fs = require('fs');
const src = fs.readFileSync(process.argv[2] || 'fabrica_bolsas_v6.html', 'utf8');
const ini = src.indexOf('// ===== 🗜 RESPALDO DE COMPROBANTES');
const fin = src.indexOf('function _arcaRefrescar(');
if (ini < 0 || fin < ini) { console.error('No encontré el bloque'); process.exit(1); }
let bloque = src.slice(ini, fin).replace('let _zipcCorriendo=false;', 'globalThis._zipcCorriendo=false;');

let ok = 0, mal = 0;
const t = (c, m) => { if (c) ok++; else { mal++; console.log('✗ ' + m); } };

// ---- stubs ----
globalThis.localDate = d => { const dt = d || new Date(); return dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0'); };
globalThis.escapeHtml = s => String(s);
globalThis._arcaFn = () => 'hyper-action';
const els = {};
const el = id => (els[id] = els[id] || { id, innerHTML: '', value: '', disabled: false, remove() { delete els[id]; } });
globalThis.document = {
  getElementById: id => els[id] || null,
  body: { insertAdjacentHTML: (_, h) => { el('zipc-modal'); el('zipc-rta'); el('zipc-btn'); el('zipc-mes').value = (h.match(/value="(\d{4}-\d{2})"/) || [])[1]; }, appendChild() {} },
  head: { appendChild() {} },
  createElement: () => ({ click() { globalThis._descargado = this.download; }, remove() {} }),
};
globalThis.URL = { createObjectURL: () => 'blob:x', revokeObjectURL() {} };
globalThis.setTimeout = f => 0;
class FakeZip { constructor() { this.files = {}; globalThis._zip = this; } file(n, b) { this.files[n] = b; } async generateAsync() { return { size: 1 }; } }
globalThis.window = { JSZip: FakeZip };
globalThis.JSZip = FakeZip;

eval(bloque);

// ---- helpers puros ----
t(JSON.stringify(_zipMesRango('2026-09')) === '{"desde":"2026-09-01","hasta":"2026-09-30"}', 'septiembre 30 días');
t(_zipMesRango('2026-02').hasta === '2026-02-28', 'febrero 2026 no bisiesto');
t(_zipMesRango('2028-02').hasta === '2028-02-29', 'febrero bisiesto');
t(_zipMesRango('2026-12').hasta === '2026-12-31', 'diciembre');
t(_zipMesRango('2026-13') === null && _zipMesRango('') === null, 'mes inválido');
const nom = _zipNombreArchivo({ fecha: '2026-09-30', comprobante: 'FACTURA A', numero: '0005-00000001', cliente: 'MUÑOZ / "SOL"' });
t(nom === '2026-09-30 FACTURA A 0005-00000001 - MUNOZ SOL .pdf' || nom === '2026-09-30 FACTURA A 0005-00000001 - MUNOZ SOL.pdf', 'nombre sin acentos ni / ni comillas: ' + nom);
t(!/[\\\/:*?"<>|]/.test(nom), 'nombre apto Windows');

// ---- flujo completo ----
(async () => {
  const items = [
    { doc_tipo: 'factura', id: 130, comprobante: 'FACTURA A', numero: '0005-00000001', fecha: '2026-09-30', cliente: 'VAZQUES', cuit: '20123456789', total: 4840000, cae: '8639', cae_vto: '2026-10-10', path: 'p1', url: 'https://ok/1' },
    { doc_tipo: 'nc', id: 5, comprobante: 'NOTA DE CREDITO A', numero: '0005-00000001', fecha: '2026-09-30', cliente: 'VAZQUES', cuit: '', total: 1000.5, cae: '1', cae_vto: '2026-10-10', path: 'p2', url: 'https://falla/2' },
    { doc_tipo: 'factura', id: 131, comprobante: 'FACTURA A', numero: '0005-00000001', fecha: '2026-09-30', cliente: 'VAZQUES', total: 1, cae: '2', path: 'p3', url: 'https://ok/3' },
  ];
  const sin = [{ doc_tipo: 'factura', id: 99, comprobante: 'FACTURA B', numero: '0005-00000009', fecha: '2026-09-15', cliente: 'X; Y', total: 10, cae: '9', cae_vto: '' }];
  globalThis._arcaInvoke = async b => { globalThis._body = b; return { ok: true, comprobantes: items, sin_pdf: sin }; };
  globalThis.fetch = async u => u.includes('falla') ? { ok: false, status: 400 } : { ok: true, arrayBuffer: async () => new ArrayBuffer(3) };

  abrirZipComprobantes();
  document.getElementById('zipc-mes').value = '2026-09';
  await descargarZipComprobantes();
  t(_body.op === 'pdf_lote' && _body.desde === '2026-09-01' && _body.hasta === '2026-09-30' && _body.ambiente === 'produccion', 'pide el lote del mes en producción');
  const nombres = Object.keys(_zip.files);
  t(nombres.length === 3, '2 PDF + índice (el que falló no entra): ' + nombres.join(' | '));
  t(nombres.some(n => / \(2\)\.pdf$/.test(n)), 'nombre repetido se desambigua');
  const csv = _zip.files['indice.csv'];
  t(csv.startsWith('﻿'), 'CSV con BOM');
  t(csv.includes('SIN PDF ARCHIVADO') && csv.includes('"X; Y"'), 'el sin PDF figura y el ; se escapa');
  t(csv.includes('NO SE PUDO BAJAR') && csv.includes('1000,50'), 'el fallido figura y total con coma');
  t(_descargado === 'Comprobantes_ARIALPLAST_2026-09.zip', 'nombre del ZIP');
  const rta = document.getElementById('zipc-rta').innerHTML;
  t(/<b>2<\/b> PDF/.test(rta) && /sin PDF archivado/.test(rta) && /no se pudieron bajar/.test(rta), 'el mensaje dice lo que falta');
  t(document.getElementById('zipc-btn').disabled === false && _zipcCorriendo === false, 'botón se rehabilita');

  // función vieja
  globalThis._arcaInvoke = async () => ({ ok: false, error: 'Faltan doc_tipo / doc_id' });
  await descargarZipComprobantes();
  t(/todavía no tiene la operación/.test(document.getElementById('zipc-rta').innerHTML), 'función vieja: lo dice');
  // mes sin comprobantes
  globalThis._arcaInvoke = async () => ({ ok: true, comprobantes: [], sin_pdf: [] });
  await descargarZipComprobantes();
  t(/No hay comprobantes/.test(document.getElementById('zipc-rta').innerHTML), 'mes vacío');
  // reentrada
  let llamadas = 0;
  globalThis._arcaInvoke = async () => { llamadas++; await new Promise(r => r()); return { ok: true, comprobantes: [], sin_pdf: [] }; };
  await Promise.all([descargarZipComprobantes(), descargarZipComprobantes()]);
  t(llamadas === 1, 'doble click no duplica');

  console.log((mal ? '✗ ' : '✓ ') + ok + ' ok, ' + mal + ' mal');
  process.exit(mal ? 1 : 0);
})();
