-- /start is the public page where buyers activate an Etsy purchase with their order number; nobody may take it as a guest-link address.
insert into public.reserved_slugs (slug) values ('start') on conflict (slug) do nothing;
