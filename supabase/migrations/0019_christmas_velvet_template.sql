-- Eighth design: "Velvet Christmas" (slug christmas-velvet): the Christmas Party layout and screens with plum and gold pictures:
-- ornament corners, a candle garland, a purple envelope with a floral lining and a gold bell seal, on neutral premium paper.
insert into public.templates (slug, name, description, current_version, supported_features, default_theme)
select 'christmas-velvet', 'Velvet Christmas', 'Elegant Christmas party invitation in plum and gold: ornament corners, a candle garland, a purple envelope with a gold bell seal; dinner, details, RSVP and closing screens.', current_version, supported_features, default_theme
from public.templates where slug = 'christmas-party'
on conflict (slug) do nothing;
