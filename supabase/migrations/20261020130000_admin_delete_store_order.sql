-- Borrado en cascada desde el superadmin y limpieza de notificaciones:
--   1. admin_delete_order(p_order_id): borra un pedido con sus ítems, su historial de estados,
--      sus tickets de soporte y las notificaciones de ambos. Las unidades de los ítems que no
--      estaban en un estado final (entregado, cancelado, devuelto, reembolsado) vuelven al inventario.
--   2. admin_delete_store(p_store): borra una tienda aliada con sus pedidos (como el punto 1),
--      sus productos (imágenes, variantes, reseñas, favoritos y anuncios van en cascada), su flujo
--      de estados y sus notificaciones. Las cuentas de la tienda pasan a la tienda principal y sus
--      administradores de tienda quedan como compradores. Devuelve las rutas de las fotos para que
--      la app las borre del Storage (Supabase no deja borrar archivos desde SQL).
--      La tienda principal ('campo') no se puede borrar.
--   3. Las notificaciones se borran al verlas (desde la app). Como respaldo, un job diario borra
--      las que tengan más de 60 días.

begin;

-- ─── 1. Borrar un pedido ──────────────────────────────────────────────────────
create or replace function public.admin_delete_order(p_order_id uuid, p_restock boolean default true)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item record;
  v_tickets uuid[];
  v_restocked int := 0;
begin
  if not public.is_admin() then
    raise exception 'Solo un superadministrador puede borrar pedidos';
  end if;

  perform 1 from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'El pedido no existe';
  end if;

  -- Devolver al inventario lo que seguía reservado (mismas reglas que al cancelar)
  if p_restock then
    for v_item in
      select i.* from public.order_items i
      join public.order_statuses s on s.id = i.status_id
      where i.order_id = p_order_id and not s.is_final
    loop
      if v_item.variant_id is not null then
        update public.product_variants set stock = stock + v_item.quantity where id = v_item.variant_id;
      elsif v_item.product_id is not null and v_item.variant_label is null then
        update public.products
        set stock = (regexp_replace(stock, '[^0-9]', '', 'g')::int + v_item.quantity)::text
        where id = v_item.product_id and regexp_replace(coalesce(stock, ''), '[^0-9]', '', 'g') <> '';
      elsif v_item.experience_id is not null then
        update public.experiences
        set capacity = (regexp_replace(capacity, '[^0-9]', '', 'g')::int + v_item.quantity)::text || ' personas'
        where id = v_item.experience_id and regexp_replace(coalesce(capacity, ''), '[^0-9]', '', 'g') <> '';
      else
        continue;
      end if;
      v_restocked := v_restocked + 1;
    end loop;
  end if;

  select coalesce(array_agg(id), '{}') into v_tickets from public.support_tickets where order_id = p_order_id;

  delete from public.user_notifications where entity_id = p_order_id or entity_id = any (v_tickets);
  delete from public.support_tickets where id = any (v_tickets);
  -- order_items y order_item_status_history se borran en cascada
  delete from public.orders where id = p_order_id;

  return jsonb_build_object('order_id', p_order_id, 'tickets', cardinality(v_tickets), 'restocked_items', v_restocked);
end;
$$;

revoke execute on function public.admin_delete_order(uuid, boolean) from public, anon;
grant execute on function public.admin_delete_order(uuid, boolean) to authenticated;

-- ─── 2. Borrar una tienda aliada ──────────────────────────────────────────────
create or replace function public.admin_delete_store(p_store text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order uuid;
  v_orders int := 0;
  v_products int := 0;
  v_users int := 0;
  v_paths text[];
begin
  if not public.is_admin() then
    raise exception 'Solo un superadministrador puede borrar tiendas';
  end if;
  if p_store = 'campo' then
    raise exception 'La tienda principal no se puede borrar';
  end if;

  perform 1 from public.store_settings where store = p_store for update;
  if not found then
    raise exception 'La tienda no existe';
  end if;

  -- Fotos de los productos: las borra la app del Storage con la respuesta de esta función
  select coalesce(array_agg(distinct path), '{}') into v_paths
  from (
    select i.storage_path as path
    from public.images i join public.products p on p.id = i.product_id
    where p.store = p_store
    union
    select v.image_storage_path
    from public.product_variants v join public.products p on p.id = v.product_id
    where p.store = p_store and v.image_storage_path is not null
  ) x;

  -- Pedidos (los productos se borran después: no hace falta devolver inventario)
  for v_order in select id from public.orders where store = p_store loop
    perform public.admin_delete_order(v_order, false);
    v_orders := v_orders + 1;
  end loop;

  -- Productos: imágenes, variantes, reseñas, favoritos y anuncios van en cascada
  delete from public.products where store = p_store;
  get diagnostics v_products = row_count;

  -- Cuentas de la tienda: pasan a la principal; sus administradores de tienda dejan de serlo
  update public.profiles set user_type = 'comprador' where store = p_store and user_type = 'admin_tienda';
  delete from public.profile_roles r
  using public.profiles p
  where p.id = r.profile_id and p.store = p_store and r.role = 'admin_tienda';
  update public.profiles set store = 'campo' where store = p_store;
  get diagnostics v_users = row_count;

  delete from public.order_status_transitions where store = p_store;
  delete from public.user_notifications where store = p_store;
  delete from public.store_settings where store = p_store;

  return jsonb_build_object(
    'store', p_store,
    'orders', v_orders,
    'products', v_products,
    'users_moved', v_users,
    'storage_paths', to_jsonb(v_paths)
  );
end;
$$;

revoke execute on function public.admin_delete_store(text) from public, anon;
grant execute on function public.admin_delete_store(text) to authenticated;

-- ─── 3. Notificaciones viejas ─────────────────────────────────────────────────
select cron.schedule(
  'cleanup-old-notifications',
  '0 4 * * *',
  $cron$delete from public.user_notifications where created_at < now() - interval '60 days'$cron$
);

commit;
