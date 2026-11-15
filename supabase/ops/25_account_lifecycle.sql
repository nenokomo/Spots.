-- Konten für alle: eigenes Konto löschen und Merkliste mit dem Konto abgleichen.
-- Manueller Betriebsschritt, keine automatische Migration. Voraussetzung: 15 (Konten) und 17 (saved_events).
-- Zuerst lokal (PGlite), dann Spots-Test. Löscht nie Events; wiederholbar.
begin;

-- Konto löschen (Pflicht bei Apple und Google): nur das eigene Konto, nur angemeldet.
-- Veranstalter, bei denen niemand mehr Mitglied ist, werden ausgeblendet (nicht gelöscht), ebenso ihre
-- eigenen Spots-Events. Profil, Merkliste, Snaps und Meldungen des Kontos verschwinden über ON DELETE CASCADE.
create or replace function public.spots_delete_my_account() returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  orphaned uuid[];
begin
  if uid is null then raise exception 'Not signed in'; end if;
  select coalesce(array_agg(m.organizer_id), '{}') into orphaned
    from public.organizer_memberships m
    where m.user_id = uid
      and not exists (select 1 from public.organizer_memberships o where o.organizer_id = m.organizer_id and o.user_id <> uid);
  delete from public.organizer_memberships where user_id = uid;
  update public.organizers set is_published = false, updated_at = now() where id = any(orphaned) and is_published;
  update public.events set is_published = false
    where source = 'spots' and organizer_id = any(orphaned) and is_published;
  delete from auth.users where id = uid;
  return true;
end;
$$;
revoke all on function public.spots_delete_my_account() from public, anon;
grant execute on function public.spots_delete_my_account() to authenticated;

-- Merkliste: Einträge vom Gerät übernehmen (nur öffentliche Events, Doppelte still ignoriert) und die
-- vollständige Liste des Kontos zurückgeben. Fremde oder unveröffentlichte IDs werden übergangen.
create or replace function public.spots_sync_saved_events(p_add uuid[] default '{}') returns setof uuid
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Not signed in'; end if;
  if coalesce(cardinality(p_add), 0) > 500 then raise exception 'Too many saved events'; end if;
  insert into public.saved_events(user_id, event_id)
    select uid, x from (select distinct unnest(coalesce(p_add, '{}')) as x) ids
    where spots_content_private.event_is_public(x)
    on conflict do nothing;
  return query select s.event_id from public.saved_events s where s.user_id = uid order by s.created_at desc, s.event_id;
end;
$$;
revoke all on function public.spots_sync_saved_events(uuid[]) from public, anon;
grant execute on function public.spots_sync_saved_events(uuid[]) to authenticated;
commit;
