-- Perfiles con varios roles.
-- Una misma cuenta puede ser Comprador, Comprador + Asociación o Comprador + Turismo.
--
-- profiles.user_type se conserva como ROL PRINCIPAL: todas las políticas, funciones y la edge
-- function admin-users que ya validan 'asociacion' / 'turismo' siguen funcionando igual.
-- Los roles de la cuenta quedan en profile_roles y los mantiene la base desde user_type:
--   asociacion → asociacion + comprador
--   turismo    → turismo + comprador
--   comprador  → comprador
--   admin / admin_tienda → solo su rol
--
--   1. Tabla profile_roles (sin escritura desde el navegador, sin duplicados)
--   2. roles_for_user_type + trigger sync_profile_roles (al crear el perfil y al cambiar user_type)
--   3. Roles de los perfiles ya existentes
--   4. has_role(): ayuda para políticas y funciones
--   5. add_my_role(): un comprador agrega Asociación o Turismo a su cuenta existente

begin;

-- ─── 1. Tabla de roles ────────────────────────────────────────────────────────
create table if not exists public.profile_roles (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('comprador', 'asociacion', 'turismo', 'admin', 'admin_tienda')),
  created_at timestamptz not null default now(),
  -- Un rol una sola vez por cuenta
  primary key (profile_id, role)
);

comment on table public.profile_roles is
  'Roles de cada cuenta. Los mantiene el trigger sync_profile_roles a partir de profiles.user_type (rol principal).';

alter table public.profile_roles enable row level security;

drop policy if exists "Usuarios ven sus roles y admins los que gestionan" on public.profile_roles;
create policy "Usuarios ven sus roles y admins los que gestionan"
  on public.profile_roles for select to authenticated
  using ((select auth.uid()) = profile_id or public.is_admin() or public.can_store_admin_manage(profile_id));

-- Nadie escribe directamente: solo el trigger y add_my_role
revoke all on public.profile_roles from public, anon, authenticated;
grant select on public.profile_roles to authenticated;

-- ─── 2. Sincronización desde user_type ───────────────────────────────────────
create or replace function public.roles_for_user_type(p_user_type text)
returns text[]
language sql
immutable
set search_path = public
as $$
  select case p_user_type
    when 'asociacion' then array['asociacion', 'comprador']
    when 'turismo' then array['turismo', 'comprador']
    when 'comprador' then array['comprador']
    when 'admin' then array['admin']
    when 'admin_tienda' then array['admin_tienda']
    else array[]::text[]
  end;
$$;

create or replace function public.sync_profile_roles()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_roles text[] := public.roles_for_user_type(new.user_type);
begin
  -- Si el superadmin cambia el rol principal, se quitan los roles que ya no corresponden
  delete from public.profile_roles
  where profile_id = new.id and role <> all (v_roles);

  insert into public.profile_roles (profile_id, role)
  select new.id, r from unnest(v_roles) as r
  on conflict (profile_id, role) do nothing;

  return new;
end;
$$;

drop trigger if exists trg_profiles_sync_roles on public.profiles;
create trigger trg_profiles_sync_roles
  after insert or update of user_type on public.profiles
  for each row execute function public.sync_profile_roles();

-- ─── 3. Perfiles existentes ──────────────────────────────────────────────────
insert into public.profile_roles (profile_id, role)
select p.id, r
from public.profiles p
cross join lateral unnest(public.roles_for_user_type(p.user_type)) as r
on conflict (profile_id, role) do nothing;

-- ─── 4. has_role ─────────────────────────────────────────────────────────────
create or replace function public.has_role(p_role text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profile_roles
    where profile_id = auth.uid() and role = p_role
  );
$$;

-- ─── 5. Agregar un rol desde el panel del comprador ──────────────────────────
-- Reutiliza las reglas del registro: solo roles públicos (asociacion / turismo), y la cuenta
-- debe tener nombre, documento y ubicación (los mismos datos obligatorios del registro).
-- La verificación del productor (RUT y Cámara de Comercio) sigue igual: hasta tenerlos
-- aprobados no puede publicar (enforce_producer_validated).
create or replace function public.add_my_role(p_role text, p_org_name text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_org text := nullif(trim(coalesce(p_org_name, '')), '');
begin
  if v_user is null then
    raise exception 'Debes iniciar sesión';
  end if;
  if p_role is null or p_role not in ('asociacion', 'turismo') then
    raise exception 'Solo puedes agregar el rol Asociación o Turismo';
  end if;
  if v_org is not null and length(v_org) > 200 then
    raise exception 'El nombre de la organización es demasiado largo';
  end if;

  perform public.ensure_profile(v_user);

  select * into v_profile from public.profiles where id = v_user for update;
  if not found then
    raise exception 'No se encontró tu perfil';
  end if;

  if exists (select 1 from public.profile_roles where profile_id = v_user and role = p_role) then
    raise exception 'Tu cuenta ya tiene este rol';
  end if;
  -- Solo una cuenta de comprador (sin otro rol) puede agregar un rol de vendedor
  if v_profile.user_type <> 'comprador' then
    raise exception 'Tu cuenta ya tiene un rol de vendedor o administrador';
  end if;

  if nullif(trim(v_profile.first_name), '') is null
     or v_profile.document_type is null or v_profile.document_number is null
     or nullif(trim(coalesce(v_profile.department, '')), '') is null
     or nullif(trim(coalesce(v_profile.municipality, '')), '') is null then
    raise exception 'Completa tu nombre, documento y ubicación en "Mis datos" antes de agregar el rol';
  end if;

  -- Mismo mecanismo que complete_my_profile para que protect_profile_privileged_fields
  -- permita cambiar el rol principal solo dentro de esta transacción
  perform set_config('app.completing_profile', 'on', true);

  update public.profiles set
    user_type = p_role,
    org_name = coalesce(v_org, org_name)
  where id = v_user;

  perform set_config('app.completing_profile', 'off', true);
  -- sync_profile_roles agrega el rol nuevo y conserva 'comprador'
end;
$$;

revoke execute on function public.sync_profile_roles() from public, anon, authenticated;
revoke execute on function public.has_role(text) from public, anon;
grant execute on function public.has_role(text) to authenticated;
revoke execute on function public.add_my_role(text, text) from public, anon;
grant execute on function public.add_my_role(text, text) to authenticated;

commit;
