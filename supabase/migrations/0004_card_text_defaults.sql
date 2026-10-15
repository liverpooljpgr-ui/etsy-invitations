-- Card 4 now holds "you are cordially invited to our wedding"; its small line above used to say
-- "In celebration of our wedding", which repeated "wedding". New default: "with joy in our hearts".
-- Card 2 gained an editable "save the date" line (the app falls back to this default when absent).
update public.invitation_content
   set draft = jsonb_set(draft, '{texts,celebration}', to_jsonb('with joy in our hearts'::text))
 where draft #>> '{texts,celebration}' = 'In celebration of our wedding';

update public.invitation_content
   set published = jsonb_set(published, '{texts,celebration}', to_jsonb('with joy in our hearts'::text))
 where published #>> '{texts,celebration}' = 'In celebration of our wedding';
