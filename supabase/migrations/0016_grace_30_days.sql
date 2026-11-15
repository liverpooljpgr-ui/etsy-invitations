-- Extra time after hosting ends: 30 days (was 14), as promised in the listing and the buyer guide.
create or replace function public.publish_invitation(p_actor uuid, p_invitation uuid, p_snapshot jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare v public.invitations; v_months int; v_state public.entitlement_state;
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

create or replace function public.renew_hosting(p_actor uuid, p_invitation uuid, p_months int, p_order uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare e public.hosting_entitlements; v_base timestamptz; v_end timestamptz; v_has_pub boolean;
begin
  if not exists (select 1 from public.profiles where id = p_actor and role = 'admin') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select * into e from public.hosting_entitlements
   where invitation_id = p_invitation and state in ('active','grace','suspended','archived') for update;
  if not found then raise exception 'no renewable term'; end if;
  v_base := greatest(coalesce(e.ends_at, now()), now());
  v_end  := v_base + make_interval(months => p_months);
  update public.hosting_entitlements set state = 'active', ends_at = v_end,
    grace_ends_at = v_end + interval '30 days', archive_at = v_end + interval '90 days',
    delete_after = v_end + interval '365 days', renewal_status = 'renewed',
    reminder_30d_at = null, reminder_7d_at = null, reminder_expired_at = null,
    order_id = coalesce(p_order, order_id)
   where id = e.id;
  select published is not null into v_has_pub from public.invitation_content where invitation_id = p_invitation;
  update public.invitations set status = case when v_has_pub then 'published' else 'draft' end::public.invitation_status
   where id = p_invitation and status in ('expired','archived');
  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (p_actor,'hosting.renew','invitation',p_invitation, jsonb_build_object('months',p_months,'order',p_order));
end $$;

-- Hosting that is already running gets the longer extra time too.
update public.hosting_entitlements
   set grace_ends_at = ends_at + interval '30 days'
 where state in ('active','grace') and ends_at is not null;
