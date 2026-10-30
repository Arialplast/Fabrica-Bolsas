-- 30c (aplicado 30/10/2026): el CHECK no aceptaba 'anulado' → deshacerInventario() revertía stock
-- pero el inventario quedaba 'completado' y seguía sumando en Diferencias de inventario.
alter table inventarios_mp drop constraint inventarios_mp_estado_check;
alter table inventarios_mp add constraint inventarios_mp_estado_check check (estado = any (array['pendiente','completado','anulado']));
update inventarios_mp i set estado='anulado'
where i.estado<>'anulado' and exists (select 1 from mov_mp m where m.ref_tipo='inventario_anulado' and m.ref_id=i.id);
