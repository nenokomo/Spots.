-- Veranstalter-Profil: kurzes Motto und Titelbild für die Veranstalterseite (Wunsch Noyan, 19.11.).
-- Manueller Betriebsschritt, transaktional. Voraussetzung: 28 und 36. Ändert keine Event-Zeilen.
-- Das Titelbild liegt wie Logo und Flyer im öffentlichen Bucket „organizer-public“ (SQL 27); die Aufräumliste
-- aus SQL 36 kennt es ab hier, damit ein benutztes Titelbild nie als verwaist gilt.
begin;
do $$ begin
  if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='organizers' and column_name='social_url')
    or to_regprocedure('public.spots_public_media_orphans(integer)') is null then
    raise exception 'SQL 28 and 36 required first';
  end if;
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='organizers' and column_name='motto') then
    raise exception 'Motto and cover already exist; inspect instead of replaying';
  end if;
end $$;

alter table public.organizers
  add column motto text check (char_length(btrim(motto)) between 1 and 120),
  add column cover_url text check (cover_url ~ '^https://[^[:space:]@]+$' and char_length(cover_url) <= 500);
grant update(motto, cover_url) on public.organizers to authenticated;

-- Wie SQL 36, zusätzlich gilt das Titelbild eines Veranstalters als benutzt.
create or replace function public.spots_public_media_orphans(p_limit integer default 500) returns table(name text)
language sql stable security definer set search_path='' as $$
  select o.name from storage.objects o
  where o.bucket_id = 'organizer-public' and o.created_at < now() - interval '24 hours'
    and not exists(select 1 from public.organizer_story_items s where s.storage_path = o.name)
    and not exists(select 1 from public.organizers g where
      (g.avatar_url is not null and right(g.avatar_url, char_length(o.name) + 18) = '/organizer-public/' || o.name)
      or (g.cover_url is not null and right(g.cover_url, char_length(o.name) + 18) = '/organizer-public/' || o.name))
    and not exists(select 1 from public.events e where e.image_url is not null
      and right(e.image_url, char_length(o.name) + 18) = '/organizer-public/' || o.name)
  order by o.created_at
  limit greatest(1, least(coalesce(p_limit, 500), 1000))
$$;
commit;
