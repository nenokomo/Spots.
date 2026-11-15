-- Etappe 2 (Veranstalter): Adresse an Events und Endzeit-Pflicht für Club-Events.
-- Manueller Betriebsschritt, transaktional. Voraussetzung: 15, 21, 22 und 27. Ändert keine bestehenden Event-Zeilen.
-- Jedes Club-Event hat eine eigene Adresse (Events finden nicht nur im Club statt). Die App rechnet sie in eine
-- Kartenposition um; die Adresse steht auf der Eventseite, auch wenn der Punkt auf der Karte etwas daneben liegt.
begin;
do $$ begin
  if to_regprocedure('spots_accounts_private.apply_event_venue()') is null or to_regclass('public.venues') is null then
    raise exception 'SQL 15, 21, 22 and 27 required first';
  end if;
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='events' and column_name='street') then
    raise exception 'Event address already exists; inspect instead of replaying';
  end if;
end $$;

-- Neue, leere Spalten. Importe (Goabase, Ticketmaster, Redaktion) lassen sie leer.
alter table public.events
  add column street text check (char_length(btrim(street)) between 1 and 200),
  add column house_number text check (char_length(btrim(house_number)) between 1 and 20),
  add column postcode text check (postcode ~ '^[0-9]{5}$');
grant insert(street, house_number, postcode), update(street, house_number, postcode) on public.events to authenticated;

-- Club-Events brauchen ein Ende. NOT VALID: gilt für neue und geänderte Zeilen, bestehende bleiben unangetastet.
alter table public.events add constraint events_spots_end_required
  check (source <> 'spots' or ends_at is not null) not valid;

-- Ort aus dem Adressbuch: zusätzlich Straße, Hausnummer und PLZ vom Ort übernehmen (sonst wie SQL 27).
create or replace function spots_accounts_private.apply_event_venue() returns trigger
language plpgsql security definer set search_path='' as $$
declare v public.venues%rowtype;
begin
  select * into v from public.venues where id = new.venue_id and is_published;
  if not found then raise exception 'Venue is not available'; end if;
  new.venue_name := v.name;
  new.city := v.city;
  new.latitude := v.latitude;
  new.longitude := v.longitude;
  new.street := nullif(btrim(v.street), '');
  new.house_number := nullif(btrim(v.house_number), '');
  new.postcode := case when v.postcode ~ '^[0-9]{5}$' then v.postcode end;
  return new;
end $$;
drop trigger events_spots_venue on public.events;
create trigger events_spots_venue before insert or update of venue_id, venue_name, city, latitude, longitude, street, house_number, postcode
  on public.events for each row when (new.source = 'spots' and new.venue_id is not null)
  execute function spots_accounts_private.apply_event_venue();
commit;
