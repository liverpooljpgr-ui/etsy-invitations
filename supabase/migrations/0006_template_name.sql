-- The only template on sale is shown to admins and customers as "FLORAL AQUARELLE" (its slug stays "sage-story" because the code refers to it).
update public.templates set name = 'FLORAL AQUARELLE', description = 'Watercolour wildflower wedding invitation: envelope, photo, venue, timeline, details, RSVP.' where slug = 'sage-story';
update public.invitations set display_title = replace(display_title, 'Sage Story', 'FLORAL AQUARELLE') where display_title like 'Sage Story%';
