-- Partner-Anfragen von der Website (/veranstalter, Kontaktformular).
-- Manueller Betriebsschritt, keine automatische Migration. Zuerst lokal (PGlite) und in Spots-Test.
-- Anfragen liegen in einem privaten Schema: weder anonym noch mit Konto lesbar, nur über das Dashboard
-- (Service-Rolle). Schreiben nur über spots_partner_request mit Prüfungen und Grenzen. Wiederholbar.
begin;
create schema if not exists spots_partner_private;
revoke all on schema spots_partner_private from public, anon, authenticated;

create table if not exists spots_partner_private.partner_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  organization text not null check (char_length(organization) between 1 and 160),
  email text not null check (char_length(email) <= 200 and email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]{2,}$'),
  city text not null check (char_length(city) between 1 and 120),
  kind text not null check (kind in ('Club', 'Bar', 'Event-Crew / Kollektiv', 'Festival / Open Air', 'Konzertveranstalter', 'Sonstiges')),
  phone text check (char_length(phone) <= 40),
  website text check (char_length(website) <= 300),
  message text check (char_length(message) <= 2000),
  status text not null default 'new' check (status in ('new', 'contacted', 'partner', 'declined')),
  created_at timestamptz not null default now()
);
create index if not exists partner_requests_email_recent on spots_partner_private.partner_requests (lower(email), created_at);
alter table spots_partner_private.partner_requests enable row level security;
revoke all on spots_partner_private.partner_requests from public, anon, authenticated;
grant all on spots_partner_private.partner_requests to service_role;
grant usage on schema spots_partner_private to service_role;

create or replace function public.spots_partner_request(
  p_name text, p_organization text, p_email text, p_city text, p_kind text,
  p_phone text default null, p_website text default null, p_message text default null
) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
begin
  if char_length(btrim(coalesce(p_name, ''))) not between 1 and 120
     or char_length(btrim(coalesce(p_organization, ''))) not between 1 and 160
     or char_length(btrim(coalesce(p_city, ''))) not between 1 and 120
     or char_length(v_email) > 200 or v_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]{2,}$'
     or coalesce(p_kind, '') not in ('Club', 'Bar', 'Event-Crew / Kollektiv', 'Festival / Open Air', 'Konzertveranstalter', 'Sonstiges')
     or char_length(coalesce(p_phone, '')) > 40 or char_length(coalesce(p_website, '')) > 300
     or char_length(coalesce(p_message, '')) > 2000 then
    raise exception 'Invalid partner request';
  end if;
  -- Schutz vor Missbrauch ohne IP-Speicherung: insgesamt höchstens 60 Anfragen pro Stunde.
  if (select count(*) from spots_partner_private.partner_requests where created_at > now() - interval '1 hour') >= 60 then
    raise exception 'Too many partner requests';
  end if;
  -- Dieselbe Adresse höchstens dreimal pro Tag; weitere Versuche werden still verworfen (gleiche Antwort).
  if (select count(*) from spots_partner_private.partner_requests
      where lower(email) = v_email and created_at > now() - interval '1 day') >= 3 then
    return true;
  end if;
  insert into spots_partner_private.partner_requests(name, organization, email, city, kind, phone, website, message)
  values (btrim(p_name), btrim(p_organization), v_email, btrim(p_city), p_kind,
    nullif(btrim(coalesce(p_phone, '')), ''), nullif(btrim(coalesce(p_website, '')), ''), nullif(btrim(coalesce(p_message, '')), ''));
  return true;
end;
$$;

revoke all on function public.spots_partner_request(text, text, text, text, text, text, text, text) from public;
grant execute on function public.spots_partner_request(text, text, text, text, text, text, text, text) to anon, authenticated, service_role;
commit;
