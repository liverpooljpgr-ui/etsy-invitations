-- Christmas invitations (Christmas Party, Purple Vintage Christmas, Christmas Amsterdam, Christmas Paris) are hosted for 2 months from the first publish
-- (a Christmas party is over within weeks); the other designs keep their plan's months. The 30 extra days stay the same.
-- Invitations already published keep the dates they were given.
create or replace function public.publish_invitation(p_actor uuid, p_invitation uuid, p_snapshot jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare v public.invitations; v_months int; v_state public.entitlement_state; v_slug text;
begin
  select * into v from public.invitations where id = p_invitation for update;
  if not found then raise exception 'not found'; end if;
  if not (v.owner_id = p_actor or exists (select 1 from public.profiles where id = p_actor and role = 'admin')) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v.status in ('expired','archived') then raise exception 'hosting inactive' using errcode = '42501'; end if;
  select state into v_state from public.hosting_entitlements
   where invitation_id = p_invitation and state in ('pending','active','grace');
  if v_state is null then raise exception 'no hosting entitlement' using errcode = '42501'; end if;
  if v_state = 'pending' then
    select hosting_months into v_months from public.plans where code = v.plan_code;
    select slug into v_slug from public.templates where id = v.template_id;
    if v_slug in ('christmas-party', 'christmas-velvet', 'christmas-amsterdam', 'cozy-blue-city', 'christmas-paris') then v_months := 2; end if;
    update public.hosting_entitlements set state = 'active', starts_at = now(),
      ends_at = now() + make_interval(months => v_months),
      grace_ends_at = now() + make_interval(months => v_months) + interval '30 days',
      archive_at    = now() + make_interval(months => v_months) + interval '90 days',
      delete_after  = now() + make_interval(months => v_months) + interval '365 days'
     where invitation_id = p_invitation and state = 'pending';
  end if;
  update public.invitation_content set published = p_snapshot, published_at = now() where invitation_id = p_invitation;
  update public.invitations set status = 'published', published_at = coalesce(published_at, now()) where id = p_invitation;
  insert into public.audit_log (actor_id, action, entity_type, entity_id) values (p_actor, 'invitation.publish','invitation',p_invitation);
end $$;
