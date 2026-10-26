-- ============================================================
-- 🧷 FUNDAS DE EMPAQUE — build 2026-10-26c
-- Correr UNA vez en Supabase (SQL editor). Es todo o nada (BEGIN/COMMIT).
-- No borra ni modifica datos existentes: agrega una categoría, columnas,
-- 11 tipos de funda, el vínculo producto→funda, los lotes del remito
-- Fénix 0001-00004276 y el consumo de las OC cerradas desde el 22/09.
-- Si se corre dos veces, la 2ª no duplica nada (todo va con NOT EXISTS).
-- ============================================================
BEGIN;

-- 1) Categoría 'empaque' en tipos_mp (las fundas viven aparte de base/aditivo)
ALTER TABLE tipos_mp DROP CONSTRAINT IF EXISTS tipos_mp_categoria_check;
ALTER TABLE tipos_mp ADD CONSTRAINT tipos_mp_categoria_check
  CHECK (categoria = ANY (ARRAY['base','aditivo','empaque']));

-- 2) Medidas de la funda (peso de una funda = g/m × largo/100)
ALTER TABLE tipos_mp ADD COLUMN IF NOT EXISTS funda_ancho_cm numeric;
ALTER TABLE tipos_mp ADD COLUMN IF NOT EXISTS funda_largo_cm numeric;
ALTER TABLE tipos_mp ADD COLUMN IF NOT EXISTS funda_g_metro  numeric;

-- 3) Qué funda lleva cada producto (una por paquete)
ALTER TABLE productos ADD COLUMN IF NOT EXISTS funda_tipo_mp_id bigint REFERENCES tipos_mp(id);

-- 4) Las 11 fundas. Chica 35×34 (45-50-60) · Grande 40×37 (75-80-90). 19 g/m ambas.
INSERT INTO tipos_mp (codigo,nombre,descripcion,categoria,unidad,activo,funda_ancho_cm,funda_largo_cm,funda_g_metro)
SELECT v.cod, v.nom, v.des, 'empaque','kg',true, v.an, v.la, 19
FROM (VALUES
 ('F45A','FUNDA 45A','Funda impresa ARIAL para 45x60',35,34),
 ('F50A','FUNDA 50A','Funda impresa ARIAL para 50x70',35,34),
 ('F60A','FUNDA 60A','Funda impresa ARIAL para 60x90',35,34),
 ('F45P','FUNDA 45P','Funda impresa POLIPLAST para 45x60',35,34),
 ('F50P','FUNDA 50P','Funda impresa POLIPLAST para 50x70',35,34),
 ('F60P','FUNDA 60P','Funda impresa POLIPLAST para 60x90',35,34),
 ('F75P','FUNDA 75P','Funda impresa POLIPLAST para 75x100',40,37),
 ('F80A','FUNDA 80A','Funda impresa ARIAL para 80x110',40,37),
 ('F80P','FUNDA 80P','Funda impresa POLIPLAST para 80x110',40,37),
 ('F90A','FUNDA 90A','Funda impresa ARIAL para 90x120',40,37),
 ('F90P','FUNDA 90P','Funda impresa POLIPLAST para 90x120',40,37)
) AS v(cod,nom,des,an,la)
WHERE NOT EXISTS (SELECT 1 FROM tipos_mp t WHERE t.codigo=v.cod);

-- 5) Producto → funda: x10/x20 con marca ARIAL o POLIPLAST, sin ROLLO ni GRANEL.
--    Medida = el primer número de la medida (45X60 → 45); marca A/P.
UPDATE productos p SET funda_tipo_mp_id = t.id
FROM tipos_empaque te, tipos_mp t
WHERE te.id = p.empaque_id
  AND te.unidades BETWEEN 2 AND 49
  AND upper(p.descripcion) !~ 'ROLLO|GRANEL'
  AND upper(p.descripcion) ~ 'ARIAL|POLIPLA'
  AND t.codigo = 'F' || substring(upper(p.descripcion) from '(\d{2})\s*X\s*\d{2,3}')
                     || CASE WHEN upper(p.descripcion) ~ 'ARIAL' THEN 'A' ELSE 'P' END
  AND p.funda_tipo_mp_id IS NULL;

-- 6) Desde cuándo las fundas se costean por consumo (antes estaban en gastos como insumos)
INSERT INTO configuracion (clave,valor)
SELECT 'funda_desde','2026-09-22'
WHERE NOT EXISTS (SELECT 1 FROM configuracion WHERE clave='funda_desde');

-- 7) Lotes del remito Fénix 0001-00004276 (22/09/2026, $6.785/kg). 75P y 90P no vinieron:
--    se cargan con el conteo físico desde la pantalla 🧷 Fundas.
WITH v(cod,kg) AS (VALUES ('F45A',66.1),('F50A',65.7),('F50P',74.2),('F45P',61.2),
                           ('F60P',34.0),('F60A',32.1),('F90A',30.0),('F80A',34.5),('F80P',40.5)),
ins AS (
  INSERT INTO lotes_mp (numero_lote,tipo_mp_id,proveedor_id,numero_remito,fecha_ingreso,
                        kg_ingresados,kg_disponibles,precio_kg,estado,activo,observaciones)
  SELECT 'FUNDA-'||substr(v.cod,2)||'-4276', t.id,
         (SELECT id FROM proveedores WHERE nombre ILIKE '%FENIX%' ORDER BY id LIMIT 1),
         '0001-00004276','2026-09-22', v.kg, 0, 6785, 'activo', true,
         'Fundas compradas a Papelera Fénix — remito 0001-00004276'
  FROM v JOIN tipos_mp t ON t.codigo=v.cod
  WHERE NOT EXISTS (SELECT 1 FROM lotes_mp l WHERE l.numero_lote='FUNDA-'||substr(v.cod,2)||'-4276')
  RETURNING id,tipo_mp_id,kg_ingresados,numero_lote
)
-- el ingreso va por el libro (el trigger fn_mp_recalc deja kg_disponibles = suma del libro)
INSERT INTO mov_mp (lote_id,tipo_mp_id,tipo_mov,kg,precio_kg,impacta_resultado,motivo,ref_tipo,ref_id,operario,fecha)
SELECT id,tipo_mp_id,'ingreso',kg_ingresados,6785,false,
       'Ingreso lote '||numero_lote||' · remito 0001-00004276','ingreso_lote',id,'admin','2026-09-22'
FROM ins;

-- 8) Consumo de las OC cerradas desde el 22/09 (una funda por paquete), tope = lo que tiene el lote.
INSERT INTO mov_mp (lote_id,tipo_mp_id,tipo_mov,kg,precio_kg,impacta_resultado,motivo,ref_tipo,ref_id,operario,fecha)
SELECT x.lote_id, x.tipo_id, 'consumo', -x.kg_cons, 6785, true,
       'Fundas '||x.numero_orden||' · '||x.paq||' paq (carga inicial)', 'orden_corte', x.oc_id, 'admin', x.fecha
FROM (
  SELECT oc.id oc_id, oc.numero_orden, oc.cantidad_bultos_reales paq,
         (oc.fecha_completada AT TIME ZONE 'America/Argentina/Buenos_Aires')::date fecha,
         t.id tipo_id, l.id lote_id,
         round(least(
           oc.cantidad_bultos_reales * t.funda_g_metro * t.funda_largo_cm / 100 / 1000,
           greatest(l.kg_ingresados - coalesce(sum(oc.cantidad_bultos_reales * t.funda_g_metro * t.funda_largo_cm / 100 / 1000)
             OVER (PARTITION BY t.id ORDER BY oc.fecha_completada, oc.id ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING),0),0)
         ),3) kg_cons
  FROM ordenes_corte oc
  JOIN productos p ON p.id=oc.producto_id
  JOIN tipos_mp t ON t.id=p.funda_tipo_mp_id
  JOIN lotes_mp l ON l.tipo_mp_id=t.id AND l.numero_remito='0001-00004276'
  WHERE oc.estado='Completada' AND oc.cantidad_bultos_reales>0
    AND oc.fecha_completada >= '2026-09-22 03:00+00'
    AND NOT EXISTS (SELECT 1 FROM mov_mp m WHERE m.ref_tipo='orden_corte' AND m.ref_id=oc.id)
) x
WHERE x.kg_cons > 0;

COMMIT;

-- Control: stock por funda después de correr
-- SELECT t.nombre, sum(l.kg_ingresados) ingreso, sum(l.kg_disponibles) quedan
-- FROM lotes_mp l JOIN tipos_mp t ON t.id=l.tipo_mp_id WHERE t.categoria='empaque' GROUP BY 1 ORDER BY 1;
