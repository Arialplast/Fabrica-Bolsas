-- 26c: productos que un cliente ya no lleva (sale de su surtido, carta y aumentos hasta que lo vuelva a pedir)
create table if not exists cliente_productos_baja(
  id bigserial primary key,
  cliente_id bigint not null references clientes(id) on delete cascade,
  producto_id bigint not null references productos(id) on delete cascade,
  desde date not null default current_date,
  motivo text,
  creado_el timestamptz not null default now(),
  unique(cliente_id,producto_id));
alter table cliente_productos_baja enable row level security;
create policy cpb_lee on cliente_productos_baja for select using (true);
create policy cpb_carga on cliente_productos_baja for insert with check (true);
create policy cpb_cambia on cliente_productos_baja for update using (true) with check (true);
create policy cpb_borra on cliente_productos_baja for delete using (true);
