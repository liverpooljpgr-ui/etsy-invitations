-- Third script colourway: "LILAC SCRIPT" (Cupid Script layout with lilac flowers on lilac paper).
insert into public.templates (slug, name, description, current_version, supported_features, default_theme)
select 'lilac-script', 'LILAC SCRIPT', 'Elegant script wedding invitation with lilac flowers and a gold wax seal: envelope, photo, venue, timeline, details, RSVP.', current_version, supported_features, default_theme
from public.templates where slug = 'mono-script'
on conflict (slug) do nothing;
