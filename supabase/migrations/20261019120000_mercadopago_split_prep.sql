-- Pagos en línea con Mercado Pago (preparación; queda apagado hasta activar la pasarela).
--
-- Modelo "split 1:1" de Mercado Pago Colombia: cada productor conecta su cuenta por OAuth y
-- cada pago va directo a su cuenta. Un pedido con varios productores genera un pago por
-- productor (order_payments). La plataforma no cobra comisión (marketplace_fee = 0).
--
-- La tarifa de la pasarela (porcentaje + valor fijo + IVA sobre la comisión + retenciones u
-- otros cargos) se configura en payment_gateway_settings y se calcula SIEMPRE en la base
-- (gateway_fee). Se le suma al comprador para que el productor reciba el valor completo.

-- ─── 1. Configuración de la pasarela ──────────────────────────────────────────
create table if not exists public.payment_gateway_settings (
  gateway text primary key check (gateway in ('mercadopago')),
  enabled boolean not null default false,
  -- true = credenciales de prueba de Mercado Pago (sandbox)
  sandbox boolean not null default true,
  -- Porcentajes en puntos (3.29 = 3,29 %)
  percent_fee numeric(6,3) not null default 3.29 check (percent_fee >= 0),
  fixed_fee numeric(12,2) not null default 800 check (fixed_fee >= 0),
  -- IVA que la pasarela cobra sobre su comisión (porcentaje + fijo)
  vat_rate numeric(6,3) not null default 19 check (vat_rate >= 0),
  -- Retenciones u otros cargos que la pasarela descuenta sobre el total cobrado
  extra_percent numeric(6,3) not null default 0 check (extra_percent >= 0),
  extra_fixed numeric(12,2) not null default 0 check (extra_fixed >= 0),
  -- false = el productor asume la tarifa y al comprador no se le suma nada
  pass_fees_to_buyer boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null,
  -- Evita una división por cero o negativa al calcular el recargo
  constraint payment_gateway_settings_rate_check
    check (percent_fee * (1 + vat_rate / 100) + extra_percent < 50)
);

insert into public.payment_gateway_settings (gateway) values ('mercadopago')
on conflict (gateway) do nothing;

alter table public.payment_gateway_settings enable row level security;

drop policy if exists "Tarifas visibles" on public.payment_gateway_settings;
create policy "Tarifas visibles" on public.payment_gateway_settings
  for select using (true);

drop policy if exists "Superadmin edita tarifas" on public.payment_gateway_settings;
create policy "Superadmin edita tarifas" on public.payment_gateway_settings
  for update using (public.is_admin()) with check (public.is_admin());

create or replace function public.touch_payment_gateway_settings()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;

drop trigger if exists trg_payment_gateway_settings_touch on public.payment_gateway_settings;
create trigger trg_payment_gateway_settings_touch
  before update on public.payment_gateway_settings
  for each row execute function public.touch_payment_gateway_settings();

-- Recargo que se suma a un pago de p_base para que, después de la tarifa de la pasarela,
-- el productor reciba p_base completo:
--   total = (base + fijo·(1+IVA) + fijo_extra) / (1 − %·(1+IVA) − %_extra)
-- Se redondea hacia arriba al peso: el productor nunca recibe menos de su precio.
create or replace function public.gateway_fee(p_base numeric, p_gateway text default 'mercadopago')
returns numeric
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  s public.payment_gateway_settings;
  v_vat numeric;
begin
  if p_base is null or p_base <= 0 then
    return 0;
  end if;

  select * into s from public.payment_gateway_settings where gateway = p_gateway;
  if not found or not s.pass_fees_to_buyer then
    return 0;
  end if;

  v_vat := 1 + s.vat_rate / 100;
  return ceil(
    (p_base + s.fixed_fee * v_vat + s.extra_fixed)
    / (1 - (s.percent_fee / 100) * v_vat - s.extra_percent / 100)
  ) - p_base;
end;
$$;

grant execute on function public.gateway_fee(numeric, text) to anon, authenticated;

-- ─── 2. Cuentas de Mercado Pago de los productores ───────────────────────────
-- Datos visibles de la conexión (sin credenciales)
create table if not exists public.seller_payment_accounts (
  seller_id uuid not null references public.profiles(id) on delete cascade,
  gateway text not null default 'mercadopago' check (gateway in ('mercadopago')),
  provider_user_id text not null,
  status text not null default 'active' check (status in ('active', 'revoked')),
  live_mode boolean not null default false,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (seller_id, gateway)
);

create unique index if not exists seller_payment_accounts_provider_user_idx
  on public.seller_payment_accounts (gateway, provider_user_id);

alter table public.seller_payment_accounts enable row level security;

drop policy if exists "Productor ve su cuenta de pagos" on public.seller_payment_accounts;
create policy "Productor ve su cuenta de pagos" on public.seller_payment_accounts
  for select using ((select auth.uid()) = seller_id or public.is_admin());

-- Credenciales OAuth: solo las lee la service role (Edge Functions). Sin políticas a propósito.
create table if not exists public.seller_payment_credentials (
  seller_id uuid not null,
  gateway text not null default 'mercadopago',
  access_token text not null,
  refresh_token text,
  public_key text,
  expires_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (seller_id, gateway),
  foreign key (seller_id, gateway) references public.seller_payment_accounts (seller_id, gateway) on delete cascade
);

alter table public.seller_payment_credentials enable row level security;
revoke all on public.seller_payment_credentials from anon, authenticated;

-- Estados OAuth de un solo uso (protegen el callback de Mercado Pago contra CSRF)
create table if not exists public.payment_oauth_states (
  state text primary key,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.payment_oauth_states enable row level security;
revoke all on public.payment_oauth_states from anon, authenticated;

-- El productor puede desconectar su cuenta (borra también las credenciales)
create or replace function public.disconnect_my_payment_account(p_gateway text default 'mercadopago')
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.seller_payment_accounts
  where seller_id = auth.uid() and gateway = p_gateway;
$$;

revoke execute on function public.disconnect_my_payment_account(text) from public, anon;
grant execute on function public.disconnect_my_payment_account(text) to authenticated;

-- ─── 3. Pagos por productor de cada pedido ────────────────────────────────────
alter table public.orders add column if not exists payment_fee numeric(12,2) not null default 0;

create table if not exists public.order_payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  seller_id uuid not null references public.profiles(id),
  gateway text not null default 'mercadopago',
  base_amount numeric(12,2) not null check (base_amount > 0),
  fee_amount numeric(12,2) not null default 0 check (fee_amount >= 0),
  total_amount numeric(12,2) not null,
  status text not null default 'Pending'
    check (status in ('Pending', 'Paid', 'Failed', 'Refunded', 'Cancelled')),
  preference_id text,
  checkout_url text,
  provider_payment_id text,
  provider_status text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_id, seller_id),
  check (total_amount = base_amount + fee_amount)
);

create index if not exists order_payments_seller_idx on public.order_payments (seller_id);

alter table public.order_payments enable row level security;

drop policy if exists "Comprador, productor y admin ven los pagos" on public.order_payments;
create policy "Comprador, productor y admin ven los pagos" on public.order_payments
  for select using (
    (select auth.uid()) = seller_id
    or public.is_order_customer(order_id)
    or public.is_admin()
  );

-- ─── 4. Cotización y preparación de los pagos ─────────────────────────────────
-- Agrupa ítems por productor con precios de la base y calcula la tarifa de cada pago.
-- p_items: [{ id, type, quantity }] igual que create_store_order.
create or replace function public.quote_online_payment(p_store text, p_items jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_enabled boolean;
  v_groups jsonb;
begin
  select enabled into v_enabled from public.payment_gateway_settings where gateway = 'mercadopago';

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'El carrito está vacío';
  end if;

  with items as (
    select (i->>'id')::uuid as id,
           coalesce(i->>'type', 'producto') as type,
           greatest(coalesce((i->>'quantity')::int, 0), 0) as qty
    from jsonb_array_elements(p_items) i
  ),
  priced as (
    select coalesce(p.producer_id, e.host_id) as seller_id,
           coalesce(p.price, e.price) * it.qty as amount
    from items it
    left join public.products p on it.type <> 'experiencia' and p.id = it.id and p.store = p_store
    left join public.experiences e on it.type = 'experiencia' and e.id = it.id and p_store = 'campo'
    where coalesce(p.id, e.id) is not null
  ),
  groups as (
    select seller_id, sum(amount) as base
    from priced
    where seller_id is not null
    group by seller_id
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'seller_id', g.seller_id,
           'seller_name', coalesce(nullif(pr.org_name, ''), trim(concat(pr.first_name, ' ', pr.last_name))),
           'base', g.base,
           'fee', public.gateway_fee(g.base),
           'total', g.base + public.gateway_fee(g.base),
           'connected', exists (
             select 1 from public.seller_payment_accounts a
             where a.seller_id = g.seller_id and a.gateway = 'mercadopago' and a.status = 'active')
         ) order by g.base desc), '[]'::jsonb)
    into v_groups
  from groups g
  left join public.profiles pr on pr.id = g.seller_id;

  return jsonb_build_object(
    'enabled', coalesce(v_enabled, false),
    'groups', v_groups,
    'fee', (select coalesce(sum((x->>'fee')::numeric), 0) from jsonb_array_elements(v_groups) x),
    'total', (select coalesce(sum((x->>'total')::numeric), 0) from jsonb_array_elements(v_groups) x)
  );
end;
$$;

revoke execute on function public.quote_online_payment(text, jsonb) from public, anon;
grant execute on function public.quote_online_payment(text, jsonb) to authenticated;

-- Crea (o actualiza mientras estén pendientes) los pagos por productor de un pedido en línea.
-- La llama la Edge Function mp-create-payment con la sesión del comprador.
create or replace function public.prepare_order_payments(p_order_id uuid)
returns setof public.order_payments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders;
  v_group record;
  v_fee numeric;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found or v_order.customer_id is distinct from auth.uid() then
    raise exception 'Pedido no encontrado';
  end if;
  if v_order.payment_method <> 'Online' then
    raise exception 'Este pedido no es de pago en línea';
  end if;
  if v_order.payment_status = 'Paid' then
    raise exception 'Este pedido ya está pagado';
  end if;
  if not exists (select 1 from public.payment_gateway_settings where gateway = 'mercadopago' and enabled) then
    raise exception 'Los pagos en línea aún no están habilitados';
  end if;

  for v_group in
    select oi.seller_id, sum(oi.total) as base
    from public.order_items oi
    join public.order_statuses s on s.id = oi.status_id
    where oi.order_id = p_order_id
      and oi.seller_id is not null
      and s.code not in ('Cancelled', 'Returned', 'Refunded')
    group by oi.seller_id
  loop
    if not exists (
      select 1 from public.seller_payment_accounts
      where seller_id = v_group.seller_id and gateway = 'mercadopago' and status = 'active'
    ) then
      raise exception 'Un productor de tu pedido aún no tiene pagos en línea habilitados';
    end if;

    v_fee := public.gateway_fee(v_group.base);

    insert into public.order_payments (order_id, seller_id, base_amount, fee_amount, total_amount)
    values (p_order_id, v_group.seller_id, v_group.base, v_fee, v_group.base + v_fee)
    on conflict (order_id, seller_id) do update
      set base_amount = excluded.base_amount,
          fee_amount = excluded.fee_amount,
          total_amount = excluded.total_amount,
          -- Si cambió el monto (tarifa nueva) el cobro ya creado en Mercado Pago no sirve
          preference_id = case when order_payments.total_amount = excluded.total_amount then order_payments.preference_id end,
          checkout_url = case when order_payments.total_amount = excluded.total_amount then order_payments.checkout_url end,
          updated_at = now()
      where order_payments.status = 'Pending';
  end loop;

  update public.orders
  set payment_fee = (select coalesce(sum(fee_amount), 0) from public.order_payments where order_id = p_order_id)
  where id = p_order_id;

  return query
    select * from public.order_payments where order_id = p_order_id order by base_amount desc;
end;
$$;

revoke execute on function public.prepare_order_payments(uuid) from public, anon;
grant execute on function public.prepare_order_payments(uuid) to authenticated;

-- Resultado de un pago (lo llama SOLO el webhook mp-webhook con la service role, después
-- de consultar el pago en la API de Mercado Pago). Al aprobarse pasa los ítems de ese
-- productor a "Pagado"; recalc_order_from_items marca el pedido pagado cuando todos lo están.
create or replace function public.apply_order_payment_result(
  p_payment_id uuid,
  p_provider_payment_id text,
  p_provider_status text,
  p_amount numeric
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pay public.order_payments;
  v_status text;
  v_paid_status bigint;
begin
  select * into v_pay from public.order_payments where id = p_payment_id for update;
  if not found then
    raise exception 'Pago % no encontrado', p_payment_id;
  end if;

  v_status := case p_provider_status
    when 'approved' then 'Paid'
    when 'rejected' then 'Failed'
    when 'cancelled' then 'Cancelled'
    when 'refunded' then 'Refunded'
    when 'charged_back' then 'Refunded'
    else 'Pending'
  end;

  if v_status = 'Paid' and p_amount < v_pay.total_amount then
    raise exception 'Monto pagado (%) menor al esperado (%)', p_amount, v_pay.total_amount;
  end if;

  -- Un pago ya aprobado solo puede pasar a reembolsado
  if v_pay.status = 'Paid' and v_status <> 'Refunded' then
    return;
  end if;

  update public.order_payments
  set status = v_status,
      provider_payment_id = p_provider_payment_id,
      provider_status = p_provider_status,
      paid_at = case when v_status = 'Paid' then now() else paid_at end,
      updated_at = now()
  where id = p_payment_id;

  if v_status = 'Paid' then
    select id into v_paid_status from public.order_statuses where code = 'Paid';
    perform set_config('app.gateway_confirmed', 'on', true);
    update public.order_items oi
    set status_id = v_paid_status
    from public.order_statuses s
    where oi.order_id = v_pay.order_id
      and oi.seller_id = v_pay.seller_id
      and s.id = oi.status_id
      and s.code = 'PendingPayment';
  end if;
end;
$$;

revoke execute on function public.apply_order_payment_result(uuid, text, text, numeric) from public, anon, authenticated;

-- ─── 5. Reglas para pedidos en línea ──────────────────────────────────────────
-- 'Online' ya existe en orders.payment_method; ahora una tienda puede ofrecerlo
alter table public.store_settings drop constraint if exists store_settings_payment_methods_check;
alter table public.store_settings add constraint store_settings_payment_methods_check
  check (payment_methods <@ array['CashOnDelivery', 'Cash', 'BankTransfer', 'Online'] and cardinality(payment_methods) > 0);

-- Un pedido en línea exige la pasarela activa y sin envío fijo de tienda (el envío fijo
-- no tiene a qué productor pagársele).
create or replace function public.guard_online_order()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.payment_method = 'Online' then
    if not exists (select 1 from public.payment_gateway_settings where gateway = 'mercadopago' and enabled) then
      raise exception 'Los pagos en línea aún no están habilitados';
    end if;
    if exists (select 1 from public.store_settings where store = new.store and shipping_fee > 0) then
      raise exception 'El pago en línea no está disponible en tiendas con envío fijo';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_orders_guard_online on public.orders;
create trigger trg_orders_guard_online
  before insert on public.orders
  for each row execute function public.guard_online_order();

-- Cada productor del pedido en línea debe tener su cuenta de Mercado Pago conectada
create or replace function public.guard_online_order_item()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from public.orders where id = new.order_id and payment_method = 'Online')
     and not exists (
       select 1 from public.seller_payment_accounts
       where seller_id = new.seller_id and gateway = 'mercadopago' and status = 'active'
     ) then
    raise exception '"%" es de un productor que aún no recibe pagos en línea. Elige otro método de pago.', new.title;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_order_items_guard_online on public.order_items;
create trigger trg_order_items_guard_online
  before insert on public.order_items
  for each row execute function public.guard_online_order_item();

-- El webhook confirma pagos sin sesión: se le permite PendingPayment → Paid sin pasar por
-- las transiciones de la tienda (app.gateway_confirmed lo activa apply_order_payment_result).
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

  -- Contraentrega se paga al recibir; el resto (transferencia, efectivo acordado) antes del envío
  if v_payment_method is distinct from 'CashOnDelivery' then
    select code into v_to_code from public.order_statuses where id = new.status_id;
    if v_to_code in ('Processing', 'Shipped', 'InTransit') and new.payment_status <> 'Paid' then
      raise exception 'Este pedido aún no está pagado. Solo se puede preparar y enviar después del pago.';
    end if;
  end if;

  if public.is_admin() or current_setting('app.gateway_confirmed', true) = 'on' then
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
