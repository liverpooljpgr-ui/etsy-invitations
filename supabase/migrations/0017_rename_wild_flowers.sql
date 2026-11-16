-- Display name of the design sage-story: "Floral Aquarelle" is now "Wild Flowers" (the slug sage-story stays).
update public.templates set name = 'Wild Flowers' where slug = 'sage-story';
