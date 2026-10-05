-- build 2026-10-05b · cómo se cargó cada bobina a una OC (pistola / boton / lista / qr)
-- No destructivo, re-ejecutable. Las filas viejas quedan en NULL (= no se sabe).
ALTER TABLE orden_corte_bobinas ADD COLUMN IF NOT EXISTS origen text;
