-- The design "Cozy Blue City" is now "Christmas Amsterdam", with the same internal name (it was cozy-blue-city). Invitations keep it: they point to the template by id.
update public.templates set slug = 'christmas-amsterdam', name = 'Christmas Amsterdam' where slug = 'cozy-blue-city';
update public.invitations set display_title = 'Christmas Amsterdam' where display_title = 'Cozy Blue City';
