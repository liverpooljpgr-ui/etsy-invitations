-- "Cozy Blue City" (slug cozy-blue-city): a Christmas party invitation of a new kind. The cover is a wrapped present
-- (tap it: it shakes, rings, whirls and opens); then a snowy street of houses where people walk (the view slides right along it),
-- a Christmas tree with the details, and the sky with the reply. It uses the fields of the Christmas party design.
insert into public.templates (slug, name, description, current_version, supported_features, default_theme)
select 'cozy-blue-city', 'Cozy Blue City', 'Christmas party invitation: tap the present to open it, then walk along a snowy street of colourful houses, see the details by the Christmas tree and reply under the star.', current_version, supported_features, default_theme
from public.templates where slug = 'christmas-party'
on conflict (slug) do nothing;
