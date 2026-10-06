-- build 2026-10-06b — ⚖ Balanza Kretz en la carga de bobinas de extrusión
-- No destructivo, re-ejecutable. Sin correrlo el HTML graba igual (kg_reales = neto)
-- y deja bruto / tubo / origen escritos en observaciones.
alter table bobinas_producidas
  add column if not exists peso_bruto_kg numeric,
  add column if not exists tara_tubo_kg  numeric,
  add column if not exists peso_origen   text;   -- 'balanza' | 'manual' · NULL = antes de la balanza (kg con tubo)

-- Peso del tubo de cartón por ancho (cm → kg). Sólo 90 cm está pesado; el resto se
-- estima proporcional hasta que se pese. Se edita desde Carga de bobinas → ⚙ Tubos.
insert into configuracion (clave, valor)
values ('taras_tubo', '{"90":1.1}')
on conflict (clave) do nothing;
