-- Sixth design: "SAGE FOREST" (sage green envelope with a woodland toile lining and a stag seal; same layout family as the script designs).
insert into public.templates (slug, name, description, current_version, supported_features, default_theme)
select 'sage-forest', 'Sage Forest', 'Elegant wedding invitation with a sage green envelope lined with a woodland toile, a stag wax seal and a classic serif Save the Date: envelope, photo, venue, timeline, details, RSVP.', current_version, supported_features, default_theme
from public.templates where slug = 'mono-script'
on conflict (slug) do nothing;
