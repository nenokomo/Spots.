-- Etappe 3 (Shots): Shots von Gästen sehen nur angemeldete Konten (Entscheidung Jacint, 15.11.).
-- Manueller Betriebsschritt, transaktional. Voraussetzung: 17 und 30. Ändert keine Events und keine Shots.
-- Die Event-Story des Clubs (by_organizer) bleibt für alle sichtbar. Weil die Storage-Leseregel aus SQL 18 an
-- dieser Tabelle hängt, lassen sich Bilddateien von Gäste-Shots ohne Anmeldung auch nicht mehr signieren.
begin;
do $$ begin
  if to_regprocedure('public.spots_admin_snap_queue(integer)') is null then raise exception 'SQL 30 required first'; end if;
  if exists(select 1 from pg_policies where schemaname = 'public' and tablename = 'live_snaps' and policyname = 'snap_signed_in_read') then
    raise exception 'Signed-in rule already exists; inspect instead of replaying';
  end if;
end $$;

drop policy snap_public_read on public.live_snaps;
-- Für alle: nur die Event-Story des Clubs (bzw. Veranstalter-Snaps ohne Event).
create policy snap_public_read on public.live_snaps for select to anon, authenticated using (
  moderation_status = 'visible' and expires_at > now() and by_organizer
  and ((event_id is not null and spots_content_private.event_is_public(event_id))
    or (event_id is null and spots_accounts_private.is_public(organizer_id))));
-- Mit Konto: zusätzlich die Shots von Gästen.
create policy snap_signed_in_read on public.live_snaps for select to authenticated using (
  moderation_status = 'visible' and expires_at > now() and not by_organizer
  and event_id is not null and spots_content_private.event_is_public(event_id));
commit;
