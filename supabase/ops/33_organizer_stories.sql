-- Etappe 2 (Veranstalter): Veranstalter-Story für „Entdecken“ und Event-Story ab dem Anlegen des Events.
-- Manueller Betriebsschritt, transaktional. Voraussetzung: 15, 17, 22, 26, 27 und 30. Ändert keine Event-Zeilen.
-- Entscheidung Jacint (17.11.):
--  * Entdecken zeigt alle freigegebenen Veranstalter einer Stadt als Story-Kachel (wie eine Profilanzeige).
--    Die Story pflegt nur der Veranstalter: Eindrücke von vergangenen Events, aber auch zu kommenden Events.
--    Bilder bleiben, bis der Veranstalter sie löscht. Ohne Story erscheint der Veranstalter mit Logo und Namen.
--  * Event-Story (live_snaps des Clubs): posten ab dem Anlegen des Events bis zwei Stunden nach dem Ende,
--    nicht erst eine Stunde vor Beginn. Jedes Bild bleibt wie bisher 24 Stunden.
begin;
do $$ begin
  if to_regclass('public.organizers') is null or to_regclass('public.live_snaps') is null
    or to_regnamespace('spots_admin_private') is null
    or to_regprocedure('spots_stats_private.count_snap()') is null
    or to_regprocedure('spots_accounts_private.is_member_folder(text)') is null
    or to_regprocedure('public.spots_admin_snap_queue(integer)') is null then
    raise exception 'SQL 15, 17, 22, 26, 27 and 30 required first';
  end if;
  if to_regclass('public.organizer_story_items') is not null then
    raise exception 'Organizer stories already exist; inspect instead of replaying';
  end if;
end $$;

-- ---------------------------------------------------------------------------------------------
-- 1) Veranstalter-Story: Bilder im öffentlichen Bucket „organizer-public“ (SQL 27),
--    Pfad <organizer_id>/story-<datei>. Optional mit kurzem Text und einem eigenen Event (vergangen oder kommend).
-- ---------------------------------------------------------------------------------------------
create table public.organizer_story_items (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references public.organizers(id) on delete cascade,
  event_id uuid references public.events(id) on delete set null,
  storage_path text not null unique check (storage_path ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/story-[A-Za-z0-9._-]{1,120}$'),
  caption text check (caption is null or char_length(btrim(caption)) between 1 and 200),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (split_part(storage_path, '/', 1) = organizer_id::text)
);
create index organizer_story_items_organizer_idx on public.organizer_story_items(organizer_id, created_at desc);

-- Server setzt Autor und Zeit; höchstens 30 Bilder pro Veranstalter; verknüpfte Events müssen eigene sein.
create function spots_accounts_private.prepare_story_item() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
    new.created_at := now();
    if (select count(*) from public.organizer_story_items where organizer_id = new.organizer_id) >= 30 then
      raise exception 'Story limit reached';
    end if;
  end if;
  if new.event_id is not null and not exists(
    select 1 from public.events where id = new.event_id and source = 'spots' and organizer_id = new.organizer_id) then
    raise exception 'Event belongs to another organizer';
  end if;
  return new;
end $$;
revoke all on function spots_accounts_private.prepare_story_item() from public, anon, authenticated;
create trigger organizer_story_items_prepare before insert or update on public.organizer_story_items
  for each row execute function spots_accounts_private.prepare_story_item();

alter table public.organizer_story_items enable row level security;
revoke all on public.organizer_story_items from public, anon, authenticated;
grant select on public.organizer_story_items to anon, authenticated;
grant insert(organizer_id, event_id, storage_path, caption), update(event_id, caption), delete on public.organizer_story_items to authenticated;
create policy story_public_read on public.organizer_story_items for select to anon, authenticated
  using (spots_accounts_private.is_public(organizer_id));
create policy story_member_read on public.organizer_story_items for select to authenticated
  using (spots_accounts_private.is_member(organizer_id));
create policy story_admin_read on public.organizer_story_items for select to authenticated
  using (spots_admin_private.is_admin());
create policy story_member_insert on public.organizer_story_items for insert to authenticated
  with check (spots_accounts_private.is_member(organizer_id));
create policy story_member_update on public.organizer_story_items for update to authenticated
  using (spots_accounts_private.is_member(organizer_id)) with check (spots_accounts_private.is_member(organizer_id));
-- Löschen: Mitglieder; das Spots-Team kann Bilder entfernen (Moderation).
create policy story_delete on public.organizer_story_items for delete to authenticated
  using (spots_accounts_private.is_member(organizer_id) or spots_admin_private.is_admin());
-- Storage löscht mit RETURNING, braucht also auch eine Leseregel.
create policy spots_org_public_admin_read on storage.objects for select to authenticated
  using (bucket_id = 'organizer-public' and spots_admin_private.is_admin());
create policy spots_org_public_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'organizer-public' and spots_admin_private.is_admin());

-- ---------------------------------------------------------------------------------------------
-- 2) Entdecken: freigegebene Veranstalter einer Stadt mit ihrer Story und dem nächsten Event.
--    Stadt: gleicher Name, oder einer beginnt mit dem anderen plus Leerzeichen
--    („Frankfurt“ passt zu „Frankfurt am Main“). Ohne Stadt: alle. Läuft mit den Rechten des Aufrufers (RLS).
-- ---------------------------------------------------------------------------------------------
create function public.spots_explore_organizers(p_city text default null, p_limit integer default 60)
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
    from (select * from public.organizer_story_items i where i.organizer_id = o.id order by i.created_at desc, i.id limit 30) s
    left join public.events ev on ev.id = s.event_id and spots_content_private.event_is_public(ev.id)) st on true
  where o.is_published
    and (w.c is null or lower(btrim(o.city)) = w.c
      or left(w.c, char_length(btrim(o.city)) + 1) = lower(btrim(o.city)) || ' '
      or left(lower(btrim(o.city)), char_length(w.c) + 1) = w.c || ' ')
  order by (st.items is not null) desc, (nxt.starts_at is not null) desc, nxt.starts_at, o.display_name, o.id
  limit greatest(1, least(coalesce(p_limit, 60), 200));
$$;
revoke all on function public.spots_explore_organizers(text, integer) from public;
grant execute on function public.spots_explore_organizers(text, integer) to anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- 3) Event-Story: Mitglieder posten ab dem Anlegen (auch Entwurf) bis zwei Stunden nach dem Ende.
--    Gäste-Shots unverändert: eine Stunde vor Beginn bis zwei Stunden nach dem Ende, nur veröffentlichte Events.
-- ---------------------------------------------------------------------------------------------
create function spots_content_private.organizer_story_open(p_event uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.events e join public.organizer_memberships m on m.organizer_id = e.organizer_id
   where e.id = p_event and e.source = 'spots' and e.status = 'scheduled' and m.user_id = (select auth.uid())
     and now() < coalesce(e.ends_at, e.starts_at + interval '8 hours') + interval '2 hours')
$$;
revoke all on function spots_content_private.organizer_story_open(uuid) from public, anon, authenticated;
grant execute on function spots_content_private.organizer_story_open(uuid) to authenticated;

drop policy snap_insert on public.live_snaps;
create policy snap_insert on public.live_snaps for insert to authenticated with check (
  split_part(storage_path, '/', 1) = (select auth.uid())::text
  and ((event_id is not null and (spots_content_private.snap_window_open(event_id) or spots_content_private.organizer_story_open(event_id)))
    or (event_id is null and spots_accounts_private.is_member(organizer_id))));

-- Statistik „Shots“ zählt nur Shots von Gästen, nicht die eigene Event-Story des Clubs.
create or replace function spots_stats_private.count_snap() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if new.event_id is not null and not new.by_organizer and exists(select 1 from public.events where id = new.event_id and source = 'spots') then
    insert into spots_stats_private.event_daily(event_id, day, snaps) values (new.event_id, spots_stats_private.today(), 1)
      on conflict (event_id, day) do update set snaps = spots_stats_private.event_daily.snaps + 1;
  end if;
  return null;
end $$;
commit;
