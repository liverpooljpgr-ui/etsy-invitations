-- Display names: the former "White Roses" (slug white-roses, jasmin paper) is now "Spring Jasmin"; the former "Mono Script" (slug mono-script, white roses on the cover) is now "White Roses". Slugs stay the same.
update public.templates set name = 'Spring Jasmin' where slug = 'white-roses';
update public.templates set name = 'White Roses' where slug = 'mono-script';
update public.templates set name = 'Cupid Trumpets' where slug = 'cupid-script';
update public.templates set name = 'Lilac Blossom' where slug = 'lilac-script';
