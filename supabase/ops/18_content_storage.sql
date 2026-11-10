-- Storage buckets and object policies for Live Snaps and organizer media. Requires 17_content_tickets.sql.
-- Supabase-specific (storage schema); cannot be tested in local PGlite. Run in Spots-Test first,
-- then verify upload/read/delete with three test users before any production use.
begin;
do $$ begin
  if to_regclass('public.live_snaps') is null then raise exception 'SQL 17 required first'; end if;
  if to_regclass('storage.objects') is null then raise exception 'Supabase Storage schema required'; end if;
  if exists(select 1 from storage.buckets where id in ('live-snaps','organizer-media')) then
    raise exception 'Buckets already exist; inspect instead of replaying';
  end if;
end $$;

-- Both buckets are private: files are only reachable through signed URLs, which Storage
-- issues only when the select policy below allows reading the object.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('live-snaps', 'live-snaps', false, 20971520, array['image/jpeg','image/png','image/webp','image/heic','video/mp4','video/quicktime']),
  ('organizer-media', 'organizer-media', false, 10485760, array['image/jpeg','image/png','image/webp']);

-- Uploads always go into the caller's own folder: <auth.uid()>/<file>.
create policy spots_snaps_upload on storage.objects for insert to authenticated
  with check (bucket_id = 'live-snaps' and (storage.foldername(name))[1] = (select auth.uid())::text);
-- Readable while the matching live_snaps row is readable (visible + unexpired, own or moderated),
-- so expired or hidden snaps cannot be signed anymore.
create policy spots_snaps_read on storage.objects for select to anon, authenticated
  using (bucket_id = 'live-snaps' and (
    exists(select 1 from public.live_snaps s where s.storage_path = name)
    or (storage.foldername(name))[1] = (select auth.uid())::text));
create policy spots_snaps_delete on storage.objects for delete to authenticated
  using (bucket_id = 'live-snaps' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy spots_org_media_upload on storage.objects for insert to authenticated
  with check (bucket_id = 'organizer-media' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy spots_org_media_read on storage.objects for select to anon, authenticated
  using (bucket_id = 'organizer-media' and (
    exists(select 1 from public.organizer_posts p where p.image_path = name)
    or (storage.foldername(name))[1] = (select auth.uid())::text));
create policy spots_org_media_delete on storage.objects for delete to authenticated
  using (bucket_id = 'organizer-media' and (storage.foldername(name))[1] = (select auth.uid())::text);
commit;
