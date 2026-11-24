-- Eleventh design: "Chandelier Garden Website" (slug chandelier-garden-website): a one-page wedding website of the same kind as Peach Website (envelope, a collage page with a live countdown,
-- the RSVP in a window, a details page), in sage green, dusty blue and mauve: a blue card with the date, the names card, a mauve cake-shaped RSVP card, plates for the details, a wreath mirror with a secret photo.
insert into public.templates (slug, name, description, current_version, supported_features, default_theme)
select 'chandelier-garden-website', 'Chandelier Garden Website', 'One-page wedding website in sage green, dusty blue and mauve: click the envelope, then a collage of cards (a blue card with the date, the names, a cake-shaped RSVP, plates for the details, a wreath mirror with a secret photo) with a live countdown, and a details page.', current_version, supported_features, default_theme
from public.templates where slug = 'peach-website'
on conflict (slug) do nothing;
