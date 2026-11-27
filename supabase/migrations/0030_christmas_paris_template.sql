-- "Christmas Paris" (slug christmas-paris): a Christmas party invitation on the Christmas Amsterdam screens, in a Parisian evening:
-- a wine-red present on a lavender cover, a street of Paris shops with lamps and walkers, a Christmas market by the Eiffel Tower, the reply under the star.
insert into public.templates (slug, name, description, current_version, supported_features, default_theme)
select 'christmas-paris', 'Christmas Paris', 'Christmas party invitation: tap the present, then stroll down a Paris street in the evening, see the details at a Christmas market by the Eiffel Tower and reply under the star.', current_version, supported_features, default_theme
from public.templates where slug = 'christmas-party'
on conflict (slug) do nothing;
