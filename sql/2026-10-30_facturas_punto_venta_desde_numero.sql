-- APLICADO 30/10/2026 (migración facturas_punto_venta_desde_numero).
-- Las facturas del PV 5 quedaban con punto_venta='1' y las NC/ND salían asociadas a 0001-xxxx.
update facturas set punto_venta='5' where numero like '0005-%' and punto_venta='1';
create or replace function public.fn_facturas_pv_desde_numero() returns trigger
language plpgsql as $$
declare v text;
begin
  v := split_part(coalesce(nullif(new.arca_numero,''), new.numero), '-', 1);
  if v ~ '^\d+$' and v::int > 0 then
    new.punto_venta := (v::int)::text;
  end if;
  return new;
end $$;
drop trigger if exists trg_facturas_pv_desde_numero on public.facturas;
create trigger trg_facturas_pv_desde_numero
  before insert or update of numero, arca_numero, punto_venta on public.facturas
  for each row execute function public.fn_facturas_pv_desde_numero();
