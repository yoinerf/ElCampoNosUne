-- El envío lo acuerda cada vendedor con el comprador: no se cobra un valor fijo por tienda.
-- Con shipping_fee = 0, create_store_order no suma envío al total y el checkout muestra
-- "A convenir con el productor". El superadmin puede volver a fijar un valor por tienda.

update public.store_settings set shipping_fee = 0 where shipping_fee <> 0;
alter table public.store_settings alter column shipping_fee set default 0;
