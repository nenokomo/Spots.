-- Etappe 2 (Veranstalter): getrennte Kontoarten. Clubs registrieren sich direkt als Veranstalter.
-- Manueller Betriebsschritt, transaktional. Voraussetzung: 15, 25, 26 und 27. Ändert keine Event-Zeilen.
-- Kontoart wird bei der Registrierung festgelegt (privat oder Veranstalter) und ist danach nicht änderbar.
-- Ansprechperson und Telefon liegen privat; sehen können sie nur Mitglieder des Veranstalters und das Spots-Team.
begin;
do $$ begin
  if to_regclass('public.user_profiles') is null or to_regprocedure('public.spots_delete_my_account()') is null
    or not exists(select 1 from information_schema.columns where table_schema='public' and table_name='organizers' and column_name='review_status')
    or to_regprocedure('spots_accounts_private.is_member_folder(text)') is null then
    raise exception 'SQL 15, 25, 26 and 27 required first';
  end if;
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='user_profiles' and column_name='account_type')
    or to_regclass('spots_accounts_private.organizer_contacts') is not null then
    raise exception 'Signup objects already exist; inspect instead of replaying';
  end if;
end $$;

-- ---------------------------------------------------------------------------------------------
-- 1) Kontoart und Club-Angaben
-- ---------------------------------------------------------------------------------------------
alter table public.user_profiles
  add column account_type text not null default 'private' check (account_type in ('private','organizer'));
-- Kein Schreibrecht für Nutzer: Die bestehenden Rechte aus SQL 15 gelten nur für display_name.

alter table public.organizers
  add column street text check (char_length(btrim(street)) between 1 and 200),
  add column house_number text check (char_length(btrim(house_number)) between 1 and 20),
  add column postcode text check (postcode ~ '^[0-9]{5}$'),
  add column social_url text check (social_url ~ '^https://[^[:space:]@]+$' and char_length(social_url) <= 500);
grant update(street, house_number, postcode, social_url) on public.organizers to authenticated;

create table spots_accounts_private.organizer_contacts (
  organizer_id uuid primary key references public.organizers(id) on delete cascade,
  contact_name text not null check (char_length(btrim(contact_name)) between 2 and 120),
  phone text not null check (phone ~ '^\+?[0-9][0-9 ()/-]{5,29}$'),
  updated_at timestamptz not null default now()
);
alter table spots_accounts_private.organizer_contacts enable row level security;
revoke all on spots_accounts_private.organizer_contacts from public, anon, authenticated;

-- Adresse eines Veranstalters: lesbare Kurzform aus dem Namen, bei Kollision mit Zufallsanhang.
create function spots_accounts_private.new_slug(p_name text) returns text
language plpgsql volatile set search_path='' as $$
declare base text; candidate text; attempts integer := 0;
begin
  base := lower(coalesce(p_name, ''));
  base := replace(replace(replace(replace(base, 'ä', 'ae'), 'ö', 'oe'), 'ü', 'ue'), 'ß', 'ss');
  base := btrim(regexp_replace(base, '[^a-z0-9]+', '-', 'g'), '-');
  base := btrim(left(base, 50), '-');
  if char_length(base) < 3 then base := 'veranstalter'; end if;
  candidate := base;
  while exists(select 1 from public.organizers where slug = candidate) loop
    attempts := attempts + 1;
    if attempts > 20 then raise exception 'No free slug'; end if;
    candidate := base || '-' || substr(md5(random()::text), 1, 4);
  end loop;
  return candidate;
end $$;

-- Legt den Club an (Antrag direkt gestellt), macht das Konto zum Besitzer und speichert die Ansprechperson.
create function spots_accounts_private.register_organizer(p_user uuid, p_data jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare
  result uuid;
  v_name text := btrim(p_data->>'name');
  v_street text := btrim(p_data->>'street');
  v_number text := btrim(p_data->>'house_number');
  v_postcode text := btrim(p_data->>'postcode');
  v_city text := btrim(p_data->>'city');
  v_website text := nullif(btrim(p_data->>'website_url'), '');
  v_social text := nullif(btrim(p_data->>'social_url'), '');
  v_contact text := btrim(p_data->>'contact_name');
  v_phone text := btrim(p_data->>'phone');
begin
  if p_user is null or p_data is null or jsonb_typeof(p_data) <> 'object' then raise exception 'Organizer data required'; end if;
  if coalesce(char_length(v_name), 0) not between 2 and 120 or coalesce(char_length(v_street), 0) not between 1 and 200
    or coalesce(char_length(v_number), 0) not between 1 and 20 or coalesce(v_postcode, '') !~ '^[0-9]{5}$'
    or coalesce(char_length(v_city), 0) not between 1 and 120 or coalesce(char_length(v_contact), 0) not between 2 and 120
    or coalesce(v_phone, '') !~ '^\+?[0-9][0-9 ()/-]{5,29}$'
    or (v_website is not null and (v_website !~ '^https://[^[:space:]@]+$' or char_length(v_website) > 500))
    or (v_social is not null and (v_social !~ '^https://[^[:space:]@]+$' or char_length(v_social) > 500)) then
    raise exception 'Invalid organizer data';
  end if;
  if exists(select 1 from public.organizer_memberships where user_id = p_user and role = 'owner') then
    raise exception 'Organizer already registered';
  end if;
  insert into public.organizers(slug, display_name, street, house_number, postcode, city, website_url, social_url, review_status, submitted_at)
    values (spots_accounts_private.new_slug(v_name), v_name, v_street, v_number, v_postcode, v_city, v_website, v_social, 'pending', now())
    returning id into result;
  insert into public.organizer_memberships(organizer_id, user_id, role) values (result, p_user, 'owner');
  insert into spots_accounts_private.organizer_contacts(organizer_id, contact_name, phone) values (result, v_contact, v_phone);
  return result;
end $$;

-- Neue Konten: Kontoart aus der Registrierung übernehmen. Club-Angaben werden danach aus den Metadaten entfernt.
-- Scheitert das Anlegen des Clubs (z. B. ungültige Angaben), bleibt die Registrierung gültig; die App fragt
-- die Angaben nach der ersten Anmeldung erneut ab (spots_register_organizer).
create function spots_accounts_private.on_auth_user_created() returns trigger
language plpgsql security definer set search_path='' as $$
declare kind text := case when new.raw_user_meta_data->>'account_type' = 'organizer' then 'organizer' else 'private' end;
begin
  insert into public.user_profiles(id, account_type) values (new.id, kind) on conflict (id) do nothing;
  if kind = 'organizer' then
    begin
      perform spots_accounts_private.register_organizer(new.id, new.raw_user_meta_data->'organizer');
    exception when others then
      null;
    end;
    update auth.users set raw_user_meta_data = raw_user_meta_data - 'organizer' where id = new.id;
  end if;
  return null;
end $$;
create trigger spots_on_auth_user_created after insert on auth.users
  for each row execute function spots_accounts_private.on_auth_user_created();

-- Nachholen für Veranstalter-Konten ohne Club (siehe oben). Private Konten können nie Veranstalter werden.
create function public.spots_register_organizer(p_data jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare caller uuid := auth.uid();
begin
  if caller is null then raise insufficient_privilege using message = 'Sign in required'; end if;
  if not exists(select 1 from public.user_profiles where id = caller and account_type = 'organizer') then
    raise insufficient_privilege using message = 'Organizer account required';
  end if;
  return spots_accounts_private.register_organizer(caller, p_data);
end $$;

-- Weitere Veranstalter nur für Veranstalter-Konten (höchstens drei, wie in SQL 26).
create or replace function public.create_organizer(p_slug text, p_display_name text) returns uuid
language plpgsql security definer set search_path='' as $$
declare result uuid; caller uuid := auth.uid();
begin
  if caller is null then raise insufficient_privilege using message='Sign in required'; end if;
  if not exists(select 1 from public.user_profiles where id = caller and account_type = 'organizer') then
    raise insufficient_privilege using message = 'Organizer account required';
  end if;
  if (select count(*) from public.organizer_memberships where user_id = caller and role = 'owner') >= 3 then
    raise exception 'Organizer limit reached';
  end if;
  insert into public.organizers(slug, display_name) values (p_slug, p_display_name) returning id into result;
  insert into public.organizer_memberships(organizer_id, user_id, role) values (result, caller, 'owner');
  return result;
end $$;

-- Eigene Kontoart (für die App: welche Oberfläche?).
create function public.spots_my_account_type() returns text
language sql stable security definer set search_path='' as $$
  select coalesce((select account_type from public.user_profiles where id = (select auth.uid())), 'private')
$$;

-- Ansprechperson lesen (Mitglieder) und ändern (Besitzer).
create function public.spots_organizer_contact(p_organizer_id uuid) returns table(contact_name text, phone text)
language plpgsql stable security definer set search_path='' as $$
begin
  if not spots_accounts_private.is_member(p_organizer_id) then raise insufficient_privilege using message = 'Member required'; end if;
  return query select c.contact_name, c.phone from spots_accounts_private.organizer_contacts c where c.organizer_id = p_organizer_id;
end $$;

create function public.spots_organizer_set_contact(p_organizer_id uuid, p_contact_name text, p_phone text) returns boolean
language plpgsql security definer set search_path='' as $$
begin
  if not spots_accounts_private.is_owner(p_organizer_id) then raise insufficient_privilege using message = 'Owner required'; end if;
  insert into spots_accounts_private.organizer_contacts(organizer_id, contact_name, phone)
    values (p_organizer_id, btrim(p_contact_name), btrim(p_phone))
    on conflict (organizer_id) do update set contact_name = excluded.contact_name, phone = excluded.phone, updated_at = now();
  return true;
end $$;

-- Verlässt das letzte Mitglied einen Veranstalter (z. B. Konto gelöscht), verschwinden Ansprechperson und offener Antrag.
create function spots_accounts_private.on_membership_removed() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if not exists(select 1 from public.organizer_memberships where organizer_id = old.organizer_id) then
    delete from spots_accounts_private.organizer_contacts where organizer_id = old.organizer_id;
    update public.organizers set review_status = 'draft', submitted_at = null where id = old.organizer_id and review_status = 'pending';
  end if;
  return null;
end $$;
create trigger organizer_membership_removed after delete on public.organizer_memberships
  for each row execute function spots_accounts_private.on_membership_removed();

-- ---------------------------------------------------------------------------------------------
-- 2) Prüfliste fürs Team: zusätzlich Adresse, Social Media, Ansprechperson, Telefon und ob die Mail bestätigt ist.
-- ---------------------------------------------------------------------------------------------
drop function public.spots_admin_organizer_queue(text);
create function public.spots_admin_organizer_queue(p_status text default null)
returns table(id uuid, slug text, display_name text, city text, biography text, website_url text, avatar_url text,
  review_status text, review_note text, submitted_at timestamptz, reviewed_at timestamptz, owner_email text,
  event_count bigint, street text, house_number text, postcode text, social_url text, contact_name text, phone text,
  email_confirmed boolean)
language plpgsql stable security definer set search_path='' as $$
begin
  if not spots_admin_private.is_admin() then raise exception 'Not allowed'; end if;
  return query
    select o.id, o.slug, o.display_name, o.city, o.biography, o.website_url, o.avatar_url,
      o.review_status, o.review_note, o.submitted_at, o.reviewed_at, owner.email,
      (select count(*) from public.events e where e.organizer_id = o.id),
      o.street, o.house_number, o.postcode, o.social_url, c.contact_name, c.phone, owner.confirmed
    from public.organizers o
    left join spots_accounts_private.organizer_contacts c on c.organizer_id = o.id
    left join lateral (
      select u.email::text as email, u.email_confirmed_at is not null as confirmed
      from public.organizer_memberships m join auth.users u on u.id = m.user_id
      where m.organizer_id = o.id and m.role = 'owner' limit 1
    ) owner on true
    where (p_status is null and o.review_status <> 'draft') or o.review_status = p_status
    order by (o.review_status = 'pending') desc, o.submitted_at nulls last, o.created_at
    limit 200;
end $$;

revoke all on function spots_accounts_private.new_slug(text), spots_accounts_private.register_organizer(uuid, jsonb),
  spots_accounts_private.on_auth_user_created(), spots_accounts_private.on_membership_removed() from public, anon, authenticated;
revoke all on function public.spots_register_organizer(jsonb), public.spots_my_account_type(),
  public.spots_organizer_contact(uuid), public.spots_organizer_set_contact(uuid, text, text),
  public.spots_admin_organizer_queue(text) from public, anon, authenticated;
grant execute on function public.spots_register_organizer(jsonb), public.spots_my_account_type(),
  public.spots_organizer_contact(uuid), public.spots_organizer_set_contact(uuid, text, text),
  public.spots_admin_organizer_queue(text) to authenticated;
commit;
