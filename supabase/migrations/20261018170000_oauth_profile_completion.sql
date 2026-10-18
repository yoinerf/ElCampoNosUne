-- Inicio de sesión con Google (OAuth).
-- 1. handle_new_user toma el nombre de los metadatos de Google (full_name / name).
-- 2. complete_my_profile: la primera vez que un usuario completa su perfil (sin documento
--    aún) puede elegir su tipo de cuenta pública y guardar documento y ubicación.
--    Con Google no hay formulario de registro, así que el perfil nace como 'comprador'.

begin;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_type text := v_meta->>'user_type';
  v_full_name text := trim(coalesce(v_meta->>'full_name', v_meta->>'name', ''));
  v_first_name text := nullif(trim(coalesce(v_meta->>'first_name', v_meta->>'given_name', '')), '');
  v_last_name text := nullif(trim(coalesce(v_meta->>'last_name', v_meta->>'family_name', '')), '');
  v_doc_type text := upper(nullif(trim(v_meta->>'document_type'), ''));
  v_doc_number text := upper(regexp_replace(coalesce(v_meta->>'document_number', ''), '[\s.]', '', 'g'));
begin
  if v_type is null or v_type not in ('comprador', 'asociacion', 'turismo') then
    v_type := 'comprador';
  end if;

  -- Google envía el nombre completo: "Ana María Pérez" → Ana / María Pérez
  if v_first_name is null and v_full_name <> '' then
    v_first_name := split_part(v_full_name, ' ', 1);
    v_last_name := coalesce(v_last_name, nullif(trim(substr(v_full_name, length(v_first_name) + 1)), ''));
  end if;

  if v_doc_type is null or v_doc_type not in ('CC', 'CE', 'TI', 'PPT', 'PAS', 'NIT') then
    v_doc_type := null;
  end if;
  if v_doc_number !~ '^[A-Z0-9-]{4,20}$' then
    v_doc_number := null;
  end if;

  insert into public.profiles (
    id, first_name, last_name, phone, email, user_type,
    org_name, department, municipality, document_type, document_number
  )
  values (
    new.id,
    coalesce(v_first_name, ''),
    coalesce(v_last_name, ''),
    v_meta->>'phone',
    new.email,
    v_type,
    v_meta->>'org_name',
    v_meta->>'department',
    v_meta->>'municipality',
    v_doc_type,
    v_doc_number
  );
  return new;
end;
$$;

-- El rol y la tienda siguen protegidos; solo complete_my_profile puede ajustar el rol
-- (y solo dentro de su propia transacción, vía app.completing_profile).
create or replace function public.protect_profile_privileged_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if new.user_type is distinct from old.user_type
       and coalesce(current_setting('app.completing_profile', true), '') <> 'on' then
      raise exception 'Solo un superadministrador puede cambiar el rol de la cuenta';
    end if;
    if new.store is distinct from old.store then
      raise exception 'Solo un superadministrador puede cambiar la tienda de la cuenta';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.complete_my_profile(
  p_user_type text,
  p_first_name text,
  p_last_name text,
  p_document_type text,
  p_document_number text,
  p_department text,
  p_municipality text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_doc_type text := upper(trim(coalesce(p_document_type, '')));
  v_doc_number text := upper(regexp_replace(coalesce(p_document_number, ''), '[\s.]', '', 'g'));
begin
  if v_user is null then
    raise exception 'Debes iniciar sesión';
  end if;

  select * into v_profile from public.profiles where id = v_user for update;
  if not found then
    raise exception 'No se encontró tu perfil';
  end if;
  -- Solo la primera vez: un perfil que ya tiene documento se edita desde "Mis datos"
  if v_profile.document_number is not null then
    raise exception 'Tu perfil ya está completo';
  end if;

  if p_user_type not in ('comprador', 'asociacion', 'turismo') then
    raise exception 'Tipo de cuenta inválido';
  end if;
  if nullif(trim(p_first_name), '') is null then
    raise exception 'El nombre es obligatorio';
  end if;
  if v_doc_type not in ('CC', 'CE', 'TI', 'PPT', 'PAS', 'NIT') or v_doc_number !~ '^[A-Z0-9-]{4,20}$' then
    raise exception 'Documento de identidad inválido';
  end if;
  if nullif(trim(p_department), '') is null or nullif(trim(p_municipality), '') is null then
    raise exception 'Selecciona el departamento y el municipio';
  end if;

  -- El tipo de cuenta solo se elige si el perfil sigue siendo el 'comprador' por defecto
  -- (nunca para admins ni admins de tienda)
  if v_profile.user_type = 'comprador' and p_user_type <> 'comprador' then
    perform set_config('app.completing_profile', 'on', true);
  end if;

  update public.profiles set
    user_type = case when v_profile.user_type = 'comprador' then p_user_type else v_profile.user_type end,
    first_name = trim(p_first_name),
    last_name = coalesce(trim(p_last_name), ''),
    document_type = v_doc_type,
    document_number = v_doc_number,
    department = trim(p_department),
    municipality = trim(p_municipality)
  where id = v_user;

  perform set_config('app.completing_profile', 'off', true);
end;
$$;

revoke execute on function public.complete_my_profile(text, text, text, text, text, text, text) from public, anon;
grant execute on function public.complete_my_profile(text, text, text, text, text, text, text) to authenticated;
revoke execute on function public.handle_new_user(), public.protect_profile_privileged_fields() from public, anon, authenticated;

commit;
