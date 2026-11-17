-- Display name of the design white-roses (jasmin paper): "Spring Jasmin" is now "Pure Jasmin" (the slug white-roses stays).
update public.templates set name = 'Pure Jasmin' where slug = 'white-roses';
