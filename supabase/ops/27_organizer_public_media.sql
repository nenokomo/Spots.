-- Etappe 2 (Veranstalter): öffentlicher Bild-Speicher für Logos und Event-Flyer, Ort aus dem Adressbuch für Veranstalter-Events.
-- Manueller Betriebsschritt, transaktional. Voraussetzung: 15 (Konten), 21 (Orte), 22 (venue_id an Events) und 26.
-- Ändert keine Event-Zeilen. Importe (Goabase, Ticketmaster, Redaktion) sind nicht betroffen.
begin;
do $$ begin
  if to_regclass('public.organizers') is null or to_regclass('public.venues') is null
    or not exists(select 1 from information_schema.columns where table_schema='public' and table_name='events' and column_name='venue_id')
    or not exists(select 1 from information_schema.columns where table_schema='public' and table_name='organizers' and column_name='review_status') then
    raise exception 'SQL 15, 21, 22 and 26 required first';
  end if;
  if to_regclass('storage.objects') is null then raise exception 'Supabase Storage schema required'; end if;
  if exists(select 1 from storage.buckets where id = 'organizer-public')
    or to_regprocedure('spots_accounts_private.is_member_folder(text)') is not null then
    raise exception 'Public media objects already exist; inspect instead of replaying';
  end if;
end $$;

-- ---------------------------------------------------------------------------------------------
-- 1) Bucket „organizer-public“: Logos und Flyer mit fester öffentlicher Adresse.
--    Pfad: <organizer_id>/<datei>. Hochladen, Ersetzen und Löschen nur für Mitglieder dieses Veranstalters.
--    Öffentlich lesbar ist nur die einzelne Datei über ihre Adresse; auflisten können nur Mitglieder.
-- ---------------------------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('organizer-public', 'organizer-public', true, 5242880, array['image/jpeg','image/png','image/webp']);

-- Ordnername → Mitgliedschaft. Kein Fehler bei Ordnern, die keine UUID sind (dann einfach kein Zugriff).
create function spots_accounts_private.is_member_folder(p_folder text) returns boolean
language sql stable security definer set search_path='' as $$
  select p_folder ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and spots_accounts_private.is_member(p_folder::uuid)
$$;
revoke all on function spots_accounts_private.is_member_folder(text) from public, anon, authenticated;
grant execute on function spots_accounts_private.is_member_folder(text) to authenticated;

create policy spots_org_public_member_read on storage.objects for select to authenticated
  using (bucket_id = 'organizer-public' and spots_accounts_private.is_member_folder((storage.foldername(name))[1]));
create policy spots_org_public_upload on storage.objects for insert to authenticated
  with check (bucket_id = 'organizer-public' and spots_accounts_private.is_member_folder((storage.foldername(name))[1]));
create policy spots_org_public_update on storage.objects for update to authenticated
  using (bucket_id = 'organizer-public' and spots_accounts_private.is_member_folder((storage.foldername(name))[1]))
  with check (bucket_id = 'organizer-public' and spots_accounts_private.is_member_folder((storage.foldername(name))[1]));
create policy spots_org_public_delete on storage.objects for delete to authenticated
  using (bucket_id = 'organizer-public' and spots_accounts_private.is_member_folder((storage.foldername(name))[1]));

-- ---------------------------------------------------------------------------------------------
-- 2) Veranstalter-Events können einen Ort aus dem Adressbuch tragen (dann erscheinen sie auch auf der Ortsseite).
--    Nur veröffentlichte Orte. Name, Stadt und Koordinaten kommen dann immer vom Ort, nicht aus der App.
-- ---------------------------------------------------------------------------------------------
create function spots_accounts_private.apply_event_venue() returns trigger
language plpgsql security definer set search_path='' as $$
declare v public.venues%rowtype;
begin
  select * into v from public.venues where id = new.venue_id and is_published;
  if not found then raise exception 'Venue is not available'; end if;
  new.venue_name := v.name;
  new.city := v.city;
  new.latitude := v.latitude;
  new.longitude := v.longitude;
  return new;
end $$;
revoke all on function spots_accounts_private.apply_event_venue() from public, anon, authenticated;
create trigger events_spots_venue before insert or update of venue_id, venue_name, city, latitude, longitude on public.events
  for each row when (new.source = 'spots' and new.venue_id is not null)
  execute function spots_accounts_private.apply_event_venue();

grant insert(venue_id), update(venue_id) on public.events to authenticated;
commit;
