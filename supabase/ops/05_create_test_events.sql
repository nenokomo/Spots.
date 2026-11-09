-- Spots-Test bootstrap, based on the column schema supplied by the user.
-- Run only after explicit approval, with the verified nfomkdvotqtlyymomksb target.
-- Never replaces an existing events table. No seed data, extensions, or Cron.
begin;
do $guard$
begin
  if to_regclass('public.events') is not null then
    raise exception 'events already exists; inspect it before bootstrap';
  end if;
end;
$guard$;

create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  genre text,
  category text,
  venue_name text,
  city text,
  latitude double precision,
  longitude double precision,
  starts_at timestamptz not null,
  ends_at timestamptz,
  image_url text,
  ticket_url text,
  source text not null,
  source_event_id text,
  source_url text,
  status text not null default 'scheduled',
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  constraint events_source_source_event_id_key unique(source, source_event_id)
);

alter table public.events enable row level security;
revoke all on table public.events from public, anon, authenticated;
grant select on table public.events to anon, authenticated;
grant all on table public.events to service_role;
create policy events_public_read on public.events
  for select to anon, authenticated
  using (is_published and status = 'scheduled');
commit;
