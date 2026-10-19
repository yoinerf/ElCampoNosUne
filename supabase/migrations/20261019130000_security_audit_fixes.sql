-- Auditoría de seguridad (2026-10-19). Correcciones sin cambiar el funcionamiento de la app:
--   1. order_items: el vendedor solo puede cambiar el estado de sus ítems (antes podía cambiar
--      cantidad, producto, pedido y precios, y con eso alterar el inventario de otros productores)
--   2. Nombre visible del productor/anfitrión: lo fija la base desde el perfil (evita suplantación)
--   3. public_profiles: solo expone a quienes venden o escribieron reseñas (no a todos los usuarios)
--   4. support_tickets: el ítem enlazado debe pertenecer al pedido del propio comprador
--   5. Límites de datos: precios no negativos, cantidades positivas y tamaño de textos

-- ─── 1. order_items: solo el estado ───────────────────────────────────────────
-- La app solo envía status_id; payment_status lo calcula set_item_payment_from_status a partir
-- del estado. El nombre empieza por "00" para correr antes que los demás BEFORE UPDATE
-- (se ejecutan en orden alfabético) y validar lo que envió el usuario.
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

  if (new.order_id, new.item_type, new.product_id, new.experience_id, new.seller_id,
      new.title, new.img, new.quantity, new.unit_price, new.total, new.created_at, new.payment_status)
     is distinct from
     (old.order_id, old.item_type, old.product_id, old.experience_id, old.seller_id,
      old.title, old.img, old.quantity, old.unit_price, old.total, old.created_at, old.payment_status) then
    raise exception 'Solo puedes cambiar el estado de los productos del pedido';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_order_items_00_protect_fields on public.order_items;
create trigger trg_order_items_00_protect_fields
  before update on public.order_items
  for each row execute function public.protect_order_item_fields();

-- ─── 2. Nombre visible del productor / anfitrión ──────────────────────────────
-- Misma regla que usa la app: nombre de la organización o, si no hay, nombre y apellido.
-- Los superadministradores pueden seguir escribiéndolo a mano.
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

-- ─── 3. public_profiles: solo perfiles públicos ───────────────────────────────
-- La vista se usa para mostrar el nombre de productores, anfitriones y autores de reseñas.
-- Antes devolvía nombre e id de TODOS los usuarios (compradores y administradores) a
-- cualquiera, incluso sin sesión.
create or replace view public.public_profiles as
  select p.id, p.first_name, p.last_name, p.org_name
  from public.profiles p
  where p.user_type in ('asociacion', 'turismo')
     or exists (select 1 from public.products pr where pr.producer_id = p.id)
     or exists (select 1 from public.experiences e where e.host_id = p.id)
     or exists (select 1 from public.product_reviews r where r.user_id = p.id);

-- ─── 4. support_tickets: el ítem debe ser del pedido del comprador ────────────
create or replace function public.guard_ticket_links()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;

  if new.order_item_id is not null and not exists (
    select 1 from public.order_items oi
    join public.orders o on o.id = oi.order_id
    where oi.id = new.order_item_id
      and oi.order_id = new.order_id
      and o.customer_id = auth.uid()
  ) then
    raise exception 'El producto indicado no pertenece a tu pedido';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_support_tickets_guard_links on public.support_tickets;
create trigger trg_support_tickets_guard_links
  before insert or update on public.support_tickets
  for each row execute function public.guard_ticket_links();

-- ─── 5. Límites de datos ──────────────────────────────────────────────────────
-- Precios no negativos: un precio negativo producía totales negativos en los pedidos
alter table public.products drop constraint if exists products_price_nonnegative;
alter table public.products add constraint products_price_nonnegative check (price >= 0);
alter table public.experiences drop constraint if exists experiences_price_nonnegative;
alter table public.experiences add constraint experiences_price_nonnegative check (price >= 0);

alter table public.reservations drop constraint if exists reservations_quantity_check;
alter table public.reservations add constraint reservations_quantity_check
  check (quantity is null or quantity between 1 and 10000);

-- Tamaño de textos que escriben los usuarios (holgado frente a lo que permite la app)
alter table public.products drop constraint if exists products_text_length;
alter table public.products add constraint products_text_length
  check (length(title) <= 200 and length(coalesce(description, '')) <= 5000 and length(coalesce(producer, '')) <= 200);
alter table public.experiences drop constraint if exists experiences_text_length;
alter table public.experiences add constraint experiences_text_length
  check (length(title) <= 200 and length(coalesce(description, '')) <= 5000 and length(coalesce(host, '')) <= 200);
alter table public.product_reviews drop constraint if exists product_reviews_comment_length;
alter table public.product_reviews add constraint product_reviews_comment_length
  check (length(coalesce(comment, '')) <= 2000);
alter table public.support_tickets drop constraint if exists support_tickets_text_length;
alter table public.support_tickets add constraint support_tickets_text_length
  check (length(coalesce(subject, '')) <= 200 and length(coalesce(description, '')) <= 5000
         and length(coalesce(admin_response, '')) <= 5000);
-- Datos de entrega que llegan del navegador en create_store_order
alter table public.orders drop constraint if exists orders_customer_data_length;
alter table public.orders add constraint orders_customer_data_length
  check (length(coalesce(customer_name, '')) <= 200 and length(coalesce(customer_phone, '')) <= 40
         and pg_column_size(shipping_address) <= 8192);
