-- handle_new_user existía pero ningún trigger lo ejecutaba sobre auth.users: el perfil lo
-- creaba el navegador al registrarse (o admin-users). Las cuentas creadas con Google
-- quedaban sin perfil. Aquí:
--   1. ensure_profile(user): crea el perfil desde los metadatos de auth.users si falta.
--   2. Trigger on_auth_user_created → handle_new_user → ensure_profile.
--   3. Crea los perfiles que falten de usuarios ya existentes.
--   4. complete_my_profile también lo asegura (respaldo si el trigger falló).

begin;

create or replace function public.ensure_profile(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user auth.users%rowtype;
  v_meta jsonb;
  v_type text;
  v_full_name text;
  v_first_name text;
  v_last_name text;
  v_doc_type text;
  v_doc_number text;
begin
  if exists (select 1 from public.profiles where id = p_user_id) then
    return;
  end if;

  select * into v_user from auth.users where id = p_user_id;
  if not found then
    return;
  end if;

  v_meta := coalesce(v_user.raw_user_meta_data, '{}'::jsonb);
  v_type := v_meta->>'user_type';
  if v_type is null or v_type not in ('comprador', 'asociacion', 'turismo') then
    v_type := 'comprador';
  end if;

  -- Registro por correo envía first_name/last_name; Google envía full_name / name
  v_full_name := trim(coalesce(v_meta->>'full_name', v_meta->>'name', ''));
  v_first_name := nullif(trim(coalesce(v_meta->>'first_name', v_meta->>'given_name', '')), '');
  v_last_name := nullif(trim(coalesce(v_meta->>'last_name', v_meta->>'family_name', '')), '');
  if v_first_name is null and v_full_name <> '' then
    v_first_name := split_part(v_full_name, ' ', 1);
    v_last_name := coalesce(v_last_name, nullif(trim(substr(v_full_name, length(v_first_name) + 1)), ''));
  end if;

  -- Documento inválido → null (no debe impedir crear la cuenta)
  v_doc_type := upper(nullif(trim(v_meta->>'document_type'), ''));
  if v_doc_type is null or v_doc_type not in ('CC', 'CE', 'TI', 'PPT', 'PAS', 'NIT') then
    v_doc_type := null;
  end if;
  v_doc_number := upper(regexp_replace(coalesce(v_meta->>'document_number', ''), '[\s.]', '', 'g'));
  if v_doc_number !~ '^[A-Z0-9-]{4,20}$' then
    v_doc_number := null;
  end if;

  insert into public.profiles (
    id, first_name, last_name, phone, email, user_type,
    org_name, department, municipality, document_type, document_number
  )
  values (
    v_user.id,
    coalesce(v_first_name, ''),
    coalesce(v_last_name, ''),
    nullif(regexp_replace(coalesce(v_meta->>'phone', ''), '\D', '', 'g'), ''),
    coalesce(v_user.email, ''),
    v_type,
    v_meta->>'org_name',
    v_meta->>'department',
    v_meta->>'municipality',
    v_doc_type,
    v_doc_number
  )
  on conflict (id) do nothing;
end;
$$;

-- Un error al crear el perfil nunca debe impedir el registro: queda pendiente y se
-- completa en "Completa tu perfil" (complete_my_profile llama a ensure_profile).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  begin
    perform public.ensure_profile(new.id);
  exception when others then
    raise warning 'handle_new_user: no se pudo crear el perfil de %: %', new.id, sqlerrm;
  end;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Usuarios ya creados sin perfil (p. ej. los que entraron con Google)
select public.ensure_profile(u.id)
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);

-- Respaldo: completar el perfil también lo crea si no existe
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

  perform public.ensure_profile(v_user);

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

revoke execute on function public.ensure_profile(uuid) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.complete_my_profile(text, text, text, text, text, text, text) from public, anon;
grant execute on function public.complete_my_profile(text, text, text, text, text, text, text) to authenticated;

commit;
