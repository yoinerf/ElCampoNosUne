-- Un pedido pagado por adelantado (transferencia o efectivo acordado) no se prepara ni se
-- envía hasta que el pago esté confirmado, en cualquier tienda. Antes solo se exigía en la
-- Tienda Amazónica; con la transferencia habilitada en El Campo quedaba sin control.
-- La contraentrega sigue igual: se paga al recibir.

create or replace function public.validate_order_item_transition()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_from text;
  v_to text;
  v_to_code text;
  v_store text;
  v_payment_method text;
begin
  select store, payment_method into v_store, v_payment_method from public.orders where id = new.order_id;
  v_store := coalesce(v_store, 'campo');

  if v_store = 'amazonica' or v_payment_method in ('BankTransfer', 'Cash') then
    select code into v_to_code from public.order_statuses where id = new.status_id;
    if v_to_code in ('Processing', 'Shipped', 'InTransit') and new.payment_status <> 'Paid' then
      raise exception 'Este pedido aún no está pagado. Solo se puede preparar y enviar después del pago.';
    end if;
  end if;

  if public.is_admin() then
    return new;
  end if;

  if not exists (
    select 1 from public.order_status_transitions
    where store = v_store
      and from_status_id = old.status_id
      and to_status_id = new.status_id
  ) then
    select name into v_from from public.order_statuses where id = old.status_id;
    select name into v_to from public.order_statuses where id = new.status_id;
    raise exception 'No se permite pasar de "%" a "%"', v_from, v_to;
  end if;

  return new;
end;
$$;

revoke execute on function public.validate_order_item_transition() from public, anon, authenticated;

-- Pasos sugeridos para transferencias en El Campo: los mismos que el pago en línea
-- (Pendiente de pago → Pagado → En preparación → Enviado ...).
update public.order_status_transitions
set suggested_for = array_append(suggested_for, 'BankTransfer')
where store = 'campo'
  and 'Online' = any(suggested_for)
  and not ('BankTransfer' = any(suggested_for));
