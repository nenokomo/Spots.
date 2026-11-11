-- Club-Verzeichnis: Orte aus OpenStreetMap (ODbL, „© OpenStreetMap-Mitwirkende“) und „Fehler melden“.
-- Manueller Betriebsschritt, keine automatische Migration. Zuerst lokal (PGlite) und in Spots-Test.
-- Orte sind keine Events: Ein Ort sagt nie, dass gerade eine Party läuft. Wiederholbar.
begin;
create schema if not exists spots_venues_private;
revoke all on schema spots_venues_private from public, anon, authenticated;

create table if not exists public.venues (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'osm' check (source in ('osm', 'redaktion')),
  source_ref text check (source_ref ~ '^(node|way|relation)/[1-9][0-9]{0,15}$'),
  name text not null check (char_length(btrim(name)) between 1 and 200),
  kind text not null check (kind in ('club', 'live', 'eventlocation')),
  street text check (char_length(street) <= 200),
  house_number text check (char_length(house_number) <= 20),
  postcode text check (char_length(postcode) <= 10),
  city text check (char_length(city) <= 120),
  region text check (region ~ '^DE-[A-Z]{2}$'),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  website text check (website ~* '^https?://' and char_length(website) <= 500),
  opening_hours text check (char_length(opening_hours) <= 255),
  -- auto: Filter bestanden; pending: braucht Prüfung; approved/hidden: Entscheidung des Teams (bleibt bei Importen).
  review_status text not null default 'pending' check (review_status in ('auto', 'pending', 'approved', 'hidden')),
  is_published boolean not null default false,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint venues_source_ref_key unique (source, source_ref),
  constraint venues_osm_ref check (source <> 'osm' or source_ref is not null),
  constraint venues_hidden_unpublished check (review_status <> 'hidden' or not is_published)
);
create index if not exists venues_published_position on public.venues (latitude, longitude) where is_published;
alter table public.venues enable row level security;
revoke all on public.venues from public, anon, authenticated;
grant select on public.venues to anon, authenticated;
grant all on public.venues to service_role;
drop policy if exists venues_public_read on public.venues;
create policy venues_public_read on public.venues for select to anon, authenticated using (is_published);

create table if not exists public.venue_reports (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  reason text not null check (reason in ('closed', 'wrong_location', 'wrong_details', 'not_a_venue', 'inappropriate', 'other')),
  note text check (char_length(note) <= 500),
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists venue_reports_open on public.venue_reports (venue_id) where status = 'open';
alter table public.venue_reports enable row level security;
revoke all on public.venue_reports from public, anon, authenticated;
grant all on public.venue_reports to service_role;

-- Einordnung eines Overpass-Elements: {"skip": Grund} oder {"row": {...}}. Keine Rateerei, nur feste Merkmale.
create or replace function spots_venues_private.osm_venue(el jsonb) returns jsonb
language plpgsql stable set search_path = '' as $$
declare
  tags jsonb := coalesce(el->'tags', '{}'::jsonb);
  v_type text := el->>'type';
  v_ref text := el->>'id';
  v_name text := btrim(regexp_replace(coalesce(el->'tags'->>'name', ''), '\s+', ' ', 'g'));
  v_kind text;
  lat double precision;
  lon double precision;
  site text;
begin
  if jsonb_typeof(el) is distinct from 'object' or v_type not in ('node', 'way', 'relation')
     or coalesce(v_ref, '') !~ '^[1-9][0-9]{0,15}$' or jsonb_typeof(tags) is distinct from 'object' then
    return jsonb_build_object('skip', 'invalid_element');
  end if;
  v_kind := case tags->>'amenity' when 'nightclub' then 'club' when 'music_venue' then 'live'
    when 'events_venue' then 'eventlocation' end;
  if v_kind is null then return jsonb_build_object('skip', 'other_amenity'); end if;
  if v_name = '' then return jsonb_build_object('skip', 'no_name'); end if;
  -- Erotik und Rotlicht: eindeutige Merkmale oder Namen, LGBTQ-Orte bleiben selbstverständlich drin.
  if exists (select 1 from jsonb_each_text(tags) t where
       (t.key in ('erotic', 'adult', 'sex', 'brothel', 'striptease', 'strip_club', 'stripclub', 'swingerclub')
         and t.value not in ('no', 'none'))
       or (t.key in ('nightclub', 'club', 'theme', 'dance:style', 'amenity:nightclub')
         and t.value ~* '(strip|erot|adult|sex|swinger|lap.?dance|table.?dance|fkk|bordel|brothel|red.?light|peep|bdsm|fetish|kink)')
       or (t.key = 'shop' and t.value in ('erotic', 'sex', 'adult')))
     or v_name ~* '(erotik|erotic|\msex|bordell|brothel|laufhaus|striptease|strip.?club|\mstrip\M|table.?dance|lap.?dance|\mfkk\M|swinger|peep.?show|rotlicht|escort|nacktbar|gentlemen.?s club)' then
    return jsonb_build_object('skip', 'adult');
  end if;
  -- Geschlossen oder aufgegeben.
  if exists (select 1 from jsonb_each_text(tags) t where
       (t.key in ('disused', 'abandoned', 'closed', 'demolished', 'razed', 'was:amenity', 'disused:amenity', 'abandoned:amenity')
         and t.value not in ('no', 'none'))
       or (t.key = 'opening_hours' and t.value ~* '^\s*(closed|off|geschlossen)\s*$')
       or (t.key = 'end_date' and case when t.value ~ '^\d{4}' then left(t.value, 4)::int < extract(year from now())::int
         else false end))
     or v_name ~* '(geschlossen|\mclosed\M|ehemalig|\mehem\.|\mformer\M|dauerhaft zu)' then
    return jsonb_build_object('skip', 'closed');
  end if;
  -- Knoten haben lat/lon, Flächen und Relationen einen Mittelpunkt (out center); nur echte Zahlen.
  lat := case when jsonb_typeof(el->'lat') = 'number' then (el->>'lat')::double precision
    when jsonb_typeof(el->'center'->'lat') = 'number' then (el->'center'->>'lat')::double precision end;
  lon := case when jsonb_typeof(el->'lon') = 'number' then (el->>'lon')::double precision
    when jsonb_typeof(el->'center'->'lon') = 'number' then (el->'center'->>'lon')::double precision end;
  if lat is null or lon is null or lat not between -90 and 90 or lon not between -180 and 180 then
    return jsonb_build_object('skip', 'no_location');
  end if;
  site := coalesce(nullif(btrim(tags->>'website'), ''), nullif(btrim(tags->>'contact:website'), ''), nullif(btrim(tags->>'url'), ''));
  if site is not null and site !~* '^https?://' then site := 'https://' || site; end if;
  if site is not null and (site !~* '^https?://[a-z0-9.-]+\.[a-z]{2,}([/:?#][^\s;,]*)?$' or char_length(site) > 500) then
    site := null; -- mehrere Adressen, Leerzeichen oder unbrauchbar: lieber keine Website als eine falsche
  end if;
  return jsonb_build_object('row', jsonb_build_object(
    'source_ref', v_type || '/' || v_ref, 'name', left(v_name, 200), 'kind', v_kind,
    'street', left(nullif(btrim(tags->>'addr:street'), ''), 200),
    'house_number', left(nullif(btrim(tags->>'addr:housenumber'), ''), 20),
    'postcode', left(nullif(btrim(tags->>'addr:postcode'), ''), 10),
    'city', left(nullif(btrim(tags->>'addr:city'), ''), 120),
    'latitude', lat, 'longitude', lon, 'website', site,
    -- OSM-Kommentare stehen in Anführungszeichen ("Nach Absprache"): ohne Anführungszeichen anzeigen.
    'opening_hours', left(nullif(btrim(tags->>'opening_hours', ' "'), ''), 255),
    -- Clubs und Live-Musik direkt zeigen; Eventlocations nur mit Website, sonst erst nach Prüfung.
    'publish', v_kind in ('club', 'live') or site is not null));
end;
$$;

-- Übernahme eines Bundeslandes. p_complete = true nur bei vollständiger Overpass-Antwort: dann werden Orte
-- der Region, die nicht mehr vorkommen, ausgeblendet (nicht gelöscht) – außer bei verdächtig kleiner Antwort.
create or replace function public.spots_venues_apply_osm(p_region text, p_elements jsonb, p_complete boolean)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  run_started timestamptz := clock_timestamp();
  el jsonb;
  result jsonb;
  r jsonb;
  existing public.venues%rowtype;
  existed boolean;
  v_status text;
  v_published boolean;
  skipped jsonb := '{}'::jsonb;
  reason text;
  seen integer := 0;
  inserted_count integer := 0;
  updated_count integer := 0;
  unchanged_count integer := 0;
  kept_hidden integer := 0;
  missing_count integer := 0;
  previously_published integer;
  stale_check text := 'not_requested';
begin
  if coalesce(p_region, '') !~ '^DE-[A-Z]{2}$' or p_complete is null then raise exception 'Invalid region'; end if;
  if jsonb_typeof(p_elements) is distinct from 'array' or jsonb_array_length(p_elements) > 20000 then
    raise exception 'Invalid OSM batch';
  end if;
  select count(*) into previously_published from public.venues
    where source = 'osm' and region = p_region and is_published;

  for el in select value from jsonb_array_elements(p_elements) loop
    result := spots_venues_private.osm_venue(el);
    if result ? 'skip' then
      reason := result->>'skip';
      skipped := jsonb_set(skipped, array[reason], to_jsonb(coalesce((skipped->>reason)::int, 0) + 1));
      continue;
    end if;
    seen := seen + 1;
    r := result->'row';
    select * into existing from public.venues v where v.source = 'osm' and v.source_ref = r->>'source_ref';
    existed := found;
    if existed and existing.review_status = 'hidden' then
      update public.venues set last_seen_at = run_started where id = existing.id;
      kept_hidden := kept_hidden + 1;
      continue;
    end if;
    -- Entscheidungen des Teams bleiben; sonst entscheidet die Regel aus osm_venue.
    v_status := case when existed and existing.review_status = 'approved' then 'approved'
      when (r->>'publish')::boolean then 'auto' else 'pending' end;
    v_published := v_status in ('auto', 'approved');
    if existed and existing.name = r->>'name' and existing.kind = r->>'kind'
       and existing.street is not distinct from r->>'street'
       and existing.house_number is not distinct from r->>'house_number'
       and existing.postcode is not distinct from r->>'postcode'
       and existing.city is not distinct from r->>'city'
       and existing.region is not distinct from p_region
       and existing.latitude = (r->>'latitude')::double precision
       and existing.longitude = (r->>'longitude')::double precision
       and existing.website is not distinct from r->>'website'
       and existing.opening_hours is not distinct from r->>'opening_hours'
       and existing.review_status = v_status and existing.is_published = v_published then
      update public.venues set last_seen_at = run_started where id = existing.id;
      unchanged_count := unchanged_count + 1;
      continue;
    end if;
    insert into public.venues(source, source_ref, name, kind, street, house_number, postcode, city, region,
      latitude, longitude, website, opening_hours, review_status, is_published, last_seen_at, updated_at)
    values ('osm', r->>'source_ref', r->>'name', r->>'kind', r->>'street', r->>'house_number', r->>'postcode',
      r->>'city', p_region, (r->>'latitude')::double precision, (r->>'longitude')::double precision,
      r->>'website', r->>'opening_hours', v_status, v_published, run_started, run_started)
    on conflict (source, source_ref) do update set
      name = excluded.name, kind = excluded.kind, street = excluded.street, house_number = excluded.house_number,
      postcode = excluded.postcode, city = excluded.city, region = excluded.region, latitude = excluded.latitude,
      longitude = excluded.longitude, website = excluded.website, opening_hours = excluded.opening_hours,
      review_status = excluded.review_status, is_published = excluded.is_published,
      last_seen_at = excluded.last_seen_at, updated_at = excluded.updated_at;
    if existed then updated_count := updated_count + 1; else inserted_count := inserted_count + 1; end if;
  end loop;

  if p_complete then
    if previously_published > 20 and seen < previously_published / 2 then
      stale_check := 'skipped_suspicious_response';
    else
      update public.venues set is_published = false, updated_at = run_started
        where source = 'osm' and region = p_region and last_seen_at < run_started
          and is_published and review_status <> 'approved';
      get diagnostics missing_count = row_count;
      stale_check := 'done';
    end if;
  end if;

  return jsonb_build_object('region', p_region, 'received', jsonb_array_length(p_elements), 'accepted', seen,
    'inserted', inserted_count, 'updated', updated_count, 'unchanged', unchanged_count,
    'kept_hidden', kept_hidden, 'unpublished_missing', missing_count, 'stale_check', stale_check,
    'skipped', skipped);
end;
$$;

-- „Fehler melden“ ohne Konto: nur fester Grund und kurzer Freitext, keine personenbezogenen Felder.
-- Schutz gegen Spam: ab 50 offenen Meldungen pro Ort wird nichts mehr gespeichert (gleiche Antwort).
create or replace function public.spots_report_venue(p_venue_id uuid, p_reason text, p_note text default null)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  open_reports integer;
begin
  if p_reason is null or p_reason not in ('closed', 'wrong_location', 'wrong_details', 'not_a_venue', 'inappropriate', 'other')
     or char_length(coalesce(p_note, '')) > 500 then
    raise exception 'Invalid venue report';
  end if;
  if not exists (select 1 from public.venues where id = p_venue_id and is_published) then
    raise exception 'Unknown venue';
  end if;
  select count(*) into open_reports from public.venue_reports where venue_id = p_venue_id and status = 'open';
  if open_reports < 50 then
    insert into public.venue_reports(venue_id, reason, note) values (p_venue_id, p_reason, nullif(btrim(p_note), ''));
  end if;
  return true;
end;
$$;

revoke all on function spots_venues_private.osm_venue(jsonb) from public, anon, authenticated;
revoke all on function public.spots_venues_apply_osm(text, jsonb, boolean) from public, anon, authenticated;
revoke all on function public.spots_report_venue(uuid, text, text) from public;
grant execute on function public.spots_venues_apply_osm(text, jsonb, boolean) to service_role;
grant execute on function public.spots_report_venue(uuid, text, text) to anon, authenticated, service_role;
commit;
