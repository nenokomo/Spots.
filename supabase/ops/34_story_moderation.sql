-- Moderation für Veranstalter-Storys und Shots: Storys melden, Prüfliste für das Spots-Team, Team-Sperre bei Shots.
-- Manueller Betriebsschritt, transaktional. Voraussetzung: 17, 22, 30 und 33. Ändert keine Event-Zeilen.
--  * Jedes Konto kann ein Story-Bild melden (Tabelle content_reports wie bei Shots).
--  * Story-Bilder blenden sich NICHT automatisch aus (anders als Gäste-Shots): Veranstalter sind geprüft, und
--    Sammelmeldungen sollen keinen Club treffen können. Das Team sieht die Meldungen und blendet aus oder löscht.
--  * Blendet das Team einen Shot aus, kann der Club ihn nicht wieder einblenden (team_locked).
begin;
do $$ begin
  if to_regclass('public.organizer_story_items') is null or to_regclass('public.content_reports') is null
    or to_regprocedure('public.spots_admin_set_snap_status(uuid, text)') is null then
    raise exception 'SQL 17, 22, 30 and 33 required first';
  end if;
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='organizer_story_items' and column_name='moderation_status') then
    raise exception 'Story moderation already exists; inspect instead of replaying';
  end if;
end $$;

-- ---------------------------------------------------------------------------------------------
-- 1) Story-Bilder: sichtbar oder vom Team ausgeblendet. Der Club sieht ausgeblendete Bilder weiter im Studio.
-- ---------------------------------------------------------------------------------------------
alter table public.organizer_story_items
  add column moderation_status text not null default 'visible' check (moderation_status in ('visible','hidden'));
drop policy story_public_read on public.organizer_story_items;
create policy story_public_read on public.organizer_story_items for select to anon, authenticated
  using (moderation_status = 'visible' and spots_accounts_private.is_public(organizer_id));

-- Entdecken-Liste wie in SQL 33, zusätzlich ohne ausgeblendete Bilder (auch für Mitglieder des Clubs).
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
    from (select * from public.organizer_story_items i where i.organizer_id = o.id and i.moderation_status = 'visible'
          order by i.created_at desc, i.id limit 30) s
    left join public.events ev on ev.id = s.event_id and spots_content_private.event_is_public(ev.id)) st on true
  where o.is_published
    and (w.c is null or lower(btrim(o.city)) = w.c
      or left(w.c, char_length(btrim(o.city)) + 1) = lower(btrim(o.city)) || ' '
      or left(lower(btrim(o.city)), char_length(w.c) + 1) = w.c || ' ')
  order by (st.items is not null) desc, (nxt.starts_at is not null) desc, nxt.starts_at, o.display_name, o.id
  limit greatest(1, least(coalesce(p_limit, 60), 200));
$$;

-- ---------------------------------------------------------------------------------------------
-- 2) Melden: content_reports nimmt jetzt auch Story-Bilder (genau ein Ziel pro Meldung, einmal pro Konto).
-- ---------------------------------------------------------------------------------------------
alter table public.content_reports
  add column story_item_id uuid references public.organizer_story_items(id) on delete cascade;
do $$
declare old_check text;
begin
  select conname into old_check from pg_constraint
    where conrelid = 'public.content_reports'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%num_nonnulls%';
  if old_check is null then raise exception 'Target check of content_reports not found'; end if;
  execute format('alter table public.content_reports drop constraint %I', old_check);
end $$;
alter table public.content_reports
  add constraint content_reports_one_target check (num_nonnulls(snap_id, post_id, story_item_id) = 1),
  add constraint content_reports_story_once unique (reporter_id, story_item_id);
create index content_reports_story_idx on public.content_reports(story_item_id) where story_item_id is not null;
grant insert(story_item_id) on public.content_reports to authenticated;

-- ---------------------------------------------------------------------------------------------
-- 3) Prüfliste für das Team: gemeldete und ausgeblendete Story-Bilder zuerst. Ohne Konto-IDs der Meldenden.
-- ---------------------------------------------------------------------------------------------
create function public.spots_admin_story_queue(p_limit integer default 100)
returns table(id uuid, organizer_id uuid, organizer_name text, storage_path text, caption text,
  moderation_status text, created_at timestamptz, report_count bigint, reasons text[])
language plpgsql stable security definer set search_path='' as $$
begin
  if not spots_admin_private.is_admin() then raise exception 'Not allowed'; end if;
  return query
    select s.id, s.organizer_id, o.display_name, s.storage_path, s.caption, s.moderation_status, s.created_at,
      count(r.id), coalesce(array_agg(distinct r.reason) filter (where r.reason is not null), '{}')
    from public.organizer_story_items s
    join public.organizers o on o.id = s.organizer_id
    left join public.content_reports r on r.story_item_id = s.id
    group by s.id, o.display_name
    order by (s.moderation_status <> 'visible') desc, count(r.id) desc, s.created_at desc
    limit greatest(1, least(coalesce(p_limit, 100), 300));
end $$;

create function public.spots_admin_set_story_status(p_item_id uuid, p_status text) returns boolean
language plpgsql security definer set search_path='' as $$
begin
  if not spots_admin_private.is_admin() or p_status not in ('visible','hidden') then raise exception 'Not allowed'; end if;
  update public.organizer_story_items set moderation_status = p_status where id = p_item_id;
  if not found then raise exception 'Unknown story item'; end if;
  return true;
end $$;
revoke all on function public.spots_admin_story_queue(integer), public.spots_admin_set_story_status(uuid, text) from public, anon, authenticated;
grant execute on function public.spots_admin_story_queue(integer), public.spots_admin_set_story_status(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------------------------
-- 4) Shots: Clubs blenden Gäste-Shots ihrer Events aus und wieder ein (SQL 17). Neu: was das Team
--    ausgeblendet oder entfernt hat, bleibt für den Club gesperrt.
-- ---------------------------------------------------------------------------------------------
alter table public.live_snaps add column team_locked boolean not null default false;

create or replace function public.spots_admin_set_snap_status(p_snap_id uuid, p_status text) returns boolean
language plpgsql security definer set search_path='' as $$
begin
  if not spots_admin_private.is_admin() or p_status not in ('visible','hidden','removed') then raise exception 'Not allowed'; end if;
  update public.live_snaps set moderation_status = p_status, team_locked = (p_status <> 'visible') where id = p_snap_id;
  if not found then raise exception 'Unknown snap'; end if;
  return true;
end $$;

drop policy snap_moderate on public.live_snaps;
create policy snap_moderate on public.live_snaps for update to authenticated
  using (organizer_id is not null and spots_accounts_private.is_member(organizer_id) and not team_locked)
  with check (organizer_id is not null and spots_accounts_private.is_member(organizer_id) and not team_locked
    and moderation_status in ('visible','hidden','removed'));
commit;
