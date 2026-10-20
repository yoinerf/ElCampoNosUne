-- Limpieza de objetos que la app ya no usa (revisado contra el código y la base el 2026-10-20):
--   - reservations: reservas viejas de experiencias. Hoy las experiencias se reservan con
--     create_store_order (orders/order_items). Solo tenía 9 reservas de prueba del 2026-08-24.
--     Se borra con su trigger trg_reservations_guard_insert y la función guard_reservation_insert.
--   - create_cash_on_delivery_order: RPC anterior a create_store_order; nadie la llama.
--   - notifications: reemplazada por user_notifications (0 filas).
--   - departments: la app usa la librería soff-geo para departamentos y municipios (33 filas sin uso).
-- Sin CASCADE: si algo dependiera todavía de estos objetos, la migración falla en vez de borrarlo.

begin;

drop trigger if exists trg_reservations_guard_insert on public.reservations;
drop function if exists public.guard_reservation_insert();
drop table if exists public.reservations;

drop function if exists public.create_cash_on_delivery_order(jsonb, jsonb, numeric);

drop table if exists public.notifications;

drop table if exists public.departments;

commit;
