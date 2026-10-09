-- PixelBridge Invites — 0001 initial schema
-- Security model: RLS on every table; anon has NO direct table access.
-- Public pages read through get_public_invitation(); privileged writes go through
-- SECURITY DEFINER functions that only service_role may execute.
-- Run: supabase db reset  (local)  |  supabase db push  (remote)

-- ───────────── Types ─────────────
create type public.account_role      as enum ('customer', 'admin');
create type public.invitation_status as enum ('draft', 'published', 'expired', 'archived');
create type public.entitlement_state as enum ('pending', 'active', 'grace', 'suspended', 'archived', 'deleted');
create type public.payment_status    as enum ('pending_verification', 'verified', 'refunded', 'cancelled', 'disputed');
create type public.rsvp_attendance   as enum ('attending', 'declined', 'maybe');

-- ───────────── Helpers ─────────────
create function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end $$;

-- ───────────── profiles ─────────────
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  name        text,
  role        public.account_role not null default 'customer',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint profiles_email_lower check (email = lower(email))
);
create unique index profiles_email_key on public.profiles (email);
create trigger profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, lower(new.email), new.raw_user_meta_data ->> 'name');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin');
$$;

-- ───────────── plans (feature flags live here, not in code) ─────────────
create table public.plans (
  code               text primary key,
  name               text not null,
  list_price_cents   int  not null check (list_price_cents >= 0),  -- hypothesis, not source of truth for Etsy price
  hosting_months     int  not null default 12 check (hosting_months > 0),
  max_gallery_images int  not null default 0 check (max_gallery_images between 0 and 30),
  features           jsonb not null,
  is_active          boolean not null default true
);
insert into public.plans (code, name, list_price_cents, max_gallery_images, features) values
 ('essential','Essential',2400,0,
  '{"gallery":false,"schedule":false,"countdown":false,"map_card":false,"dress_code":false,"registry":false,"qr":false,"rsvp":false}'),
 ('signature','Signature',3900,12,
  '{"gallery":true,"schedule":true,"countdown":true,"map_card":true,"dress_code":true,"registry":true,"qr":true,"rsvp":false}'),
 ('signature_rsvp','Signature RSVP',5900,12,
  '{"gallery":true,"schedule":true,"countdown":true,"map_card":true,"dress_code":true,"registry":true,"qr":true,"rsvp":true}'),
 -- ASSUMPTION: Personalized Setup feature set is undecided; defaults to Signature (no RSVP). Confirm.
 ('personalized_setup','Personalized Setup',8900,12,
  '{"gallery":true,"schedule":true,"countdown":true,"map_card":true,"dress_code":true,"registry":true,"qr":true,"rsvp":false}');

-- ───────────── templates ─────────────
create table public.templates (
  id                 uuid primary key default gen_random_uuid(),
  slug               text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name               text not null,
  description        text,
  current_version    int  not null default 1 check (current_version > 0),
  supported_features jsonb not null default '{}',
  default_theme      jsonb not null default '{}',
  default_content    jsonb not null default '{}',
  preview_images     jsonb not null default '[]',
  is_active          boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create trigger templates_updated before update on public.templates
  for each row execute function public.set_updated_at();
-- Template CODE lives in the app registry keyed "<slug>@<version>"; rows here are metadata only.

-- ───────────── orders ─────────────
create table public.orders (
  id                uuid primary key default gen_random_uuid(),
  customer_id       uuid references public.profiles(id) on delete set null,   -- null until claimed
  etsy_order_ref    text,                       -- receipt/order id typed by admin after manual verification
  plan_code         text not null references public.plans(code),
  product_title     text,
  buyer_note        text,                       -- minimal: Etsy username or similar; no payment data ever
  payment_status    public.payment_status not null default 'pending_verification',
  refund_status     text not null default 'none' check (refund_status in ('none','requested','partial','full')),
  purchased_at      timestamptz,
  verified_by       uuid references public.profiles(id),
  verified_at       timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create unique index orders_etsy_ref_key on public.orders (etsy_order_ref) where etsy_order_ref is not null;
create index orders_customer_idx on public.orders (customer_id);
create trigger orders_updated before update on public.orders
  for each row execute function public.set_updated_at();

-- ───────────── invitations ─────────────
create table public.reserved_slugs (slug text primary key);
insert into public.reserved_slugs values
 ('admin'),('api'),('app'),('auth'),('claim'),('dashboard'),('demo'),('editor'),('help'),('login'),
 ('logout'),('preview'),('privacy'),('terms'),('static'),('_next'),('robots.txt'),('sitemap.xml'),
 ('favicon.ico'),('www'),('support'),('report'),('pixelbridge');

create table public.invitations (
  id                 uuid primary key default gen_random_uuid(),
  owner_id           uuid references public.profiles(id) on delete set null,  -- null until claimed
  order_id           uuid references public.orders(id) on delete set null,
  template_id        uuid not null references public.templates(id),
  template_version   int  not null check (template_version > 0),               -- pinned; upgrades are explicit
  plan_code          text not null references public.plans(code),
  slug               text not null unique
                     check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 3 and 40),
  display_title      text not null default '',     -- e.g. "Emma & James"; for admin search only
  status             public.invitation_status not null default 'draft',
  event_type         text not null default 'wedding'
                     check (event_type in ('wedding','engagement','bridal_shower','baby_shower','birthday','anniversary','graduation','other')),
  event_starts_at    timestamptz,
  time_zone          text,                          -- IANA name, validated in app
  published_at       timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index invitations_owner_idx  on public.invitations (owner_id);
create index invitations_status_idx on public.invitations (status);
create index invitations_title_idx  on public.invitations (lower(display_title));
create trigger invitations_updated before update on public.invitations
  for each row execute function public.set_updated_at();

create function public.guard_slug() returns trigger
language plpgsql set search_path = '' as $$
begin
  if exists (select 1 from public.reserved_slugs r where r.slug = new.slug) then
    raise exception 'slug is reserved' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger invitations_slug_guard before insert or update of slug on public.invitations
  for each row execute function public.guard_slug();

create function public.owns_invitation(p_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.invitations where id = p_id and owner_id = (select auth.uid()));
$$;

-- ───────────── content (draft vs published snapshot) ─────────────
create table public.invitation_content (
  invitation_id  uuid primary key references public.invitations(id) on delete cascade,
  draft          jsonb not null,
  draft_version  int   not null default 1,         -- optimistic concurrency for autosave
  published      jsonb,                            -- validated + plan-stripped snapshot; the ONLY thing the public sees
  published_at   timestamptz,
  updated_at     timestamptz not null default now(),
  constraint draft_size  check (octet_length(draft::text) <= 65536),
  constraint pub_size    check (published is null or octet_length(published::text) <= 65536)
);
create trigger content_updated before update on public.invitation_content
  for each row execute function public.set_updated_at();

create table public.invitation_revisions (
  id            uuid primary key default gen_random_uuid(),
  invitation_id uuid not null references public.invitations(id) on delete cascade,
  kind          text not null check (kind in ('draft','published')),
  content       jsonb not null,
  created_at    timestamptz not null default now()
);
create index revisions_inv_idx on public.invitation_revisions (invitation_id, created_at desc);

create function public.content_before_update() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_status public.invitation_status;
begin
  select status into v_status from public.invitations where id = new.invitation_id;
  if v_status in ('expired','archived') then
    raise exception 'invitation is not editable' using errcode = '42501';
  end if;
  if new.draft is distinct from old.draft then
    new.draft_version := old.draft_version + 1;
    -- throttle: keep a draft revision at most every 10 minutes (recovery from accidental edits)
    if not exists (select 1 from public.invitation_revisions
                   where invitation_id = new.invitation_id and kind = 'draft'
                     and created_at > now() - interval '10 minutes') then
      insert into public.invitation_revisions (invitation_id, kind, content)
      values (new.invitation_id, 'draft', old.draft);
    end if;
  end if;
  if old.published is not null and new.published is distinct from old.published then
    insert into public.invitation_revisions (invitation_id, kind, content)
    values (new.invitation_id, 'published', old.published);
  end if;
  return new;
end $$;
create trigger content_guard before update on public.invitation_content
  for each row execute function public.content_before_update();

-- ───────────── media ─────────────
create table public.invitation_media (
  id             uuid primary key default gen_random_uuid(),
  invitation_id  uuid not null references public.invitations(id) on delete cascade,
  storage_path   text not null unique,              -- "<invitation_id>/<uuid>.webp"
  media_type     text not null default 'image' check (media_type in ('image')),
  mime_type      text not null check (mime_type in ('image/jpeg','image/png','image/webp')),
  file_size      int  not null check (file_size between 1 and 5242880),
  width          int,
  height         int,
  alt_text       text not null default '' check (char_length(alt_text) <= 300),
  display_order  int  not null default 0,
  uploaded_at    timestamptz not null default now(),
  constraint media_path_prefix check (storage_path like invitation_id::text || '/%')
);
create index media_inv_idx on public.invitation_media (invitation_id, display_order);

create function public.media_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.invitation_media where invitation_id = new.invitation_id) >= 40 then
    raise exception 'media limit reached' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger media_limit_check before insert on public.invitation_media
  for each row execute function public.media_limit();

-- ───────────── hosting entitlements ─────────────
create table public.hosting_entitlements (
  id                uuid primary key default gen_random_uuid(),
  invitation_id     uuid not null references public.invitations(id) on delete cascade,
  order_id          uuid references public.orders(id) on delete set null,
  state             public.entitlement_state not null default 'pending',
  starts_at         timestamptz,                    -- set on first publish
  ends_at           timestamptz,
  grace_ends_at     timestamptz,                    -- ends_at + 14d  (page still visible, banner shown)
  archive_at        timestamptz,                    -- ends_at + 90d  (page hidden, data kept, owner can still renew/export)
  delete_after      timestamptz,                    -- ends_at + 365d (needs admin confirmation; see lifecycle doc)
  renewal_status    text not null default 'none' check (renewal_status in ('none','offered','renewed','declined')),
  reminder_30d_at   timestamptz,
  reminder_7d_at    timestamptz,
  reminder_expired_at timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint ent_dates check (ends_at is null or starts_at is null or ends_at > starts_at)
);
-- at most one live term per invitation
create unique index ent_one_live on public.hosting_entitlements (invitation_id)
  where state in ('pending','active','grace','suspended','archived');
create index ent_due_idx on public.hosting_entitlements (state, ends_at);
create trigger ent_updated before update on public.hosting_entitlements
  for each row execute function public.set_updated_at();

-- ───────────── edit-access claim tokens (fulfillment) ─────────────
create table public.edit_claims (
  id             uuid primary key default gen_random_uuid(),
  invitation_id  uuid not null references public.invitations(id) on delete cascade,
  token_hash     bytea not null unique,             -- sha256(token); raw token shown once to admin, never stored
  expires_at     timestamptz not null,
  redeemed_at    timestamptz,
  redeemed_by    uuid references public.profiles(id),
  revoked_at     timestamptz,
  created_by     uuid references public.profiles(id),
  created_at     timestamptz not null default now()
);
create index claims_inv_idx on public.edit_claims (invitation_id);

-- ───────────── RSVPs ─────────────
create table public.rsvp_responses (
  id               uuid primary key default gen_random_uuid(),
  invitation_id    uuid not null references public.invitations(id) on delete cascade,
  idempotency_key  uuid not null,                   -- client-generated; makes retries/double-taps safe
  guest_name       text not null check (char_length(guest_name) between 1 and 120),
  guest_contact    text check (guest_contact is null or char_length(guest_contact) <= 160),  -- optional; only if host enables
  attendance       public.rsvp_attendance not null,
  attendee_count   int  not null check (attendee_count between 0 and 20),
  dietary          text check (dietary is null or char_length(dietary) <= 300),
  message          text check (message is null or char_length(message) <= 1000),
  submitted_at     timestamptz not null default now(),
  constraint rsvp_count_matches check (
    (attendance = 'declined' and attendee_count = 0) or (attendance <> 'declined' and attendee_count >= 1)),
  unique (invitation_id, idempotency_key)
);
create index rsvp_inv_idx on public.rsvp_responses (invitation_id, submitted_at desc);

-- ───────────── rate limiting, audit, abuse ─────────────
create table public.rate_limits (
  key           text not null,                      -- e.g. "rsvp:<invitation>:<hmac(ip)>"
  window_start  timestamptz not null,
  hits          int not null default 1,
  primary key (key, window_start)
);

create function public.hit_rate_limit(p_key text, p_window_seconds int, p_max int) returns boolean
language plpgsql security definer set search_path = '' as $$
declare v_start timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
        v_hits int;
begin
  insert into public.rate_limits as r (key, window_start) values (p_key, v_start)
  on conflict (key, window_start) do update set hits = r.hits + 1
  returning r.hits into v_hits;
  return v_hits <= p_max;                           -- false => block
end $$;

create table public.audit_log (
  id           bigint generated always as identity primary key,
  actor_id     uuid references public.profiles(id) on delete set null,
  action       text not null,                       -- e.g. 'order.verify', 'invitation.suspend', 'claim.issue'
  entity_type  text not null,
  entity_id    uuid,
  metadata     jsonb not null default '{}',
  created_at   timestamptz not null default now()
);
create index audit_entity_idx on public.audit_log (entity_type, entity_id, created_at desc);

create table public.abuse_reports (
  id             uuid primary key default gen_random_uuid(),
  invitation_id  uuid references public.invitations(id) on delete set null,
  reporter_email text check (reporter_email is null or char_length(reporter_email) <= 254),
  reason         text not null check (char_length(reason) between 5 and 2000),
  status         text not null default 'open' check (status in ('open','actioned','dismissed')),
  created_at     timestamptz not null default now()
);

-- ───────────── Privileged functions (service_role only) ─────────────

-- Public read path. Only function anon may call. Returns published snapshot only.
create function public.get_public_invitation(p_slug text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare r record;
begin
  select i.id, i.status, i.event_starts_at, i.time_zone, i.display_title, i.template_version,
         t.slug as template_slug, p.features, c.published, h.state, h.ends_at
    into r
    from public.invitations i
    join public.templates t on t.id = i.template_id
    join public.plans p on p.code = i.plan_code
    left join public.invitation_content c on c.invitation_id = i.id
    left join public.hosting_entitlements h on h.invitation_id = i.id
         and h.state in ('pending','active','grace','suspended','archived')
   where i.slug = lower(p_slug);
  if not found then return null; end if;
  if r.status = 'published' and r.published is not null and r.state in ('active','grace') then
    return jsonb_build_object('status','published','template',r.template_slug,'template_version',r.template_version,
      'title',r.display_title,'event_starts_at',r.event_starts_at,'time_zone',r.time_zone,
      'features',r.features,'content',r.published,'hosting_grace', r.state = 'grace');
  end if;
  return jsonb_build_object('status', case when r.status = 'draft' then 'unavailable' else r.status::text end);
end $$;

-- Publish: caller (Next.js server action) has already Zod-validated and plan-stripped p_snapshot.
create function public.publish_invitation(p_actor uuid, p_invitation uuid, p_snapshot jsonb) returns void
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
      grace_ends_at = now() + make_interval(months => v_months) + interval '14 days',
      archive_at    = now() + make_interval(months => v_months) + interval '90 days',
      delete_after  = now() + make_interval(months => v_months) + interval '365 days'
     where invitation_id = p_invitation and state = 'pending';
  end if;
  update public.invitation_content set published = p_snapshot, published_at = now() where invitation_id = p_invitation;
  update public.invitations set status = 'published', published_at = coalesce(published_at, now()) where id = p_invitation;
  insert into public.audit_log (actor_id, action, entity_type, entity_id) values (p_actor, 'invitation.publish','invitation',p_invitation);
end $$;

create function public.unpublish_invitation(p_actor uuid, p_invitation uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v public.invitations;
begin
  select * into v from public.invitations where id = p_invitation for update;
  if not found then raise exception 'not found'; end if;
  if not (v.owner_id = p_actor or exists (select 1 from public.profiles where id = p_actor and role = 'admin')) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update public.invitation_content set published = null where invitation_id = p_invitation;  -- old snapshot kept in revisions
  update public.invitations set status = 'draft' where id = p_invitation and status = 'published';
  insert into public.audit_log (actor_id, action, entity_type, entity_id) values (p_actor, 'invitation.unpublish','invitation',p_invitation);
end $$;

-- Claim: server hashes the raw token (sha256) and passes the hash.
create function public.redeem_claim(p_user uuid, p_token_hash bytea) returns uuid
language plpgsql security definer set search_path = '' as $$
declare c public.edit_claims;
begin
  select * into c from public.edit_claims where token_hash = p_token_hash for update;
  if not found or c.redeemed_at is not null or c.revoked_at is not null or c.expires_at < now() then
    raise exception 'invalid or expired claim' using errcode = '42501';
  end if;
  update public.edit_claims set redeemed_at = now(), redeemed_by = p_user where id = c.id;
  update public.invitations set owner_id = p_user where id = c.invitation_id and owner_id is null;
  update public.orders set customer_id = p_user where id = (select order_id from public.invitations where id = c.invitation_id) and customer_id is null;
  insert into public.audit_log (actor_id, action, entity_type, entity_id) values (p_user,'claim.redeem','invitation',c.invitation_id);
  return c.invitation_id;
end $$;

-- RSVP: caller has already verified Turnstile + rate limit.
create function public.submit_rsvp(p_slug text, p_idem uuid, p_name text, p_contact text,
  p_attendance public.rsvp_attendance, p_count int, p_dietary text, p_message text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare r record; v_id uuid; v_max int;
begin
  select i.id, i.status, c.published, p.features, h.state into r
    from public.invitations i
    join public.plans p on p.code = i.plan_code
    join public.invitation_content c on c.invitation_id = i.id
    left join public.hosting_entitlements h on h.invitation_id = i.id and h.state in ('active','grace')
   where i.slug = lower(p_slug);
  if not found or r.status <> 'published' or r.state is null
     or (r.features ->> 'rsvp') is distinct from 'true'
     or (r.published -> 'rsvp' ->> 'enabled') is distinct from 'true' then
    return jsonb_build_object('ok', false, 'error', 'rsvp_unavailable');
  end if;
  v_max := coalesce((r.published -> 'rsvp' ->> 'max_party')::int, 10);
  if p_count > v_max then return jsonb_build_object('ok', false, 'error', 'party_too_large'); end if;
  insert into public.rsvp_responses (invitation_id, idempotency_key, guest_name, guest_contact, attendance, attendee_count, dietary, message)
  values (r.id, p_idem, p_name, nullif(p_contact,''), p_attendance, p_count, nullif(p_dietary,''), nullif(p_message,''))
  on conflict (invitation_id, idempotency_key) do nothing
  returning id into v_id;
  return jsonb_build_object('ok', true, 'duplicate', v_id is null);
end $$;

-- Renewal (manual until payments are automated)
create function public.renew_hosting(p_actor uuid, p_invitation uuid, p_months int, p_order uuid) returns void
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
    grace_ends_at = v_end + interval '14 days', archive_at = v_end + interval '90 days',
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

-- Scheduled (Vercel Cron -> route handler -> service_role). Never deletes data.
create function public.advance_hosting_lifecycle() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare n_grace int; n_susp int; n_arch int;
begin
  update public.hosting_entitlements set state = 'grace' where state = 'active' and ends_at <= now();
  get diagnostics n_grace = row_count;
  update public.hosting_entitlements set state = 'suspended' where state = 'grace' and grace_ends_at <= now();
  get diagnostics n_susp = row_count;
  update public.invitations i set status = 'expired'
    from public.hosting_entitlements h
   where h.invitation_id = i.id and h.state = 'suspended' and i.status in ('draft','published');
  update public.hosting_entitlements set state = 'archived' where state = 'suspended' and archive_at <= now();
  get diagnostics n_arch = row_count;
  update public.invitations i set status = 'archived'
    from public.hosting_entitlements h
   where h.invitation_id = i.id and h.state = 'archived' and i.status <> 'archived';
  return jsonb_build_object('grace', n_grace, 'suspended', n_susp, 'archived', n_arch);
end $$;

-- ───────────── Grants ─────────────
revoke all on all tables    in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;
alter default privileges in schema public revoke all on tables    from anon, authenticated;
alter default privileges in schema public revoke all on functions from public, anon, authenticated;

grant select on public.plans, public.templates to anon, authenticated;
grant select on public.profiles, public.orders, public.invitations, public.invitation_content,
                public.invitation_revisions, public.invitation_media, public.hosting_entitlements,
                public.rsvp_responses, public.audit_log, public.abuse_reports to authenticated;
grant update (name)            on public.profiles           to authenticated;   -- role is NOT updatable
grant update (draft)           on public.invitation_content to authenticated;   -- published is NOT updatable
grant insert, update (alt_text, display_order), delete on public.invitation_media to authenticated;
grant delete on public.rsvp_responses to authenticated;                         -- hosts may delete guest data

grant execute on function public.get_public_invitation(text) to anon, authenticated;
grant execute on function public.is_admin(), public.owns_invitation(uuid) to authenticated;
-- service_role bypasses grants but is explicit here for clarity of intent:
grant execute on function public.publish_invitation(uuid,uuid,jsonb), public.unpublish_invitation(uuid,uuid),
  public.redeem_claim(uuid,bytea),
  public.submit_rsvp(text,uuid,text,text,public.rsvp_attendance,int,text,text),
  public.renew_hosting(uuid,uuid,int,uuid), public.advance_hosting_lifecycle(),
  public.hit_rate_limit(text,int,int) to service_role;

-- ───────────── Row Level Security ─────────────
alter table public.profiles             enable row level security;
alter table public.plans                enable row level security;
alter table public.templates            enable row level security;
alter table public.orders               enable row level security;
alter table public.reserved_slugs       enable row level security;
alter table public.invitations          enable row level security;
alter table public.invitation_content   enable row level security;
alter table public.invitation_revisions enable row level security;
alter table public.invitation_media     enable row level security;
alter table public.hosting_entitlements enable row level security;
alter table public.edit_claims          enable row level security;   -- no policies: service_role only
alter table public.rsvp_responses       enable row level security;
alter table public.rate_limits          enable row level security;   -- no policies: service_role only
alter table public.audit_log            enable row level security;
alter table public.abuse_reports        enable row level security;

create policy plans_read     on public.plans     for select to anon, authenticated using (is_active);
create policy templates_read on public.templates for select to anon, authenticated using (is_active);

create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.is_admin());
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy orders_select on public.orders for select to authenticated
  using (customer_id = (select auth.uid()) or public.is_admin());

create policy inv_select on public.invitations for select to authenticated
  using (owner_id = (select auth.uid()) or public.is_admin());

create policy content_select on public.invitation_content for select to authenticated
  using (public.owns_invitation(invitation_id) or public.is_admin());
create policy content_update on public.invitation_content for update to authenticated
  using (public.owns_invitation(invitation_id)) with check (public.owns_invitation(invitation_id));

create policy rev_select on public.invitation_revisions for select to authenticated
  using (public.owns_invitation(invitation_id) or public.is_admin());

create policy media_select on public.invitation_media for select to authenticated
  using (public.owns_invitation(invitation_id) or public.is_admin());
create policy media_insert on public.invitation_media for insert to authenticated
  with check (public.owns_invitation(invitation_id));
create policy media_update on public.invitation_media for update to authenticated
  using (public.owns_invitation(invitation_id)) with check (public.owns_invitation(invitation_id));
create policy media_delete on public.invitation_media for delete to authenticated
  using (public.owns_invitation(invitation_id));

create policy ent_select on public.hosting_entitlements for select to authenticated
  using (public.owns_invitation(invitation_id) or public.is_admin());

create policy rsvp_select on public.rsvp_responses for select to authenticated
  using (public.owns_invitation(invitation_id) or public.is_admin());
create policy rsvp_delete on public.rsvp_responses for delete to authenticated
  using (public.owns_invitation(invitation_id));

create policy audit_admin on public.audit_log     for select to authenticated using (public.is_admin());
create policy abuse_admin on public.abuse_reports for select to authenticated using (public.is_admin());

-- ───────────── Storage ─────────────
-- Public-read bucket with unguessable paths; writes restricted to the invitation owner's folder.
-- Server re-encodes uploads (strips EXIF/GPS, caps dimensions) — see docs.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('invitation-media', 'invitation-media', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy media_obj_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'invitation-media' and public.owns_invitation(((storage.foldername(name))[1])::uuid));
create policy media_obj_update on storage.objects for update to authenticated
  using (bucket_id = 'invitation-media' and public.owns_invitation(((storage.foldername(name))[1])::uuid));
create policy media_obj_delete on storage.objects for delete to authenticated
  using (bucket_id = 'invitation-media' and public.owns_invitation(((storage.foldername(name))[1])::uuid));
