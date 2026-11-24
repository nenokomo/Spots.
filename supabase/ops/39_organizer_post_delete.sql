-- Beiträge der Veranstalter: Mitglieder können eigene Beiträge endgültig löschen (bisher nur zurückziehen),
-- das Spots-Team ebenfalls (Moderation). Höchstens 100 Beiträge pro Veranstalter.
-- Manueller Betriebsschritt, transaktional. Voraussetzung: 15, 19 und 22. Ändert keine Event-Zeilen.
-- Die Bilder eines Beitrags (organizer_post_media, SQL 19) und Meldungen dazu verschwinden mit dem Beitrag;
-- die Dateien im privaten Bucket „organizer-media“ sind danach nicht mehr lesbar und werden von der App gelöscht.
begin;
do $$ begin
  if to_regclass('public.organizer_post_media') is null or to_regnamespace('spots_admin_private') is null then
    raise exception 'SQL 15, 19 and 22 required first';
  end if;
  if exists(select 1 from pg_policies where schemaname = 'public' and tablename = 'organizer_posts' and policyname = 'organizer_post_delete') then
    raise exception 'Post delete already exists; inspect instead of replaying';
  end if;
end $$;

grant delete on public.organizer_posts to authenticated;
create policy organizer_post_delete on public.organizer_posts for delete to authenticated
  using (spots_accounts_private.is_member(organizer_id) or spots_admin_private.is_admin());

create function spots_accounts_private.limit_posts() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if (select count(*) from public.organizer_posts where organizer_id = new.organizer_id) >= 100 then
    raise exception 'Post limit reached';
  end if;
  return new;
end $$;
revoke all on function spots_accounts_private.limit_posts() from public, anon, authenticated;
create trigger organizer_posts_limit before insert on public.organizer_posts
  for each row execute function spots_accounts_private.limit_posts();

-- Das Team darf Dateien im Bucket „organizer-media“ löschen (wie bei organizer-public, SQL 33).
create policy spots_org_media_admin_read on storage.objects for select to authenticated
  using (bucket_id = 'organizer-media' and spots_admin_private.is_admin());
create policy spots_org_media_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'organizer-media' and spots_admin_private.is_admin());
commit;
