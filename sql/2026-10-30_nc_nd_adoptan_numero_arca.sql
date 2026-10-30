-- APLICADO 30/10/2026 (migración nc_nd_adoptan_numero_arca).
-- Una NC/ND con CAE real adopta el número de ARCA (igual que las facturas).
create or replace function public.fn_nota_adopta_numero_arca() returns trigger
language plpgsql as $$
begin
  if new.cae is not null and coalesce(new.arca_numero,'') <> ''
     and coalesce(new.ambiente,'produccion') = 'produccion' then
    new.numero := new.arca_numero;
    if tg_table_name = 'notas_debito' then new.numero_doc := new.arca_numero; end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_nc_adopta_numero_arca on public.notas_credito;
create trigger trg_nc_adopta_numero_arca before insert or update of cae, arca_numero, numero
  on public.notas_credito for each row execute function public.fn_nota_adopta_numero_arca();
drop trigger if exists trg_nd_adopta_numero_arca on public.notas_debito;
create trigger trg_nd_adopta_numero_arca before insert or update of cae, arca_numero, numero
  on public.notas_debito for each row execute function public.fn_nota_adopta_numero_arca();
update public.notas_credito set numero = arca_numero where cae is not null and coalesce(arca_numero,'')<>'' and numero is distinct from arca_numero;
