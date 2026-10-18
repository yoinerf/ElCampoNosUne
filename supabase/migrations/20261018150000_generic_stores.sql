-- Tiendas parametrizables: cada fila de store_settings es una tienda con su vitrina,
-- ruta, marca, métodos de pago y costo de envío. Agregar una tienda nueva no requiere
-- tocar código. 'campo' (El Campo Nos Une) es la tienda principal: home, experiencias y
-- registro viven allí.

begin;

-- ─── 1. Configuración de cada tienda ─────────────────────────────────────────
alter table public.store_settings
  add column if not exists slug text,
  add column if not exists tagline text,
  add column if not exists description text,
  add column if not exists payment_methods text[] not null default '{Cash,BankTransfer}',
  add column if not exists shipping_fee numeric not null default 0,
  add column if not exists active boolean not null default true,
  add column if not exists sort_order integer not null default 0;

alter table public.store_settings drop constraint if exists store_settings_slug_check;
alter table public.store_settings add constraint store_settings_slug_check
  check (slug is null or slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');

-- Rutas reservadas por las pantallas de la app
alter table public.store_settings drop constraint if exists store_settings_slug_reserved;
alter table public.store_settings add constraint store_settings_slug_reserved
  check (slug is null or slug not in ('productos', 'experiencias', 'nosotros', 'mi-cuenta', 'panel', 'superadmin', 'admin-tienda', 'assets'));

create unique index if not exists store_settings_slug_key on public.store_settings (slug) where slug is not null;

alter table public.store_settings drop constraint if exists store_settings_payment_methods_check;
alter table public.store_settings add constraint store_settings_payment_methods_check
  check (payment_methods <@ array['CashOnDelivery', 'Cash', 'BankTransfer'] and cardinality(payment_methods) > 0);

alter table public.store_settings drop constraint if exists store_settings_shipping_fee_check;
alter table public.store_settings add constraint store_settings_shipping_fee_check check (shipping_fee >= 0);

-- Valores actuales (los que estaban escritos en el código)
update public.store_settings set
  slug = null,
  tagline = coalesce(tagline, 'Sembrando hoy la cooperación del mañana.'),
  payment_methods = '{CashOnDelivery,BankTransfer}',
  shipping_fee = 9000,
  sort_order = 0
where store = 'campo';

update public.store_settings set
  slug = 'tienda-amazonica',
  tagline = coalesce(tagline, 'Productos de la Amazonía, directo de quienes los cultivan.'),
  payment_methods = '{Cash,BankTransfer}',
  shipping_fee = 9000,
  sort_order = 10
where store = 'amazonica';

-- Toda tienda que no sea la principal necesita una ruta propia
alter table public.store_settings drop constraint if exists store_settings_slug_required;
alter table public.store_settings add constraint store_settings_slug_required
  check (store = 'campo' or slug is not null);

-- ─── 2. Tienda nueva: hereda el flujo de estados de pago previo al envío ──────
create or replace function public.seed_store_transitions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.order_status_transitions where store = new.store) then
    insert into public.order_status_transitions (store, from_status_id, to_status_id, sort_order, suggested_for)
    select new.store, from_status_id, to_status_id, sort_order, suggested_for
    from public.order_status_transitions
    where store = 'amazonica';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_store_settings_seed_transitions on public.store_settings;
create trigger trg_store_settings_seed_transitions
  after insert on public.store_settings
  for each row execute function public.seed_store_transitions();

-- ─── 3. Pedidos: métodos de pago y envío según la tienda ──────────────────────
-- p_shipping_fee se conserva por compatibilidad pero se ignora: el envío lo fija la tienda
-- (antes lo enviaba el navegador). Los pedidos solo de experiencias no pagan envío.
create or replace function public.create_store_order(p_store text, p_payment_method text, p_items jsonb, p_shipping jsonb default '{}'::jsonb, p_shipping_fee numeric default 0)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_status_id bigint;
  v_order_id uuid;
  v_item jsonb;
  v_type text;
  v_id uuid;
  v_qty int;
  v_title text;
  v_img text;
  v_price numeric;
  v_seller uuid;
  v_raw_stock text;
  v_item_store text;
  v_digits text;
  v_subtotal numeric := 0;
  v_fee numeric := 0;
  v_store_fee numeric;
  v_has_products boolean := false;
  v_count int := 0;
  v_store_name text;
  v_methods text[];
  v_active boolean;
  v_buyer_msg text;
  v_seller_title text;
begin
  if v_user is null then
    raise exception 'Debes iniciar sesión para crear un pedido';
  end if;

  select name, payment_methods, shipping_fee, active
    into v_store_name, v_methods, v_store_fee, v_active
  from public.store_settings where store = p_store;

  if not found or not v_active then
    raise exception 'Tienda inválida';
  end if;
  if not (p_payment_method = any (v_methods)) then
    raise exception 'Método de pago no disponible en esta tienda';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'El carrito está vacío';
  end if;

  select id into v_status_id from public.order_statuses where code = 'PendingPayment';
  if v_status_id is null then
    raise exception 'No existe el estado PendingPayment en order_statuses';
  end if;

  insert into public.orders (
    customer_id, status_id, payment_method, payment_status, store,
    customer_name, customer_phone, shipping_address, shipping_fee
  )
  values (
    v_user, v_status_id, p_payment_method, 'Pending', p_store,
    p_shipping->>'fullName', p_shipping->>'phone', p_shipping, 0
  )
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_type := coalesce(v_item->>'type', 'producto');
    v_id := (v_item->>'id')::uuid;
    v_qty := (v_item->>'quantity')::int;
    v_item_store := null;

    if v_qty is null or v_qty <= 0 then
      raise exception 'Cantidad inválida para el ítem %', v_id;
    end if;

    if v_type = 'experiencia' then
      -- Las experiencias solo existen en la tienda principal (El Campo Nos Une)
      select title, price, host_id, capacity, 'campo'
        into v_title, v_price, v_seller, v_raw_stock, v_item_store
      from public.experiences where id = v_id
      for update;
    else
      v_type := 'producto';
      v_has_products := true;
      select title, price, producer_id, stock, store
        into v_title, v_price, v_seller, v_raw_stock, v_item_store
      from public.products where id = v_id
      for update;
    end if;

    if not found then
      raise exception 'El ítem % ya no está disponible', v_id;
    end if;

    if v_item_store is distinct from p_store then
      raise exception '"%" pertenece a otra tienda. Haz un pedido por tienda.', v_title;
    end if;

    select image_url into v_img
    from public.images
    where (v_type = 'producto' and product_id = v_id)
       or (v_type = 'experiencia' and experience_id = v_id)
    order by is_primary desc, sort_order asc, created_at asc
    limit 1;

    -- Stock en texto ("45", "45 unidades", "Disponible"). Sin número = sin límite.
    v_digits := regexp_replace(coalesce(v_raw_stock, ''), '[^0-9]', '', 'g');
    if v_digits <> '' then
      if v_qty > v_digits::int then
        raise exception 'Stock insuficiente para "%". Disponible: %', v_title, v_digits;
      end if;

      if v_type = 'experiencia' then
        update public.experiences
        set capacity = (v_digits::int - v_qty)::text || ' personas'
        where id = v_id;
      else
        update public.products
        set stock = (v_digits::int - v_qty)::text
        where id = v_id;
      end if;
    end if;

    insert into public.order_items (
      order_id, item_type, product_id, experience_id, seller_id,
      title, img, quantity, unit_price, total, status_id
    )
    values (
      v_order_id, v_type,
      case when v_type = 'producto' then v_id end,
      case when v_type = 'experiencia' then v_id end,
      v_seller, v_title, v_img, v_qty, v_price, v_price * v_qty, v_status_id
    );

    v_subtotal := v_subtotal + v_price * v_qty;
    v_count := v_count + 1;

    if p_payment_method <> 'CashOnDelivery' then
      v_buyer_msg := format('Solicitaste %s x %s ($%s COP) en %s. El productor lo enviará cuando se confirme tu pago.',
        v_qty, v_title, v_price * v_qty, coalesce(v_store_name, 'la tienda'));
      v_seller_title := 'Nuevo pedido: espera el pago antes de enviar';
    else
      v_buyer_msg := format('Solicitaste %s x %s ($%s COP). Pagarás al recibir.', v_qty, v_title, v_price * v_qty);
      v_seller_title := '¡Tienes una nueva venta (Contraentrega)!';
    end if;

    -- Notificaciones (opcional: no bloquea el pedido si falla)
    begin
      insert into public.activities (user_id, user_role, type, title, description, entity_type, entity_id)
      values (
        v_user, 'comprador', 'purchase',
        case when p_payment_method <> 'CashOnDelivery' then 'Pedido registrado: pendiente de pago' else 'Pedido contraentrega registrado' end,
        v_buyer_msg,
        case when v_type = 'producto' then 'products' else 'experiences' end, v_id
      );

      if v_seller is not null then
        insert into public.activities (user_id, user_role, type, title, description, entity_type, entity_id)
        values (
          v_seller, case when v_type = 'producto' then 'productor' else 'turismo' end, 'sale',
          v_seller_title,
          format('Te encargaron %s x %s. Entregar en: %s, %s (Tel: %s).',
            v_qty, v_title,
            coalesce(p_shipping->>'address', ''), coalesce(p_shipping->>'municipality', ''),
            coalesce(p_shipping->>'phone', '')),
          case when v_type = 'producto' then 'products' else 'experiences' end, v_id
        );
      end if;
    exception when others then
      null;
    end;
  end loop;

  if v_has_products then
    v_fee := coalesce(v_store_fee, 0);
  end if;

  update public.orders
  set subtotal = v_subtotal,
      shipping_fee = v_fee,
      total = v_subtotal + v_fee
  where id = v_order_id;

  return jsonb_build_object(
    'order_id', v_order_id,
    'store', p_store,
    'status', 'PendingPayment',
    'items', v_count,
    'subtotal', v_subtotal,
    'shipping_fee', v_fee,
    'total', v_subtotal + v_fee
  );
end;
$$;

-- ─── 4. Pago previo al envío: depende del método, no del nombre de la tienda ──
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

create or replace function public.notify_new_order_item()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_store text;
  v_payment_method text;
begin
  if new.seller_id is null then
    return new;
  end if;

  select coalesce(store, 'campo'), payment_method into v_store, v_payment_method from public.orders where id = new.order_id;

  insert into public.user_notifications (user_id, type, title, body, link_tab, link_section, entity_id, store)
  values (
    new.seller_id, 'new_order',
    case when v_payment_method is distinct from 'CashOnDelivery'
      then 'Nuevo pedido: espera el pago antes de enviar'
      else '¡Tienes un nuevo pedido!' end,
    format('%s x %s · Pedido #%s', new.quantity, new.title, upper(left(new.order_id::text, 8))),
    'admin', 'orders', new.order_id, coalesce(v_store, 'campo')
  );
  return new;
exception when others then
  -- Una notificación nunca debe impedir que se cree el pedido
  return new;
end;
$$;

revoke execute on function
  public.seed_store_transitions(),
  public.validate_order_item_transition(),
  public.notify_new_order_item()
from public, anon, authenticated;
revoke execute on function public.create_store_order(text, text, jsonb, jsonb, numeric) from public, anon;
grant execute on function public.create_store_order(text, text, jsonb, jsonb, numeric) to authenticated;

commit;
