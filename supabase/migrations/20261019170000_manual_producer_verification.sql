-- Verificación manual de productores por el superadministrador.
-- Hasta ahora un productor (asociacion / turismo) solo quedaba verificado con el RUT y la
-- Cámara de Comercio aprobados. El superadmin ahora puede verificarlo manualmente sin que
-- cargue esos documentos (y quitar esa verificación).
--
--   1. profiles.manually_verified_at / manually_verified_by
--   2. Solo un superadmin puede escribirlas (trigger)
--   3. is_producer_validated: documentos aprobados O verificación manual
--      (enforce_producer_validated la usa para permitir publicar)
--   4. set_producer_manual_verification(): RPC solo para superadmin, con notificación

begin;

-- ─── 1. Columnas ─────────────────────────────────────────────────────────────
alter table public.profiles
  add column if not exists manually_verified_at timestamptz,
  add column if not exists manually_verified_by uuid references public.profiles(id) on delete set null;

comment on column public.profiles.manually_verified_at is
  'Productor verificado manualmente por un superadmin (sin exigir RUT ni Cámara de Comercio). null = no.';

-- ─── 2. Protección ───────────────────────────────────────────────────────────
create or replace function public.protect_manual_verification()
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
    new.manually_verified_at := null;
    new.manually_verified_by := null;
  elsif (new.manually_verified_at, new.manually_verified_by)
        is distinct from (old.manually_verified_at, old.manually_verified_by) then
    raise exception 'Solo un superadministrador puede verificar productores manualmente';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profiles_protect_manual_verification on public.profiles;
create trigger trg_profiles_protect_manual_verification
  before insert or update on public.profiles
  for each row execute function public.protect_manual_verification();

-- ─── 3. Validación del productor ─────────────────────────────────────────────
create or replace function public.is_producer_validated(p_user uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
      select 1 from public.profiles
      where id = p_user and manually_verified_at is not null
    )
    or (
      select count(distinct doc_type) = 2
      from public.producer_documents
      where producer_id = p_user
        and status = 'aprobado'
        and doc_type in ('rut', 'camara_comercio')
    );
$$;

-- ─── 4. RPC del superadmin ───────────────────────────────────────────────────
create or replace function public.set_producer_manual_verification(p_producer uuid, p_verified boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_type text;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Solo un superadministrador puede verificar productores manualmente';
  end if;

  select user_type into v_type from public.profiles where id = p_producer for update;
  if not found then
    raise exception 'El usuario no existe';
  end if;
  if v_type not in ('asociacion', 'turismo') then
    raise exception 'Solo se pueden verificar productores (Asociación o Turismo)';
  end if;

  update public.profiles set
    manually_verified_at = case when p_verified then now() else null end,
    manually_verified_by = case when p_verified then auth.uid() else null end
  where id = p_producer;

  begin
    if to_regclass('public.user_notifications') is not null then
      insert into public.user_notifications (user_id, type, title, body, link_tab, link_section, entity_id)
      values (
        p_producer, 'document_review',
        case when p_verified then 'Perfil verificado' else 'Verificación retirada' end,
        case when p_verified
          then 'Un administrador verificó tu perfil. Ya puedes publicar.'
          else 'Un administrador retiró la verificación manual de tu perfil. Para publicar necesitas el RUT y la Cámara de Comercio aprobados.' end,
        'admin', 'settings', p_producer
      );
    end if;
  exception when others then
    null;
  end;
end;
$$;

revoke execute on function public.protect_manual_verification() from public, anon, authenticated;
revoke execute on function public.set_producer_manual_verification(uuid, boolean) from public, anon;
grant execute on function public.set_producer_manual_verification(uuid, boolean) to authenticated;

commit;
