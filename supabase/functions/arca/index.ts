// ============================================================================
//  Edge Function: arca   (slug en Supabase: hyper-action)
//  Habla con TusFacturas.app (API v2) para pedir el CAE de una factura / NC / ND.
//
//  POR QUE UNA SOLA FUNCION CON `op`:
//  Supabase cobra el deploy por funcion y cada una tiene que mantenerse aparte.
//  Aca hay varias operaciones que comparten TODO (credenciales, ambiente, log),
//  asi que viven juntas y se deployan de una sola vez.
//
//    op = 'ping'      -> prueba credenciales + punto de venta, NO emite nada
//    op = 'cae'       -> pide el CAE de un comprobante
//    op = 'verificar' -> pregunta si un comprobante ya se emitio (anti-duplicado)
//    op = 'pdf'       -> link firmado al PDF archivado
//    op = 'padron'    -> consulta la constancia de inscripcion de ARCA de uno o
//                        varios clientes y actualiza condicion de IVA, razon
//                        social, domicilio y provincia (28/09/2026)
//
//  AMBIENTES — esto es lo importante:
//  TusFacturas NO tiene sandbox por URL ni por flag en el payload. El unico
//  "modo prueba" que existe es una CUENTA DISTINTA (plan API DEV). Por eso el
//  ambiente elige QUE CREDENCIALES se usan, no un booleano decorativo:
//
//    dev        -> TF_DEV_APIKEY  / TF_DEV_APITOKEN  / TF_DEV_USERTOKEN
//    produccion -> TF_PROD_APIKEY / TF_PROD_APITOKEN / TF_PROD_USERTOKEN
//
//  Si el ambiente elegido no tiene sus credenciales cargadas, la funcion se
//  NIEGA a emitir. Es imposible mandar una factura fiscal real "sin querer".
//
//  DEPLOY (no hace falta instalar nada):
//    Dashboard de Supabase -> Edge Functions -> hyper-action -> editar ->
//    pegar este archivo -> Deploy. Copia de seguridad: este archivo en el repo.
//    Los secretos van en Edge Functions -> Secrets.
//    Dejar la verificacion de JWT como viene: el sistema llama a la funcion con
//    la anon key, que ya es un JWT valido del proyecto.
// ============================================================================

// Especificador npm:, que es la forma que documenta Supabase hoy. Con el editor
// del dashboard el bundling es del lado del servidor y esto lo resuelve solo.
import { createClient } from "npm:@supabase/supabase-js@2";

const BASE = "https://www.tusfacturas.app/app/api/v2";
const URL_NUEVO = `${BASE}/facturacion/nuevo`;
const URL_NUMERACION = `${BASE}/facturacion/numeracion`;
const URL_ALERTAS = `${BASE}/estado_servicios/alertas`;
const URL_CONSULTA_AV = `${BASE}/facturacion/consulta_avanzada`;
const URL_AFIP_INFO = `${BASE}/clientes/afip-info`;

const TIMEOUT_MS = 90000; // AFIP puede tardar; mas alla de esto cortamos y verificamos aparte

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ---------------------------------------------------------------------------
//  Helpers
// ---------------------------------------------------------------------------

function ddmmyyyy(iso: unknown): string {
  if (!iso) return "";
  const [y, m, d] = String(iso).slice(0, 10).split("-");
  if (!y || !m || !d) return "";
  return `${d}/${m}/${y}`;
}

function isoDesdeDdmmyyyy(s: unknown): string | null {
  const t = String(s || "").trim();
  const m = t.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

function r2(n: number): number {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

// El precio unitario NO se puede redondear a 2 decimales.
// Caso real: en una Factura B de 600 paquetes a $656,88 (total $394.128), netear
// el precio y redondearlo a 2 decimales da 542,88, y 600 x 542,88 x 1,21 =
// $394.130,88 — $2,88 de mas en un comprobante FISCAL. Con 4 decimales el
// desvio baja a 2 centavos. Los totales SI van a 2 decimales.
function rPrecio(n: number): number {
  return Math.round((Number(n) + Number.EPSILON) * 10000) / 10000;
}

// Condicion de IVA del cliente (valores del sistema) -> codigo TusFacturas.
// Tabla oficial: CF / RI / M / E / CDEX / IVNA / PDEX.
// OJO: exento es "E", NO "EX" (ese codigo no existe y ARCA rechaza).
function condIva(v: unknown): string {
  const s = String(v || "").toLowerCase();
  if (s.includes("monotrib")) return "M";
  if (s.includes("exento")) return "E";
  if (s.includes("final")) return "CF";
  if (s.includes("exterior") || s.includes("export")) return "CDEX";
  return "RI"; // con_iva / responsable inscripto (default del sistema)
}

// Constancia de inscripcion (texto de ARCA) -> valor del sistema en
// clientes.condicion_iva (con_iva / monotributo / exento / consumidor_final).
// Si ARCA devuelve algo que no reconocemos, NO se toca lo que habia.
function condDesdePadron(v: unknown): string | null {
  const s = String(v || "").toUpperCase();
  if (s.includes("MONOTRIB")) return "monotributo";
  if (s.includes("EXENTO")) return "exento";
  if (s.includes("CONSUMIDOR")) return "consumidor_final";
  if (s.includes("RESPONSABLE") || s.includes("INSCRIPTO")) return "con_iva";
  return null;
}

// TusFacturas a veces devuelve los textos del padron con la Ñ y los acentos
// "doble codificados" (caso real: "MUÃ\x91OZ" en vez de "MUÑOZ"). Si el texto
// tiene esa marca, se reinterpreta como UTF-8; si no cierra, queda como vino.
function arreglarTexto(v: unknown): string {
  const s = String(v ?? "").trim();
  if (!/[ÃÂ][\u0080-ÿ]/.test(s)) return s;
  try {
    const bytes = Uint8Array.from([...s].map((ch) => ch.charCodeAt(0) & 0xff));
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes).trim();
  } catch (_) {
    return s;
  }
}

// Provincias: el sistema guarda el NOMBRE (como lo devuelve ARCA); TusFacturas
// pide el CODIGO de su tabla de referencia.
const PROVINCIAS: Record<string, string> = {
  "CIUDAD AUTONOMA DE BUENOS AIRES": "1",
  "BUENOS AIRES": "2",
  "CATAMARCA": "3",
  "CHACO": "4",
  "CHUBUT": "5",
  "CORDOBA": "6",
  "CORRIENTES": "7",
  "ENTRE RIOS": "8",
  "FORMOSA": "9",
  "JUJUY": "10",
  "LA PAMPA": "11",
  "LA RIOJA": "12",
  "MENDOZA": "13",
  "MISIONES": "14",
  "NEUQUEN": "15",
  "RIO NEGRO": "16",
  "SALTA": "17",
  "SAN JUAN": "18",
  "SAN LUIS": "19",
  "SANTA CRUZ": "20",
  "SANTA FE": "21",
  "SANTIAGO DEL ESTERO": "22",
  "TIERRA DEL FUEGO": "23",
  "TUCUMAN": "24",
};

// Normaliza un nombre de provincia a la clave de PROVINCIAS (sin acentos,
// mayusculas, variantes de CABA). Devuelve null si no la reconoce.
function normProv(v: unknown): string | null {
  let s = String(v || "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toUpperCase().replace(/[^A-Z ]/g, " ").replace(/\s+/g, " ").trim();
  if (!s) return null;
  if (s === "CABA" || s.includes("AUTONOMA") || s === "CAPITAL FEDERAL") s = "CIUDAD AUTONOMA DE BUENOS AIRES";
  if (s.startsWith("TIERRA DEL FUEGO")) s = "TIERRA DEL FUEGO";
  return PROVINCIAS[s] ? s : null;
}

function provCodigo(v: unknown): string | null {
  const n = normProv(v);
  return n ? PROVINCIAS[n] : null;
}

function tipoComprobante(docTipo: string, letra: string): string {
  const L = String(letra || "A").toUpperCase();
  if (docTipo === "nc") return `NOTA DE CREDITO ${L}`;
  if (docTipo === "nd") return `NOTA DE DEBITO ${L}`;
  return `FACTURA ${L}`;
}

function tablaDe(docTipo: string): string {
  return docTipo === "factura" ? "facturas" : docTipo === "nc" ? "notas_credito" : "notas_debito";
}

function extRef(docTipo: string, docId: number | string): string {
  return `${docTipo}-${docId}`;
}

// El CAE puede venir "vacio de verdad" de tres formas distintas:
//   - modo DEV: cae y vencimiento_cae vienen vacios
//   - modo asincronico: cae = " " (un espacio) y vencimiento_cae = "01/01/2000"
// Nunca comparar contra "" a secas.
function sinCae(cae: unknown, vto: unknown): boolean {
  const c = String(cae ?? "").trim();
  if (!c) return true;
  if (String(vto ?? "").trim() === "01/01/2000") return true;
  return false;
}

// TusFacturas devuelve comprobante_nro como "0000123" o "00010-00000000".
// Lo normalizamos al formato del sistema: PPPP-NNNNNNNN.
function normalizarNumero(nro: unknown, puntoVenta: unknown): string | null {
  const s = String(nro ?? "").trim();
  if (!s) return null;
  if (s.includes("-")) {
    const [pv, n] = s.split("-");
    const pvN = String(parseInt(pv, 10) || 0).padStart(4, "0");
    const nN = String(parseInt(n, 10) || 0).padStart(8, "0");
    return `${pvN}-${nN}`;
  }
  const pvN = String(parseInt(String(puntoVenta), 10) || 0).padStart(4, "0");
  const nN = String(parseInt(s, 10) || 0).padStart(8, "0");
  return `${pvN}-${nN}`;
}

async function postTF(url: string, payload: unknown, timeoutMs = TIMEOUT_MS) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    });
    const txt = await resp.text();
    let data: any = {};
    try {
      data = txt ? JSON.parse(txt) : {};
    } catch {
      data = { error: "S", errores: ["Respuesta no JSON de TusFacturas: " + txt.slice(0, 300)] };
    }
    return { ok: resp.ok, status: resp.status, data };
  } finally {
    clearTimeout(t);
  }
}

function erroresDe(data: any): string {
  if (!data) return "Sin respuesta";
  if (data.mantenimiento === 1 || data.mantenimiento === "1") {
    return `TusFacturas/ARCA en mantenimiento hasta ${data.mantenimiento_hasta || "?"}`;
  }
  const e = data.errores ?? data.error_details ?? data.error;
  if (Array.isArray(e)) {
    return e
      .map((x: any) => (typeof x === "string" ? x : x?.text || JSON.stringify(x)))
      .filter(Boolean)
      .join(" | ");
  }
  if (typeof e === "string" && e !== "S" && e !== "N") return e;
  return "Error desconocido de TusFacturas";
}

// ---------------------------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...cors, "Content-Type": "application/json" },
    });

  let sb: any = null;
  let ambiente = "dev";
  let logCtx: any = {};

  const logear = async (row: any) => {
    if (!sb) return;
    try {
      await sb.from("arca_log").insert({ ambiente, ...logCtx, ...row });
    } catch (_) {
      /* el log nunca puede tumbar la operacion */
    }
  };

  try {
    const body = await req.json().catch(() => ({}));
    const op = String(body.op || "cae");

    sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // ---- Configuracion del sistema -----------------------------------------
    const { data: cfgRows } = await sb.from("configuracion").select("clave,valor");
    const cfg: Record<string, string> = {};
    (cfgRows || []).forEach((r: any) => (cfg[r.clave] = r.valor));

    ambiente = String(cfg["arca_ambiente"] || "dev").toLowerCase();
    if (ambiente !== "produccion") ambiente = "dev";
    const esProd = ambiente === "produccion";

    const puntoVenta = String(
      (esProd ? cfg["arca_punto_venta_prod"] : cfg["arca_punto_venta_dev"]) ||
        cfg["arca_punto_venta"] ||
        "1",
    ).trim();

    // ---- Credenciales SEGUN EL AMBIENTE ------------------------------------
    const pre = esProd ? "TF_PROD_" : "TF_DEV_";
    const APIKEY = Deno.env.get(pre + "APIKEY") || "";
    const APITOKEN = Deno.env.get(pre + "APITOKEN") || "";
    const USERTOKEN = Deno.env.get(pre + "USERTOKEN") || "";

    if (!APIKEY || !APITOKEN || !USERTOKEN) {
      return json({
        ok: false,
        ambiente,
        error:
          `No hay credenciales cargadas para el ambiente "${ambiente}". ` +
          `Faltan los secretos ${pre}APIKEY / ${pre}APITOKEN / ${pre}USERTOKEN en Supabase. ` +
          `Cargalos con: supabase secrets set ${pre}APIKEY=... ${pre}APITOKEN=... ${pre}USERTOKEN=...`,
      });
    }

    const cred = { usertoken: USERTOKEN, apikey: APIKEY, apitoken: APITOKEN };

    // =======================================================================
    //  op = ping  -> valida credenciales y punto de venta SIN emitir nada
    // =======================================================================
    if (op === "ping") {
      const tipo = String(body.tipo || "FACTURA A");
      const r1 = await postTF(
        URL_NUMERACION,
        { ...cred, comprobante: { tipo, operacion: "V", punto_venta: puntoVenta } },
        20000,
      );
      const credOk = r1.data?.error === "N";
      const proximo = r1.data?.comprobante?.numero;

      // El estado de los servicios de ARCA es info aparte: puede fallar sin que
      // las credenciales esten mal, y saberlo evita el "no me factura" a ciegas.
      let arcaOk: boolean | null = null;
      let arcaMsg = "";
      try {
        const r2r = await postTF(URL_ALERTAS, { ...cred }, 15000);
        if (r2r.data?.error === "N") {
          arcaOk = String(r2r.data?.facturacion || "").toUpperCase() === "OK";
          arcaMsg = String(r2r.data?.facturacion || "");
          const mant = r2r.data?.prox_mantenimientos_programados;
          if (Array.isArray(mant) && mant.length) {
            arcaMsg += " · mantenimiento programado: " + JSON.stringify(mant).slice(0, 200);
          }
        }
      } catch (_) {
        arcaOk = null;
      }

      await logear({
        operacion: "ping",
        request: { op, tipo, punto_venta: puntoVenta },
        response: r1.data,
        ok: credOk,
        error: credOk ? null : erroresDe(r1.data).slice(0, 500),
      });

      return json({
        ok: credOk,
        ambiente,
        punto_venta: puntoVenta,
        tipo,
        proximo_numero: credOk && proximo != null
          ? `${String(parseInt(puntoVenta, 10) || 0).padStart(4, "0")}-${String((parseInt(String(proximo), 10) || 0)).padStart(8, "0")}`
          : null,
        arca_ok: arcaOk,
        arca_msg: arcaMsg,
        error: credOk ? null : erroresDe(r1.data),
      });
    }

    // =======================================================================
    //  op = padron  -> constancia de inscripcion de ARCA -> ficha del cliente
    //
    //  body: { op:'padron', cliente_ids?: number[], limite?: number }
    //   - con cliente_ids: consulta esos (aunque ya esten verificados)
    //   - sin cliente_ids: los que tienen CUIT de 11 digitos y todavia no se
    //     verificaron, de a `limite` (max 40) por llamada para no pasar el
    //     tiempo maximo de la funcion. El sistema repite hasta que `quedan` = 0.
    //
    //  Que actualiza: condicion_iva (define A/B), razon_social (es la que sale
    //  en la factura), direccion / localidad / provincia / codigo_postal cuando
    //  ARCA los informa, arca_estado y arca_verificado_el. `nombre` (el nombre
    //  corto que usa la planta) NO se toca. Si ARCA no trae un dato, queda el
    //  que habia.
    //
    //  Cada consulta cuenta como un request del plan de TusFacturas. Solo
    //  funciona con la cuenta enlazada a ARCA (produccion).
    // =======================================================================
    if (op === "padron") {
      if (!esProd) {
        return json({
          ok: false,
          ambiente,
          error: "La consulta al padrón de ARCA sólo funciona con la cuenta de producción (la enlazada con ARCA).",
        });
      }
      const ids = Array.isArray(body.cliente_ids)
        ? body.cliente_ids.map((x: any) => parseInt(String(x), 10)).filter((x: number) => Number.isFinite(x))
        : [];
      const limite = Math.max(1, Math.min(parseInt(String(body.limite ?? "25"), 10) || 25, 40));

      let q = sb.from("clientes")
        .select("id,nombre,razon_social,cuit,condicion_iva,direccion,localidad,provincia,codigo_postal,arca_verificado_el");
      if (ids.length) q = q.in("id", ids);
      else q = q.is("arca_verificado_el", null);
      const { data: clis, error: eCli } = await q.order("id").limit(1000);
      if (eCli) return json({ ok: false, ambiente, error: "No se pudieron leer los clientes: " + eCli.message });

      const conCuit = (clis || []).filter((c: any) => String(c.cuit || "").replace(/\D/g, "").length === 11);
      const sinCuit = (clis || []).filter((c: any) => String(c.cuit || "").replace(/\D/g, "").length !== 11);
      const lote = conCuit.slice(0, limite);

      const resultados: any[] = [];
      for (const c of lote) {
        const nro = String(c.cuit).replace(/\D/g, "");
        let d: any = {};
        try {
          const r = await postTF(URL_AFIP_INFO, { ...cred, cliente: { documento_tipo: "CUIT", documento_nro: nro } }, 25000);
          d = r.data || {};
        } catch (e: any) {
          d = { error: "S", errores: [String(e?.name) === "AbortError" ? "ARCA no contestó a tiempo" : String(e?.message || e)] };
        }

        // CUIT sin inscripcion en IVA ni en Monotributo: ARCA contesta error
        // ("No se ha podido recuperar la condicion frente al IVA") pero informa
        // CONSUMIDOR FINAL. Para facturarle es eso: Factura B a consumidor final.
        const sinInscripcion = d.error !== "N" &&
          String(d.condicion_impositiva || "").toUpperCase().includes("CONSUMIDOR");
        if (sinInscripcion) {
          d = { ...d, error: "N", estado: d.estado || "SIN INSCRIPCION EN IVA" };
        }

        if (d.error !== "N") {
          const msg = erroresDe(d);
          resultados.push({ id: c.id, nombre: c.nombre, cuit: nro, ok: false, error: msg });
          await logear({ operacion: "padron", doc_tipo: "cliente", doc_id: c.id, request: { cuit: nro }, response: d, ok: false, error: msg.slice(0, 500) });
          continue;
        }

        const upd: any = {
          arca_verificado_el: new Date().toISOString(),
          arca_estado: String(d.estado || "").trim().slice(0, 40) || null,
        };
        const cond = condDesdePadron(d.condicion_impositiva);
        if (cond) upd.condicion_iva = cond;
        const rs = arreglarTexto(d.razon_social);
        if (rs) upd.razon_social = rs.slice(0, 255);
        const dir = arreglarTexto(d.direccion);
        if (dir) upd.direccion = dir.slice(0, 255);
        const loc = arreglarTexto(d.localidad);
        if (loc) upd.localidad = loc.slice(0, 120);
        const prov = normProv(d.provincia);
        if (prov) upd.provincia = prov;
        const cp = String(d.codigopostal ?? d.codigo_postal ?? "").trim();
        if (cp) upd.codigo_postal = cp.slice(0, 20);

        const { error: eUp } = await sb.from("clientes").update(upd).eq("id", c.id);

        const cambios: string[] = [];
        if (upd.condicion_iva && upd.condicion_iva !== c.condicion_iva) cambios.push(`IVA: ${c.condicion_iva || "—"} → ${upd.condicion_iva}`);
        if (upd.razon_social && upd.razon_social !== c.razon_social) cambios.push(`razón social: ${c.razon_social || "—"} → ${upd.razon_social}`);
        if (upd.provincia && upd.provincia !== c.provincia) cambios.push(`provincia: ${c.provincia || "—"} → ${upd.provincia}`);
        if (upd.direccion && upd.direccion !== c.direccion) cambios.push("domicilio actualizado");

        resultados.push({
          id: c.id,
          nombre: c.nombre,
          cuit: nro,
          ok: !eUp,
          error: eUp ? "No se pudo guardar: " + eUp.message : null,
          condicion_arca: d.condicion_impositiva || null,
          condicion_iva: upd.condicion_iva || c.condicion_iva,
          estado: upd.arca_estado,
          cambios,
          apoc: String(d.apoc_existe || "").toUpperCase() === "SI" ? String(d.apoc_info || "Figura en la base APOC") : null,
        });
        await logear({
          operacion: "padron",
          doc_tipo: "cliente",
          doc_id: c.id,
          request: { cuit: nro },
          response: { condicion_impositiva: d.condicion_impositiva, estado: d.estado, provincia: d.provincia, apoc_existe: d.apoc_existe },
          ok: !eUp,
          error: eUp ? String(eUp.message).slice(0, 300) : null,
        });
      }

      return json({
        ok: true,
        ambiente,
        consultados: resultados.length,
        resultados,
        quedan: ids.length ? 0 : Math.max(0, conCuit.length - lote.length),
        sin_cuit: ids.length ? sinCuit.map((c: any) => ({ id: c.id, nombre: c.nombre })) : sinCuit.length,
      });
    }

    // =======================================================================
    //  A partir de aca hace falta un documento
    // =======================================================================
    const docTipo = String(body.doc_tipo || "");
    const docId = body.doc_id;
    if (!docTipo || docId == null) return json({ ok: false, error: "Faltan doc_tipo / doc_id" });
    if (!["factura", "nc", "nd"].includes(docTipo)) return json({ ok: false, error: "doc_tipo invalido" });

    const tabla = tablaDe(docTipo);
    logCtx = { doc_tipo: docTipo, doc_id: docId };

    // ---- Traer el documento y sus lineas ------------------------------------
    let doc: any = null;
    let lineas: any[] = [];
    let letra = "A";

    if (docTipo === "factura") {
      const { data } = await sb.from("facturas").select("*, factura_lineas(*)").eq("id", docId).single();
      doc = data;
      lineas = data?.factura_lineas || [];
      letra = data?.tipo || "A";
    } else if (docTipo === "nc") {
      const { data } = await sb.from("notas_credito").select("*, nota_credito_lineas(*)").eq("id", docId).single();
      doc = data;
      lineas = data?.nota_credito_lineas || [];
      if (data?.doc_tipo === "factura") {
        const { data: f } = await sb.from("facturas").select("tipo").eq("id", data.doc_id).single();
        letra = f?.tipo || "A";
      }
    } else {
      const { data } = await sb.from("notas_debito").select("*").eq("id", docId).single();
      doc = data;
      lineas = [];
      if (data?.doc_tipo === "factura") {
        const { data: f } = await sb.from("facturas").select("tipo").eq("id", data.doc_id).single();
        letra = f?.tipo || "A";
      }
    }

    if (!doc) return json({ ok: false, error: "No se encontro el documento" });

    const referencia = extRef(docTipo, docId);

    // =======================================================================
    //  op = pdf  -> link temporal al PDF archivado en el Storage propio.
    //  El bucket es PRIVADO (son comprobantes con datos de clientes), asi que
    //  la unica forma de abrirlo desde el navegador es una URL firmada, y eso
    //  solo lo puede hacer el servidor.
    // =======================================================================
    if (op === "pdf") {
      if (!doc.arca_pdf_path) {
        return json({
          ok: false,
          error: doc.arca_pdf_url
            ? "Este comprobante no quedó archivado (se emitió antes de que el archivado existiera). El link original de TusFacturas puede haber vencido."
            : "Este comprobante no tiene PDF.",
          url_original: doc.arca_pdf_url || null,
        });
      }
      const { data: fir, error: eF } = await sb.storage.from("comprobantes")
        .createSignedUrl(doc.arca_pdf_path, 3600);
      if (eF || !fir?.signedUrl) return json({ ok: false, error: "No se pudo abrir el archivo: " + (eF?.message || "sin URL") });
      return json({ ok: true, url: fir.signedUrl, path: doc.arca_pdf_path });
    }

    // =======================================================================
    //  op = verificar  -> ¿este comprobante ya existe en TusFacturas?
    //  Es el antidoto al doble pedido: si el CAE salio pero la respuesta se
    //  perdio (timeout, red), lo recuperamos en vez de emitir dos veces.
    // =======================================================================
    const consultarPorRef = async () => {
      const r = await postTF(
        URL_CONSULTA_AV,
        {
          ...cred,
          busqueda_tipo: "EXT_REF",
          pagina: 0,
          limite: 10,
          comprobante: { external_reference: referencia, operacion: "V" },
        },
        25000,
      );
      const arr = r.data?.comprobantes;
      const hit = Array.isArray(arr) && arr.length ? arr[0] : null;
      return { raw: r.data, hit };
    };

    // Lo que efectivamente se le declaro a ARCA. Se guarda junto al CAE para que
    // el comprobante impreso salga de ACA y no de un recalculo: si el sistema
    // reimprimiera el detalle por su cuenta, el papel y lo declarado podrian
    // separarse sin que nadie se entere.
    let detalleDeclarado: any = null;

    const guardarAutorizado = async (d: any) => {
      const cae = d.cae ?? d.CAE ?? null;
      const vtoRaw = d.vencimiento_cae ?? d.vencimiento ?? null;
      const enPrueba = sinCae(cae, vtoRaw);
      const numeroArca = normalizarNumero(d.comprobante_nro ?? d.numero, puntoVenta);

      const upd: any = {
        cae: enPrueba ? null : String(cae).trim(),
        cae_vto: enPrueba ? null : isoDesdeDdmmyyyy(vtoRaw),
        cae_estado: enPrueba ? "prueba" : "autorizado",
        cae_error: null,
        cae_solicitado_el: new Date().toISOString(),
        arca_numero: numeroArca,
        arca_pdf_url: d.comprobante_pdf_url || d.comprobante_ticket_url || null,
        arca_qr_url: d.afip_qr || null,
        arca_cod_barras: d.afip_codigo_barras ? String(d.afip_codigo_barras) : null,
        ambiente,
      };
      if (detalleDeclarado) upd.arca_detalle = detalleDeclarado;

      // Guardado TOLERANTE a que falten columnas nuevas. Si el SQL de la ultima
      // version todavia no se corrio, `arca_detalle` / `arca_cod_barras` no
      // existen y el UPDATE entero falla — y con el, se pierde el CAE de un
      // comprobante que ARCA YA AUTORIZO. Antes que eso, se guarda sin esos
      // campos y se avisa: el CAE es lo que no se puede perder.
      const OPCIONALES = ["arca_detalle", "arca_cod_barras", "arca_pdf_path"];
      let { error: eUpd } = await sb.from(tabla).update(upd).eq("id", docId);
      let faltantes: string[] = [];
      if (eUpd) {
        const msg = String(eUpd.message || "");
        const recorte: any = { ...upd };
        OPCIONALES.forEach((c) => {
          if (msg.includes(c) || /column .* does not exist|schema cache/i.test(msg)) {
            if (recorte[c] !== undefined) { delete recorte[c]; faltantes.push(c); }
          }
        });
        if (faltantes.length) {
          const r2u = await sb.from(tabla).update(recorte).eq("id", docId);
          eUpd = r2u.error;
        }
        await logear({
          operacion: "guardar_cae",
          ok: !eUpd,
          error: (eUpd ? "NO SE PUDO GUARDAR EL CAE: " : "guardado sin las columnas nuevas: ") + msg.slice(0, 300),
        });
      }
      (upd as any)._faltan_columnas = faltantes.length ? faltantes : null;
      (upd as any)._error_guardado = eUpd ? String(eUpd.message).slice(0, 300) : null;

      // ARCHIVAR EL PDF. La URL de TusFacturas es TEMPORAL: guardar solo el link
      // es guardar nada. Se baja el archivo y se sube al Storage del propio
      // proyecto, que es donde tiene que vivir un comprobante fiscal.
      if (upd.arca_pdf_url) {
        try {
          const r = await fetch(upd.arca_pdf_url);
          if (r.ok) {
            const bytes = new Uint8Array(await r.arrayBuffer());
            const nom = String(numeroArca || `id${docId}`).replace(/[^\w-]/g, "");
            const ruta = `${ambiente}/${docTipo}/${nom}.pdf`;
            const { error: eUp } = await sb.storage.from("comprobantes")
              .upload(ruta, bytes, { contentType: "application/pdf", upsert: true });
            if (!eUp) {
              upd.arca_pdf_path = ruta;
              await sb.from(tabla).update({ arca_pdf_path: ruta }).eq("id", docId);
            } else {
              // Que falle el archivado NO puede tumbar la emision: el CAE ya esta.
              await logear({ operacion: "archivar_pdf", ok: false, error: String(eUp.message).slice(0, 300) });
            }
          }
        } catch (e: any) {
          await logear({ operacion: "archivar_pdf", ok: false, error: String(e?.message || e).slice(0, 300) });
        }
      }

      // MANDA ARCA: cuando hay CAE real, el numero oficial del comprobante es
      // el que asigno ARCA. Adoptarlo evita tener dos numeraciones en paralelo.
      // En modo prueba NO se toca: ese numero no existe para nadie.
      let numeroAdoptado = null;
      if (!enPrueba && numeroArca && docTipo === "factura" && doc.numero !== numeroArca) {
        const { error: eNum } = await sb.from("facturas").update({ numero: numeroArca }).eq("id", docId);
        if (!eNum) numeroAdoptado = numeroArca;
      }

      return {
        upd, enPrueba, numeroArca, numeroAdoptado,
        faltanColumnas: (upd as any)._faltan_columnas,
        errorGuardado: (upd as any)._error_guardado,
      };
    };

    if (op === "verificar") {
      const { raw, hit } = await consultarPorRef();
      await logear({ operacion: "verificar", request: { external_reference: referencia }, response: raw, ok: !!hit });
      if (!hit) {
        await sb.from(tabla).update({ cae_estado: null }).eq("id", docId);
        return json({
          ok: true,
          encontrado: false,
          ambiente,
          mensaje: "No hay ningun comprobante emitido con esta referencia. Podes volver a pedir el CAE sin miedo a duplicar.",
        });
      }
      const res = await guardarAutorizado(hit);
      return json({
        ok: true,
        encontrado: true,
        ambiente,
        modo_prueba: res.enPrueba,
        cae: res.upd.cae,
        vencimiento: res.upd.cae_vto,
        numero: res.numeroArca,
        numero_adoptado: res.numeroAdoptado,
        pdf: res.upd.arca_pdf_url,
      });
    }

    // =======================================================================
    //  op = cae  -> emitir
    // =======================================================================
    if (doc.cae) return json({ ok: false, error: "Este comprobante ya tiene CAE" });

    // ¿ESTE documento se declara? Espejo de _arcaAplica del sistema.
    // No todo lo que vive en notas_debito es un comprobante fiscal: la tabla
    // guarda tambien los cargos por CHEQUE RECHAZADO y las notas contra
    // PROVEEDORES, que son movimientos internos de cuenta corriente.
    const noVa = (() => {
      if (String(doc.plano || "formal") !== "formal") return "es del circuito informal (negro): no va a ARCA";
      if (docTipo === "nc") {
        if (doc.estado === "anulada") return "la nota de credito esta anulada";
        if (doc.doc_tipo !== "factura") return "acredita un remito valorizado, no una factura";
      }
      if (docTipo === "nd") {
        if (doc.anulada) return "la nota de debito esta anulada";
        if (doc.tipo_entidad !== "cliente") return "es contra un proveedor, no un cliente";
        if (doc.doc_tipo !== "factura") return "no corrige una factura (por ejemplo, un cheque rechazado): es un movimiento interno de cuenta corriente";
      }
      return null;
    })();
    if (noVa) return json({ ok: false, error: "Este comprobante no se declara a ARCA: " + noVa });

    // ANTI-DUPLICADO: si quedo "procesando" de un intento anterior, primero
    // preguntamos si ese intento termino emitiendo. Nunca reintentar a ciegas.
    if (doc.cae_estado === "procesando") {
      const { hit } = await consultarPorRef();
      if (hit) {
        const res = await guardarAutorizado(hit);
        await logear({ operacion: "cae_recuperado", request: { external_reference: referencia }, response: hit, ok: true });
        return json({
          ok: true,
          recuperado: true,
          ambiente,
          modo_prueba: res.enPrueba,
          cae: res.upd.cae,
          vencimiento: res.upd.cae_vto,
          numero: res.numeroArca,
          numero_adoptado: res.numeroAdoptado,
          pdf: res.upd.arca_pdf_url,
          aviso: "El intento anterior SI habia emitido el comprobante. Se recupero en vez de emitir uno nuevo.",
        });
      }
    }

    // ---- Cliente ------------------------------------------------------------
    const cliId = doc.cliente_id ?? doc.entidad_id;
    const { data: cli } = await sb.from("clientes").select("*").eq("id", cliId).single();
    if (!cli) return json({ ok: false, error: "No se encontro el cliente del comprobante" });

    const cuit = String(doc.cuit_cliente || cli.cuit || "").replace(/\D/g, "");
    const ivaCli = condIva(doc.condicion_iva_cliente || cli.condicion_iva);
    const nombreCli = String(doc.razon_social_cliente || cli.razon_social || cli.nombre || "").trim();

    if (letra === "A" && cuit.length !== 11) {
      return json({
        ok: false,
        error:
          `Para una Factura A el cliente necesita CUIT valido de 11 digitos. ` +
          `"${nombreCli}" tiene: ${cuit || "(vacio)"}. Cargaselo en la ficha del cliente.`,
      });
    }

    let docTipoAfip = "OTRO";
    let docNro = "0";
    if (cuit.length === 11) {
      docTipoAfip = "CUIT";
      docNro = cuit;
    } else if (cuit.length >= 7 && cuit.length <= 8) {
      docTipoAfip = "DNI";
      docNro = cuit;
    }

    // ---- Percepciones: no se adivina un regimen impositivo ------------------
    const percep = parseFloat(doc.percepciones ?? 0) || 0;
    if (percep > 0.009) {
      const pTipo = cfg["arca_percepcion_tipo"];
      const pReg = cfg["arca_percepcion_regimen"];
      if (!pTipo || !pReg) {
        return json({
          ok: false,
          error:
            `Este comprobante tiene $${percep.toFixed(2)} de percepciones y todavia no esta configurado ` +
            `a que regimen corresponden. Cargá en Configuración las claves arca_percepcion_tipo ` +
            `(6 = percepción IVA, 7 = percepción IIBB) y arca_percepcion_regimen (5 = IIBB Buenos Aires, ` +
            `4 = IIBB CABA, 2 = IVA RG 2408/3337). Preferimos frenar antes que declarar mal un impuesto.`,
        });
      }
    }

    // ---- Detalle ------------------------------------------------------------
    // Factura A: los precios del sistema son NETOS (el IVA se suma aparte).
    // Factura B: el sistema guarda iva_monto = 0 y total = subtotal, o sea que
    // el precio YA tiene el IVA adentro. A ARCA hay que mandarle el neto igual,
    // asi que hay que sacarle el IVA. Si no, la factura sale 21% mas cara.
    const ALIC = 21;
    const netear = letra === "A" ? (x: number) => x : (x: number) => x / (1 + ALIC / 100);
    const listaPrecios = cfg["arca_lista_precios"] || "Lista general";
    const unidadMedida = parseInt(cfg["arca_unidad_medida"] || "7", 10) || 7; // 7 = unidades

    const mkItem = (descripcion: string, codigo: string, cantidad: number, puBruto: number, yaNeto = false) => {
      const pu = rPrecio(yaNeto ? puBruto : netear(puBruto));
      return {
        cantidad: r2(cantidad),
        afecta_stock: "N",
        bonificacion_porcentaje: 0,
        leyenda: "",
        producto: {
          descripcion: String(descripcion || "Producto").slice(0, 255),
          codigo: String(codigo || "SN").slice(0, 20),
          lista_precios: listaPrecios,
          precio_unitario_sin_iva: pu,
          alicuota: ALIC,
          unidad_bulto: 1,
          unidad_medida: unidadMedida,
          actualiza_precio: "N",
          rg5329: "N",
          impuestos_internos_alicuota: 0,
        },
        _neto: r2(r2(cantidad) * pu),
      };
    };

    // El codigo que sale impreso tiene que ser el codigo REAL del producto
    // (ej "00316"), no el id interno de la base: en la factura del cliente un
    // "[89]" no significa nada y encima queda al lado del codigo de verdad, que
    // ya viene dentro de la descripcion.
    const idsProd = [...new Set((lineas || []).map((l: any) => l.producto_id).filter((x: any) => x != null))];
    const codProd: Record<string, string> = {};
    if (idsProd.length) {
      const { data: prods } = await sb.from("productos").select("id,codigo").in("id", idsProd);
      (prods || []).forEach((p: any) => { if (p.codigo) codProd[String(p.id)] = String(p.codigo); });
    }

    // La descripcion guardada es "[Remito REM-00355] 00456 - BOLSA ...": trae el
    // remito adelante y REPITE el codigo, que TusFacturas ya imprime en su propia
    // columna. Sacarle esos dos pedazos acorta cada renglon a la mitad.
    const limpiarDesc = (desc: unknown, codigo: string) => {
      let d = String(desc ?? "").trim();
      let remito = "";
      const m = d.match(/^\[\s*Remito\s+([^\]]+)\]\s*/i);
      if (m) { remito = m[1].trim(); d = d.slice(m[0].length); }
      if (codigo && codigo !== "SN") {
        const esc = codigo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        d = d.replace(new RegExp("^" + esc + "\\s*[-–—]\\s*"), "");
      }
      return { desc: d.trim() || "Producto", remito };
    };

    // CONSOLIDAR. La factura se arma juntando las lineas de sus remitos, asi que
    // el MISMO producto al MISMO precio puede venir repetido tres veces (caso
    // real: BLANCA 45X60 en 30 + 10 + 10). Eso no es informacion para el cliente,
    // es ruido que estira el comprobante a dos hojas. Se agrupa por producto +
    // precio + REMITO: distinto remito = distinta entrega, esa separacion si vale.
    const grupos = new Map<string, any>();
    (lineas || []).forEach((l: any) => {
      const cant = parseFloat(l.cantidad) || 0;
      const sub = parseFloat(l.subtotal) || 0;
      const pu = parseFloat(l.precio_unitario) || (cant > 0 ? sub / cant : 0);
      const cod = codProd[String(l.producto_id)] || (l.producto_id != null ? String(l.producto_id) : "SN");
      const { desc, remito } = limpiarDesc(l.descripcion, cod);
      const k = `${cod}|${pu.toFixed(6)}|${remito}`;
      const g = grupos.get(k);
      if (g) g.cant += cant;
      else grupos.set(k, { cod, pu, cant, desc, remito });
    });

        // 02d: los remitos salen del vínculo de cabecera (factura_remitos → remitos.numero_remito),
    // que es el dato (P1). El prefijo '[Remito …]' de la descripción queda como fallback para
    // las facturas anteriores al 02d.
    let remitos: string[] = [];
    if (docTipo === "factura") {
      const { data: fr } = await sb.from("factura_remitos").select("remito_id").eq("factura_id", docId);
      const ids = (fr || []).map((x: any) => x.remito_id).filter((x: any) => x != null);
      if (ids.length) {
        const { data: rs } = await sb.from("remitos").select("id,numero_remito").in("id", ids);
        remitos = (rs || []).map((r: any) => String(r.numero_remito || ("#" + r.id))).sort();
      }
    }
    if (!remitos.length) remitos = [...new Set([...grupos.values()].map((g) => g.remito).filter(Boolean))];
    // Con UN solo remito, repetirlo en cada renglon no agrega nada: va una vez
    // en la leyenda del pie. Con varios, cada renglon lleva el suyo.
    const remitoEnLinea = remitos.length > 1;

    let detalle: any[] = [...grupos.values()].map((g) =>
      mkItem(g.desc + (remitoEnLinea && g.remito ? " · " + g.remito : ""), g.cod, g.cant, g.pu)
    );

    // ND (y NC por monto) no tienen lineas: va una sola por el importe.
    // OJO: el importe guardado en notas_credito.total / notas_debito.monto es el
    // TOTAL, con el IVA adentro. Mandarlo como si fuera neto declara 21% de mas
    // — el mismo error que tenia la Factura B. Se usa el neto GUARDADO
    // (subtotal) y, si no esta, se desglosa del total.
    if (!detalle.length) {
      const totalDoc = parseFloat(doc.total ?? doc.monto ?? 0) || 0;
      const netoGuardado = parseFloat(String(doc.subtotal ?? ""));
      const netoOk = Number.isFinite(netoGuardado) && netoGuardado > 0 && netoGuardado <= totalDoc + 0.01;
      const neto = netoOk ? netoGuardado : (letra === "A" ? totalDoc / (1 + ALIC / 100) : totalDoc);
      detalle = [mkItem(doc.concepto || doc.motivo_detalle || doc.motivo || "Ajuste", "AJUSTE", 1, neto, true)];
    }

    if (!detalle.length || detalle.every((d) => !d._neto)) {
      return json({ ok: false, error: "El comprobante no tiene lineas ni importe: no hay nada que facturar" });
    }

    // El total se RECALCULA desde el detalle con el mismo redondeo que va a usar
    // TusFacturas. Mandar el total del sistema y un detalle que sume otra cosa
    // es la causa numero uno de rechazo por "el total no coincide".
    const neto = r2(detalle.reduce((s, d) => s + d._neto, 0));
    const ivaCalc = r2(neto * (ALIC / 100));
    const totalCalc = r2(neto + ivaCalc + percep);
    const totalSistema = r2(parseFloat(doc.total ?? doc.monto ?? 0) || 0);
    const desvio = r2(Math.abs(totalCalc - totalSistema));

    detalleDeclarado = {
      lineas: detalle.map((d: any) => ({
        cant: d.cantidad,
        cod: d.producto.codigo,
        desc: d.producto.descripcion,
        pu: d.producto.precio_unitario_sin_iva,
        sub: r2(d._neto),
      })),
      neto, iva: ivaCalc, percepciones: r2(percep), total: totalCalc,
      alicuota: ALIC, letra, remitos,
    };

    detalle.forEach((d) => delete d._neto);

    // ---- Armar el request ---------------------------------------------------
    const dias = parseInt(String(cli.dias_credito ?? 0), 10) || 0;

    // Vencimiento del comprobante. Si el documento no trae una fecha propia, se
    // deriva de los dias de credito del cliente: una factura a cuenta corriente
    // que vence el mismo dia que se emite no le sirve a nadie para cobrar.
    const vtoCalc = (() => {
      const propia = doc.fecha_vencimiento || doc.fecha_estimada_cobro;
      if (propia) return ddmmyyyy(propia);
      const base = String(doc.fecha || "").slice(0, 10);
      if (!base || !dias) return ddmmyyyy(doc.fecha);
      const [y, m, d] = base.split("-").map(Number);
      const f = new Date(Date.UTC(y, m - 1, d + dias));
      return ddmmyyyy(f.toISOString());
    })();

    // Domicilio y provincia del cliente: los de su ficha (desde el 28/09 se
    // completan con la constancia de inscripcion de ARCA). Si la ficha no tiene
    // provincia, va la de configuracion (Buenos Aires).
    const domicilioCli = [cli.direccion, cli.localidad, cli.codigo_postal ? `CP ${cli.codigo_postal}` : ""]
      .map((x: any) => String(x || "").trim()).filter(Boolean).join(", ");
    const provinciaCli = provCodigo(cli.provincia) || String(cfg["arca_provincia_default"] || "2");

    const payload: any = {
      ...cred,
      cliente: {
        documento_tipo: docTipoAfip,
        documento_nro: docNro,
        razon_social: nombreCli.slice(0, 255) || "CONSUMIDOR FINAL",
        nombre_fantasia: "",
        email: String(cli.email || "").slice(0, 255),
        domicilio: String(domicilioCli || "SIN INFORMAR").slice(0, 255),
        provincia: provinciaCli,
        codigo: String(cli.id),
        envia_por_mail: "N",
        condicion_pago: dias > 0 ? "205" : "201", // 205 cta cte / 201 contado
        condicion_iva: ivaCli,
        condicion_iva_operacion: ivaCli, // RG 5616 — si no se manda, hereda condicion_iva
        rg5329: "N",
      },
      comprobante: {
        fecha: ddmmyyyy(doc.fecha),
        vencimiento: vtoCalc,
        tipo: tipoComprobante(docTipo, letra),
        operacion: "V",
        punto_venta: puntoVenta,
        // `numero` NO se manda a proposito: TusFacturas trae la proxima
        // numeracion de ARCA. Manda ARCA, no el sistema.
        moneda: "PES",
        cotizacion: 1,
        idioma: 1,
        rubro: String(cfg["arca_rubro"] || "Envases plasticos").slice(0, 255),
        rubro_grupo_contable: String(cfg["arca_rubro_grupo"] || "Productos").slice(0, 255),
        detalle,
        bonificacion: 0,
        leyenda_gral: [
          remitos.length ? (remitos.length === 1 ? "Remito " : "Remitos ") + remitos.join(", ") : "",
          String(doc.observaciones || "").trim(),
        ].filter(Boolean).join(" · ").slice(0, 500),
        total: totalCalc,
        external_reference: referencia,
      },
    };

    if (percep > 0.009) {
      payload.comprobante.tributos = [{
        tipo: parseInt(String(cfg["arca_percepcion_tipo"]), 10),
        regimen: parseInt(String(cfg["arca_percepcion_regimen"]), 10),
        base_imponible: neto,
        alicuota: neto > 0 ? r2((percep / neto) * 100) : 0,
        total: r2(percep),
      }];
    }

    // NC / ND tienen que referenciar el comprobante que corrigen.
    // Nombres de campo segun la referencia v2: tipo_comprobante / comprobante_fecha / cuit.
    if ((docTipo === "nc" || docTipo === "nd") && doc.doc_tipo === "factura" && doc.doc_id) {
      const { data: fOrig } = await sb.from("facturas").select("*").eq("id", doc.doc_id).single();
      if (!fOrig?.cae) {
        return json({
          ok: false,
          error:
            "La factura que esta nota corrige todavia no tiene CAE. " +
            "Primero hay que autorizar la factura original ante ARCA.",
        });
      }
      const numOrig = String(fOrig.arca_numero || fOrig.numero || "");
      const soloNro = numOrig.includes("-") ? numOrig.split("-")[1] : numOrig;
      payload.comprobante.comprobantes_asociados = [{
        tipo_comprobante: `FACTURA ${fOrig.tipo || "A"}`,
        punto_venta: String(parseInt(String(fOrig.punto_venta || puntoVenta), 10) || 0),
        numero: parseInt(soloNro, 10) || 0,
        comprobante_fecha: ddmmyyyy(fOrig.fecha),
        cuit: parseInt(String(cfg["empresa_cuit"] || "0").replace(/\D/g, ""), 10) || 0,
      }];
    }

    // ---- Marcar "procesando" ANTES de salir a la red -------------------------
    // Si se corta la conexion, el estado queda en procesando y el boton pasa a
    // ser "verificar", no "reintentar". Esa es la diferencia entre recuperar un
    // CAE y emitir una factura fiscal duplicada.
    await sb.from(tabla).update({
      cae_estado: "procesando",
      cae_solicitado_el: new Date().toISOString(),
      ambiente,
    }).eq("id", docId);

    const safeReq = JSON.parse(JSON.stringify(payload));
    delete safeReq.apikey;
    delete safeReq.apitoken;
    delete safeReq.usertoken;

    let resp: any;
    try {
      resp = await postTF(URL_NUEVO, payload);
    } catch (e: any) {
      const corte = String(e?.name) === "AbortError";
      await logear({
        operacion: "solicitar_cae",
        request: safeReq,
        response: { excepcion: String(e?.message || e) },
        ok: false,
        error: (corte ? "TIMEOUT: " : "") + String(e?.message || e).slice(0, 400),
      });
      return json({
        ok: false,
        pendiente: true,
        ambiente,
        error: corte
          ? "ARCA no contesto a tiempo. El comprobante PUEDE haberse emitido igual: usá el botón 🔎 Verificar antes de reintentar."
          : "Error de red: " + String(e?.message || e),
      });
    }

    const data = resp.data;
    const okTF = data?.error === "N";

    if (!okTF) {
      const msg = erroresDe(data);
      await sb.from(tabla).update({
        cae_estado: "rechazado",
        cae_error: msg.slice(0, 900),
        ambiente,
      }).eq("id", docId);
      await logear({ operacion: "solicitar_cae", request: safeReq, response: data, ok: false, error: msg.slice(0, 500) });
      return json({ ok: false, ambiente, error: msg, detalle: data });
    }

    const res = await guardarAutorizado(data);
    await logear({ operacion: "solicitar_cae", request: safeReq, response: data, ok: true });

    return json({
      ok: true,
      ambiente,
      modo_prueba: res.enPrueba,
      cae: res.upd.cae,
      vencimiento: res.upd.cae_vto,
      numero: res.numeroArca,
      numero_adoptado: res.numeroAdoptado,
      pdf: res.upd.arca_pdf_url,
      qr: res.upd.arca_qr_url,
      total_enviado: totalCalc,
      total_sistema: totalSistema,
      aviso_sql: res.faltanColumnas
        ? `El CAE se obtuvo bien, pero faltan columnas en la base (${res.faltanColumnas.join(", ")}): corré de nuevo migracion_arca_cae.sql. Hasta entonces la factura se imprime con el detalle del sistema en vez del declarado a ARCA.`
        : (res.errorGuardado ? `⚠ ARCA autorizó el comprobante pero NO se pudo guardar en la base: ${res.errorGuardado}. Usá 🔎 Verificar para recuperarlo.` : null),
      aviso_total: desvio > 1
        ? `Ojo: el total que se le declaró a ARCA ($${totalCalc}) difiere del total del sistema ($${totalSistema}) en $${desvio}. Revisá los precios de las líneas.`
        : null,
      rta: data.rta || null,
    });
  } catch (e: any) {
    await logear({ operacion: "excepcion", ok: false, error: String(e?.message || e).slice(0, 500) });
    return json({ ok: false, error: String(e?.message || e) });
  }
});
