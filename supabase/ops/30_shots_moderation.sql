-- Etappe 3 (Shots): Gäste-Shots sofort sichtbar, Moderation durch das Spots-Team, Aufräumen nach 24 Stunden.
-- Manueller Betriebsschritt, transaktional. Voraussetzung: 17 (live_snaps, content_reports) und 22 (Admins). Ändert keine Events.
-- Entscheidung Jacint (15.11.): Shots von Gästen sind sofort sichtbar; posten nur mit Konto. Schutz: Melden (drei
-- Meldungen blenden aus, SQL 17), Ausblenden durch den Club (eigene Events, SQL 17) und durch das Spots-Team (hier).
begin;
do $$ begin
  if to_regclass('public.live_snaps') is null or to_regprocedure('spots_content_private.prepare_snap()') is null
    or to_regnamespace('spots_admin_private') is null then
    raise exception 'SQL 17 and 22 required first';
  end if;
  if to_regprocedure('public.spots_admin_snap_queue(integer)') is not null then
    raise exception 'Shots moderation already exists; inspect instead of replaying';
  end if;
end $$;

-- Wie SQL 17, aber Gäste-Shots starten sichtbar statt „pending“.
create or replace function spots_content_private.prepare_snap() returns trigger
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
  new.moderation_status := 'visible';
  return new;
end $$;

-- Das Team sieht alle Shots (auch ausgeblendete), damit es sie prüfen und signierte Bild-Links erzeugen kann.
create policy snap_admin_read on public.live_snaps for select to authenticated using (spots_admin_private.is_admin());

-- Prüfliste: aktuelle Shots, gemeldete und ausgeblendete zuerst. Ohne Konto-IDs der Gäste.
create function public.spots_admin_snap_queue(p_limit integer default 100)
returns table(id uuid, event_id uuid, event_title text, storage_path text, media_type text, moderation_status text,
  by_organizer boolean, created_at timestamptz, expires_at timestamptz, report_count bigint, reasons text[])
language plpgsql stable security definer set search_path='' as $$
begin
  if not spots_admin_private.is_admin() then raise exception 'Not allowed'; end if;
  return query
    select s.id, s.event_id, e.title, s.storage_path, s.media_type, s.moderation_status, s.by_organizer,
      s.created_at, s.expires_at, count(r.id), coalesce(array_agg(distinct r.reason) filter (where r.reason is not null), '{}')
    from public.live_snaps s
    left join public.events e on e.id = s.event_id
    left join public.content_reports r on r.snap_id = s.id
    where s.expires_at > now()
    group by s.id, e.title
    order by (s.moderation_status <> 'visible') desc, count(r.id) desc, s.created_at desc
    limit greatest(1, least(coalesce(p_limit, 100), 300));
end $$;

-- Team blendet aus, entfernt endgültig oder zeigt wieder.
create function public.spots_admin_set_snap_status(p_snap_id uuid, p_status text) returns boolean
language plpgsql security definer set search_path='' as $$
begin
  if not spots_admin_private.is_admin() or p_status not in ('visible','hidden','removed') then raise exception 'Not allowed'; end if;
  update public.live_snaps set moderation_status = p_status where id = p_snap_id;
  if not found then raise exception 'Unknown snap'; end if;
  return true;
end $$;

-- Nur für den Server (Edge Function cleanup-snaps mit dem geheimen Projektschlüssel):
-- abgelaufene Shots auflisten und nach dem Löschen der Dateien die Zeilen entfernen.
create function public.spots_snaps_cleanup_list(p_limit integer default 500)
returns table(id uuid, storage_path text)
language sql stable security definer set search_path='' as $$
  select s.id, s.storage_path from spots_content_private.expired_snaps(p_limit) s
$$;
create function public.spots_snaps_cleanup_delete(p_ids uuid[]) returns integer
language plpgsql security definer set search_path='' as $$
declare removed integer;
begin
  if coalesce(cardinality(p_ids), 0) > 5000 then raise exception 'Too many snaps'; end if;
  delete from public.live_snaps where id = any(coalesce(p_ids, '{}')) and expires_at < now();
  get diagnostics removed = row_count;
  return removed;
end $$;

revoke all on function public.spots_admin_snap_queue(integer), public.spots_admin_set_snap_status(uuid, text),
  public.spots_snaps_cleanup_list(integer), public.spots_snaps_cleanup_delete(uuid[]) from public, anon, authenticated;
grant execute on function public.spots_admin_snap_queue(integer), public.spots_admin_set_snap_status(uuid, text) to authenticated;
do $$ begin
  if exists(select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.spots_snaps_cleanup_list(integer), public.spots_snaps_cleanup_delete(uuid[]) to service_role;
  end if;
end $$;
commit;
