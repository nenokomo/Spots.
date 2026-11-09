-- PREPARED ONLY. Requires explicit combined production automation approval.
-- The executing runner must verify yhnxdeypkbzyjappuzmv before every remote action.
begin;
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

-- Supabase owns net as supabase_admin. Its PUBLIC grants are required by pg_net
-- and cannot be revoked by postgres. Do not change owners or platform ACLs.
-- Before using Vault/pg_net, verify net is NOT exposed in the Data API and
-- that direct LOGIN roles are trusted; anon/authenticated/service_role are NOLOGIN.
-- https://supabase.com/kb/troubleshooting/revoking-access-to-pg_net-objects-has-no-effect-0bbc16
revoke all on schema cron from public, anon, authenticated;
revoke all on all tables in schema cron from public, anon, authenticated;
revoke all on all sequences in schema cron from public, anon, authenticated;
revoke all on all functions in schema cron from public, anon, authenticated;

-- Correlation metadata only; no keys, request headers, URLs or event payloads.
create table spots_sync_private.goabase_cron_dispatches (
 id uuid primary key default gen_random_uuid(),
 job_id bigint not null,
 phase text not null check(phase in ('controlled','scheduled')),
 created_at timestamptz not null default clock_timestamp(),
 request_id bigint unique,
 dispatch_error text check(dispatch_error ~ '^[A-Z0-9]{5}$'),
 check(request_id is null or dispatch_error is null)
);
create unique index goabase_cron_one_controlled
 on spots_sync_private.goabase_cron_dispatches(phase) where phase='controlled';
alter table spots_sync_private.goabase_cron_dispatches enable row level security;
revoke all on spots_sync_private.goabase_cron_dispatches from public,anon,authenticated,service_role;
commit;
