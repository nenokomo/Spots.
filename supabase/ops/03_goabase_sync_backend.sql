-- DRAFT: run ONLY in an isolated test project first. Not an automatic migration.
-- Requires the existing UNIQUE(source, source_event_id). No events are deleted.
begin;
create schema if not exists spots_sync_private;
revoke all on schema spots_sync_private from public, anon, authenticated;

create table if not exists spots_sync_private.goabase_lease (
  singleton boolean primary key default true check (singleton),
  token uuid,
  expires_at timestamptz not null default '-infinity'
);
insert into spots_sync_private.goabase_lease(singleton) values(true) on conflict do nothing;
create table if not exists spots_sync_private.goabase_versions (
  source_event_id text primary key,
  modified_at timestamptz not null,
  payload jsonb not null
);
alter table spots_sync_private.goabase_lease enable row level security;
alter table spots_sync_private.goabase_versions enable row level security;
revoke all on all tables in schema spots_sync_private from public, anon, authenticated, service_role;

create or replace function public.spots_goabase_begin() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  acquired uuid;
  known_ids jsonb;
begin
  update spots_sync_private.goabase_lease
    set token = gen_random_uuid(), expires_at = clock_timestamp() + interval '120 seconds'
    where singleton and expires_at <= clock_timestamp()
    returning token into acquired;
  if acquired is null then return null; end if;
  select coalesce(jsonb_agg(source_event_id order by source_event_id), '[]'::jsonb)
    into known_ids from public.events where source = 'goabase';
  if jsonb_array_length(known_ids) > 5000 then
    raise exception 'Goabase inventory capacity exceeded';
  end if;
  return jsonb_build_object('token', acquired, 'ids', known_ids);
end;
$$;

create or replace function public.spots_goabase_release(p_token uuid) returns void
language sql security definer set search_path = '' as $$
  update spots_sync_private.goabase_lease
    set token = null, expires_at = '-infinity'
    where singleton and token = p_token;
$$;

create or replace function public.spots_goabase_apply(p_token uuid, p_rows jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  lease spots_sync_private.goabase_lease%rowtype;
  previous spots_sync_private.goabase_versions%rowtype;
  item jsonb;
  content jsonb;
  modified timestamptz;
  inserted_count integer := 0;
  updated_count integer := 0;
  unchanged_count integer := 0;
  rejected_count integer := 0;
  cancelled_count integer := 0;
  postponed_count integer := 0;
  existed boolean;
  old_payload jsonb;
begin
  -- Held until transaction commit. An expired/old owner cannot write after takeover.
  select * into lease from spots_sync_private.goabase_lease where singleton for update;
  if p_token is null or lease.token is distinct from p_token or lease.expires_at <= clock_timestamp() then
    raise exception 'Invalid or expired Goabase lease';
  end if;
  if jsonb_typeof(p_rows) is distinct from 'array' or jsonb_array_length(p_rows) > 5000 then
    raise exception 'Invalid Goabase batch';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_rows) r group by r->>'source_event_id' having count(*) > 1
  ) then raise exception 'Duplicate source IDs in batch'; end if;

  for item in select value from jsonb_array_elements(p_rows) loop
    if item->>'source' is distinct from 'goabase'
       or coalesce(item->>'source_event_id', '') !~ '^[1-9][0-9]*$'
       or coalesce(item->>'status', '') not in ('scheduled', 'cancelled', 'postponed')
       or coalesce(trim(item->>'title'), '') = ''
       or item->>'source_modified_at' is null
       or item->>'starts_at' is null
       or item->>'is_published' is null then
      raise exception 'Invalid Goabase row';
    end if;
    modified := (item->>'source_modified_at')::timestamptz;
    content := item - 'source_modified_at' - 'is_published';
    select * into previous from spots_sync_private.goabase_versions
      where source_event_id = item->>'source_event_id';
    -- Same version with different content is ambiguous: retain previously confirmed data.
    if found and (modified < previous.modified_at or
       (modified = previous.modified_at and content <> previous.payload)) then
      rejected_count := rejected_count + 1;
      continue;
    end if;
    select jsonb_build_object(
      'source', e.source, 'source_event_id', e.source_event_id, 'source_url', e.source_url,
      'title', e.title, 'city', e.city, 'category', e.category,
      'starts_at', to_char(e.starts_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
      'ends_at', case when e.ends_at is null then null else
        to_char(e.ends_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') end,
      'latitude', e.latitude, 'longitude', e.longitude, 'image_url', e.image_url,
      'status', e.status, 'is_published', e.is_published)
      into old_payload from public.events e
      where e.source = 'goabase' and e.source_event_id = item->>'source_event_id';
    existed := found;
    -- Enforce visibility independently of the caller; end time is exclusive.
    item := jsonb_set(item, '{is_published}', to_jsonb(
      item->>'status' = 'scheduled' and case when item->>'ends_at' is not null
        then (item->>'ends_at')::timestamptz > clock_timestamp()
        else (item->>'starts_at')::timestamptz >= clock_timestamp() end));
    if existed and old_payload = item - 'source_modified_at' then
      unchanged_count := unchanged_count + 1;
    else
      insert into public.events(source, source_event_id, source_url, title, city, category,
        starts_at, ends_at, latitude, longitude, image_url, status, is_published)
      values ('goabase', item->>'source_event_id', item->>'source_url', item->>'title',
        item->>'city', item->>'category', (item->>'starts_at')::timestamptz,
        (item->>'ends_at')::timestamptz, (item->>'latitude')::double precision,
        (item->>'longitude')::double precision, item->>'image_url', item->>'status',
        (item->>'is_published')::boolean)
      on conflict (source, source_event_id) do update set
        source_url = excluded.source_url, title = excluded.title, city = excluded.city,
        category = excluded.category, starts_at = excluded.starts_at, ends_at = excluded.ends_at,
        latitude = excluded.latitude, longitude = excluded.longitude, image_url = excluded.image_url,
        status = excluded.status, is_published = excluded.is_published;
      if existed then updated_count := updated_count + 1;
      else inserted_count := inserted_count + 1; end if;
    end if;
    if item->>'status' = 'cancelled' then cancelled_count := cancelled_count + 1; end if;
    if item->>'status' = 'postponed' then postponed_count := postponed_count + 1; end if;
    insert into spots_sync_private.goabase_versions(source_event_id, modified_at, payload)
      values(item->>'source_event_id', modified, content)
      on conflict(source_event_id) do update set modified_at = excluded.modified_at, payload = excluded.payload;
  end loop;
  return jsonb_build_object('inserted', inserted_count, 'updated', updated_count,
    'unchanged', unchanged_count, 'rejected_versions', rejected_count,
    'cancelled', cancelled_count, 'postponed', postponed_count);
end;
$$;

revoke all on function public.spots_goabase_begin() from public, anon, authenticated;
revoke all on function public.spots_goabase_release(uuid) from public, anon, authenticated;
revoke all on function public.spots_goabase_apply(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.spots_goabase_begin() to service_role;
grant execute on function public.spots_goabase_release(uuid) to service_role;
grant execute on function public.spots_goabase_apply(uuid, jsonb) to service_role;
commit;
