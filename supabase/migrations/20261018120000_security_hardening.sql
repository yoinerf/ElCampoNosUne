-- Endurecimiento de seguridad (RLS, permisos de funciones y checkout sin backend).
-- Basado en el estado real de la base al 2026-10-18 (pg_policies, triggers y advisors).

begin;

-- ─── 1. profiles: dejar de exponer correo, teléfono y dirección ────────────────
-- Antes: "Perfiles públicos para lectura" (select using true) para anon y authenticated.
-- Ahora: cada usuario ve su perfil; el superadmin ve todos; el admin de tienda ve sus productores.
-- Para mostrar nombres públicos (productor de un producto, autor de una reseña) se usa
-- la vista public_profiles, que solo expone columnas no sensibles.
drop policy if exists "Perfiles públicos para lectura" on public.profiles;
create policy "Usuarios ven su perfil y admins los que gestionan"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id or public.is_admin() or public.can_store_admin_manage(id));

create or replace view public.public_profiles
  with (security_invoker = false) as
  select id, first_name, last_name, org_name
  from public.profiles;

comment on view public.public_profiles is
  'Datos públicos de un perfil (nombre y organización). Sin correo, teléfono ni dirección.';

revoke all on public.public_profiles from public, anon, authenticated;
grant select on public.public_profiles to anon, authenticated;

-- ─── 2. Catálogo: quitar políticas por created_by que saltaban validaciones ───
-- Permitían crear productos con producer_id de otro usuario (solo se verificaba created_by)
-- y editar productos ajenos marcados con created_by. Ninguna fila usa created_by hoy.
drop policy if exists "solo asociacion puede crear productos" on public.products;
drop policy if exists "dueno puede editar productos" on public.products;
drop policy if exists "productos visibles para todos" on public.products;
drop policy if exists "solo turismo puede crear experiencias" on public.experiences;
drop policy if exists "dueno puede editar experiencias" on public.experiences;
drop policy if exists "experiencias visibles para todos" on public.experiences;

-- Calificación, reseñas y "destacado por la plataforma" (products.outstanding) no los
-- decide el productor. experiences.featured sí lo elige el anfitrión en su formulario.
create or replace function public.protect_catalog_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
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
  return new;
end;
$$;

drop trigger if exists trg_products_protect_fields on public.products;
create trigger trg_products_protect_fields
  before insert or update on public.products
  for each row execute function public.protect_catalog_fields();

drop trigger if exists trg_experiences_protect_fields on public.experiences;
create trigger trg_experiences_protect_fields
  before insert or update on public.experiences
  for each row execute function public.protect_catalog_fields();

-- ─── 3. orders: los pedidos solo se crean con create_store_order ──────────────
-- La política permitía insertar pedidos con total, estado y payment_status arbitrarios.
drop policy if exists "Clientes crean sus pedidos" on public.orders;

-- ─── 4. reservations: el usuario no decide el estado ─────────────────────────
drop policy if exists "Usuarios actualizan sus reservas" on public.reservations;

create or replace function public.guard_reservation_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.status := 'pendiente';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_reservations_guard_insert on public.reservations;
create trigger trg_reservations_guard_insert
  before insert on public.reservations
  for each row execute function public.guard_reservation_insert();

-- ─── 5. activities: políticas duplicadas ─────────────────────────────────────
drop policy if exists "Usuarios pueden insertar sus propias actividades" on public.activities;
drop policy if exists "Usuarios pueden ver sus propias actividades" on public.activities;

-- ─── 6. Funciones SECURITY DEFINER expuestas por /rest/v1/rpc ─────────────────
-- Los triggers se ejecutan igual sin EXECUTE (el permiso solo se verifica al crear el trigger).
revoke execute on function
  public.adjust_stock_on_item_status(),
  public.enforce_producer_validated(),
  public.enforce_product_images_limit(),
  public.guard_profile_insert(),
  public.handle_new_user(),
  public.log_order_item_status(),
  public.notify_new_order_item(),
  public.notify_new_ticket(),
  public.notify_order_item_status(),
  public.notify_ticket_status(),
  public.prevent_self_admin_promotion(),
  public.protect_profile_privileged_fields(),
  public.protect_ticket_admin_fields(),
  public.set_item_payment_from_status(),
  public.set_product_store(),
  public.sync_order_status_from_items(),
  public.sync_products_store_from_profile(),
  public.validate_order_item_transition(),
  public.protect_catalog_fields(),
  public.guard_reservation_insert(),
  public.recalc_order_from_items(uuid),
  public.cancel_unpaid_store_orders()
from public, anon, authenticated;

-- RPC que solo tienen sentido con sesión
revoke execute on function
  public.create_store_order(text, text, jsonb, jsonb, numeric),
  public.create_cash_on_delivery_order(jsonb, jsonb, numeric),
  public.submit_producer_document(text, text, text, text, integer),
  public.review_producer_document(uuid, boolean, text)
from public, anon;
grant execute on function
  public.create_store_order(text, text, jsonb, jsonb, numeric),
  public.create_cash_on_delivery_order(jsonb, jsonb, numeric),
  public.submit_producer_document(text, text, text, text, integer),
  public.review_producer_document(uuid, boolean, text)
to authenticated;

-- Helpers de RLS (is_admin, is_order_customer, ...) se mantienen ejecutables:
-- las políticas los evalúan con el rol de quien consulta.

alter function public.get_user_role(uuid) set search_path = public;
revoke execute on function public.get_user_role(uuid) from public, anon;

-- ─── 7. Checkout sin backend: transferencia en El Campo Nos Une ──────────────
-- create_store_order ya calcula precios y stock en la base; solo se habilita BankTransfer
-- para 'campo' y se ajustan los textos de actividad (no es contraentrega).
-- Se edita la definición vigente en lugar de reescribirla completa.
do $$
declare
  v_def text := pg_get_functiondef('public.create_store_order(text, text, jsonb, jsonb, numeric)'::regprocedure);
  v_new text;
begin
  v_new := replace(v_def,
    $q$if p_payment_method <> 'CashOnDelivery' then$q$,
    $q$if p_payment_method not in ('CashOnDelivery', 'BankTransfer') then$q$);
  if v_new = v_def then
    raise exception 'create_store_order: no se encontró la validación de método de pago de campo';
  end if;
  v_def := v_new;

  v_new := regexp_replace(v_def,
    $q$if p_store = 'amazonica' then(\s+v_buyer_msg)$q$,
    $q$if p_store = 'amazonica' or p_payment_method <> 'CashOnDelivery' then\1$q$);
  if v_new = v_def then
    raise exception 'create_store_order: no se encontró el mensaje para el comprador';
  end if;
  v_def := v_new;

  v_new := replace(v_def,
    $q$case when p_store = 'amazonica' then 'Pedido registrado: pendiente de pago'$q$,
    $q$case when p_payment_method <> 'CashOnDelivery' then 'Pedido registrado: pendiente de pago'$q$);
  if v_new = v_def then
    raise exception 'create_store_order: no se encontró el título de la actividad del comprador';
  end if;

  execute v_new;
end;
$$;

-- Los datos bancarios de El Campo estaban escritos en el frontend; ahora viven en la base
-- (los mismos que se mostraban). Solo se cargan si la tienda aún no tiene datos.
update public.store_settings
set transfer_info = jsonb_build_object(
  'bank', 'Bancolombia',
  'accountType', 'Cuenta de Ahorros',
  'accountNumber', '458-920184-12',
  'accountHolder', 'El Campo Nos Une S.A.S',
  'nit', '901.582.419-3',
  'nequi', '315 482 9102',
  'whatsapp', '573154829102'
)
where store = 'campo' and (transfer_info is null or transfer_info = '{}'::jsonb);

commit;
