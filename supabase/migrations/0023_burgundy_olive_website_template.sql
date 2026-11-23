-- Tenth design: "Burgundy Olive Website" (slug burgundy-olive-website): a one-page wedding website of the same kind as Peach Website (envelope, a collage page with a live countdown,
-- the RSVP in a window, a details page), in burgundy and olive: a leather book with the date, the names card, a burgundy RSVP paper, a mirror with a secret photo.
insert into public.templates (slug, name, description, current_version, supported_features, default_theme)
select 'burgundy-olive-website', 'Burgundy Olive Website', 'One-page wedding website in burgundy and olive: click the envelope, then a collage of cards (a leather book with the date, the names, the RSVP, a mirror with a secret photo) with a live countdown, and a details page.', current_version, supported_features, default_theme
from public.templates where slug = 'peach-website'
on conflict (slug) do nothing;
