-- Second Mono Script colourway: "CUPID SCRIPT" (same layout, own cover picture and a gold cupid wax seal).
insert into public.templates (slug, name, description, current_version, supported_features, default_theme)
select 'cupid-script', 'CUPID SCRIPT', 'Elegant script wedding invitation with a gold cupid wax seal: envelope, photo, venue, timeline, details, RSVP.', current_version, supported_features, default_theme
from public.templates where slug = 'mono-script'
on conflict (slug) do nothing;
