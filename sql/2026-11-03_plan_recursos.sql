-- 2026-11-03 — Plan de recursos (02k): qué turno trabaja cada máquina cada día.
-- Una fila = una EXCEPCIÓN cargada a mano. Los días sin fila toman la semana tipo
-- (configuracion.plan_semana_tipo) o, en corte y para días ya vividos, los fichajes.
-- recurso: 'e:<extrusoras.id>' o 'c:<maquinas_corte.id>'. turno: código ('24','D6','S12','M','T','MT','N','M12','0').
create table if not exists public.plan_recursos (
  fecha date not null,
  recurso text not null check (recurso ~ '^(e|c):[0-9]+$'),
  turno text not null check (turno in ('24','D6','S12','M','T','MT','N','M12','0')),
  nota text,
  actualizado timestamptz not null default now(),
  primary key (fecha, recurso)
);
create index if not exists plan_recursos_fecha on public.plan_recursos(fecha);
alter table public.plan_recursos enable row level security;
drop policy if exists plan_rec_lee on public.plan_recursos;
drop policy if exists plan_rec_carga on public.plan_recursos;
drop policy if exists plan_rec_cambia on public.plan_recursos;
drop policy if exists plan_rec_borra on public.plan_recursos;
create policy plan_rec_lee on public.plan_recursos for select using (true);
create policy plan_rec_carga on public.plan_recursos for insert with check (true);
create policy plan_rec_cambia on public.plan_recursos for update using (true) with check (true);
create policy plan_rec_borra on public.plan_recursos for delete using (true);
grant select, insert, update, delete on public.plan_recursos to anon, authenticated;
