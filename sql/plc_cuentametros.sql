-- build 2026-10-07e — 📏 Cuentametros de extrusión (PLC Delta) → MES
-- No destructivo y re-ejecutable. Sólo crea tablas nuevas y agrega UNA columna nullable
-- (bobinas_producidas.plc_cierre_id). No modifica ni borra datos existentes.
--
-- Principios (proyecto cuentametros):
--  · P1: el PLC lleva odómetros que nunca vuelven a cero. Acá se guardan PULSOS, nunca
--    metros: los metros salen de restar dos odómetros × el factor vigente.
--  · P3: el factor m/pulso vive en configuracion.plc_factor y lo carga una persona
--    después del testigo. El sistema no lo recalcula solo.
--  · Las tablas plc_* las escribe SÓLO la PC del medidor, a través de plc_subir(), que
--    pide un token. El MES (clave pública) sólo las lee. La única marca que puede poner
--    el MES es «este cierre no fue una bobina» (plc_cierre_marcar).

-- 1) Qué grupo de bornes del PLC es qué extrusora, y desde cuándo
create table if not exists plc_grupos (
  id           bigserial primary key,
  grupo        integer not null,            -- 1 = D2010…, 2 = D2030…, 3 = D2050…
  extrusora_id bigint  not null references extrusoras(id),
  desde        timestamptz not null,
  hasta        timestamptz,
  nota         text
);

-- 2) Estado en vivo: una fila por grupo, la pisa la PC cada ~10 s
create table if not exists plc_estado (
  grupo          integer primary key,
  actualizado_en timestamptz not null,
  odo_bruto      bigint, odo_film bigint,     -- pulsos (P1)
  seg_film       bigint, seg_prod bigint,     -- segundos acumulados (P1)
  cierres        bigint,
  film_cierre    bigint, prod_cierre bigint,  -- valores congelados en el último cierre
  version_plc    integer
);

-- 3) Un registro por minuto y por grupo (odómetros al cierre del minuto)
create table if not exists plc_minutos (
  grupo     integer not null,
  ts        timestamptz not null,
  odo_bruto bigint, odo_film bigint, seg_film bigint, seg_prod bigint, cierres bigint,
  primary key (grupo, ts)
);
create index if not exists plc_minutos_ts on plc_minutos (ts desc);

-- 4) Cada vez que el operario aprieta el pulsador de la máquina
create table if not exists plc_cierres (
  id          bigserial primary key,
  grupo       integer not null,
  n_cierre    bigint  not null,               -- contador de cierres del PLC (D20x8)
  cerrado_en  timestamptz not null,
  odo_bruto   bigint, odo_film bigint,        -- odómetros leídos ≤0,5 s después del cierre
  film_cierre bigint, prod_cierre bigint,     -- congelados por el PLC en el cierre (exactos)
  seg_film    bigint, seg_prod bigint,
  descartado  boolean not null default false, -- «no fue una bobina» (marcado desde el MES)
  nota        text,
  creado_en   timestamptz not null default now(),
  unique (grupo, n_cierre)
);
create index if not exists plc_cierres_cerrado on plc_cierres (cerrado_en desc);

-- 5) La bobina del MES se ata a su cierre (una bobina ↔ un cierre)
alter table bobinas_producidas add column if not exists plc_cierre_id bigint references plc_cierres(id);
create unique index if not exists bobinas_producidas_plc_cierre_uq
  on bobinas_producidas (plc_cierre_id) where plc_cierre_id is not null;

-- 6) Lectura pública (el MES), escritura sólo por las funciones
alter table plc_grupos  enable row level security;
alter table plc_estado  enable row level security;
alter table plc_minutos enable row level security;
alter table plc_cierres enable row level security;
drop policy if exists plc_grupos_lee  on plc_grupos;  create policy plc_grupos_lee  on plc_grupos  for select using (true);
drop policy if exists plc_estado_lee  on plc_estado;  create policy plc_estado_lee  on plc_estado  for select using (true);
drop policy if exists plc_minutos_lee on plc_minutos; create policy plc_minutos_lee on plc_minutos for select using (true);
drop policy if exists plc_cierres_lee on plc_cierres; create policy plc_cierres_lee on plc_cierres for select using (true);

-- 7) Token de la PC del medidor (se guarda el hash; el token vive sólo en esa PC)
create schema if not exists plc_privado;
revoke all on schema plc_privado from public, anon, authenticated;
create table if not exists plc_privado.token (id int primary key default 1, hash text not null);

create or replace function plc_subir(p_token text, p_estado jsonb, p_minutos jsonb, p_cierres jsonb)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare n_m int := 0; n_c int := 0;
begin
  if not exists (select 1 from plc_privado.token t
                 where t.hash = encode(extensions.digest(coalesce(p_token,''), 'sha256'), 'hex')) then
    raise exception 'token invalido';
  end if;
  if p_estado is not null and jsonb_typeof(p_estado) = 'array' then
    insert into plc_estado (grupo, actualizado_en, odo_bruto, odo_film, seg_film, seg_prod, cierres, film_cierre, prod_cierre, version_plc)
    select (e->>'grupo')::int, (e->>'ts')::timestamptz, (e->>'bruto')::bigint, (e->>'film')::bigint,
           (e->>'seg_film')::bigint, (e->>'seg_prod')::bigint, (e->>'cierres')::bigint,
           (e->>'film_cierre')::bigint, (e->>'prod_cierre')::bigint, (e->>'version')::int
    from jsonb_array_elements(p_estado) e
    on conflict (grupo) do update set actualizado_en = excluded.actualizado_en, odo_bruto = excluded.odo_bruto,
      odo_film = excluded.odo_film, seg_film = excluded.seg_film, seg_prod = excluded.seg_prod,
      cierres = excluded.cierres, film_cierre = excluded.film_cierre, prod_cierre = excluded.prod_cierre,
      version_plc = excluded.version_plc;
  end if;
  if p_minutos is not null and jsonb_typeof(p_minutos) = 'array' then
    insert into plc_minutos (grupo, ts, odo_bruto, odo_film, seg_film, seg_prod, cierres)
    select (m->>'grupo')::int, (m->>'ts')::timestamptz, (m->>'bruto')::bigint, (m->>'film')::bigint,
           (m->>'seg_film')::bigint, (m->>'seg_prod')::bigint, (m->>'cierres')::bigint
    from jsonb_array_elements(p_minutos) m
    on conflict (grupo, ts) do nothing;
    get diagnostics n_m = row_count;
  end if;
  if p_cierres is not null and jsonb_typeof(p_cierres) = 'array' then
    insert into plc_cierres (grupo, n_cierre, cerrado_en, odo_bruto, odo_film, film_cierre, prod_cierre, seg_film, seg_prod)
    select (c->>'grupo')::int, (c->>'cierres')::bigint, (c->>'ts')::timestamptz, (c->>'bruto')::bigint,
           (c->>'film')::bigint, (c->>'film_cierre')::bigint, (c->>'prod_cierre')::bigint,
           (c->>'seg_film')::bigint, (c->>'seg_prod')::bigint
    from jsonb_array_elements(p_cierres) c
    on conflict (grupo, n_cierre) do nothing;
    get diagnostics n_c = row_count;
  end if;
  return jsonb_build_object('minutos', n_m, 'cierres', n_c);
end $$;
revoke all on function plc_subir(text, jsonb, jsonb, jsonb) from public;
grant execute on function plc_subir(text, jsonb, jsonb, jsonb) to anon, authenticated;

-- «Este cierre no fue una bobina» (o volver atrás). Lo usa la carga de bobinas.
create or replace function plc_cierre_marcar(p_id bigint, p_descartado boolean, p_nota text)
returns void language sql security definer set search_path = public as $$
  update plc_cierres set descartado = coalesce(p_descartado, false), nota = left(p_nota, 300) where id = p_id;
$$;
revoke all on function plc_cierre_marcar(bigint, boolean, text) from public;
grant execute on function plc_cierre_marcar(bigint, boolean, text) to anon, authenticated;

-- 8) Asignación de grupos al 07/10/2026 (grupo 1 = EXT-03 desde la primera prueba; grupo 3 = EXT-07)
insert into plc_grupos (grupo, extrusora_id, desde, nota)
select 1, 3, '2026-09-25 00:00-03', 'EXT-03 cableada provisoriamente en el grupo 1'
where not exists (select 1 from plc_grupos where grupo = 1);
insert into plc_grupos (grupo, extrusora_id, desde, nota)
select 3, 7, '2026-10-03 12:00-03', 'EXT-07 conectada el 03/10'
where not exists (select 1 from plc_grupos where grupo = 3);

-- 9) Factor m/pulso por extrusora (P3). PROVISORIO hasta el testigo: congelado=false.
insert into configuracion (clave, valor)
values ('plc_factor', '{"3":{"m_pulso":0.80,"congelado":false},"7":{"m_pulso":0.80,"congelado":false}}')
on conflict (clave) do nothing;
