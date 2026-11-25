-- 25h: aprobar el plan de la semana
create table if not exists public.planes_semana (id bigserial primary key, semana date not null unique, aprobado_en timestamptz not null default now(), foto jsonb not null, nota text, created_at timestamptz not null default now());
alter table public.planes_semana enable row level security;
create policy plsem_lee on public.planes_semana for select using (true);
create policy plsem_carga on public.planes_semana for insert with check (true);
create policy plsem_cambia on public.planes_semana for update using (true) with check (true);
