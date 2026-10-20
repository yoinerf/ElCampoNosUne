-- Menú "Aliados": cada tienda aliada muestra la entidad aliada junto al nombre de la tienda
-- (p. ej. "Universidad de la Amazonia — Tienda Amazónica"). Se edita desde el superadmin.

begin;

alter table public.store_settings
  add column if not exists ally_name text;

alter table public.store_settings drop constraint if exists store_settings_ally_name_length;
alter table public.store_settings add constraint store_settings_ally_name_length
  check (ally_name is null or length(ally_name) <= 120);

comment on column public.store_settings.ally_name is
  'Entidad aliada dueña de la tienda (se muestra en el menú Aliados). null = solo el nombre de la tienda.';

update public.store_settings
set ally_name = 'Universidad de la Amazonia'
where store = 'amazonica' and ally_name is null;

commit;
