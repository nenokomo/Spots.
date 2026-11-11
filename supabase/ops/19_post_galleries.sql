-- Gallery posts: several images per organizer post, in order (Instagram-style).
-- Manual, transactional, additive. Requires 17_content_tickets.sql (organizer_posts.image_path) and 18 (bucket organizer-media).
-- Not executed against any remote project yet.
begin;
do $$ begin
  if to_regclass('public.organizer_posts') is null or to_regnamespace('spots_accounts_private') is null then
    raise exception 'SQL 15 and 17 required first';
  end if;
  if to_regclass('public.organizer_post_media') is not null then
    raise exception 'organizer_post_media already exists; inspect instead of replaying';
  end if;
end $$;

create table public.organizer_post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.organizer_posts(id) on delete cascade,
  storage_path text not null unique check (storage_path ~ '^[0-9a-f-]{36}/[A-Za-z0-9._-]{1,120}$'),
  sort_order smallint not null default 0 check (sort_order between 0 and 9),
  width integer check (width is null or width between 1 and 10000),
  height integer check (height is null or height between 1 and 10000),
  created_at timestamptz not null default now(),
  unique (post_id, sort_order)
);
create index organizer_post_media_post_idx on public.organizer_post_media(post_id, sort_order);

-- Readable where the post is readable; writable by members of the post's organizer.
create function spots_accounts_private.post_organizer(p_post uuid) returns uuid
language sql stable security definer set search_path='' as $$ select organizer_id from public.organizer_posts where id=p_post $$;
revoke all on function spots_accounts_private.post_organizer(uuid) from public, anon, authenticated;
grant execute on function spots_accounts_private.post_organizer(uuid) to anon, authenticated;

alter table public.organizer_post_media enable row level security;
revoke all on public.organizer_post_media from public, anon, authenticated;
grant select on public.organizer_post_media to anon, authenticated;
grant insert(post_id, storage_path, sort_order, width, height), update(sort_order), delete on public.organizer_post_media to authenticated;
create policy post_media_read on public.organizer_post_media for select to anon, authenticated using (
  exists(select 1 from public.organizer_posts p where p.id = post_id));
create policy post_media_insert on public.organizer_post_media for insert to authenticated with check (
  spots_accounts_private.is_member(spots_accounts_private.post_organizer(post_id))
  and split_part(storage_path, '/', 1) = (select auth.uid())::text);
create policy post_media_update on public.organizer_post_media for update to authenticated
  using (spots_accounts_private.is_member(spots_accounts_private.post_organizer(post_id)))
  with check (spots_accounts_private.is_member(spots_accounts_private.post_organizer(post_id)));
create policy post_media_delete on public.organizer_post_media for delete to authenticated
  using (spots_accounts_private.is_member(spots_accounts_private.post_organizer(post_id)));

-- Storage: gallery files live in organizer-media next to single post images. Reading follows the media row.
create policy spots_org_gallery_read on storage.objects for select to anon, authenticated
  using (bucket_id = 'organizer-media' and exists(select 1 from public.organizer_post_media m where m.storage_path = name));
commit;
