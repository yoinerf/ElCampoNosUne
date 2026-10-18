-- Documento de identidad en el perfil (tipo + número).
-- Es un dato sensible: profiles solo lo ven el dueño y los admins (RLS) y la vista
-- public_profiles no lo expone.

alter table public.profiles
  add column if not exists document_type text,
  add column if not exists document_number text;

alter table public.profiles drop constraint if exists profiles_document_type_check;
alter table public.profiles add constraint profiles_document_type_check
  check (document_type is null or document_type in ('CC', 'CE', 'TI', 'PPT', 'PAS', 'NIT'));

-- Normalizado en mayúsculas, sin espacios ni puntos (el NIT puede llevar "-DV")
alter table public.profiles drop constraint if exists profiles_document_number_check;
alter table public.profiles add constraint profiles_document_number_check
  check (document_number is null or document_number ~ '^[A-Z0-9-]{4,20}$');

-- El registro público guarda el documento que llega en raw_user_meta_data.
-- Un valor inválido se descarta (null) en vez de impedir el registro; el formulario ya lo valida.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_type text := new.raw_user_meta_data->>'user_type';
  v_doc_type text := upper(nullif(trim(new.raw_user_meta_data->>'document_type'), ''));
  v_doc_number text := upper(regexp_replace(coalesce(new.raw_user_meta_data->>'document_number', ''), '[\s.]', '', 'g'));
begin
  if v_type is null or v_type not in ('comprador', 'asociacion', 'turismo') then
    v_type := 'comprador';
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
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    new.raw_user_meta_data->>'phone',
    new.email,
    v_type,
    new.raw_user_meta_data->>'org_name',
    new.raw_user_meta_data->>'department',
    new.raw_user_meta_data->>'municipality',
    v_doc_type,
    v_doc_number
  );
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
