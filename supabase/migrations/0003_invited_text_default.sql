-- Card 2 now reads "you are cordially invited to our wedding" (and carries the arch photo).
-- Update drafts that still hold the previous default text.
update public.invitation_content
   set draft = jsonb_set(draft, '{texts,invited}', to_jsonb('you are cordially invited to our wedding'::text))
 where draft #>> '{texts,invited}' = 'You''re cordially invited';

update public.invitation_content
   set published = jsonb_set(published, '{texts,invited}', to_jsonb('you are cordially invited to our wedding'::text))
 where published #>> '{texts,invited}' = 'You''re cordially invited';
