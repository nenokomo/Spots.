-- Admin-Bereich für das Spots-Team: Event-Entwürfe freigeben, Orte prüfen, Meldungen bearbeiten.
-- Manueller Betriebsschritt, keine automatische Migration. Voraussetzung: 05, 15 (Konten) und 21 (Orte).
-- Admins werden nur per SQL eingetragen (keine Selbstanmeldung). Wiederholbar.
begin;
create schema if not exists spots_admin_private;
revoke all on schema spots_admin_private from public, anon, authenticated;
-- Wie bei SQL 15: Policies rufen die Prüffunktion auf, dafür braucht die Rolle Zugriff aufs Schema.
grant usage on schema spots_admin_private to authenticated;

create table if not exists spots_admin_private.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  note text check (char_length(note) <= 200),
  added_at timestamptz not null default now()
);
alter table spots_admin_private.admins enable row level security;
revoke all on spots_admin_private.admins from public, anon, authenticated;

create or replace function spots_admin_private.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from spots_admin_private.admins a where a.user_id = (select auth.uid()));
$$;
revoke all on function spots_admin_private.is_admin() from public, anon;
grant execute on function spots_admin_private.is_admin() to authenticated;

create or replace function public.spots_is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select spots_admin_private.is_admin();
$$;
revoke all on function public.spots_is_admin() from public, anon;
grant execute on function public.spots_is_admin() to authenticated;

-- Redaktionelle Events gehören zu einem Ort; Importe bleiben ohne Ort.
alter table public.events add column if not exists venue_id uuid references public.venues(id) on delete set null;
create index if not exists events_venue_upcoming on public.events (venue_id, starts_at) where venue_id is not null;

create table if not exists public.event_drafts (
  id uuid primary key default gen_random_uuid(),
  origin text not null default 'manual' check (origin in ('manual', 'website')),
  venue_id uuid references public.venues(id) on delete set null,
  title text not null check (char_length(btrim(title)) between 1 and 200),
  starts_at timestamptz not null,
  ends_at timestamptz check (ends_at is null or ends_at > starts_at),
  genre text check (char_length(genre) <= 40),
  category text not null default 'club' check (category in ('club', 'concert', 'event')),
  ticket_url text check (ticket_url ~ '^https://[^\s]+$' and char_length(ticket_url) <= 500),
  source_url text check (source_url ~ '^https://[^\s]+$' and char_length(source_url) <= 500),
  -- Herkunft ist Pflicht: woher stammt die Angabe (Website, Instagram-Post, Telefonat mit …)? Keine erfundenen Events.
  provenance text not null check (char_length(btrim(provenance)) between 3 and 500),
  status text not null default 'open' check (status in ('open', 'approved', 'rejected')),
  review_note text check (char_length(review_note) <= 500),
  event_id uuid references public.events(id) on delete set null,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz
);
alter table public.event_drafts enable row level security;
revoke all on public.event_drafts from public, anon, authenticated;
grant select, insert, update, delete on public.event_drafts to authenticated;
grant all on public.event_drafts to service_role;
drop policy if exists event_drafts_admin on public.event_drafts;
create policy event_drafts_admin on public.event_drafts for all to authenticated
  using (spots_admin_private.is_admin()) with check (spots_admin_private.is_admin() and status = 'open');

-- Admins sehen auch ungeprüfte Orte und alle Meldungen.
drop policy if exists venues_admin_read on public.venues;
create policy venues_admin_read on public.venues for select to authenticated using (spots_admin_private.is_admin());
grant select on public.venue_reports to authenticated;
drop policy if exists venue_reports_admin_read on public.venue_reports;
create policy venue_reports_admin_read on public.venue_reports for select to authenticated using (spots_admin_private.is_admin());

-- Entwurf freigeben: legt ein Event der Quelle „redaktion“ am Ort des Entwurfs an.
create or replace function public.spots_admin_approve_draft(p_draft_id uuid, p_publish boolean default true) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  d public.event_drafts%rowtype;
  v public.venues%rowtype;
  new_id uuid;
begin
  if not spots_admin_private.is_admin() then raise exception 'Not allowed'; end if;
  select * into d from public.event_drafts where id = p_draft_id for update;
  if not found or d.status <> 'open' then raise exception 'Draft is not open'; end if;
  select * into v from public.venues where id = d.venue_id;
  if not found then raise exception 'Draft needs a venue'; end if;
  if v.review_status = 'hidden' then raise exception 'Venue is hidden'; end if;
  insert into public.events(title, genre, category, venue_name, city, latitude, longitude, starts_at, ends_at,
    ticket_url, source, source_event_id, source_url, status, is_published, venue_id)
  values (btrim(d.title), nullif(btrim(d.genre), ''), d.category, v.name, v.city, v.latitude, v.longitude,
    d.starts_at, d.ends_at, d.ticket_url, 'redaktion', d.id::text, coalesce(d.source_url, d.ticket_url),
    'scheduled', coalesce(p_publish, true), v.id)
  returning id into new_id;
  update public.event_drafts set status = 'approved', event_id = new_id, reviewed_by = auth.uid(), reviewed_at = now()
    where id = d.id;
  return new_id;
end;
$$;

create or replace function public.spots_admin_reject_draft(p_draft_id uuid, p_note text default null) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if not spots_admin_private.is_admin() then raise exception 'Not allowed'; end if;
  if char_length(coalesce(p_note, '')) > 500 then raise exception 'Note too long'; end if;
  update public.event_drafts set status = 'rejected', review_note = nullif(btrim(p_note), ''),
    reviewed_by = auth.uid(), reviewed_at = now()
    where id = p_draft_id and status = 'open';
  if not found then raise exception 'Draft is not open'; end if;
  return true;
end;
$$;

-- Nur redaktionelle Events lassen sich hier ein- und ausblenden; Importe und Veranstalter-Events nie.
create or replace function public.spots_admin_set_event_published(p_event_id uuid, p_published boolean) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if not spots_admin_private.is_admin() or p_published is null then raise exception 'Not allowed'; end if;
  update public.events set is_published = p_published where id = p_event_id and source = 'redaktion';
  if not found then raise exception 'Only editorial events'; end if;
  return true;
end;
$$;

create or replace function public.spots_admin_set_venue_status(p_venue_id uuid, p_status text) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if not spots_admin_private.is_admin() or p_status not in ('approved', 'hidden', 'pending') then
    raise exception 'Not allowed';
  end if;
  update public.venues set review_status = p_status, is_published = (p_status = 'approved'), updated_at = now()
    where id = p_venue_id;
  if not found then raise exception 'Unknown venue'; end if;
  return true;
end;
$$;

create or replace function public.spots_admin_resolve_report(p_report_id uuid, p_status text) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if not spots_admin_private.is_admin() or p_status not in ('resolved', 'dismissed') then raise exception 'Not allowed'; end if;
  update public.venue_reports set status = p_status, resolved_at = now() where id = p_report_id and status = 'open';
  if not found then raise exception 'Report is not open'; end if;
  return true;
end;
$$;

revoke all on function public.spots_admin_approve_draft(uuid, boolean) from public, anon;
revoke all on function public.spots_admin_reject_draft(uuid, text) from public, anon;
revoke all on function public.spots_admin_set_event_published(uuid, boolean) from public, anon;
revoke all on function public.spots_admin_set_venue_status(uuid, text) from public, anon;
revoke all on function public.spots_admin_resolve_report(uuid, text) from public, anon;
grant execute on function public.spots_admin_approve_draft(uuid, boolean) to authenticated;
grant execute on function public.spots_admin_reject_draft(uuid, text) to authenticated;
grant execute on function public.spots_admin_set_event_published(uuid, boolean) to authenticated;
grant execute on function public.spots_admin_set_venue_status(uuid, text) to authenticated;
grant execute on function public.spots_admin_resolve_report(uuid, text) to authenticated;
commit;
