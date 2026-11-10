-- Live Snaps, reports, server-side saved events, ticket types and post images.
-- Manual, transactional and additive. Requires 15_organizer_accounts.sql.
-- No UPDATE/DELETE of existing events; importer, Goabase and Cron are untouched.
-- Not executed against any remote project yet. Storage buckets/policies: 18_content_storage.sql.
begin;
do $$ begin
  if to_regclass('public.organizers') is null or to_regnamespace('spots_accounts_private') is null then
    raise exception 'SQL 15 (organizer accounts) required first';
  end if;
  if to_regclass('public.live_snaps') is not null or to_regclass('public.content_reports') is not null
    or to_regclass('public.saved_events') is not null or to_regclass('public.ticket_types') is not null
    or to_regnamespace('spots_content_private') is not null
    or exists(select 1 from information_schema.columns where table_schema='public' and table_name='organizer_posts' and column_name='image_path') then
    raise exception 'Content objects already exist; inspect instead of replaying';
  end if;
end $$;

create schema spots_content_private;
revoke all on schema spots_content_private from public, anon, authenticated;
grant usage on schema spots_content_private to anon, authenticated;

-- Helpers read events/memberships without recursive RLS; they only ever answer for auth.uid().
create function spots_content_private.event_is_public(p_event uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.events e where e.id=p_event and e.is_published and e.status='scheduled'
   and (e.source<>'spots' or exists(select 1 from public.organizers o where o.id=e.organizer_id and o.is_published)))
$$;
create function spots_content_private.event_organizer(p_event uuid) returns uuid
language sql stable security definer set search_path='' as $$
 select organizer_id from public.events where id=p_event
$$;
create function spots_content_private.is_event_member(p_event uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.events e join public.organizer_memberships m on m.organizer_id=e.organizer_id
   where e.id=p_event and m.user_id=(select auth.uid()))
$$;
-- Visitors may post from one hour before the start until two hours after the end
-- (eight hours after the start when no end is known).
create function spots_content_private.snap_window_open(p_event uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.events e where e.id=p_event and e.is_published and e.status='scheduled'
   and now() >= e.starts_at - interval '1 hour'
   and now() < coalesce(e.ends_at, e.starts_at + interval '8 hours') + interval '2 hours')
$$;
revoke all on all functions in schema spots_content_private from public, anon, authenticated;
grant execute on function spots_content_private.event_is_public(uuid) to anon, authenticated;
grant execute on function spots_content_private.event_organizer(uuid), spots_content_private.is_event_member(uuid),
  spots_content_private.snap_window_open(uuid) to authenticated;

-- Live Snaps: temporary photos/short videos, visible for at most 24 hours.
create table public.live_snaps (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete cascade,
  organizer_id uuid references public.organizers(id) on delete cascade,
  author_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  by_organizer boolean not null default false,
  media_type text not null check (media_type in ('image','video')),
  storage_path text not null unique check (storage_path ~ '^[0-9a-f-]{36}/[A-Za-z0-9._-]{1,120}$'),
  caption text check (char_length(caption) <= 200),
  duration_ms integer check (duration_ms is null or duration_ms between 1 and 15000),
  moderation_status text not null default 'pending' check (moderation_status in ('pending','visible','hidden','removed')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '24 hours',
  check (event_id is not null or organizer_id is not null),
  check (expires_at > created_at and expires_at <= created_at + interval '24 hours'),
  check (media_type = 'video' or duration_ms is null)
);
create index live_snaps_event_idx on public.live_snaps(event_id, expires_at) where moderation_status = 'visible';
create index live_snaps_organizer_idx on public.live_snaps(organizer_id, expires_at) where moderation_status = 'visible';
create index live_snaps_author_idx on public.live_snaps(author_id, created_at);

-- Server-controlled fields: author, lifetime, organizer flag and initial moderation state.
-- Organizer members publish directly; visitor snaps wait for the organizer or Spots moderation.
create function spots_content_private.prepare_snap() returns trigger
language plpgsql security definer set search_path='' as $$
declare caller uuid := auth.uid();
begin
  if caller is null then raise insufficient_privilege using message = 'Sign in required'; end if;
  if (select count(*) from public.live_snaps where author_id = caller and created_at > now() - interval '1 hour') >= 20 then
    raise exception 'Snap limit reached, please try again later';
  end if;
  new.author_id := caller;
  new.created_at := now();
  new.expires_at := now() + interval '24 hours';
  if new.event_id is not null then new.organizer_id := spots_content_private.event_organizer(new.event_id); end if;
  new.by_organizer := new.organizer_id is not null and exists(
    select 1 from public.organizer_memberships m where m.organizer_id = new.organizer_id and m.user_id = caller);
  new.moderation_status := case when new.by_organizer then 'visible' else 'pending' end;
  return new;
end $$;
revoke all on function spots_content_private.prepare_snap() from public, anon, authenticated;
create trigger live_snaps_prepare before insert on public.live_snaps for each row execute function spots_content_private.prepare_snap();

alter table public.live_snaps enable row level security;
revoke all on public.live_snaps from public, anon, authenticated;
grant select on public.live_snaps to anon, authenticated;
grant insert(event_id, organizer_id, media_type, storage_path, caption, duration_ms) on public.live_snaps to authenticated;
grant update(moderation_status) on public.live_snaps to authenticated;
grant delete on public.live_snaps to authenticated;
create policy snap_public_read on public.live_snaps for select to anon, authenticated using (
  moderation_status = 'visible' and expires_at > now()
  and ((event_id is not null and spots_content_private.event_is_public(event_id))
    or (event_id is null and spots_accounts_private.is_public(organizer_id))));
create policy snap_author_read on public.live_snaps for select to authenticated using (author_id = (select auth.uid()));
create policy snap_moderator_read on public.live_snaps for select to authenticated using (
  organizer_id is not null and spots_accounts_private.is_member(organizer_id));
create policy snap_insert on public.live_snaps for insert to authenticated with check (
  split_part(storage_path, '/', 1) = (select auth.uid())::text
  and ((event_id is not null and spots_content_private.snap_window_open(event_id))
    or (event_id is null and spots_accounts_private.is_member(organizer_id))));
create policy snap_moderate on public.live_snaps for update to authenticated
  using (organizer_id is not null and spots_accounts_private.is_member(organizer_id))
  with check (organizer_id is not null and spots_accounts_private.is_member(organizer_id) and moderation_status in ('visible','hidden','removed'));
create policy snap_author_delete on public.live_snaps for delete to authenticated using (author_id = (select auth.uid()));

-- Reports for snaps and organizer posts. Three distinct reports hide a snap until reviewed.
create table public.content_reports (
  id uuid primary key default gen_random_uuid(),
  snap_id uuid references public.live_snaps(id) on delete cascade,
  post_id uuid references public.organizer_posts(id) on delete cascade,
  reporter_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  reason text not null check (reason in ('nudity','violence','harassment','privacy','spam','other')),
  details text check (char_length(details) <= 500),
  created_at timestamptz not null default now(),
  check (num_nonnulls(snap_id, post_id) = 1),
  unique (reporter_id, snap_id),
  unique (reporter_id, post_id)
);
create function spots_content_private.apply_report() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if new.snap_id is not null and (select count(*) from public.content_reports where snap_id = new.snap_id) >= 3 then
    update public.live_snaps set moderation_status = 'hidden' where id = new.snap_id and moderation_status = 'visible';
  end if;
  return null;
end $$;
revoke all on function spots_content_private.apply_report() from public, anon, authenticated;
create trigger content_reports_apply after insert on public.content_reports for each row execute function spots_content_private.apply_report();
alter table public.content_reports enable row level security;
revoke all on public.content_reports from public, anon, authenticated;
grant select on public.content_reports to authenticated;
grant insert(snap_id, post_id, reason, details) on public.content_reports to authenticated;
create policy report_own_read on public.content_reports for select to authenticated using (reporter_id = (select auth.uid()));
create policy report_insert on public.content_reports for insert to authenticated with check (reporter_id = (select auth.uid()));

-- Saved events per account. The app keeps its device list and merges it after sign-in.
create table public.saved_events (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, event_id)
);
alter table public.saved_events enable row level security;
revoke all on public.saved_events from public, anon, authenticated;
grant select, delete on public.saved_events to authenticated;
grant insert(event_id) on public.saved_events to authenticated;
create policy saved_own_read on public.saved_events for select to authenticated using (user_id = (select auth.uid()));
create policy saved_own_insert on public.saved_events for insert to authenticated with check (
  user_id = (select auth.uid()) and spots_content_private.event_is_public(event_id));
create policy saved_own_delete on public.saved_events for delete to authenticated using (user_id = (select auth.uid()));

-- Ticket categories for Spots-owned events. Information and external links only: no orders or payments.
create table public.ticket_types (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  description text check (char_length(description) <= 300),
  price_cents integer check (price_cents is null or price_cents between 0 and 1000000),
  currency text not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  capacity integer check (capacity is null or capacity > 0),
  sales_start timestamptz,
  sales_end timestamptz,
  external_url text check (external_url ~ '^https://[^[:space:]@]+$'),
  sold_out boolean not null default false,
  sort_order smallint not null default 0,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (sales_end is null or sales_start is null or sales_end > sales_start)
);
create index ticket_types_event_idx on public.ticket_types(event_id, sort_order);
create trigger ticket_types_updated_at before update on public.ticket_types for each row execute function spots_accounts_private.touch_updated_at();
alter table public.ticket_types enable row level security;
revoke all on public.ticket_types from public, anon, authenticated;
grant select on public.ticket_types to anon, authenticated;
grant insert(event_id, name, description, price_cents, currency, capacity, sales_start, sales_end, external_url, sold_out, sort_order, is_published),
      update(name, description, price_cents, currency, capacity, sales_start, sales_end, external_url, sold_out, sort_order, is_published)
  on public.ticket_types to authenticated;
grant delete on public.ticket_types to authenticated;
create policy ticket_public_read on public.ticket_types for select to anon, authenticated using (
  is_published and spots_content_private.event_is_public(event_id));
create policy ticket_member_read on public.ticket_types for select to authenticated using (spots_content_private.is_event_member(event_id));
create policy ticket_member_insert on public.ticket_types for insert to authenticated with check (spots_content_private.is_event_member(event_id));
create policy ticket_member_update on public.ticket_types for update to authenticated
  using (spots_content_private.is_event_member(event_id)) with check (spots_content_private.is_event_member(event_id));
create policy ticket_member_delete on public.ticket_types for delete to authenticated using (spots_content_private.is_event_member(event_id));

-- Permanent posts may carry one image from the organizer-media bucket.
alter table public.organizer_posts add column image_path text check (image_path ~ '^[0-9a-f-]{36}/[A-Za-z0-9._-]{1,120}$');
grant insert(image_path), update(image_path) on public.organizer_posts to authenticated;

-- Backend-only cleanup: expired snaps whose files can be removed via the Storage API.
create function spots_content_private.expired_snaps(p_limit integer default 500)
returns table(id uuid, storage_path text)
language sql stable security definer set search_path='' as $$
 select s.id, s.storage_path from public.live_snaps s where s.expires_at < now() - interval '1 hour'
 order by s.expires_at limit greatest(1, least(p_limit, 5000))
$$;
revoke all on function spots_content_private.expired_snaps(integer) from public, anon, authenticated;
do $$ begin
  if exists(select 1 from pg_roles where rolname = 'service_role') then
    grant usage on schema spots_content_private to service_role;
    grant execute on function spots_content_private.expired_snaps(integer) to service_role;
  end if;
end $$;
commit;
