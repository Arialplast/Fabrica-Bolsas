-- build 2026-10-14b — 🎈 «¿Se pinchó el globo?»: la respuesta del operario queda junto al cierre del PLC.
-- No destructivo y re-ejecutable: agrega 3 columnas nullable a plc_cierres y una función.
-- plc_cierres la escribe sólo la PC del medidor (plc_subir); el MES puede marcar «no fue bobina»
-- (plc_cierre_marcar) y, desde ahora, contestar lo del globo (plc_cierre_globo). La primera
-- respuesta queda: no se pisa (registro de evidencia, como plc_respuestas).
alter table plc_cierres add column if not exists globo_pinchado boolean;      -- true = sí / false = no / null = no se preguntó
alter table plc_cierres add column if not exists globo_resp_por text;         -- operario y pantalla
alter table plc_cierres add column if not exists globo_resp_en  timestamptz;

create or replace function plc_cierre_globo(p_id bigint, p_pinchado boolean, p_por text)
returns void language sql security definer set search_path = public as $$
  update plc_cierres
     set globo_pinchado = p_pinchado, globo_resp_por = left(p_por, 160), globo_resp_en = now()
   where id = p_id and globo_pinchado is null and p_pinchado is not null;
$$;
revoke all on function plc_cierre_globo(bigint, boolean, text) from public;
grant execute on function plc_cierre_globo(bigint, boolean, text) to anon, authenticated;
