-- Variantes de producto con inventario independiente por combinación
-- (p. ej. un yogur con Sabor = Fresa/Mora/Vainilla y Presentación = 250 ml/500 ml/1 L).
--
--   1. product_variant_attributes: atributos del producto y sus opciones (Sabor: [Fresa, Mora, ...]).
--   2. product_variants: una fila por combinación, con su stock (entero >= 0), y opcionalmente su
--      precio y su foto. Solo se escriben con save_product_variants (dueño del producto o admin).
--   3. products.has_variants y products.stock: para productos con variantes los mantiene la base
--      (stock = suma de las combinaciones activas), así el listado, "Agotado" y los paneles siguen igual.
--   4. order_items.variant_id / variant_label: la combinación comprada (el texto queda aunque se borre).
--   5. create_store_order descuenta el stock de la combinación y valida que alcance (en la base, con
--      bloqueo de fila); adjust_stock_on_item_status devuelve/reserva en la combinación.
--   6. Correcciones relacionadas:
--      - protect_catalog_fields ponía el nombre del COMPRADOR como productor al descontar stock en
--        create_store_order (corre con el auth.uid() del comprador). Ahora solo lo fija el dueño.
--      - protect_order_item_fields bloqueaba el ON DELETE SET NULL de product_id/experience_id al
--        borrar un producto con pedidos. Ahora permite que la referencia pase a null si ya no existe.

begin;

-- ─── 1. Atributos de variante ─────────────────────────────────────────────────
create table if not exists public.product_variant_attributes (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null,
  position integer not null default 0,
  options text[] not null,
  created_at timestamptz not null default now(),
  constraint product_variant_attributes_name_length check (length(btrim(name)) between 1 and 40),
  constraint product_variant_attributes_options_count check (cardinality(options) between 1 and 30)
);

create unique index if not exists product_variant_attributes_name_key
  on public.product_variant_attributes (product_id, lower(name));

comment on table public.product_variant_attributes is
  'Atributos de variante de un producto (Sabor, Presentación, Talla...) y sus opciones en orden. Se escriben con save_product_variants.';

-- ─── 2. Combinaciones (variantes) ─────────────────────────────────────────────
create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  -- {"Sabor": "Fresa", "Presentación": "1 L"}: un valor por cada atributo del producto
  options jsonb not null,
  stock integer not null default 0,
  -- null = precio del producto
  price numeric,
  image_url text,
  image_storage_path text,
  -- false = el vendedor no ofrece esta combinación (no se muestra)
  active boolean not null default true,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_variants_stock_nonnegative check (stock >= 0),
  constraint product_variants_price_positive check (price is null or price > 0),
  constraint product_variants_options_object check (jsonb_typeof(options) = 'object'),
  constraint product_variants_text_length check (
    length(coalesce(image_url, '')) <= 1000 and length(coalesce(image_storage_path, '')) <= 500
  )
);

create unique index if not exists product_variants_combination_key
  on public.product_variants (product_id, options);

comment on table public.product_variants is
  'Combinaciones de un producto con inventario propio. stock >= 0 lo garantiza la base; se escriben con save_product_variants y create_store_order.';

drop trigger if exists trg_product_variants_updated_at on public.product_variants;
create trigger trg_product_variants_updated_at
  before update on public.product_variants
  for each row execute function public.set_updated_at();

-- RLS: lectura pública; sin políticas de escritura (solo funciones SECURITY DEFINER)
alter table public.product_variant_attributes enable row level security;
alter table public.product_variants enable row level security;

drop policy if exists "Atributos de variante visibles para todos" on public.product_variant_attributes;
create policy "Atributos de variante visibles para todos" on public.product_variant_attributes
  for select to anon, authenticated using (true);

drop policy if exists "Variantes visibles para todos" on public.product_variants;
create policy "Variantes visibles para todos" on public.product_variants
  for select to anon, authenticated using (true);

revoke all on public.product_variant_attributes from public, anon, authenticated;
revoke all on public.product_variants from public, anon, authenticated;
grant select on public.product_variant_attributes to anon, authenticated;
grant select on public.product_variants to anon, authenticated;

-- ─── 3. products.has_variants y stock sincronizado ────────────────────────────
alter table public.products
  add column if not exists has_variants boolean not null default false;

comment on column public.products.has_variants is
  'true si el producto tiene combinaciones (product_variants). Lo mantiene la base.';

-- Recalcula has_variants y, si hay variantes, stock = suma de las combinaciones activas.
-- Corre en cada UPDATE de products, así nadie puede dejar un stock distinto al de las variantes.
create or replace function public.sync_product_variant_stock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
  v_sum bigint;
begin
  if tg_op = 'INSERT' then
    new.has_variants := false;
    return new;
  end if;

  select count(*), coalesce(sum(stock) filter (where active), 0)
    into v_count, v_sum
  from public.product_variants where product_id = new.id;

  new.has_variants := v_count > 0;
  if v_count > 0 then
    new.stock := v_sum::text;
  end if;
  return new;
end;
$$;

-- "v" para correr después de los demás BEFORE de products (orden alfabético)
drop trigger if exists trg_products_variants_sync on public.products;
create trigger trg_products_variants_sync
  before insert or update on public.products
  for each row execute function public.sync_product_variant_stock();

-- Al cambiar una combinación se "toca" el producto para que el trigger anterior recalcule
create or replace function public.touch_product_from_variant()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    update public.products set has_variants = has_variants where id = old.product_id;
  end if;
  if tg_op = 'INSERT' or (tg_op = 'UPDATE' and new.product_id is distinct from old.product_id) then
    update public.products set has_variants = has_variants where id = new.product_id;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_product_variants_touch_product on public.product_variants;
create trigger trg_product_variants_touch_product
  after insert or delete or update of stock, active, product_id on public.product_variants
  for each row execute function public.touch_product_from_variant();

-- Texto legible de una combinación, en el orden de los atributos: "Sabor: Fresa · Presentación: 1 L"
create or replace function public.product_variant_label(p_product_id uuid, p_options jsonb)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select string_agg(a.name || ': ' || (p_options->>a.name), ' · ' order by a.position, a.name)
  from public.product_variant_attributes a
  where a.product_id = p_product_id and p_options ? a.name;
$$;

-- ─── 4. order_items: combinación comprada ─────────────────────────────────────
alter table public.order_items
  add column if not exists variant_id uuid references public.product_variants(id) on delete set null,
  add column if not exists variant_label text;

create index if not exists order_items_variant_id_idx on public.order_items (variant_id);

alter table public.order_items drop constraint if exists order_items_variant_label_length;
alter table public.order_items add constraint order_items_variant_label_length
  check (length(coalesce(variant_label, '')) <= 500);

comment on column public.order_items.variant_label is
  'Combinación comprada ("Sabor: Fresa · Presentación: 1 L"). Se conserva aunque se borre la variante.';

-- El vendedor solo cambia el estado. Las referencias a producto/experiencia/variante solo pueden
-- pasar a null cuando se borra el registro (ON DELETE SET NULL).
create or replace function public.protect_order_item_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;

  if (new.order_id, new.item_type, new.seller_id, new.title, new.img, new.quantity, new.unit_price,
      new.total, new.created_at, new.payment_status, new.variant_label)
     is distinct from
     (old.order_id, old.item_type, old.seller_id, old.title, old.img, old.quantity, old.unit_price,
      old.total, old.created_at, old.payment_status, old.variant_label)
     or (new.product_id is distinct from old.product_id
         and not (new.product_id is null and not exists (select 1 from public.products where id = old.product_id)))
     or (new.experience_id is distinct from old.experience_id
         and not (new.experience_id is null and not exists (select 1 from public.experiences where id = old.experience_id)))
     or (new.variant_id is distinct from old.variant_id
         and not (new.variant_id is null and not exists (select 1 from public.product_variants where id = old.variant_id))) then
    raise exception 'Solo puedes cambiar el estado de los productos del pedido';
  end if;
  return new;
end;
$$;

-- ─── 5. Guardar atributos y combinaciones ─────────────────────────────────────
-- p_attributes: [{"name": "Sabor", "options": ["Fresa", "Mora"]}, ...]   ([] = sin variantes)
-- p_variants:   [{"options": {"Sabor": "Fresa"}, "stock": 10, "price": null,
--                 "image_url": null, "image_storage_path": null, "active": true}, ...]
-- Conserva el id de las combinaciones que siguen existiendo (mismas opciones) y borra las demás.
create or replace function public.save_product_variants(p_product_id uuid, p_attributes jsonb, p_variants jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_attr jsonb;
  v_names text[] := '{}';
  v_name text;
  v_opts text[];
  v_all_opts jsonb := '{}';
  v_combos bigint := 1;
  v_variant jsonb;
  v_options jsonb;
  v_value text;
  v_stock_raw text;
  v_price_raw text;
  v_price numeric;
  v_keep uuid[] := '{}';
  v_id uuid;
  v_pos int := 0;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión';
  end if;

  select producer_id into v_owner from public.products where id = p_product_id for update;
  if not found then
    raise exception 'El producto no existe';
  end if;
  if v_owner is distinct from auth.uid() and not public.is_admin() then
    raise exception 'No puedes modificar las variantes de este producto';
  end if;

  p_attributes := coalesce(p_attributes, '[]'::jsonb);
  p_variants := coalesce(p_variants, '[]'::jsonb);
  if jsonb_typeof(p_attributes) <> 'array' or jsonb_typeof(p_variants) <> 'array' then
    raise exception 'Formato de variantes inválido';
  end if;
  if jsonb_array_length(p_attributes) > 5 then
    raise exception 'Un producto puede tener máximo 5 atributos de variante';
  end if;

  -- Atributos
  for v_attr in select * from jsonb_array_elements(p_attributes) loop
    v_name := btrim(coalesce(v_attr->>'name', ''));
    if v_name = '' or length(v_name) > 40 then
      raise exception 'Cada atributo necesita un nombre de hasta 40 caracteres';
    end if;
    if exists (select 1 from unnest(v_names) n where lower(n) = lower(v_name)) then
      raise exception 'El atributo "%" está repetido', v_name;
    end if;
    if jsonb_typeof(v_attr->'options') is distinct from 'array' then
      raise exception 'El atributo "%" no tiene opciones', v_name;
    end if;

    select coalesce(array_agg(btrim(o) order by ord), '{}')
      into v_opts
    from jsonb_array_elements_text(v_attr->'options') with ordinality as t(o, ord);

    if cardinality(v_opts) = 0 or cardinality(v_opts) > 30 then
      raise exception 'El atributo "%" debe tener entre 1 y 30 opciones', v_name;
    end if;
    if exists (select 1 from unnest(v_opts) o where o = '' or length(o) > 60) then
      raise exception 'Las opciones de "%" deben tener entre 1 y 60 caracteres', v_name;
    end if;
    if (select count(distinct lower(o)) from unnest(v_opts) o) <> cardinality(v_opts) then
      raise exception 'Hay opciones repetidas en "%"', v_name;
    end if;

    v_names := v_names || v_name;
    v_all_opts := v_all_opts || jsonb_build_object(v_name, to_jsonb(v_opts));
    v_combos := v_combos * cardinality(v_opts);
  end loop;

  if cardinality(v_names) = 0 then
    if jsonb_array_length(p_variants) > 0 then
      raise exception 'Las combinaciones necesitan al menos un atributo';
    end if;
  else
    if v_combos > 300 then
      raise exception 'Demasiadas combinaciones (%). El máximo es 300.', v_combos;
    end if;
    if jsonb_array_length(p_variants) = 0 then
      raise exception 'Agrega al menos una combinación';
    end if;
  end if;

  -- Combinaciones
  for v_variant in select * from jsonb_array_elements(p_variants) loop
    if jsonb_typeof(v_variant->'options') is distinct from 'object'
       or (select count(*) from jsonb_object_keys(v_variant->'options')) <> cardinality(v_names) then
      raise exception 'Cada combinación debe tener un valor para cada atributo';
    end if;

    v_options := '{}';
    foreach v_name in array v_names loop
      v_value := btrim(coalesce(v_variant->'options'->>v_name, ''));
      if not ((v_all_opts->v_name) ? v_value) then
        raise exception '"%" no es una opción de "%"', v_value, v_name;
      end if;
      v_options := v_options || jsonb_build_object(v_name, v_value);
    end loop;

    v_stock_raw := btrim(coalesce(v_variant->>'stock', '0'));
    if v_stock_raw !~ '^[0-9]{1,7}$' then
      raise exception 'Inventario inválido para %', v_options;
    end if;

    v_price_raw := nullif(btrim(coalesce(v_variant->>'price', '')), '');
    if v_price_raw is not null and v_price_raw !~ '^[0-9]{1,12}(\.[0-9]{1,2})?$' then
      raise exception 'Precio inválido para %', v_options;
    end if;
    v_price := v_price_raw::numeric;
    if v_price is not null and v_price <= 0 then
      v_price := null;
    end if;

    insert into public.product_variants (
      product_id, options, stock, price, image_url, image_storage_path, active, position
    )
    values (
      p_product_id, v_options, v_stock_raw::int, v_price,
      nullif(btrim(coalesce(v_variant->>'image_url', '')), ''),
      nullif(btrim(coalesce(v_variant->>'image_storage_path', '')), ''),
      coalesce((v_variant->>'active')::boolean, true),
      v_pos
    )
    on conflict (product_id, options) do update
      set stock = excluded.stock,
          price = excluded.price,
          image_url = excluded.image_url,
          image_storage_path = excluded.image_storage_path,
          active = excluded.active,
          position = excluded.position
    returning id into v_id;

    if v_id = any (v_keep) then
      raise exception 'La combinación % está repetida', v_options;
    end if;
    v_keep := v_keep || v_id;
    v_pos := v_pos + 1;
  end loop;

  -- Combinaciones que ya no existen (los pedidos conservan variant_label)
  delete from public.product_variants
  where product_id = p_product_id and not (id = any (v_keep));

  delete from public.product_variant_attributes where product_id = p_product_id;
  insert into public.product_variant_attributes (product_id, name, position, options)
  select p_product_id, n, ord - 1, array(select jsonb_array_elements_text(v_all_opts->n))
  from unnest(v_names) with ordinality as t(n, ord);

  return jsonb_build_object('product_id', p_product_id, 'variants', cardinality(v_keep));
end;
$$;

revoke execute on function public.save_product_variants(uuid, jsonb, jsonb) from public, anon;
grant execute on function public.save_product_variants(uuid, jsonb, jsonb) to authenticated;
revoke execute on function public.sync_product_variant_stock() from public, anon, authenticated;
revoke execute on function public.touch_product_from_variant() from public, anon, authenticated;

-- ─── 6. Pedido: stock por combinación ─────────────────────────────────────────
-- p_items: [{ "id": uuid, "type": "producto"|"experiencia", "quantity": int, "variant_id"?: uuid }]
create or replace function public.create_store_order(
  p_store text,
  p_payment_method text,
  p_items jsonb,
  p_shipping jsonb default '{}'::jsonb,
  p_shipping_fee numeric default 0
)
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
  v_has_variants boolean;
  v_variant_id uuid;
  v_variant_label text;
  v_var_stock int;
  v_var_price numeric;
  v_var_img text;
  v_var_active boolean;
  v_var_options jsonb;
  v_display text;
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
    v_has_variants := false;
    v_variant_id := null;
    v_variant_label := null;

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
      select title, price, producer_id, stock, store, has_variants
        into v_title, v_price, v_seller, v_raw_stock, v_item_store, v_has_variants
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

    if v_type = 'producto' and v_has_variants then
      -- Producto con variantes: se compra una combinación con su propio inventario
      if nullif(v_item->>'variant_id', '') is null then
        raise exception 'Elige una opción de "%" antes de comprarlo', v_title;
      end if;
      v_variant_id := (v_item->>'variant_id')::uuid;

      select stock, price, image_url, active, options
        into v_var_stock, v_var_price, v_var_img, v_var_active, v_var_options
      from public.product_variants
      where id = v_variant_id and product_id = v_id
      for update;

      if not found or not v_var_active then
        raise exception 'La opción elegida de "%" ya no está disponible', v_title;
      end if;

      v_variant_label := public.product_variant_label(v_id, v_var_options);
      if v_qty > v_var_stock then
        raise exception 'Stock insuficiente para "%" (%). Disponible: %', v_title, v_variant_label, v_var_stock;
      end if;

      -- El CHECK (stock >= 0) es la última barrera si algo se saltara la validación
      update public.product_variants set stock = stock - v_qty where id = v_variant_id;

      v_price := coalesce(v_var_price, v_price);
      v_img := coalesce(v_var_img, v_img);
    elsif nullif(v_item->>'variant_id', '') is not null then
      raise exception 'La opción elegida de "%" ya no está disponible', v_title;
    else
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
    end if;

    insert into public.order_items (
      order_id, item_type, product_id, experience_id, seller_id,
      title, img, quantity, unit_price, total, status_id, variant_id, variant_label
    )
    values (
      v_order_id, v_type,
      case when v_type = 'producto' then v_id end,
      case when v_type = 'experiencia' then v_id end,
      v_seller, v_title, v_img, v_qty, v_price, v_price * v_qty, v_status_id,
      v_variant_id, v_variant_label
    );

    v_subtotal := v_subtotal + v_price * v_qty;
    v_count := v_count + 1;
    v_display := v_title || coalesce(' (' || v_variant_label || ')', '');

    if p_payment_method <> 'CashOnDelivery' then
      v_buyer_msg := format('Solicitaste %s x %s ($%s COP) en %s. El productor lo enviará cuando se confirme tu pago.',
        v_qty, v_display, v_price * v_qty, coalesce(v_store_name, 'la tienda'));
      v_seller_title := 'Nuevo pedido: espera el pago antes de enviar';
    else
      v_buyer_msg := format('Solicitaste %s x %s ($%s COP). Pagarás al recibir.', v_qty, v_display, v_price * v_qty);
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
            v_qty, v_display,
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

-- ─── 7. Cancelar / reactivar: stock de la combinación ─────────────────────────
create or replace function public.adjust_stock_on_item_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_code text;
  v_new_code text;
  v_delta int;
  v_raw text;
  v_digits text;
  v_new_stock int;
  v_var_stock int;
begin
  select code into v_old_code from public.order_statuses where id = old.status_id;
  select code into v_new_code from public.order_statuses where id = new.status_id;

  if v_new_code = 'Cancelled' and v_old_code <> 'Cancelled' then
    v_delta := new.quantity;          -- devolver unidades
  elsif v_old_code = 'Cancelled' and v_new_code <> 'Cancelled' then
    v_delta := -new.quantity;         -- volver a reservar unidades
  else
    return new;
  end if;

  if new.product_id is not null then
    -- Producto primero y luego variante: mismo orden de bloqueo que create_store_order
    select stock into v_raw from public.products where id = new.product_id for update;
  elsif new.experience_id is not null then
    select capacity into v_raw from public.experiences where id = new.experience_id for update;
  else
    return new;                       -- el producto ya no existe
  end if;

  -- Ítem de una combinación: el inventario es el de la combinación
  if new.variant_id is not null or new.variant_label is not null then
    if new.variant_id is null then
      return new;                     -- la combinación ya no existe
    end if;
    select stock into v_var_stock from public.product_variants where id = new.variant_id for update;
    if not found then
      return new;
    end if;
    if v_var_stock + v_delta < 0 then
      raise exception 'Stock insuficiente para reactivar "%" (%). Disponible: %', new.title, new.variant_label, v_var_stock;
    end if;
    update public.product_variants set stock = stock + v_delta where id = new.variant_id;
    return new;
  end if;

  v_digits := regexp_replace(coalesce(v_raw, ''), '[^0-9]', '', 'g');
  if v_digits = '' then
    return new;
  end if;

  v_new_stock := v_digits::int + v_delta;
  if v_new_stock < 0 then
    raise exception 'Stock insuficiente para reactivar "%". Disponible: %', new.title, v_digits;
  end if;

  if new.product_id is not null then
    update public.products set stock = v_new_stock::text where id = new.product_id;
  else
    update public.experiences set capacity = v_new_stock::text || ' personas' where id = new.experience_id;
  end if;

  return new;
end;
$$;

-- ─── 8. Notificaciones con la combinación ─────────────────────────────────────
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
    format('%s x %s · Pedido #%s', new.quantity,
      new.title || coalesce(' (' || new.variant_label || ')', ''), upper(left(new.order_id::text, 8))),
    'admin', 'orders', new.order_id, coalesce(v_store, 'campo')
  );
  return new;
exception when others then
  -- Una notificación nunca debe impedir que se cree el pedido
  return new;
end;
$$;

create or replace function public.notify_order_item_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer uuid;
  v_store text;
  v_status text;
begin
  select customer_id, coalesce(store, 'campo') into v_customer, v_store
  from public.orders where id = new.order_id;
  select name into v_status from public.order_statuses where id = new.status_id;

  if v_customer is null or v_customer = auth.uid() then
    return new;
  end if;

  insert into public.user_notifications (user_id, type, title, body, link_tab, link_section, entity_id, store)
  values (
    v_customer, 'order_status',
    format('Tu pedido #%s: %s', upper(left(new.order_id::text, 8)), coalesce(v_status, 'estado actualizado')),
    format('%s x %s ahora está en "%s".', new.quantity,
      new.title || coalesce(' (' || new.variant_label || ')', ''), coalesce(v_status, '')),
    'profile', 'orders', new.order_id, v_store
  );
  return new;
exception when others then
  return new;
end;
$$;

-- ─── 9. Nombre del productor: solo lo fija el dueño ───────────────────────────
-- create_store_order y los triggers de variantes actualizan products con el auth.uid() del
-- comprador; antes eso cambiaba products.producer por el nombre del comprador.
create or replace function public.protect_catalog_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.rating := 5;   -- valor inicial que usaba la app
    new.reviews := 0;
    new.created_by := auth.uid();
    if tg_table_name = 'products' then
      new.outstanding := false;
    end if;
  else
    new.rating := old.rating;
    new.reviews := old.reviews;
    new.created_by := old.created_by;
    if tg_table_name = 'products' then
      new.outstanding := old.outstanding;
    end if;
  end if;

  -- products.producer_id / experiences.host_id
  if coalesce(to_jsonb(new)->>'producer_id', to_jsonb(new)->>'host_id') is distinct from auth.uid()::text then
    return new;
  end if;

  select coalesce(nullif(trim(org_name), ''), nullif(trim(concat_ws(' ', first_name, last_name)), ''))
    into v_name
  from public.profiles where id = auth.uid();

  if v_name is not null then
    if tg_table_name = 'products' then
      new.producer := v_name;
    else
      new.host := v_name;
    end if;
  end if;
  return new;
end;
$$;

commit;
