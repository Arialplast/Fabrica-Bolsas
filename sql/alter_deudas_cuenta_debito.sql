-- build 2026-10-09g — De qué banco se debita cada deuda.
-- Re-ejecutable: la columna es IF NOT EXISTS y los UPDATE ponen siempre el mismo valor.
-- Nada se borra. Correr en Supabase → SQL Editor.

BEGIN;

ALTER TABLE deudas_financieras
  ADD COLUMN IF NOT EXISTS cuenta_debito_id bigint REFERENCES cuentas_caja(id);

-- Planes ARCA que se debitan de CREDICOOP (cuenta 2)
UPDATE deudas_financieras SET cuenta_debito_id = (SELECT id FROM cuentas_caja WHERE nombre = 'CREDICOOP')
 WHERE tipo = 'plan_arca'
   AND descripcion ~* '\m(T757395|W725608|W703625|V938074|W938074|W451625|W240247|W303682|W393352|W717249)\M';

-- Planes ARCA que se debitan de GALICIA (cuenta 3)
UPDATE deudas_financieras SET cuenta_debito_id = (SELECT id FROM cuentas_caja WHERE nombre = 'GALICIA')
 WHERE tipo = 'plan_arca'
   AND descripcion ~* '\m(W186314|W557348|V898262)\M';

-- Opcional: Anticipos de Ganancias 2026 (sus cuotas pagadas salieron de CREDICOOP).
-- Sacale los dos guiones si querés asignarlo acá; si no, se asigna desde ✏️ Editar datos.
-- UPDATE deudas_financieras SET cuenta_debito_id = (SELECT id FROM cuentas_caja WHERE nombre = 'CREDICOOP')
--  WHERE tipo = 'plan_arca' AND descripcion ILIKE 'Anticipos Ganancias 2026%';

-- Verificación: tiene que listar 9 en CREDICOOP y 3 en GALICIA.
SELECT c.nombre AS banco, d.id, d.descripcion
  FROM deudas_financieras d LEFT JOIN cuentas_caja c ON c.id = d.cuenta_debito_id
 WHERE d.tipo = 'plan_arca' AND d.estado <> 'cancelado'
 ORDER BY c.nombre NULLS LAST, d.id;

COMMIT;
