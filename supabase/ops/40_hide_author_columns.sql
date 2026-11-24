-- Datenschutz: Wer einen Shot oder ein Story-Bild gepostet hat, ist über die Schnittstelle nicht mehr abrufbar.
-- Manueller Betriebsschritt, transaktional. Voraussetzung: 17, 33 und 34. Ändert keine Event-Zeilen und keine Inhalte.
-- Bisher durften alle die ganze Zeile lesen, also auch live_snaps.author_id und organizer_story_items.created_by
-- (die App zeigt beides nie an). Ab hier gibt es Leserechte nur noch auf die Spalten, die die App braucht.
-- Die Regeln (RLS) bleiben unverändert: Autoren sehen und löschen ihre eigenen Shots weiterhin.
begin;
do $$ begin
  if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='live_snaps' and column_name='team_locked')
    or not exists(select 1 from information_schema.columns where table_schema='public' and table_name='organizer_story_items' and column_name='moderation_status') then
    raise exception 'SQL 17, 33 and 34 required first';
  end if;
  if not has_column_privilege('authenticated', 'public.live_snaps', 'author_id', 'select') then
    raise exception 'Author columns already hidden; inspect instead of replaying';
  end if;
end $$;

revoke select on public.live_snaps from anon, authenticated;
grant select(id, event_id, organizer_id, by_organizer, media_type, storage_path, caption, duration_ms,
  moderation_status, team_locked, created_at, expires_at) on public.live_snaps to anon, authenticated;

revoke select on public.organizer_story_items from anon, authenticated;
grant select(id, organizer_id, event_id, storage_path, caption, moderation_status, created_at)
  on public.organizer_story_items to anon, authenticated;

-- Entdecken-Liste wie in SQL 34, aber mit genau den lesbaren Spalten statt „alle Spalten“.
create or replace function public.spots_explore_organizers(p_city text default null, p_limit integer default 60)
returns table(id uuid, slug text, display_name text, city text, avatar_url text,
  next_event_id uuid, next_event_title text, next_event_starts_at timestamptz, story jsonb)
language sql stable security invoker set search_path='' as $$
  with wanted as (select nullif(lower(btrim(coalesce(p_city, ''))), '') as c)
  select o.id, o.slug, o.display_name, o.city, o.avatar_url, nxt.id, nxt.title, nxt.starts_at, coalesce(st.items, '[]'::jsonb)
  from public.organizers o
  cross join wanted w
  left join lateral (
    select e.id, e.title, e.starts_at from public.events e
    where e.organizer_id = o.id and e.source = 'spots' and e.is_published and e.status = 'scheduled'
      and coalesce(e.ends_at, e.starts_at + interval '8 hours') > now()
    order by e.starts_at, e.id limit 1) nxt on true
  left join lateral (
    select jsonb_agg(jsonb_build_object('id', s.id, 'storage_path', s.storage_path, 'caption', s.caption, 'created_at', s.created_at,
        'event_id', ev.id, 'event_title', ev.title, 'event_starts_at', ev.starts_at) order by s.created_at desc, s.id) as items
    from (select i.id, i.storage_path, i.caption, i.created_at, i.event_id from public.organizer_story_items i
          where i.organizer_id = o.id and i.moderation_status = 'visible'
          order by i.created_at desc, i.id limit 30) s
    left join public.events ev on ev.id = s.event_id and spots_content_private.event_is_public(ev.id)) st on true
  where o.is_published
    and (w.c is null or lower(btrim(o.city)) = w.c
      or left(w.c, char_length(btrim(o.city)) + 1) = lower(btrim(o.city)) || ' '
      or left(lower(btrim(o.city)), char_length(w.c) + 1) = w.c || ' ')
  order by (st.items is not null) desc, (nxt.starts_at is not null) desc, nxt.starts_at, o.display_name, o.id
  limit greatest(1, least(coalesce(p_limit, 60), 200));
$$;
commit;
