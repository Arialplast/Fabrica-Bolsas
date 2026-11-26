-- 26d: condiciones comerciales por cliente para el precio de bolsillo (comisión %, flete $/kg, días de cobro pactados si no hay historia)
create table if not exists cliente_condiciones(
  cliente_id bigint primary key references clientes(id) on delete cascade,
  comision_pct numeric, flete_kg numeric, dias_cobro integer, nota text,
  actualizado_el timestamptz not null default now());
alter table cliente_condiciones enable row level security;
create policy ccond_lee on cliente_condiciones for select using (true);
create policy ccond_carga on cliente_condiciones for insert with check (true);
create policy ccond_cambia on cliente_condiciones for update using (true) with check (true);
create policy ccond_borra on cliente_condiciones for delete using (true);
