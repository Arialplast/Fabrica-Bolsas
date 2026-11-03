-- 2026-11-03 — Etapa 1 «Velocidades reales»: agregados de SOLO LECTURA para corte.
-- corte_tandas (~1.800 filas/día) y corte_pistas_minutos (~5.800 filas/día) no se pueden bajar
-- enteras al navegador para 28 días. Estas funciones resumen en la base; no escriben nada.
-- security invoker: leen con los permisos de quien llama (mismas políticas que las tablas).

-- Golpes y segundos en marcha por cortadora y día (tandas con hora; las «sin_hora» suman golpes aparte).
create or replace function public.vel_corte_dias(p_desde timestamptz)
returns table(maquina int, dia date, golpes bigint, golpes_con_hora bigint, seg_marcha numeric, tandas bigint)
language sql stable security invoker set search_path = public as $$
  select t.maquina,
         (t.inicio at time zone 'America/Argentina/Buenos_Aires')::date as dia,
         sum(t.golpes)::bigint,
         sum(t.golpes) filter (where not coalesce(t.sin_hora,false))::bigint,
         round(sum(extract(epoch from (t.fin - t.inicio))) filter (where not coalesce(t.sin_hora,false) and t.fin > t.inicio)::numeric, 1),
         count(*)
  from corte_tandas t
  where t.inicio >= p_desde
  group by 1, 2
  order by 1, 2
$$;

-- Cortinas (PLC2): por día, golpes de la máquina, bolsas medidas (golpes × pistas que se movieron
-- en el minuto) y golpes con film de cada pista. Contadores acumulados → diferencias entre minutos;
-- se descartan saltos negativos o > 200 golpes/min (reinicios).
create or replace function public.vel_corte_pistas_dias(p_desde timestamptz)
returns table(maquina int, dia date, minutos bigint, golpes bigint, bolsas bigint,
              g1 bigint, g2 bigint, g3 bigint, g4 bigint)
language sql stable security invoker set search_path = public as $$
  with d as (
    select maquina, pista, ts,
           golpes - lag(golpes) over w as dg,
           mov - lag(mov) over w as dm
    from corte_pistas_minutos
    where ts >= p_desde - interval '2 minutes'
    window w as (partition by maquina, pista order by ts)
  ), m as (
    select maquina, ts, max(dg) as dg,
           count(*) filter (where dm > 0) as pact,
           max(case when pista = 1 and dm > 0 then dg else 0 end) as g1,
           max(case when pista = 2 and dm > 0 then dg else 0 end) as g2,
           max(case when pista = 3 and dm > 0 then dg else 0 end) as g3,
           max(case when pista = 4 and dm > 0 then dg else 0 end) as g4
    from d where dg between 1 and 200 and ts >= p_desde
    group by maquina, ts
  )
  select maquina, (ts at time zone 'America/Argentina/Buenos_Aires')::date,
         count(*), sum(dg)::bigint, sum(dg * pact)::bigint,
         sum(g1)::bigint, sum(g2)::bigint, sum(g3)::bigint, sum(g4)::bigint
  from m group by 1, 2 order by 1, 2
$$;

-- Minutos en que una pista que venía cortando siguió golpeando SIN film (bobina terminada,
-- film cortado): la máquina golpeó, la cortina no se movió, y su último movimiento fue hace
-- más de 15 golpes y menos de 1.500 (si pasó más, la pista ya no está en uso).
create or replace function public.vel_corte_pistas_vacias(p_desde timestamptz)
returns table(maquina int, pista int, ts timestamptz, golpes bigint, gap bigint)
language sql stable security invoker set search_path = public as $$
  with d as (
    select maquina, pista, ts, golpes, golpes_ult_mov,
           golpes - lag(golpes) over w as dg,
           mov - lag(mov) over w as dm
    from corte_pistas_minutos
    where ts >= p_desde - interval '2 minutes'
    window w as (partition by maquina, pista order by ts)
  )
  select maquina, pista, ts, dg::bigint, (golpes - golpes_ult_mov)::bigint
  from d
  where ts >= p_desde and dg between 1 and 200 and dm = 0
    and golpes_ult_mov is not null and (golpes - golpes_ult_mov) between 16 and 1500
  order by maquina, pista, ts
$$;

grant execute on function public.vel_corte_dias(timestamptz) to anon, authenticated;
grant execute on function public.vel_corte_pistas_dias(timestamptz) to anon, authenticated;
grant execute on function public.vel_corte_pistas_vacias(timestamptz) to anon, authenticated;
