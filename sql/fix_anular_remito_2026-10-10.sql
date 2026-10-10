-- fix_anular_remito_2026-10-10.sql
-- Supabase > SQL Editor > pegar todo > Run.
-- Agrega UNA sola cosa a anular_remito: antes de borrar las líneas del remito,
-- borra sus vínculos en factura_linea_remitos (que frenaban por FK).
-- Seguro: la función ya bloquea si la factura del remito está viva
-- (sin anular o sin NC total), así que el vínculo que borra es historia.

CREATE OR REPLACE FUNCTION public.anular_remito(p_remito_id bigint, p_motivo text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_rem        public.remitos%ROWTYPE;
  v_lin        public.remito_lineas%ROWTYPE;
  v_pre        public.prestamos_bolsas%ROWTYPE;
  v_dest       bigint;
  v_prestado   numeric;
  v_libre      numeric;
  v_libre_uni  numeric;
  v_uniratio   numeric;
  v_lote       public.stock_bolsas%ROWTYPE;
  v_total_ped  numeric := 0;
  v_entregado  numeric := 0;
  v_nuevo_est  text;
  v_devuelto_prest numeric := 0;
  v_devuelto_libre numeric := 0;
  v_doc_total  numeric;
  v_doc_nc     numeric;
BEGIN
  SELECT * INTO v_rem FROM public.remitos WHERE id = p_remito_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'msg', 'El remito no existe');
  END IF;
  IF v_rem.estado = 'anulado' THEN
    RETURN jsonb_build_object('ok', false, 'msg', 'El remito ya esta anulado');
  END IF;

  IF v_rem.factura_id IS NOT NULL THEN
    SELECT total INTO v_doc_total FROM public.facturas WHERE id = v_rem.factura_id;
    SELECT COALESCE(SUM(total),0) INTO v_doc_nc FROM public.notas_credito
      WHERE doc_tipo='factura' AND doc_id=v_rem.factura_id AND estado <> 'anulada';
    IF COALESCE(v_doc_nc,0) < COALESCE(v_doc_total,0) - 0.01 THEN
      RETURN jsonb_build_object('ok', false, 'msg', 'El remito esta facturado. Emiti una NC total de la factura para poder anularlo.');
    END IF;
  END IF;

  IF v_rem.rv_id IS NOT NULL THEN
    SELECT total INTO v_doc_total FROM public.remitos_valorizados WHERE id = v_rem.rv_id;
    SELECT COALESCE(SUM(total),0) INTO v_doc_nc FROM public.notas_credito
      WHERE doc_tipo='rv' AND doc_id=v_rem.rv_id AND estado <> 'anulada';
    IF COALESCE(v_doc_nc,0) < COALESCE(v_doc_total,0) - 0.01 THEN
      RETURN jsonb_build_object('ok', false, 'msg', 'El remito tiene un RV. Emiti una NC total del RV para poder anularlo.');
    END IF;
  END IF;

  PERFORM set_config('app.mov_skip', 'on', true);

  FOR v_pre IN SELECT * FROM public.prestamos_bolsas WHERE remito_id = p_remito_id LOOP
    SELECT id INTO v_dest FROM public.stock_bolsas
      WHERE pedido_id = v_pre.pedido_origen_id AND producto_id = v_pre.producto_id AND estado = 'reservado'
      ORDER BY id LIMIT 1;
    IF v_dest IS NOT NULL THEN
      UPDATE public.stock_bolsas
         SET cantidad_paquetes = cantidad_paquetes + v_pre.cantidad_paquetes,
             cantidad_unidades = cantidad_unidades + COALESCE(v_pre.cantidad_unidades, 0)
       WHERE id = v_dest;
    ELSE
      INSERT INTO public.stock_bolsas (producto_id, pedido_id, cantidad_paquetes, cantidad_unidades, estado)
      VALUES (v_pre.producto_id, v_pre.pedido_origen_id, v_pre.cantidad_paquetes, COALESCE(v_pre.cantidad_unidades,0), 'reservado');
    END IF;
    v_devuelto_prest := v_devuelto_prest + v_pre.cantidad_paquetes;
  END LOOP;

  FOR v_lin IN SELECT * FROM public.remito_lineas WHERE remito_id = p_remito_id LOOP
    v_prestado := COALESCE((SELECT SUM(cantidad_paquetes) FROM public.prestamos_bolsas
      WHERE remito_id = p_remito_id AND producto_id = v_lin.producto_id), 0);
    v_libre := v_lin.cantidad_paquetes - v_prestado;
    IF v_libre < 0 THEN v_libre := 0; END IF;
    v_uniratio := CASE WHEN v_lin.cantidad_paquetes > 0
                       THEN COALESCE(v_lin.cantidad_unidades,0) / v_lin.cantidad_paquetes ELSE 0 END;
    v_libre_uni := ROUND(v_libre * v_uniratio);

    IF v_libre > 0 THEN
      IF v_lin.stock_bolsa_id IS NOT NULL THEN
        SELECT * INTO v_lote FROM public.stock_bolsas WHERE id = v_lin.stock_bolsa_id;
        IF FOUND AND v_lote.estado IN ('disponible','reservado') THEN
          UPDATE public.stock_bolsas
             SET cantidad_paquetes = cantidad_paquetes + v_libre,
                 cantidad_unidades = cantidad_unidades + v_libre_uni
           WHERE id = v_lin.stock_bolsa_id;
        ELSE
          INSERT INTO public.stock_bolsas (producto_id, cantidad_paquetes, cantidad_unidades, estado, orden_corte_id)
          VALUES (v_lin.producto_id, v_libre, v_libre_uni, 'disponible', COALESCE(v_lote.orden_corte_id, NULL));
        END IF;
      ELSE
        INSERT INTO public.stock_bolsas (producto_id, cantidad_paquetes, cantidad_unidades, estado)
        VALUES (v_lin.producto_id, v_libre, v_libre_uni, 'disponible');
      END IF;
      v_devuelto_libre := v_devuelto_libre + v_libre;
    END IF;

    INSERT INTO public.mov_bolsas
      (producto_id, fecha, tipo, paquetes, impacta_result, remito_id, pedido_id, observaciones)
    VALUES
      (v_lin.producto_id, now(), 'produccion', v_lin.cantidad_paquetes, false, p_remito_id,
       v_rem.pedido_id, 'anulacion remito ' || COALESCE(v_rem.numero_remito, '#'||p_remito_id));
  END LOOP;

  DELETE FROM public.stock_bolsas WHERE estado = 'entregado' AND remito_id = p_remito_id;

  -- (2026-10-10) NUEVO: el vinculo renglon factura -> renglon remito frenaba por FK.
  DELETE FROM public.factura_linea_remitos
   WHERE remito_linea_id IN (SELECT id FROM public.remito_lineas WHERE remito_id = p_remito_id);
  DELETE FROM public.remito_lineas    WHERE remito_id = p_remito_id;
  DELETE FROM public.prestamos_bolsas WHERE remito_id = p_remito_id;
  UPDATE public.remitos SET estado='anulado', anulado_el=now(), anulado_motivo=p_motivo WHERE id = p_remito_id;

  IF v_rem.pedido_id IS NOT NULL THEN
    SELECT COALESCE(SUM(cantidad),0) INTO v_total_ped FROM public.pedido_lineas WHERE pedido_id = v_rem.pedido_id;
    SELECT COALESCE(SUM(rl.cantidad_paquetes),0) INTO v_entregado
      FROM public.remito_lineas rl JOIN public.remitos r ON r.id = rl.remito_id
     WHERE r.pedido_id = v_rem.pedido_id AND r.estado <> 'anulado';
    IF v_entregado <= 0 THEN v_nuevo_est := 'Pendiente';
    ELSIF v_entregado >= v_total_ped THEN v_nuevo_est := 'Entregado';
    ELSE v_nuevo_est := 'Entregado parcial'; END IF;
    UPDATE public.pedidos SET estado = v_nuevo_est WHERE id = v_rem.pedido_id;
  END IF;

  RETURN jsonb_build_object('ok', true,
    'msg', 'Remito ' || COALESCE(v_rem.numero_remito, '#'||p_remito_id) || ' anulado',
    'devuelto_prestamos', v_devuelto_prest, 'devuelto_libre', v_devuelto_libre, 'pedido_estado', v_nuevo_est);
END;
$function$;
