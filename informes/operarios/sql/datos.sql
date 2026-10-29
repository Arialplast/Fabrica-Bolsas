-- Bobinas cargadas, órdenes, restos de bobina pasados de pista (corte_restos), fichajes, bobinas pesadas y minutos con film del cuentametros.
-- Reemplazar __DESDE__ y __HASTA__ (timestamptz).
with m as (select grupo, ts, odo_film - lag(odo_film) over (partition by grupo order by ts) dm, ts - lag(ts) over (partition by grupo order by ts) gp
           from plc_minutos where ts >= '__DESDE__' and ts < '__HASTA__')
select json_build_object(
'ocb',(select json_agg(json_build_object('id',x.id,'orden_corte_id',x.orden_corte_id,'bobina_producida_id',x.bobina_producida_id,'metros_usados',x.metros_usados,'fecha_asignacion',x.fecha_asignacion,'empleado_id',x.empleado_id,'maquina_id',x.maquina_id,'origen',x.origen,'pista',x.pista,'pista_contador',x.pista_contador,'pista_en',x.pista_en,
  'bobinas_producidas',json_build_object('numero_bobina',bp.numero_bobina,'kg_reales',bp.kg_reales,'metros_reales',bp.metros_reales,'tara_tubo_kg',bp.tara_tubo_kg,'peso_origen',bp.peso_origen,'extrusora_id',bp.extrusora_id,'plc_cierre_id',bp.plc_cierre_id)) order by x.fecha_asignacion)
  from orden_corte_bobinas x join bobinas_producidas bp on bp.id=x.bobina_producida_id where x.fecha_asignacion >= timestamptz '__DESDE__' - interval '5 days' and x.fecha_asignacion < '__HASTA__'),
'oc',(select json_agg(json_build_object('id',oc.id,'numero_orden',oc.numero_orden,'cliente',oc.cliente,'estado',oc.estado,'unidades_reales',oc.unidades_reales,'peso_scrap_kg',oc.peso_scrap_kg,'fecha_completada',oc.fecha_completada,'observaciones',oc.observaciones,
  'productos',json_build_object('codigo',p.codigo,'descripcion',p.descripcion,'metros_por_bolsa',p.metros_por_bolsa,'peso_por_bolsa',p.peso_por_bolsa)))
  from ordenes_corte oc join productos p on p.id=oc.producto_id where oc.id in (select orden_corte_id from orden_corte_bobinas where fecha_asignacion >= timestamptz '__DESDE__' - interval '5 days' and fecha_asignacion < '__HASTA__')),
'restos',(select json_agg(r order by r.id) from corte_restos r where r.orden_corte_id in (select orden_corte_id from orden_corte_bobinas where fecha_asignacion >= timestamptz '__DESDE__' - interval '5 days' and fecha_asignacion < '__HASTA__')),
'fich',(select json_agg(json_build_object('empleado_id',empleado_id,'fecha',fecha,'hora',hora,'tipo',tipo) order by fecha,hora) from fichajes where fecha >= (timestamptz '__DESDE__')::date - 1 and fecha <= (timestamptz '__HASTA__')::date),
'emp',(select json_agg(json_build_object('id',id,'apellido_nombre',apellido_nombre)) from empleados),
'bob',(select json_agg(json_build_object('id',bp.id,'nro',bp.numero_bobina,'ext',bp.extrusora_id,'op',bp.operario,'ca',bp.created_at,'m',bp.metros_reales,'kg',bp.kg_reales,'err',bp.error_pct,'cal',bp.estado_calidad,'anul',bp.anulada,'resp',(select count(*) from plc_respuestas r where r.bobina_id=bp.id)) order by bp.extrusora_id,bp.created_at)
  from bobinas_producidas bp where bp.created_at >= '__DESDE__' and bp.created_at < '__HASTA__'),
'plc',(select json_agg(t) from (select grupo, to_char(date_trunc('hour',ts) + floor(extract(minute from ts)/10)*interval '10 min','YYYY-MM-DD"T"HH24:MI') q,
  count(*) filter (where gp<=interval '2 min') n, count(*) filter (where gp<=interval '2 min' and dm>5) mov from m group by 1,2 order by 1,2) t)
) d;
