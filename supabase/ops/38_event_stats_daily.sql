-- Statistik-Verlauf für Spots Studio: Tageswerte pro Event (Aufrufe, Ticket-Klicks, Shots, neu gemerkt).
-- Manueller Betriebsschritt, transaktional. Voraussetzung: 17 und 26. Ändert keine Event-Zeilen.
-- Weiterhin nur Tagessummen, nichts über einzelne Personen. „Neu gemerkt“ zählt ab jetzt jeden neuen
-- Merklisten-Eintrag eines Kontos am Tag des Merkens; ältere Einträge haben keinen Tag und fehlen im Verlauf
-- (die Gesamtzahl „Gemerkt“ aus SQL 26 bleibt richtig).
begin;
do $$ begin
  if to_regclass('spots_stats_private.event_daily') is null or to_regclass('public.saved_events') is null then
    raise exception 'SQL 17 and 26 required first';
  end if;
  if to_regprocedure('public.spots_organizer_event_stats_daily(uuid, integer)') is not null then
    raise exception 'Daily stats already exist; inspect instead of replaying';
  end if;
end $$;

alter table spots_stats_private.event_daily add column saves integer not null default 0;

create function spots_stats_private.count_save() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if exists(select 1 from public.events where id = new.event_id and source = 'spots') then
    insert into spots_stats_private.event_daily(event_id, day, saves) values (new.event_id, spots_stats_private.today(), 1)
      on conflict (event_id, day) do update set saves = spots_stats_private.event_daily.saves + 1;
  end if;
  return null;
end $$;
revoke all on function spots_stats_private.count_save() from public, anon, authenticated;
create trigger saved_events_count after insert on public.saved_events for each row execute function spots_stats_private.count_save();

-- Tageswerte der letzten p_days Tage (1 bis 365, Berliner Kalendertage) für alle Events eines Veranstalters.
-- Nur Tage mit mindestens einem Wert; nur für Mitglieder des Veranstalters oder das Spots-Team.
create function public.spots_organizer_event_stats_daily(p_organizer_id uuid, p_days integer default 30)
returns table(event_id uuid, day date, views integer, ticket_clicks integer, saves integer, snaps integer)
language plpgsql stable security definer set search_path='' as $$
begin
  if not (spots_accounts_private.is_member(p_organizer_id) or spots_admin_private.is_admin()) then
    raise exception 'Not allowed';
  end if;
  return query
    select d.event_id, d.day, d.views, d.ticket_clicks, d.saves, d.snaps
    from spots_stats_private.event_daily d
    join public.events e on e.id = d.event_id
    where e.organizer_id = p_organizer_id and e.source = 'spots'
      and d.day > spots_stats_private.today() - greatest(1, least(coalesce(p_days, 30), 365))
    order by d.day, d.event_id
    limit 20000;
end $$;
revoke all on function public.spots_organizer_event_stats_daily(uuid, integer) from public, anon, authenticated;
grant execute on function public.spots_organizer_event_stats_daily(uuid, integer) to authenticated;
commit;
