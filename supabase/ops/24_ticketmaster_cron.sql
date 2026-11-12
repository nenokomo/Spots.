-- Zeitplan für den Ticketmaster-Import (Edge Function import-ticketmaster).
-- Reihenfolge: lokal (PGlite) → Spots-Test → Produktion nur mit Freigabe von Jacint und Noyan.
-- Voraussetzungen: SQL 20 und genau je ein Vault-Eintrag 'spots_project_url' und
-- 'spots_import_goabase_secret_key' (Default Secret des Projekts; in Produktion von Goabase
-- vorhanden, in Spots-Test legt Jacint sie an). Diese Datei enthält keine Schlüssel.
--
-- Ablauf: Der Job läuft stündlich, startet den Import aber höchstens alle 6 Stunden.
-- Schlägt ein Lauf fehl (HTTP ≠ 200/409, Zeitüberschreitung, keine Antwort nach 1 Stunde,
-- falscher Vault-Eintrag), pausiert sich der Job selbst und startet nichts mehr.
-- Die Datei legt den Job INAKTIV an. Aktivieren (auch nach Prüfung einer Pause):
--   select spots_sync_private.ticketmaster_cron_resume();
begin;
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

-- Wie in 11: cron nicht für Client-Rollen. Die PUBLIC-Rechte von net gehören Supabase.
revoke all on schema cron from public, anon, authenticated;
revoke all on all tables in schema cron from public, anon, authenticated;
revoke all on all sequences in schema cron from public, anon, authenticated;
revoke all on all functions in schema cron from public, anon, authenticated;

-- Nur Zuordnung und Ergebnis, keine Schlüssel, Header, URLs oder Eventdaten.
create table if not exists spots_sync_private.ticketmaster_cron_dispatches (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default clock_timestamp(),
  request_id bigint unique,
  status_code integer,
  dispatch_error text check (dispatch_error ~ '^[A-Z0-9]{5}$'),
  reviewed_at timestamptz,
  check (request_id is null or dispatch_error is null)
);
alter table spots_sync_private.ticketmaster_cron_dispatches enable row level security;
revoke all on spots_sync_private.ticketmaster_cron_dispatches from public, anon, authenticated, service_role;

create or replace function spots_sync_private.ticketmaster_cron_tick() returns text
language plpgsql set search_path = '' as $$
declare
  job bigint;
  last spots_sync_private.ticketmaster_cron_dispatches%rowtype;
  attempt uuid := gen_random_uuid();
  project_url text;
  call_key text;
  request bigint;
begin
  perform pg_advisory_xact_lock(732481, 4);
  select jobid into strict job from cron.job where jobname = 'spots-import-ticketmaster';

  -- pg_net hebt Antworten nur einige Stunden auf: Ergebnis sofort übernehmen (0 = Zeitüberschreitung/Netzfehler).
  update spots_sync_private.ticketmaster_cron_dispatches d
    set status_code = case when coalesce(r.timed_out, false) or r.error_msg is not null then 0 else r.status_code end
    from net._http_response r
    where r.id = d.request_id and d.status_code is null;

  select * into last from spots_sync_private.ticketmaster_cron_dispatches
    order by created_at desc, id desc limit 1;
  if found and last.reviewed_at is null then
    if last.dispatch_error is not null
      or (last.status_code is not null and last.status_code not in (200, 409))
      or (last.status_code is null and last.created_at < clock_timestamp() - interval '1 hour') then
      perform cron.alter_job(job, active := false);
      raise warning 'Ticketmaster-Zeitplan pausiert: letzter Lauf fehlgeschlagen, bitte prüfen';
      return 'paused';
    end if;
    if last.created_at > clock_timestamp() - interval '5 hours 50 minutes' then
      return 'waiting';
    end if;
  end if;

  begin
    select decrypted_secret into strict project_url from vault.decrypted_secrets where name = 'spots_project_url';
    select decrypted_secret into strict call_key from vault.decrypted_secrets where name = 'spots_import_goabase_secret_key';
    if project_url is null
      or project_url not in ('https://yhnxdeypkbzyjappuzmv.supabase.co', 'https://nfomkdvotqtlyymomksb.supabase.co')
      or call_key is null or call_key !~ '^sb_secret_[A-Za-z0-9_-]+$' then
      raise exception 'Invalid Vault configuration; values withheld';
    end if;
    insert into spots_sync_private.ticketmaster_cron_dispatches(id) values (attempt);
    select net.http_post(
      url := project_url || '/functions/v1/import-ticketmaster',
      headers := jsonb_build_object('Content-Type', 'application/json', 'apikey', call_key),
      body := '{}'::jsonb, timeout_milliseconds := 150000
    ) into request;
    if request is null then raise exception 'HTTP request ID missing'; end if;
    update spots_sync_private.ticketmaster_cron_dispatches set request_id = request where id = attempt;
    call_key := null;
    return 'dispatched';
  exception when others then
    call_key := null;
    -- Die innere Transaktion ist zurückgerollt; nur ein Fehlermarker ohne Werte bleibt.
    insert into spots_sync_private.ticketmaster_cron_dispatches(id, dispatch_error)
      values (attempt, sqlstate) on conflict do nothing;
    perform cron.alter_job(job, active := false);
    raise warning 'Ticketmaster-Zeitplan pausiert; SQLSTATE %, keine Werte', sqlstate;
    return 'paused';
  end;
end;
$$;

-- Nach Prüfung: bisherige Läufe als geprüft markieren und den Job (wieder) einschalten.
create or replace function spots_sync_private.ticketmaster_cron_resume() returns void
language plpgsql set search_path = '' as $$
declare job bigint;
begin
  perform pg_advisory_xact_lock(732481, 4);
  select jobid into strict job from cron.job where jobname = 'spots-import-ticketmaster';
  update spots_sync_private.ticketmaster_cron_dispatches
    set reviewed_at = clock_timestamp() where reviewed_at is null;
  perform cron.alter_job(job, active := true);
end;
$$;

revoke all on function spots_sync_private.ticketmaster_cron_tick() from public, anon, authenticated, service_role;
revoke all on function spots_sync_private.ticketmaster_cron_resume() from public, anon, authenticated, service_role;

-- Job nur anlegen, wenn es ihn noch nicht gibt (cron.schedule würde einen gleichnamigen überschreiben).
do $prepare$
declare prepared bigint;
begin
  if not exists (select 1 from cron.job where jobname = 'spots-import-ticketmaster') then
    prepared := cron.schedule('spots-import-ticketmaster', '17 * * * *',
      'select spots_sync_private.ticketmaster_cron_tick()');
    perform cron.alter_job(prepared, active := false);
  end if;
end;
$prepare$;
commit;
