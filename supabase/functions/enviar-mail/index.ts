// ============================================================================
//  Edge Function: enviar-mail
//  Manda por correo un comprobante (recibo / orden de pago) con el PDF adjunto,
//  usando Resend (https://resend.com). La llama el sistema con la anon key.
//
//    accion = 'estado' -> dice si el servicio esta configurado. NO manda nada.
//    accion = 'enviar' -> manda UN mail a UN destinatario con UN PDF adjunto.
//
//  SECRETOS (Supabase -> Edge Functions -> Secrets):
//    RESEND_API_KEY  clave de Resend (empieza con re_)
//    MAIL_FROM       remitente, de un dominio verificado en Resend.
//                    Ej.:  Arialplast <pagos@midominio.com.ar>
//
//  El remitente lo fija el secreto, NO quien llama: asi nadie puede usar la
//  funcion para mandar correo "en nombre de" otra direccion. Un destinatario
//  por llamada, texto plano y un solo PDF: no sirve para mandar correo masivo.
//  Sin los secretos la funcion no manda nada y avisa que falta configurar.
// ============================================================================
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
// Siempre 200 con {ok:false,error}: supabase-js descarta el cuerpo de los no-2xx
// y el motivo del error es justo lo que hay que mostrar en pantalla.
const out = (o: unknown) => new Response(JSON.stringify(o), { headers: { ...cors, "Content-Type": "application/json" } });
const esMail = (s: unknown) => typeof s === "string" && s.length <= 254 && /^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/.test(s);
const MAX_PDF_B64 = 6_000_000; // ~4,5 MB de PDF

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return out({ ok: false, error: "Metodo no permitido" });
  const KEY = Deno.env.get("RESEND_API_KEY") || "";
  const FROM = Deno.env.get("MAIL_FROM") || "";
  let b: Record<string, unknown> = {};
  try { b = await req.json(); } catch (_e) { return out({ ok: false, error: "Pedido invalido" }); }
  const configurado = !!(KEY && FROM);
  if (b.accion === "estado") return out({ ok: true, configurado, remitente: FROM || null, falta: [!KEY && "RESEND_API_KEY", !FROM && "MAIL_FROM"].filter(Boolean) });
  if (b.accion !== "enviar") return out({ ok: false, error: "Accion desconocida" });
  if (!configurado) return out({ ok: false, sin_configurar: true, error: "El envio de mail todavia no esta configurado (faltan los secretos RESEND_API_KEY y MAIL_FROM)." });

  const para = String(b.para || "").trim();
  const copia = String(b.copia || "").trim();
  const asunto = String(b.asunto || "").replace(/[\r\n]+/g, " ").trim().slice(0, 200);
  const texto = String(b.texto || "").slice(0, 6000);
  const pdf = String(b.pdf_b64 || "");
  const archivo = (String(b.archivo || "comprobante.pdf").replace(/[^\w.\-]+/g, "_").slice(0, 80)) || "comprobante.pdf";
  if (!esMail(para)) return out({ ok: false, error: "El mail del destinatario no es valido." });
  if (copia && !esMail(copia)) return out({ ok: false, error: "El mail de la copia no es valido." });
  if (!asunto || !texto) return out({ ok: false, error: "Falta el asunto o el mensaje." });
  if (pdf && (pdf.length > MAX_PDF_B64 || !/^[A-Za-z0-9+/=]+$/.test(pdf) || !pdf.startsWith("JVBER"))) return out({ ok: false, error: "El adjunto no es un PDF valido o es demasiado grande." });

  const cuerpo: Record<string, unknown> = { from: FROM, to: [para], subject: asunto, text: texto };
  if (copia) { cuerpo.bcc = [copia]; cuerpo.reply_to = copia; }
  if (pdf) cuerpo.attachments = [{ filename: /\.pdf$/i.test(archivo) ? archivo : archivo + ".pdf", content: pdf }];
  try {
    const r = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: "Bearer " + KEY, "Content-Type": "application/json" }, body: JSON.stringify(cuerpo) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return out({ ok: false, error: "Resend rechazo el envio: " + (j?.message || j?.name || ("HTTP " + r.status)) });
    return out({ ok: true, id: j?.id || null, remitente: FROM });
  } catch (e) {
    return out({ ok: false, error: "No se pudo conectar con Resend: " + String((e as Error)?.message || e) });
  }
});
