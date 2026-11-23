-- Aufräumen im öffentlichen Bild-Speicher „organizer-public“: Dateien, auf die nichts mehr zeigt
-- (ersetzte Logos und Flyer, abgebrochene Uploads, gelöschte Story-Bilder, deren Datei liegen blieb).
-- Manueller Betriebsschritt, transaktional. Voraussetzung: 27 und 33. Ändert keine Event-Zeilen und löscht selbst nichts:
-- Die Funktion listet nur; gelöscht wird über die Storage-Schnittstelle in der Edge Function cleanup-snaps.
-- Schonfrist 24 Stunden, damit ein gerade hochgeladenes Bild vor dem Speichern nicht verschwindet.
begin;
do $$ begin
  if to_regclass('public.organizer_story_items') is null or not exists(select 1 from storage.buckets where id = 'organizer-public') then
    raise exception 'SQL 27 and 33 required first';
  end if;
  if to_regprocedure('public.spots_public_media_orphans(integer)') is not null then
    raise exception 'Public media cleanup already exists; inspect instead of replaying';
  end if;
end $$;

-- „Benutzt“ heißt: Story-Bild (Pfad), Logo eines Veranstalters oder Bild eines Events (Adresse endet auf den Pfad).
create function public.spots_public_media_orphans(p_limit integer default 500) returns table(name text)
language sql stable security definer set search_path='' as $$
  select o.name from storage.objects o
  where o.bucket_id = 'organizer-public' and o.created_at < now() - interval '24 hours'
    and not exists(select 1 from public.organizer_story_items s where s.storage_path = o.name)
    and not exists(select 1 from public.organizers g where g.avatar_url is not null
      and right(g.avatar_url, char_length(o.name) + 18) = '/organizer-public/' || o.name)
    and not exists(select 1 from public.events e where e.image_url is not null
      and right(e.image_url, char_length(o.name) + 18) = '/organizer-public/' || o.name)
  order by o.created_at
  limit greatest(1, least(coalesce(p_limit, 500), 1000))
$$;
revoke all on function public.spots_public_media_orphans(integer) from public, anon, authenticated;
do $$ begin
  if exists(select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.spots_public_media_orphans(integer) to service_role;
  end if;
end $$;
commit;
