-- 25f: cheques propios y e-cheq emitidos (lo que firma Arialplast para pagar)
-- Un cheque emitido cancela la deuda con el proveedor el día del pago, pero la plata
-- sale del banco el día en que se cobra: hasta entonces es un compromiso del banco.
create table if not exists public.cheques_emitidos (
  id            bigserial primary key,
  tipo          text not null default 'cheque' check (tipo in ('cheque','echeq')),
  numero        text,
  cuenta_id     bigint not null references public.cuentas_caja(id),
  monto         numeric(14,2) not null check (monto > 0),
  fecha_emision date not null default current_date,
  fecha_pago    date not null,                    -- desde cuándo se puede cobrar (diferido)
  proveedor_id  bigint references public.proveedores(id),
  pago_id       bigint references public.pagos(id),
  plano         text,
  estado        text not null default 'emitido' check (estado in ('emitido','debitado','anulado')),
  fecha_debito  date,                             -- cuándo salió del banco
  observaciones text,
  created_at    timestamptz not null default now()
);
create index if not exists cheques_emitidos_estado_idx on public.cheques_emitidos(estado, fecha_pago);
create index if not exists cheques_emitidos_pago_idx on public.cheques_emitidos(pago_id);
alter table public.cheques_emitidos enable row level security;
create policy chem_lee    on public.cheques_emitidos for select using (true);
create policy chem_carga  on public.cheques_emitidos for insert with check (true);
create policy chem_cambia on public.cheques_emitidos for update using (true) with check (true);
create policy chem_borra  on public.cheques_emitidos for delete using (true);
