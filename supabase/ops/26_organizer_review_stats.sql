-- Etappe 2 (Veranstalter): Antrag und Freigabe von Veranstalter-Profilen plus datensparsame Event-Statistik.
-- Manueller Betriebsschritt, transaktional. Voraussetzung: 15 (Konten), 17 (Snaps/Merkliste) und 22 (Admins).
-- Ändert keine Event-Zeilen. Bestehende veröffentlichte Veranstalter gelten als bereits freigegeben.
begin;
do $$ begin
  if to_regclass('public.organizers') is null or to_regclass('public.saved_events') is null
    or to_regclass('public.live_snaps') is null or to_regnamespace('spots_admin_private') is null then
    raise exception 'SQL 15, 17 and 22 required first';
  end if;
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='organizers' and column_name='review_status')
    or to_regnamespace('spots_stats_private') is not null then
    raise exception 'Review/stats objects already exist; inspect instead of replaying';
  end if;
end $$;

-- ---------------------------------------------------------------------------------------------
-- 1) Antrag → Freigabe. is_published lässt sich nur noch über die Funktionen unten ändern
--    (Veranstalter haben kein Schreibrecht mehr darauf).
--    Öffentlich sein kann ein Profil nur mit review_status = 'approved'.
--    draft: angelegt · pending: Antrag gestellt · approved: öffentlich · rejected: abgelehnt (neu stellbar)
--    · suspended: vom Team gesperrt (nur das Team hebt die Sperre auf).
-- ---------------------------------------------------------------------------------------------
alter table public.organizers
  add column review_status text not null default 'draft'
    check (review_status in ('draft','pending','approved','rejected','suspended')),
  add column review_note text check (char_length(review_note) <= 500),
  add column submitted_at timestamptz,
  add column reviewed_at timestamptz,
  add column reviewed_by uuid references auth.users(id) on delete set null;
update public.organizers set review_status = 'approved', reviewed_at = now() where is_published;
alter table public.organizers add constraint organizers_published_needs_approval
  check (not is_published or review_status = 'approved');
-- „nur wenn“ statt „genau dann“: SQL 25 (Konto löschen) blendet verwaiste Veranstalter mit is_published=false aus.

revoke update(is_published) on public.organizers from authenticated;

-- Höchstens drei eigene Veranstalter pro Konto (Schutz gegen Massenanträge). Sonst wie SQL 15.
create or replace function public.create_organizer(p_slug text, p_display_name text) returns uuid
language plpgsql security definer set search_path='' as $$
declare result uuid; caller uuid := auth.uid();
begin
  if caller is null then raise insufficient_privilege using message='Sign in required'; end if;
  if (select count(*) from public.organizer_memberships where user_id = caller and role = 'owner') >= 3 then
    raise exception 'Organizer limit reached';
  end if;
  insert into public.organizers(slug, display_name) values (p_slug, p_display_name) returning id into result;
  insert into public.organizer_memberships(organizer_id, user_id, role) values (result, caller, 'owner');
  return result;
end $$;

-- Besitzer stellt den Antrag (auch erneut nach einer Ablehnung).
create function public.spots_organizer_submit(p_organizer_id uuid) returns boolean
language plpgsql security definer set search_path='' as $$
begin
  if not spots_accounts_private.is_owner(p_organizer_id) then raise insufficient_privilege using message='Owner required'; end if;
  update public.organizers set review_status = 'pending', submitted_at = now(), review_note = null
    where id = p_organizer_id and review_status in ('draft','rejected');
  if not found then raise exception 'Organizer cannot be submitted in its current state'; end if;
  return true;
end $$;

-- Besitzer zieht einen offenen Antrag zurück.
create function public.spots_organizer_withdraw(p_organizer_id uuid) returns boolean
language plpgsql security definer set search_path='' as $$
begin
  if not spots_accounts_private.is_owner(p_organizer_id) then raise insufficient_privilege using message='Owner required'; end if;
  update public.organizers set review_status = 'draft', submitted_at = null where id = p_organizer_id and review_status = 'pending';
  if not found then raise exception 'No open request'; end if;
  return true;
end $$;

-- Team entscheidet. Erlaubte Wechsel: pending → approved/rejected, approved → suspended, suspended → approved.
create function public.spots_admin_review_organizer(p_organizer_id uuid, p_status text, p_note text default null) returns boolean
language plpgsql security definer set search_path='' as $$
declare current_status text;
begin
  if not spots_admin_private.is_admin() then raise exception 'Not allowed'; end if;
  if char_length(coalesce(p_note, '')) > 500 then raise exception 'Note too long'; end if;
  select review_status into current_status from public.organizers where id = p_organizer_id for update;
  if not found then raise exception 'Unknown organizer'; end if;
  if not ((current_status = 'pending' and p_status in ('approved','rejected'))
       or (current_status = 'approved' and p_status = 'suspended')
       or (current_status = 'suspended' and p_status = 'approved')) then
    raise exception 'Status change not allowed';
  end if;
  update public.organizers set review_status = p_status, is_published = (p_status = 'approved'),
    review_note = nullif(btrim(p_note), ''), reviewed_at = now(), reviewed_by = auth.uid()
    where id = p_organizer_id;
  return true;
end $$;

-- Prüfliste fürs Team: offene und gesperrte zuerst. Die Kontakt-Mail des Besitzers nur hier, nur für Admins.
create function public.spots_admin_organizer_queue(p_status text default null)
returns table(id uuid, slug text, display_name text, city text, biography text, website_url text, avatar_url text,
  review_status text, review_note text, submitted_at timestamptz, reviewed_at timestamptz, owner_email text,
  event_count bigint)
language plpgsql stable security definer set search_path='' as $$
begin
  if not spots_admin_private.is_admin() then raise exception 'Not allowed'; end if;
  return query
    select o.id, o.slug, o.display_name, o.city, o.biography, o.website_url, o.avatar_url,
      o.review_status, o.review_note, o.submitted_at, o.reviewed_at,
      (select u.email::text from public.organizer_memberships m join auth.users u on u.id = m.user_id
        where m.organizer_id = o.id and m.role = 'owner' limit 1),
      (select count(*) from public.events e where e.organizer_id = o.id)
    from public.organizers o
    where (p_status is null and o.review_status <> 'draft') or o.review_status = p_status
    order by (o.review_status = 'pending') desc, o.submitted_at nulls last, o.created_at
    limit 200;
end $$;

-- ---------------------------------------------------------------------------------------------
-- 2) Statistik: nur Tagessummen pro Event, keine Personen. Gegen Mehrfachzählen hält die App eine
--    zufällige Geräte-Kennung; gespeichert wird nur ein Hash mit täglich neuem Salz, und nur bis
--    zum Folgetag. So zählt ein Gerät pro Event und Tag höchstens einmal je Art.
-- ---------------------------------------------------------------------------------------------
create schema spots_stats_private;
revoke all on schema spots_stats_private from public, anon, authenticated;

create table spots_stats_private.event_daily (
  event_id uuid not null references public.events(id) on delete cascade,
  day date not null,
  views integer not null default 0,
  ticket_clicks integer not null default 0,
  snaps integer not null default 0,
  primary key (event_id, day)
);
create table spots_stats_private.daily_salt (
  day date primary key,
  salt text not null
);
create table spots_stats_private.recent_hits (
  day date not null,
  hit text not null,
  primary key (day, hit)
);
alter table spots_stats_private.event_daily enable row level security;
alter table spots_stats_private.daily_salt enable row level security;
alter table spots_stats_private.recent_hits enable row level security;
revoke all on all tables in schema spots_stats_private from public, anon, authenticated;

create function spots_stats_private.today() returns date
language sql stable set search_path='' as $$ select (now() at time zone 'Europe/Berlin')::date $$;

-- Zählt einen Aufruf oder Ticket-Klick. Antwortet nie mit Daten; unbekannte oder private Events werden still ignoriert.
create function public.spots_track_event(p_event_id uuid, p_kind text, p_device text) returns void
language plpgsql security definer set search_path='' as $$
declare d date := spots_stats_private.today(); s text; inserted integer;
begin
  if p_kind not in ('view','ticket_click') or p_device is null or p_device !~ '^[A-Za-z0-9-]{16,64}$' then return; end if;
  if not exists(select 1 from public.events e join public.organizers o on o.id = e.organizer_id
      where e.id = p_event_id and e.source = 'spots' and e.is_published and o.is_published) then
    return;
  end if;
  insert into spots_stats_private.daily_salt(day, salt) values (d, gen_random_uuid()::text) on conflict (day) do nothing;
  select salt into s from spots_stats_private.daily_salt where day = d;
  insert into spots_stats_private.recent_hits(day, hit) values (d, md5(s || ':' || p_kind || ':' || p_event_id || ':' || p_device))
    on conflict do nothing;
  get diagnostics inserted = row_count;
  if inserted = 0 then return; end if;
  insert into spots_stats_private.event_daily(event_id, day, views, ticket_clicks)
    values (p_event_id, d, (p_kind = 'view')::int, (p_kind = 'ticket_click')::int)
    on conflict (event_id, day) do update set
      views = spots_stats_private.event_daily.views + excluded.views,
      ticket_clicks = spots_stats_private.event_daily.ticket_clicks + excluded.ticket_clicks;
  -- Aufräumen: Salze und Hashes von vorgestern und älter verschwinden.
  delete from spots_stats_private.recent_hits where day < d - 1;
  delete from spots_stats_private.daily_salt where day < d - 1;
end $$;

-- Jeder hochgeladene Snap zu einem Veranstalter-Event zählt einmal (auch wenn er später abläuft).
create function spots_stats_private.count_snap() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if new.event_id is not null and exists(select 1 from public.events where id = new.event_id and source = 'spots') then
    insert into spots_stats_private.event_daily(event_id, day, snaps) values (new.event_id, spots_stats_private.today(), 1)
      on conflict (event_id, day) do update set snaps = spots_stats_private.event_daily.snaps + 1;
  end if;
  return null;
end $$;
create trigger live_snaps_count after insert on public.live_snaps for each row execute function spots_stats_private.count_snap();

-- Dashboard: Summen pro Event, nur für Mitglieder des Veranstalters (oder das Team).
-- Gemerkt = aktuelle Merklisten-Einträge von Konten (Merklisten ohne Konto bleiben auf dem Gerät und zählen nicht).
create function public.spots_organizer_event_stats(p_organizer_id uuid)
returns table(event_id uuid, title text, starts_at timestamptz, is_published boolean,
  views bigint, ticket_clicks bigint, saves bigint, snaps bigint)
language plpgsql stable security definer set search_path='' as $$
begin
  if not (spots_accounts_private.is_member(p_organizer_id) or spots_admin_private.is_admin()) then
    raise exception 'Not allowed';
  end if;
  return query
    select e.id, e.title, e.starts_at, e.is_published,
      coalesce(sum(d.views), 0)::bigint, coalesce(sum(d.ticket_clicks), 0)::bigint,
      (select count(*) from public.saved_events s where s.event_id = e.id),
      coalesce(sum(d.snaps), 0)::bigint
    from public.events e
    left join spots_stats_private.event_daily d on d.event_id = e.id
    where e.organizer_id = p_organizer_id and e.source = 'spots'
    group by e.id
    order by e.starts_at desc
    limit 500;
end $$;

revoke all on all functions in schema spots_stats_private from public, anon, authenticated;
revoke all on function public.spots_organizer_submit(uuid), public.spots_organizer_withdraw(uuid),
  public.spots_admin_review_organizer(uuid, text, text), public.spots_admin_organizer_queue(text),
  public.spots_track_event(uuid, text, text), public.spots_organizer_event_stats(uuid) from public, anon, authenticated;
grant execute on function public.spots_track_event(uuid, text, text) to anon, authenticated;
grant execute on function public.spots_organizer_submit(uuid), public.spots_organizer_withdraw(uuid),
  public.spots_admin_review_organizer(uuid, text, text), public.spots_admin_organizer_queue(text),
  public.spots_organizer_event_stats(uuid) to authenticated;
commit;
