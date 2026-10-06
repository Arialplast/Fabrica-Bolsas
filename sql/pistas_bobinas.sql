-- build 2026-10-06a · 🧵 Plan de bobinas por pistas
-- No destructivo y re-ejecutable: sólo agrega columnas y completa las que están en NULL.
-- Sin correr esto el HTML funciona igual (deriva pistas/objetivo con la misma regla),
-- pero no puede guardar el plan de cada OE ni lo que se edite en la ficha de la bobina.

-- 1) Ficha de la bobina (la bolsa): cuántas pistas corre y cuántos metros lleva cada bobina
ALTER TABLE bobinas ADD COLUMN IF NOT EXISTS pistas integer;
ALTER TABLE bobinas ADD COLUMN IF NOT EXISTS metros_bobina_obj numeric;
ALTER TABLE bobinas ADD COLUMN IF NOT EXISTS rango_bobina_pct numeric;

-- 2) Plan de la OE: N bobinas × L metros en P pistas (metros de la OE = N × L)
ALTER TABLE ordenes ADD COLUMN IF NOT EXISTS bobinas_plan integer;
ALTER TABLE ordenes ADD COLUMN IF NOT EXISTS metros_bobina_plan numeric;
ALTER TABLE ordenes ADD COLUMN IF NOT EXISTS pistas_plan integer;

-- 3) Carga inicial de pistas: 45–60 cm = 4, salvo 60 cm de más de 50 µ = 2; más de 60 cm = 2
UPDATE bobinas SET pistas = CASE
    WHEN coalesce(ancho,0) > 60 THEN 2
    WHEN coalesce(ancho,0) >= 60 AND coalesce(espesor,0) > 50 THEN 2
    ELSE 4 END
WHERE pistas IS NULL;

UPDATE bobinas SET rango_bobina_pct = 15 WHERE rango_bobina_pct IS NULL;

-- 4) Metros objetivo por bobina, del historial de CADA tipo (últimos 180 días):
--    mediana de sus bobinas sin la más corta de cada OE (el «resto»), redondeada a 50 m.
--    Hace falta un mínimo de 8 bobinas. Si no hay, se usa el PESO típico de las bobinas del
--    mismo ancho (mediana de kg) dividido por los kg/m de ésta — así una bobina más gruesa
--    sale con menos metros —; y si tampoco, una tabla de peso por ancho.
WITH b AS (
  SELECT coalesce(bp.bobina_tipo_id, o.bobina_id) AS tipo, bp.orden_id, bp.metros_reales AS m, bp.kg_reales AS kg,
         row_number() OVER (PARTITION BY bp.orden_id ORDER BY bp.metros_reales) AS rk,
         count(*)     OVER (PARTITION BY bp.orden_id) AS n
  FROM bobinas_producidas bp JOIN ordenes o ON o.id = bp.orden_id
  WHERE bp.fecha_produccion > current_date - 180
    AND coalesce(bp.anulada,false) = false AND coalesce(bp.fuera_de_rango,false) = false
    AND bp.metros_reales > 0
),
sin_resto AS (SELECT tipo, m, kg FROM b WHERE n < 2 OR rk > 1),
por_tipo AS (
  SELECT tipo, count(*) AS c, percentile_cont(0.5) WITHIN GROUP (ORDER BY m) AS med
  FROM sin_resto GROUP BY tipo
),
por_ancho AS (
  SELECT bo.ancho, percentile_cont(0.5) WITHIN GROUP (ORDER BY s.kg) AS kg_med, count(*) AS c
  FROM sin_resto s JOIN bobinas bo ON bo.id = s.tipo
  WHERE s.kg > 0
  GROUP BY 1
)
UPDATE bobinas bo SET metros_bobina_obj = greatest(50, round(coalesce(
    (SELECT pt.med FROM por_tipo pt WHERE pt.tipo = bo.id AND pt.c >= 8),
    CASE WHEN coalesce(bo.kg_por_metro,0) > 0 THEN
      (SELECT pa.kg_med FROM por_ancho pa WHERE pa.ancho = bo.ancho AND pa.c >= 8) / bo.kg_por_metro
    END,
    CASE WHEN coalesce(bo.kg_por_metro,0) > 0 THEN
      (CASE WHEN coalesce(bo.ancho,0) <= 50 THEN 20
            WHEN coalesce(bo.ancho,0) <= 60 THEN 26
            WHEN coalesce(bo.ancho,0) <= 90 THEN 32 ELSE 36 END) / bo.kg_por_metro
    END,
    1000) / 50.0) * 50)
WHERE bo.metros_bobina_obj IS NULL;

-- Control: cómo quedó cada bobina
-- SELECT nombre, descripcion, ancho, espesor, pistas, metros_bobina_obj, rango_bobina_pct FROM bobinas ORDER BY ancho, espesor;
