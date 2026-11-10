-- Manual test-project extension, nfomkdvotqtlyymomksb only in this phase.
-- Transactional and additive. No UPDATE/DELETE of existing events; no Goabase/Cron changes.
begin;
do $$ begin
  if to_regclass('public.events') is null or to_regclass('auth.users') is null then
    raise exception 'Existing events/Auth schema required';
  end if;
  if to_regclass('public.organizers') is not null or to_regclass('public.user_profiles') is not null
    or to_regclass('public.organizer_memberships') is not null or to_regclass('public.organizer_posts') is not null
    or to_regnamespace('spots_accounts_private') is not null
    or exists(select 1 from information_schema.columns where table_schema='public' and table_name='events' and column_name='organizer_id') then
    raise exception 'Account objects already exist; inspect instead of replaying';
  end if;
  if exists(select 1 from public.events where source='spots') then
    raise exception 'Existing Spots-owned events need separate ownership review';
  end if;
  if not (select relrowsecurity from pg_class where oid='public.events'::regclass) then
    raise exception 'Event RLS must already be enabled';
  end if;
  if has_table_privilege('authenticated','public.events','INSERT,UPDATE,DELETE') then
    raise exception 'Pre-existing event write rights need separate review';
  end if;
end $$;

create schema spots_accounts_private;
revoke all on schema spots_accounts_private from public, anon, authenticated;
grant usage on schema spots_accounts_private to anon, authenticated;

create table public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check(char_length(display_name)<=80),
  created_at timestamptz not null default now()
);
create table public.organizers (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check(slug ~ '^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$'),
  display_name text not null check(char_length(btrim(display_name)) between 1 and 120),
  biography text check(char_length(biography)<=5000),
  city text check(char_length(city)<=120),
  avatar_url text check(avatar_url ~ '^https://[^[:space:]@]+$'),
  website_url text check(website_url ~ '^https://[^[:space:]@]+$'),
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.organizer_memberships (
  organizer_id uuid not null references public.organizers(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete restrict,
  role text not null check(role in ('owner','editor')),
  created_at timestamptz not null default now(),
  primary key(organizer_id,user_id)
);
create index organizer_memberships_user_idx on public.organizer_memberships(user_id,organizer_id);
create table public.organizer_posts (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references public.organizers(id) on delete restrict,
  body text not null check(char_length(btrim(body)) between 1 and 5000),
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index organizer_posts_organizer_idx on public.organizer_posts(organizer_id,created_at);

alter table public.events add column organizer_id uuid references public.organizers(id) on delete restrict;
alter table public.events add constraint events_organizer_origin check (
  (source='spots' and organizer_id is not null and source_event_id is null)
  or (source<>'spots' and organizer_id is null)
);
alter table public.events add constraint events_spots_content check (source<>'spots' or (
  char_length(btrim(title)) between 1 and 200 and status in ('scheduled','cancelled','postponed')
  and (not is_published or status='scheduled')
  and (ends_at is null or ends_at>starts_at)
  and ((latitude is null and longitude is null) or
       (latitude is not null and longitude is not null and latitude between -90 and 90 and longitude between -180 and 180))
));
create index events_organizer_idx on public.events(organizer_id,starts_at) where organizer_id is not null;

create function spots_accounts_private.is_member(p_organizer_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.organizer_memberships where organizer_id=p_organizer_id and user_id=(select auth.uid()))
$$;
create function spots_accounts_private.is_owner(p_organizer_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.organizer_memberships where organizer_id=p_organizer_id and user_id=(select auth.uid()) and role='owner')
$$;
create function spots_accounts_private.is_public(p_organizer_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.organizers where id=p_organizer_id and is_published)
$$;
revoke all on all functions in schema spots_accounts_private from public,anon,authenticated;
grant execute on function spots_accounts_private.is_member(uuid),spots_accounts_private.is_public(uuid) to anon,authenticated;
grant execute on function spots_accounts_private.is_owner(uuid) to authenticated;

create function spots_accounts_private.touch_updated_at() returns trigger
language plpgsql set search_path='' as $$ begin new.updated_at=now();return new;end $$;
revoke all on function spots_accounts_private.touch_updated_at() from public,anon,authenticated;
create trigger organizers_updated_at before update on public.organizers for each row execute function spots_accounts_private.touch_updated_at();
create trigger organizer_posts_updated_at before update on public.organizer_posts for each row execute function spots_accounts_private.touch_updated_at();

alter table public.user_profiles enable row level security;
alter table public.organizers enable row level security;
alter table public.organizer_memberships enable row level security;
alter table public.organizer_posts enable row level security;
revoke all on public.user_profiles,public.organizers,public.organizer_memberships,public.organizer_posts from public,anon,authenticated;
grant select on public.user_profiles to authenticated;
grant insert(id,display_name),update(display_name) on public.user_profiles to authenticated;
grant select on public.organizers,public.organizer_posts to anon,authenticated;
grant update(slug,display_name,biography,city,avatar_url,website_url,is_published) on public.organizers to authenticated;
grant select on public.organizer_memberships to authenticated;
grant insert(organizer_id,body,is_published),update(body,is_published) on public.organizer_posts to authenticated;
create policy profile_owner_read on public.user_profiles for select to authenticated using(id=(select auth.uid()));
create policy profile_owner_insert on public.user_profiles for insert to authenticated with check(id=(select auth.uid()));
create policy profile_owner_update on public.user_profiles for update to authenticated using(id=(select auth.uid())) with check(id=(select auth.uid()));
create policy organizer_read on public.organizers for select to anon,authenticated using(is_published or spots_accounts_private.is_member(id));
create policy organizer_edit on public.organizers for update to authenticated using(spots_accounts_private.is_member(id)) with check(spots_accounts_private.is_member(id));
create policy membership_read on public.organizer_memberships for select to authenticated using(user_id=(select auth.uid()) or spots_accounts_private.is_owner(organizer_id));
create policy organizer_post_read on public.organizer_posts for select to anon,authenticated using(
  (is_published and spots_accounts_private.is_public(organizer_id)) or spots_accounts_private.is_member(organizer_id));
create policy organizer_post_insert on public.organizer_posts for insert to authenticated with check(spots_accounts_private.is_member(organizer_id));
create policy organizer_post_edit on public.organizer_posts for update to authenticated using(spots_accounts_private.is_member(organizer_id)) with check(spots_accounts_private.is_member(organizer_id));

-- Preserve existing public read policy; add member drafts plus an independent Spots-only publication gate.
create policy spots_event_member_read on public.events for select to authenticated using(source='spots' and spots_accounts_private.is_member(organizer_id));
create policy spots_event_public_gate on public.events as restrictive for select to anon,authenticated
  using(source<>'spots' or spots_accounts_private.is_member(organizer_id) or spots_accounts_private.is_public(organizer_id));
grant insert(title,description,genre,category,venue_name,city,latitude,longitude,starts_at,ends_at,image_url,ticket_url,source,organizer_id,status,is_published),
      update(title,description,genre,category,venue_name,city,latitude,longitude,starts_at,ends_at,image_url,ticket_url,status,is_published)
  on public.events to authenticated;
create policy spots_event_insert on public.events for insert to authenticated with check(source='spots' and spots_accounts_private.is_member(organizer_id) and (not is_published or spots_accounts_private.is_public(organizer_id)));
create policy spots_event_edit on public.events for update to authenticated using(source='spots' and spots_accounts_private.is_member(organizer_id)) with check(source='spots' and spots_accounts_private.is_member(organizer_id) and (not is_published or spots_accounts_private.is_public(organizer_id)));

create function public.create_organizer(p_slug text,p_display_name text) returns uuid
language plpgsql security definer set search_path='' as $$
declare result uuid; caller uuid := auth.uid();
begin
 if caller is null then raise insufficient_privilege using message='Sign in required';end if;
 insert into public.organizers(slug,display_name) values(p_slug,p_display_name) returning id into result;
 insert into public.organizer_memberships(organizer_id,user_id,role) values(result,caller,'owner');
 return result;
end $$;
create function public.save_private_profile(p_display_name text) returns public.user_profiles
language sql security invoker set search_path='' as $$
 insert into public.user_profiles(id,display_name) values(auth.uid(),p_display_name)
 on conflict(id) do update set display_name=excluded.display_name returning *
$$;
create function public.set_organizer_editor(p_organizer_id uuid,p_user_id uuid,p_enabled boolean) returns void
language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.organizers where id=p_organizer_id for update;
 if not spots_accounts_private.is_owner(p_organizer_id) then raise insufficient_privilege using message='Owner required';end if;
 if exists(select 1 from public.organizer_memberships where organizer_id=p_organizer_id and user_id=p_user_id and role='owner') then
   raise exception 'Ownership transfer is not supported';
 end if;
 if p_enabled is null then raise exception 'Explicit membership action required';end if;
 if p_enabled then
   insert into public.organizer_memberships(organizer_id,user_id,role) values(p_organizer_id,p_user_id,'editor') on conflict(organizer_id,user_id) do nothing;
 else
   delete from public.organizer_memberships where organizer_id=p_organizer_id and user_id=p_user_id and role='editor';
 end if;
end $$;
revoke all on function public.create_organizer(text,text),public.set_organizer_editor(uuid,uuid,boolean),public.save_private_profile(text) from public,anon,authenticated;
grant execute on function public.create_organizer(text,text),public.set_organizer_editor(uuid,uuid,boolean),public.save_private_profile(text) to authenticated;
commit;
