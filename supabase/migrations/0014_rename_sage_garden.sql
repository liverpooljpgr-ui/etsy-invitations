-- Display name of the sixth design: "Sage Forest" is now "Sage Garden" (the slug sage-forest stays).
update public.templates set name = 'Sage Garden' where slug = 'sage-forest';
