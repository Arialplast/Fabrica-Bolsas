-- 19e (19/10/2026): pista de la cortadora que elige el operario al escanear cada bobina. Aplicada en Supabase.
alter table public.orden_corte_bobinas add column if not exists pista smallint, add column if not exists pista_contador bigint, add column if not exists pista_en timestamptz;
