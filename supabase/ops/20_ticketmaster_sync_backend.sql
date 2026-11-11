-- Ticketmaster als zweite Eventquelle (docs/TICKETMASTER_IMPORT.md).
-- Manueller Betriebsschritt, keine automatische Migration. Zuerst lokal (PGlite) und in Spots-Test.
-- Voraussetzung: public.events mit UNIQUE(source, source_event_id) (05). Löscht keine Events,
-- verändert keine Zeilen anderer Quellen. Wiederholbar.
begin;
create schema if not exists spots_sync_private;
revoke all on schema spots_sync_private from public, anon, authenticated;

create table if not exists spots_sync_private.ticketmaster_lease (
  singleton boolean primary key default true check (singleton),
  token uuid,
  expires_at timestamptz not null default '-infinity'
);
insert into spots_sync_private.ticketmaster_lease(singleton) values(true) on conflict do nothing;

-- Löschwünsche von Rechteinhabern (Ticketmaster-Bedingungen: innerhalb von 24 Stunden entfernen).
create table if not exists spots_sync_private.ticketmaster_blocklist (
  source_event_id text primary key check (source_event_id ~ '^[A-Za-z0-9_-]{1,64}$'),
  reason text not null check (char_length(btrim(reason)) between 1 and 200),
  blocked_at timestamptz not null default now()
);
alter table spots_sync_private.ticketmaster_lease enable row level security;
alter table spots_sync_private.ticketmaster_blocklist enable row level security;
revoke all on spots_sync_private.ticketmaster_lease, spots_sync_private.ticketmaster_blocklist
  from public, anon, authenticated, service_role;

create or replace function public.spots_ticketmaster_begin() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  acquired uuid;
  known_ids jsonb;
begin
  update spots_sync_private.ticketmaster_lease
    set token = gen_random_uuid(), expires_at = clock_timestamp() + interval '180 seconds'
    where singleton and expires_at <= clock_timestamp()
    returning token into acquired;
  if acquired is null then return null; end if;
  -- Bekannte, noch nicht vorbei gelaufene Events: fehlen sie in der Suche, prüft der Import sie einzeln.
  select coalesce(jsonb_agg(source_event_id order by source_event_id), '[]'::jsonb)
    into known_ids from public.events
    where source = 'ticketmaster' and status in ('scheduled', 'postponed')
      and starts_at >= clock_timestamp() - interval '12 hours';
  if jsonb_array_length(known_ids) > 5000 then
    raise exception 'Ticketmaster inventory capacity exceeded';
  end if;
  return jsonb_build_object('token', acquired, 'ids', known_ids);
end;
$$;

create or replace function public.spots_ticketmaster_release(p_token uuid) returns void
language sql security definer set search_path = '' as $$
  update spots_sync_private.ticketmaster_lease
    set token = null, expires_at = '-infinity'
    where singleton and token = p_token;
$$;

create or replace function public.spots_ticketmaster_apply(
  p_token uuid, p_rows jsonb, p_removed_ids jsonb, p_unconfirmed_ids jsonb
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  lease spots_sync_private.ticketmaster_lease%rowtype;
  item jsonb;
  v_id text;
  starts timestamptz;
  ends timestamptz;
  published boolean;
  existing public.events%rowtype;
  existed boolean;
  inserted_count integer := 0;
  updated_count integer := 0;
  unchanged_count integer := 0;
  blocked_count integer := 0;
  removed_count integer := 0;
  unconfirmed_count integer := 0;
  url_pattern constant text := '^https://([a-z0-9-]+\.)*(ticketmaster\.[a-z]{2,3}(\.[a-z]{2})?|universe\.com)(/|$)';
begin
  -- Bis zum Commit gehalten: ein abgelaufener oder alter Besitzer kann nach Übernahme nicht schreiben.
  select * into lease from spots_sync_private.ticketmaster_lease where singleton for update;
  if p_token is null or lease.token is distinct from p_token or lease.expires_at <= clock_timestamp() then
    raise exception 'Invalid or expired Ticketmaster lease';
  end if;
  if jsonb_typeof(p_rows) is distinct from 'array' or jsonb_array_length(p_rows) > 5000
     or jsonb_typeof(p_removed_ids) is distinct from 'array' or jsonb_array_length(p_removed_ids) > 5000
     or jsonb_typeof(p_unconfirmed_ids) is distinct from 'array' or jsonb_array_length(p_unconfirmed_ids) > 5000 then
    raise exception 'Invalid Ticketmaster batch';
  end if;
  if exists (select 1 from (
      select r->>'source_event_id' as k from jsonb_array_elements(p_rows) r
      union all select value #>> '{}' from jsonb_array_elements(p_removed_ids)
      union all select value #>> '{}' from jsonb_array_elements(p_unconfirmed_ids)) ids
    group by k having count(*) > 1) then
    raise exception 'Duplicate source IDs in batch';
  end if;

  for item in select value from jsonb_array_elements(p_rows) loop
    if jsonb_typeof(item) is distinct from 'object'
       or item->>'source' is distinct from 'ticketmaster'
       or coalesce(item->>'source_event_id', '') !~ '^[A-Za-z0-9_-]{1,64}$'
       or coalesce(item->>'status', '') not in ('scheduled', 'cancelled', 'postponed')
       or coalesce(btrim(item->>'title'), '') = '' or char_length(item->>'title') > 300
       or item->>'category' is distinct from 'concert'
       or item->>'starts_at' is null
       or coalesce(item->>'source_url', '') !~ url_pattern
       or coalesce(item->>'ticket_url', '') !~ url_pattern
       or (item->>'image_url' is not null and item->>'image_url' !~ '^https://')
       or char_length(coalesce(item->>'venue_name', '')) > 200
       or char_length(coalesce(item->>'city', '')) > 120
       or char_length(coalesce(item->>'genre', '')) > 40
       or (item->>'latitude' is not null and (item->>'latitude')::double precision not between -90 and 90)
       or (item->>'longitude' is not null and (item->>'longitude')::double precision not between -180 and 180) then
      raise exception 'Invalid Ticketmaster row';
    end if;
    v_id := item->>'source_event_id';
    starts := (item->>'starts_at')::timestamptz;
    ends := (item->>'ends_at')::timestamptz;
    if ends is not null and ends <= starts then raise exception 'Invalid Ticketmaster end time'; end if;
    -- Sichtbarkeit unabhängig vom Aufrufer; ohne Endzeit gilt wie in der App eine Dauer von 8 Stunden.
    published := item->>'status' = 'scheduled'
      and coalesce(ends, starts + interval '8 hours') > clock_timestamp();
    if exists (select 1 from spots_sync_private.ticketmaster_blocklist b where b.source_event_id = v_id) then
      update public.events set is_published = false
        where source = 'ticketmaster' and source_event_id = v_id and is_published;
      blocked_count := blocked_count + 1;
      continue;
    end if;
    select * into existing from public.events e where e.source = 'ticketmaster' and e.source_event_id = v_id;
    existed := found;
    if existed and existing.title = item->>'title'
       and existing.source_url is not distinct from item->>'source_url'
       and existing.ticket_url is not distinct from item->>'ticket_url'
       and existing.venue_name is not distinct from item->>'venue_name'
       and existing.city is not distinct from item->>'city'
       and existing.genre is not distinct from item->>'genre'
       and existing.category is not distinct from item->>'category'
       and existing.starts_at = starts and existing.ends_at is not distinct from ends
       and existing.latitude is not distinct from (item->>'latitude')::double precision
       and existing.longitude is not distinct from (item->>'longitude')::double precision
       and existing.image_url is not distinct from item->>'image_url'
       and existing.status = item->>'status' and existing.is_published = published then
      unchanged_count := unchanged_count + 1;
      continue;
    end if;
    insert into public.events(source, source_event_id, source_url, ticket_url, title, venue_name, city,
      genre, category, starts_at, ends_at, latitude, longitude, image_url, status, is_published)
    values ('ticketmaster', v_id, item->>'source_url', item->>'ticket_url', btrim(item->>'title'),
      item->>'venue_name', item->>'city', item->>'genre', item->>'category', starts, ends,
      (item->>'latitude')::double precision, (item->>'longitude')::double precision,
      item->>'image_url', item->>'status', published)
    on conflict (source, source_event_id) do update set
      source_url = excluded.source_url, ticket_url = excluded.ticket_url, title = excluded.title,
      venue_name = excluded.venue_name, city = excluded.city, genre = excluded.genre,
      category = excluded.category, starts_at = excluded.starts_at, ends_at = excluded.ends_at,
      latitude = excluded.latitude, longitude = excluded.longitude, image_url = excluded.image_url,
      status = excluded.status, is_published = excluded.is_published;
    if existed then updated_count := updated_count + 1; else inserted_count := inserted_count + 1; end if;
  end loop;

  -- Nicht mehr auffindbar (404): unveröffentlichen, Zeile und UUID bleiben erhalten.
  for v_id in select value #>> '{}' from jsonb_array_elements(p_removed_ids) loop
    if coalesce(v_id, '') !~ '^[A-Za-z0-9_-]{1,64}$' then raise exception 'Invalid Ticketmaster ID'; end if;
    update public.events set status = 'source_removed', is_published = false
      where source = 'ticketmaster' and source_event_id = v_id and status <> 'source_removed';
    if found then removed_count := removed_count + 1; end if;
  end loop;
  -- Detail vorhanden, aber nicht mehr übernehmbar (z. B. unbekannter Status): ausblenden statt raten.
  for v_id in select value #>> '{}' from jsonb_array_elements(p_unconfirmed_ids) loop
    if coalesce(v_id, '') !~ '^[A-Za-z0-9_-]{1,64}$' then raise exception 'Invalid Ticketmaster ID'; end if;
    update public.events set status = 'source_unconfirmed', is_published = false
      where source = 'ticketmaster' and source_event_id = v_id and status <> 'source_unconfirmed';
    if found then unconfirmed_count := unconfirmed_count + 1; end if;
  end loop;

  return jsonb_build_object('inserted', inserted_count, 'updated', updated_count,
    'unchanged', unchanged_count, 'blocked', blocked_count, 'removed', removed_count,
    'unconfirmed', unconfirmed_count);
end;
$$;

-- Löschwunsch umsetzen: sofort unveröffentlichen und dauerhaft vom Import ausschließen.
create or replace function public.spots_ticketmaster_block(p_source_event_id text, p_reason text) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(p_source_event_id, '') !~ '^[A-Za-z0-9_-]{1,64}$'
     or char_length(btrim(coalesce(p_reason, ''))) not between 1 and 200 then
    raise exception 'Invalid Ticketmaster block request';
  end if;
  insert into spots_sync_private.ticketmaster_blocklist(source_event_id, reason)
    values (p_source_event_id, btrim(p_reason))
    on conflict (source_event_id) do update set reason = excluded.reason;
  update public.events set is_published = false
    where source = 'ticketmaster' and source_event_id = p_source_event_id;
  return true;
end;
$$;

revoke all on function public.spots_ticketmaster_begin() from public, anon, authenticated;
revoke all on function public.spots_ticketmaster_release(uuid) from public, anon, authenticated;
revoke all on function public.spots_ticketmaster_apply(uuid, jsonb, jsonb, jsonb) from public, anon, authenticated;
revoke all on function public.spots_ticketmaster_block(text, text) from public, anon, authenticated;
grant execute on function public.spots_ticketmaster_begin() to service_role;
grant execute on function public.spots_ticketmaster_release(uuid) to service_role;
grant execute on function public.spots_ticketmaster_apply(uuid, jsonb, jsonb, jsonb) to service_role;
grant execute on function public.spots_ticketmaster_block(text, text) to service_role;
commit;
