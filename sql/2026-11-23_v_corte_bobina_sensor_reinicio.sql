-- 23n (23/11/2026) — v_corte_bobina_sensor: que un reinicio del registrador no deje la bobina en 0.
-- Antes tomaba la ÚLTIMA fila por minuto del intervalo de la bobina. Cuando el registrador se reinicia
-- (o vuelve la PC) las filas siguientes traen golpes_ult_mov / ult_mov vacíos hasta que la cortina se
-- vuelve a mover, y la bobina quedaba con 0 bolsas (y a veces «ok» con 0 %).
-- Ahora: bolsas = la última fila del intervalo que SÍ tiene movimiento posterior a la carga;
-- cortina y hora del dato siguen saliendo de la última fila. Mismas columnas y tipos (las vistas
-- v_corte_oc_sensor y v_corte_alarmas no cambian). Sólo lectura; no toca datos.
-- Verificado sobre 21 días: cambian 10 bobinas, todas las que estaban en 0 por un reinicio.
create or replace view public.v_corte_bobina_sensor with (security_invoker = true) as
with b as (
  select o.id as ocb_id, o.orden_corte_id, o.maquina_id as maquina, o.pista,
         o.pista_en as carga_en, o.pista_contador as golpes_carga, o.metros_usados,
         lead(o.pista_en) over (partition by o.maquina_id, o.pista order by o.pista_en, o.id) as prox_carga_en,
         p.metros_por_bolsa
    from orden_corte_bobinas o
    join ordenes_corte oc on oc.id = o.orden_corte_id
    left join productos p on p.id = oc.producto_id
   where o.pista >= 1 and o.pista <= 4 and o.pista_en is not null and o.pista_contador is not null
)
select b.ocb_id, b.orden_corte_id, b.maquina, b.pista, b.carga_en, b.prox_carga_en, b.golpes_carga,
       f.golpes_ult_mov as golpes_fin,
       f.ult_mov as fin_en,
       coalesce(greatest(f.golpes_ult_mov - b.golpes_carga, 0::bigint), 0::bigint) as bolsas_sensor,
       round(b.metros_usados / nullif(b.metros_por_bolsa, 0::numeric)) as bolsas_esperadas,
       round(100.0 * coalesce(greatest(f.golpes_ult_mov - b.golpes_carga, 0::bigint), 0::bigint)::numeric
             / nullif(b.metros_usados / nullif(b.metros_por_bolsa, 0::numeric), 0::numeric), 1) as pct,
       case
         when u.ts is null then 'sin_sensor'::text
         when b.prox_carga_en is null then 'en_curso'::text
         when f.ult_mov is null then 'pista_sin_movimiento'::text
         when b.metros_usados is null or b.metros_por_bolsa is null or b.metros_por_bolsa = 0::numeric or b.metros_usados = 0::numeric then 'sin_metros'::text
         when 100.0 * (f.golpes_ult_mov - b.golpes_carga)::numeric / (b.metros_usados / b.metros_por_bolsa) > 105::numeric then 'alto'::text
         when 100.0 * (f.golpes_ult_mov - b.golpes_carga)::numeric / (b.metros_usados / b.metros_por_bolsa) < 95::numeric then 'bajo'::text
         else 'ok'::text
       end as estado,
       u.cortina as cortina_ahora,
       u.ts as dato_en
  from b
  left join lateral (
       select m.ts, m.cortina
         from corte_pistas_minutos m
        where m.maquina = b.maquina and m.pista = b.pista
          and m.ts >= b.carga_en - '00:02:00'::interval and m.ts <= coalesce(b.prox_carga_en, now())
        order by m.ts desc limit 1) u on true
  left join lateral (
       select m.golpes_ult_mov, m.ult_mov
         from corte_pistas_minutos m
        where m.maquina = b.maquina and m.pista = b.pista
          and m.ts >= b.carga_en - '00:02:00'::interval and m.ts <= coalesce(b.prox_carga_en, now())
          and m.golpes_ult_mov is not null and m.ult_mov >= b.carga_en
        order by m.ts desc limit 1) f on true;
