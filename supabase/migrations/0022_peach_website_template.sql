-- Ninth design: "Peach Website" (slug peach-website): a one-page wedding website (envelope, a collage page with a live countdown and the RSVP in a window,
-- a details page with a Back button). It uses the Sage Garden pictures until its own are added. Same wedding content and editor as the invitations.
insert into public.templates (slug, name, description, current_version, supported_features, default_theme)
select 'peach-website', 'Peach Website', 'One-page wedding website: click the envelope, then a collage of cards with a live countdown, the RSVP in a window and a details page with a Back button. Fits a laptop screen and scales down to a phone.', current_version, supported_features, default_theme
from public.templates where slug = 'sage-forest'
on conflict (slug) do nothing;
