-- Display name of the design christmas-velvet: "Velvet Christmas" is now "Purple Vintage Christmas" (the slug christmas-velvet stays).
update public.templates set name = 'Purple Vintage Christmas' where slug = 'christmas-velvet';
