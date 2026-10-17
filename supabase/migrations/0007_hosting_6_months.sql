-- Hosting now lasts 6 months (was 12) from the first publish.
alter table public.plans alter column hosting_months set default 6;
update public.plans set hosting_months = 6;
-- Re-date hosting that already started under the old 12-month rule.
update public.hosting_entitlements
   set ends_at       = starts_at + interval '6 months',
       grace_ends_at = starts_at + interval '6 months' + interval '14 days',
       archive_at    = starts_at + interval '6 months' + interval '90 days',
       delete_after  = starts_at + interval '6 months' + interval '365 days'
 where state in ('active','grace') and starts_at is not null;
