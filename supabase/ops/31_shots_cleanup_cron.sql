-- Zeitplan fürs Aufräumen abgelaufener Shots (Edge Function cleanup-snaps, SQL 30).
-- Supabase-spezifisch (pg_cron, pg_net, Vault); nicht in PGlite testbar. Reihenfolge: Spots-Test → Produktion nur mit
-- Freigabe von Jacint und Noyan. Voraussetzung: Function cleanup-snaps bereitgestellt und genau je ein Vault-Eintrag
-- 'spots_project_url' und 'spots_import_goabase_secret_key' (wie SQL 24). Diese Datei enthält keine Schlüssel.
-- Der Job läuft stündlich (Minute 43). Aufräumen ist wiederholbar: Ein ausgefallener Lauf wird beim nächsten nachgeholt.
begin;
do $$ begin
  if to_regprocedure('public.spots_snaps_cleanup_list(integer)') is null then raise exception 'SQL 30 required first'; end if;
  if to_regnamespace('cron') is null or to_regnamespace('net') is null then raise exception 'pg_cron and pg_net required'; end if;
  if exists(select 1 from cron.job where jobname = 'spots-cleanup-snaps') then
    raise exception 'Cleanup job already exists; inspect instead of replaying';
  end if;
end $$;

create function spots_content_private.snaps_cleanup_tick() returns text
language plpgsql set search_path = '' as $$
declare project_url text; call_key text; request bigint;
begin
  select decrypted_secret into strict project_url from vault.decrypted_secrets where name = 'spots_project_url';
  select decrypted_secret into strict call_key from vault.decrypted_secrets where name = 'spots_import_goabase_secret_key';
  if project_url not in ('https://yhnxdeypkbzyjappuzmv.supabase.co', 'https://nfomkdvotqtlyymomksb.supabase.co')
    or call_key !~ '^sb_secret_[A-Za-z0-9_-]+$' then
    raise exception 'Invalid Vault configuration; values withheld';
  end if;
  select net.http_post(
    url := project_url || '/functions/v1/cleanup-snaps',
    headers := jsonb_build_object('Content-Type', 'application/json', 'apikey', call_key),
    body := '{}'::jsonb, timeout_milliseconds := 60000
  ) into request;
  call_key := null;
  return 'dispatched';
end $$;
revoke all on function spots_content_private.snaps_cleanup_tick() from public, anon, authenticated, service_role;

select cron.schedule('spots-cleanup-snaps', '43 * * * *', 'select spots_content_private.snaps_cleanup_tick()');
commit;
