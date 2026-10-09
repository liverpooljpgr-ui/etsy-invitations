-- First template: "sage-story" (vertical story cards). Code lives in templates registry.
insert into public.templates (slug, name, description, current_version, supported_features, default_theme)
values (
  'sage-story', 'Sage Story', 'Vertical story-style wedding invitation: envelope, names, photo, timeline, details, RSVP.', 1,
  '{"schedule":true,"registry":true,"dress_code":true,"qr":true,"rsvp_info":true}',
  '{"theme":"sage"}'
) on conflict (slug) do nothing;
