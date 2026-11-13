-- Seventh design: "CHRISTMAS PARTY" (cream paper, olive ribbon frame, a wreath on the cover; pages: cover, dinner, details, RSVP, closing). Same features as the other designs.
insert into public.templates (slug, name, description, current_version, supported_features, default_theme)
select 'christmas-party', 'Christmas Party', 'Cozy Christmas party invitation: a wreath on the cover, the dinner (date, time and place), details with dress code and presents, RSVP and a closing page.', current_version, supported_features, default_theme
from public.templates where slug = 'mono-script'
on conflict (slug) do nothing;
