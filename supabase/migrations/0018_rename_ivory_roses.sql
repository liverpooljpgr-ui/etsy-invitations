-- Display name of the design mono-script: "White Roses" is now "Ivory Roses" (the slug mono-script stays).
update public.templates set name = 'Ivory Roses' where slug = 'mono-script';
