-- The design "Country Dahlia Wedding Website" gets the same internal name as its public name (it was dahlia-village-website). Invitations keep it: they point to the template by id.
update public.templates set slug = 'country-dahlia-wedding-website', name = 'Country Dahlia Wedding Website' where slug = 'dahlia-village-website';
update public.invitations set display_title = 'Country Dahlia Wedding Website' where display_title = 'Dahlia Village Website';
