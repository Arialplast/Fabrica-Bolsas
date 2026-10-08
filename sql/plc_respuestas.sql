-- 07v — Respuestas del operario cuando una bobina salió fuera de rango y no corrigió la velocidad.
-- Es un registro de evidencia: se puede insertar y leer, NO modificar ni borrar desde el MES.
create table if not exists public.plc_respuestas (
  id bigserial primary key,
  creado_en timestamptz not null default now(),
  extrusora_id bigint references public.extrusoras(id),
  bobina_id bigint references public.bobinas_producidas(id),
  numero_bobina text,
  desvio_pct numeric,
  estado text,          -- nada | reves | poco
  vel_antes numeric,
  vel_despues numeric,
  motivo text not null, -- tornillo | no_da | globo | ya_corrijo | a_proposito | otro
  detalle text,
  operario text
);
create index if not exists plc_respuestas_bob on public.plc_respuestas(bobina_id);
create index if not exists plc_respuestas_ext_t on public.plc_respuestas(extrusora_id, creado_en);
alter table public.plc_respuestas enable row level security;
drop policy if exists plc_resp_lee on public.plc_respuestas;
drop policy if exists plc_resp_carga on public.plc_respuestas;
create policy plc_resp_lee on public.plc_respuestas for select using (true);
create policy plc_resp_carga on public.plc_respuestas for insert with check (motivo in ('tornillo','no_da','globo','ya_corrijo','a_proposito','otro'));
