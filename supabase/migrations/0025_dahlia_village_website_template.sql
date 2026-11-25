-- Twelfth design: "Country Dahlia Wedding Website" (slug dahlia-village-website): a one-page wedding website of the same kind as Peach Website (envelope, a collage page with a live countdown,
-- the RSVP in a window, a details page), in pink, green and autumn orange: a village wedding with dahlias, a pink envelope, a green card with a bow, a yellow card with hearts, a teacup for the details, a mirror on a stand.
insert into public.templates (slug, name, description, current_version, supported_features, default_theme)
select 'dahlia-village-website', 'Country Dahlia Wedding Website', 'One-page wedding website for a village or garden wedding in pink, green and autumn orange: click the envelope, then a collage of cards (a green card with the date, the names, a yellow RSVP card, a teacup for the details, a mirror on a stand with a secret photo) with a live countdown, and a details page.', current_version, supported_features, default_theme
from public.templates where slug = 'peach-website'
on conflict (slug) do nothing;
update public.templates set name = 'Country Dahlia Wedding Website' where slug = 'dahlia-village-website';
