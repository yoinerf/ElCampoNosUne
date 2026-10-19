-- Pagos en línea con dinero directo a cada productor: Mercado Pago y ePayco.
-- Todo queda APAGADO hasta que el superadmin active cada pasarela (Superadmin → Pagos).
--
-- Mercado Pago (método 'MercadoPago', split 1:1)
--   Cada productor conecta su cuenta por OAuth. Un pedido con varios productores genera un
--   pago por productor (order_payments.seller_id), cada uno con su propia tarifa.
-- ePayco (método 'Epayco', Pagos Divididos)
--   Cada productor es "receptor" de la cuenta ePayco de la plataforma (customer ID que activa
--   el superadmin o el admin de su tienda). Un pedido es UN solo cobro que ePayco reparte
--   entre los productores (order_payments.split); seller_id queda en null.
--
-- La plataforma no cobra comisión. La tarifa de cada pasarela (porcentaje + valor fijo + IVA
-- sobre la comisión + retenciones u otros cargos) se configura en payment_gateway_settings y
-- se calcula SIEMPRE en la base (gateway_fee); se suma al comprador para que el productor
-- reciba el valor completo de su venta.

-- ─── 1. Configuración de las pasarelas ────────────────────────────────────────
create table if not exists public.payment_gateway_settings (
  gateway text primary key check (gateway in ('mercadopago', 'epayco')),
  enabled boolean not null default false,
  -- true = credenciales y checkout de pruebas (sandbox)
  sandbox boolean not null default true,
  -- Porcentajes en puntos (3.29 = 3,29 %)
  percent_fee numeric(6,3) not null default 0 check (percent_fee >= 0),
  fixed_fee numeric(12,2) not null default 0 check (fixed_fee >= 0),
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

-- Tarifas de referencia: ajústalas a las de tu contrato desde Superadmin → Pagos
insert into public.payment_gateway_settings (gateway, percent_fee, fixed_fee) values
  ('mercadopago', 3.29, 800),
  ('epayco', 2.99, 900)
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

-- Recargo que se suma a un cobro de p_base para que, después de la tarifa de la pasarela,
-- quede p_base completo:
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

-- Método de pago del pedido (orders.payment_method) → pasarela
create or replace function public.payment_method_gateway(p_method text)
returns text
language sql
immutable
as $$
  select case p_method when 'MercadoPago' then 'mercadopago' when 'Epayco' then 'epayco' end;
$$;

-- ─── 2. Cuentas de cobro de los productores ──────────────────────────────────
-- Datos visibles de la conexión (sin credenciales).
--   mercadopago: provider_user_id = user_id de Mercado Pago (lo guarda mp-oauth, queda 'active')
--   epayco:      provider_user_id = customer ID (P_CUST_ID_CLIENTE) del productor en ePayco.
--                El productor lo registra ('pending') y se activa cuando la plataforma lo
--                agrega como receptor en ePayco (Pagos Divididos → Receptores).
create table if not exists public.seller_payment_accounts (
  seller_id uuid not null references public.profiles(id) on delete cascade,
  gateway text not null check (gateway in ('mercadopago', 'epayco')),
  provider_user_id text not null,
  status text not null default 'pending' check (status in ('pending', 'active', 'revoked')),
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
  for select using (
    (select auth.uid()) = seller_id
    or public.is_admin()
    or public.can_store_admin_manage(seller_id)
  );

-- Credenciales OAuth de Mercado Pago: solo las lee la service role (Edge Functions).
-- Sin políticas a propósito.
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

-- El productor registra su customer ID de ePayco; queda pendiente hasta que lo activen
create or replace function public.request_epayco_receiver(p_customer_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id text := regexp_replace(coalesce(p_customer_id, ''), '\s', '', 'g');
begin
  if not exists (
    select 1 from public.profiles where id = auth.uid() and user_type in ('asociacion', 'turismo')
  ) then
    raise exception 'Solo los productores pueden registrar una cuenta de cobro';
  end if;
  if v_id !~ '^\d{3,15}$' then
    raise exception 'El ID de cliente de ePayco debe tener solo números';
  end if;
  if exists (
    select 1 from public.seller_payment_accounts
    where gateway = 'epayco' and provider_user_id = v_id and seller_id <> auth.uid()
  ) then
    raise exception 'Ese ID de ePayco ya está registrado por otro productor';
  end if;

  insert into public.seller_payment_accounts (seller_id, gateway, provider_user_id, status)
  values (auth.uid(), 'epayco', v_id, 'pending')
  on conflict (seller_id, gateway) do update
    set provider_user_id = excluded.provider_user_id,
        -- Cambiar el ID exige una nueva activación
        status = case when seller_payment_accounts.provider_user_id = excluded.provider_user_id
                      and seller_payment_accounts.status = 'active' then 'active' else 'pending' end,
        updated_at = now();
end;
$$;

revoke execute on function public.request_epayco_receiver(text) from public, anon;
grant execute on function public.request_epayco_receiver(text) to authenticated;

-- Superadmin (o el admin de la tienda del productor) activa o revoca una cuenta de cobro.
-- Mercado Pago solo se activa con OAuth: aquí únicamente se puede revocar.
create or replace function public.set_seller_payment_status(p_seller uuid, p_gateway text, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (public.is_admin() or public.can_store_admin_manage(p_seller)) then
    raise exception 'No tienes permiso para cambiar esta cuenta de cobro';
  end if;
  if p_status not in ('active', 'revoked') or (p_gateway = 'mercadopago' and p_status <> 'revoked') then
    raise exception 'Estado inválido para esta pasarela';
  end if;

  update public.seller_payment_accounts
  set status = p_status, updated_at = now()
  where seller_id = p_seller and gateway = p_gateway;
  if not found then
    raise exception 'El productor no tiene cuenta registrada en esta pasarela';
  end if;
end;
$$;

revoke execute on function public.set_seller_payment_status(uuid, text, text) from public, anon;
grant execute on function public.set_seller_payment_status(uuid, text, text) to authenticated;

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

-- ─── 3. Cobros de cada pedido ─────────────────────────────────────────────────
alter table public.orders add column if not exists payment_fee numeric(12,2) not null default 0;

create table if not exists public.order_payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  gateway text not null check (gateway in ('mercadopago', 'epayco')),
  -- Mercado Pago: productor que recibe el cobro. ePayco: null (el reparto va en split)
  seller_id uuid references public.profiles(id),
  -- ePayco: [{ seller_id, receiver_id, amount }] que ePayco dispersa
  split jsonb,
  base_amount numeric(12,2) not null check (base_amount > 0),
  fee_amount numeric(12,2) not null default 0 check (fee_amount >= 0),
  total_amount numeric(12,2) not null,
  status text not null default 'Pending'
    check (status in ('Pending', 'Paid', 'Failed', 'Refunded', 'Cancelled')),
  -- Mercado Pago: id de la preferencia. ePayco: sessionId del checkout
  preference_id text,
  checkout_url text,
  provider_payment_id text,
  provider_status text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint order_payments_unique unique nulls not distinct (order_id, gateway, seller_id),
  check (total_amount = base_amount + fee_amount)
);

create index if not exists order_payments_seller_idx on public.order_payments (seller_id);

alter table public.order_payments enable row level security;

drop policy if exists "Comprador, productor y admin ven los pagos" on public.order_payments;
create policy "Comprador, productor y admin ven los pagos" on public.order_payments
  for select using (
    (select auth.uid()) = seller_id
    or split @> jsonb_build_array(jsonb_build_object('seller_id', (select auth.uid())))
    or public.is_order_customer(order_id)
    or public.is_admin()
  );

-- ─── 4. Cotización y preparación de los cobros ────────────────────────────────
-- Agrupa ítems por productor con precios de la base y calcula la tarifa.
-- p_items: [{ id, type, quantity }] igual que create_store_order.
--   mercadopago: un cobro por productor → tarifa por grupo
--   epayco:      un solo cobro → tarifa sobre el total
create or replace function public.quote_online_payment(p_store text, p_items jsonb, p_gateway text default 'mercadopago')
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_enabled boolean;
  v_groups jsonb;
  v_base numeric;
  v_fee numeric;
begin
  if p_gateway not in ('mercadopago', 'epayco') then
    raise exception 'Pasarela inválida';
  end if;
  select enabled into v_enabled from public.payment_gateway_settings where gateway = p_gateway;

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
           'fee', case when p_gateway = 'mercadopago' then public.gateway_fee(g.base, p_gateway) else 0 end,
           'total', g.base + case when p_gateway = 'mercadopago' then public.gateway_fee(g.base, p_gateway) else 0 end,
           'connected', exists (
             select 1 from public.seller_payment_accounts a
             where a.seller_id = g.seller_id and a.gateway = p_gateway and a.status = 'active')
         ) order by g.base desc), '[]'::jsonb)
    into v_groups
  from groups g
  left join public.profiles pr on pr.id = g.seller_id;

  select coalesce(sum((x->>'base')::numeric), 0) into v_base from jsonb_array_elements(v_groups) x;
  v_fee := case when p_gateway = 'mercadopago'
    then (select coalesce(sum((x->>'fee')::numeric), 0) from jsonb_array_elements(v_groups) x)
    else public.gateway_fee(v_base, p_gateway) end;

  return jsonb_build_object(
    'gateway', p_gateway,
    'enabled', coalesce(v_enabled, false),
    'groups', v_groups,
    'payments', case when p_gateway = 'mercadopago' then jsonb_array_length(v_groups) else 1 end,
    'fee', v_fee,
    'total', v_base + v_fee
  );
end;
$$;

revoke execute on function public.quote_online_payment(text, jsonb, text) from public, anon;
grant execute on function public.quote_online_payment(text, jsonb, text) to authenticated;

-- Crea (o actualiza mientras estén pendientes) los cobros de un pedido en línea.
-- La llaman mp-create-payment y epayco-create-session con la sesión del comprador.
create or replace function public.prepare_order_payments(p_order_id uuid)
returns setof public.order_payments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders;
  v_gateway text;
  v_group record;
  v_fee numeric;
  v_base numeric := 0;
  v_split jsonb := '[]'::jsonb;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found or v_order.customer_id is distinct from auth.uid() then
    raise exception 'Pedido no encontrado';
  end if;
  v_gateway := public.payment_method_gateway(v_order.payment_method);
  if v_gateway is null then
    raise exception 'Este pedido no es de pago en línea';
  end if;
  if v_order.payment_status = 'Paid' then
    raise exception 'Este pedido ya está pagado';
  end if;
  if not exists (select 1 from public.payment_gateway_settings where gateway = v_gateway and enabled) then
    raise exception 'Los pagos en línea aún no están habilitados';
  end if;

  for v_group in
    select oi.seller_id, sum(oi.total) as base, a.provider_user_id, a.status
    from public.order_items oi
    join public.order_statuses s on s.id = oi.status_id
    left join public.seller_payment_accounts a on a.seller_id = oi.seller_id and a.gateway = v_gateway
    where oi.order_id = p_order_id
      and oi.seller_id is not null
      and s.code not in ('Cancelled', 'Returned', 'Refunded')
    group by oi.seller_id, a.provider_user_id, a.status
  loop
    if v_group.status is distinct from 'active' then
      raise exception 'Un productor de tu pedido aún no tiene pagos en línea habilitados';
    end if;

    if v_gateway = 'mercadopago' then
      v_fee := public.gateway_fee(v_group.base, v_gateway);
      insert into public.order_payments (order_id, gateway, seller_id, base_amount, fee_amount, total_amount)
      values (p_order_id, v_gateway, v_group.seller_id, v_group.base, v_fee, v_group.base + v_fee)
      on conflict on constraint order_payments_unique do update
        set base_amount = excluded.base_amount,
            fee_amount = excluded.fee_amount,
            total_amount = excluded.total_amount,
            -- Si cambió el monto (tarifa nueva) el cobro ya creado en la pasarela no sirve
            preference_id = case when order_payments.total_amount = excluded.total_amount then order_payments.preference_id end,
            checkout_url = case when order_payments.total_amount = excluded.total_amount then order_payments.checkout_url end,
            updated_at = now()
        where order_payments.status = 'Pending';
    else
      v_base := v_base + v_group.base;
      v_split := v_split || jsonb_build_array(jsonb_build_object(
        'seller_id', v_group.seller_id,
        'receiver_id', v_group.provider_user_id,
        'amount', v_group.base));
    end if;
  end loop;

  if v_gateway = 'epayco' and v_base > 0 then
    v_fee := public.gateway_fee(v_base, v_gateway);
    insert into public.order_payments (order_id, gateway, seller_id, split, base_amount, fee_amount, total_amount)
    values (p_order_id, v_gateway, null, v_split, v_base, v_fee, v_base + v_fee)
    on conflict on constraint order_payments_unique do update
      set split = excluded.split,
          base_amount = excluded.base_amount,
          fee_amount = excluded.fee_amount,
          total_amount = excluded.total_amount,
          -- Cada intento crea una sesión nueva de checkout
          status = 'Pending',
          preference_id = null,
          checkout_url = null,
          updated_at = now()
      where order_payments.status in ('Pending', 'Failed', 'Cancelled');
  end if;

  update public.orders
  set payment_fee = (select coalesce(sum(fee_amount), 0) from public.order_payments where order_id = p_order_id)
  where id = p_order_id;

  return query
    select * from public.order_payments where order_id = p_order_id order by base_amount desc;
end;
$$;

revoke execute on function public.prepare_order_payments(uuid) from public, anon;
grant execute on function public.prepare_order_payments(uuid) to authenticated;

-- Resultado de un cobro. La llaman SOLO los webhooks (mp-webhook, epayco-confirmation) con
-- la service role, después de validar el pago con la pasarela. Al aprobarse pasa a
-- "Pagado" los ítems del productor (Mercado Pago) o de todo el pedido (ePayco);
-- recalc_order_from_items marca el pedido pagado cuando todos lo están.
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

  -- Estados de Mercado Pago (approved, ...) y de ePayco (Aceptada, ...)
  v_status := case lower(coalesce(p_provider_status, ''))
    when 'approved' then 'Paid'
    when 'aceptada' then 'Paid'
    when 'rejected' then 'Failed'
    when 'rechazada' then 'Failed'
    when 'fallida' then 'Failed'
    when 'cancelled' then 'Cancelled'
    when 'cancelada' then 'Cancelled'
    when 'abandonada' then 'Cancelled'
    when 'refunded' then 'Refunded'
    when 'charged_back' then 'Refunded'
    when 'reversada' then 'Refunded'
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
      and (v_pay.seller_id is null or oi.seller_id = v_pay.seller_id)
      and s.id = oi.status_id
      and s.code = 'PendingPayment';
  end if;
end;
$$;

revoke execute on function public.apply_order_payment_result(uuid, text, text, numeric) from public, anon, authenticated;

-- ─── 5. Reglas para pedidos en línea ──────────────────────────────────────────
alter table public.orders drop constraint if exists ck_orders_payment_method;
alter table public.orders add constraint ck_orders_payment_method
  check (payment_method in ('CashOnDelivery', 'Online', 'Cash', 'BankTransfer', 'MercadoPago', 'Epayco'));

alter table public.store_settings drop constraint if exists store_settings_payment_methods_check;
alter table public.store_settings add constraint store_settings_payment_methods_check
  check (payment_methods <@ array['CashOnDelivery', 'Cash', 'BankTransfer', 'MercadoPago', 'Epayco']
         and cardinality(payment_methods) > 0);

-- Un pedido en línea exige la pasarela activa y sin envío fijo de tienda (el envío fijo
-- no tiene a qué productor pagársele).
create or replace function public.guard_online_order()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_gateway text := public.payment_method_gateway(new.payment_method);
begin
  if v_gateway is not null then
    if not exists (select 1 from public.payment_gateway_settings where gateway = v_gateway and enabled) then
      raise exception 'Este método de pago en línea aún no está habilitado';
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

-- Cada productor del pedido en línea debe tener su cuenta de cobro activa en esa pasarela
create or replace function public.guard_online_order_item()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_gateway text;
begin
  select public.payment_method_gateway(payment_method) into v_gateway
  from public.orders where id = new.order_id;

  if v_gateway is not null and not exists (
    select 1 from public.seller_payment_accounts
    where seller_id = new.seller_id and gateway = v_gateway and status = 'active'
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

-- Los webhooks confirman pagos sin sesión: se les permite PendingPayment → Paid sin pasar
-- por las transiciones de la tienda (app.gateway_confirmed lo activa apply_order_payment_result).
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

  -- Contraentrega se paga al recibir; el resto (transferencia, efectivo acordado, en línea) antes del envío
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
