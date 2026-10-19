-- cancel_unpaid_store_orders existía solo en la base (creada desde el panel) y nadie la
-- ejecutaba porque pg_cron no estaba activo. Aquí:
--   1. Se versiona la función y se excluyen los pedidos contraentrega: también nacen en
--      PendingPayment con pago Pending, pero se pagan al recibir.
--   2. Se activa pg_cron y se programa cada 15 minutos (corre como postgres).
-- Sin efecto mientras ninguna tienda tenga store_settings.payment_timeout_hours.

begin;

create or replace function public.cancel_unpaid_store_orders()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pending bigint;
  v_cancelled bigint;
  v_count int;
begin
  select id into v_pending from public.order_statuses where code = 'PendingPayment';
  select id into v_cancelled from public.order_statuses where code = 'Cancelled';

  update public.order_items oi
  set status_id = v_cancelled
  from public.orders o
  join public.store_settings s on s.store = o.store
  where oi.order_id = o.id
    and oi.status_id = v_pending
    and oi.payment_status <> 'Paid'
    and o.payment_method is distinct from 'CashOnDelivery'
    and s.payment_timeout_hours is not null
    and o.created_at < now() - make_interval(hours => s.payment_timeout_hours);

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke execute on function public.cancel_unpaid_store_orders() from public, anon, authenticated;

create extension if not exists pg_cron with schema pg_catalog;

select cron.unschedule(jobid) from cron.job where jobname = 'cancel-unpaid-store-orders';
select cron.schedule(
  'cancel-unpaid-store-orders',
  '*/15 * * * *',
  $$select public.cancel_unpaid_store_orders()$$
);

commit;
