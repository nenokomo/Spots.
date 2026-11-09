-- REVIEW TEMPLATE ONLY; NOT a migration and NOT executed against production.
-- Default gate blocks execution. Read GOABASE_SYNC.md and inspect the importer first.
-- When reviewed, this prepares ONE INACTIVE job; it never activates any job.
begin;

do $prepare$
declare
  inventory_reviewed boolean := false; -- change only after 00/01 and wrapper review
  candidate_count integer;
  prepared_job_id bigint;
  expected_job_name constant text := 'spots-import-goabase-2h';
begin
  if not inventory_reviewed then
    raise exception 'Blocked: inspect existing jobs, function auth and importer safety first.';
  end if;
  if to_regclass('cron.job') is null or to_regclass('vault.secrets') is null
     or not exists (select 1 from pg_extension where extname = 'pg_net') then
    raise exception 'Missing Cron, Vault or pg_net; inspect extensions before proceeding.';
  end if;
  if coalesce(current_setting('cron.timezone', true), 'GMT') not in ('GMT', 'UTC', 'Etc/UTC') then
    raise exception 'Unexpected Cron timezone. Review it before preparing the two-hour schedule.';
  end if;

  -- Serializes concurrent executions of THIS preparation template only.
  -- This is not an importer lock; pg_net enqueues asynchronous work.
  perform pg_advisory_xact_lock(732481, 2);
  select count(*) into candidate_count
  from cron.job
  where command ilike '%import-goabase%' or jobname ilike '%goabase%';
  if candidate_count > 0 then
    raise notice 'Existing Goabase job(s) found: %. No job created or changed. Review and reuse the correct job ID.', candidate_count;
    return;
  end if;
  if (select count(*) from vault.secrets where name = 'spots_project_url') <> 1
     or (select count(*) from vault.secrets where name = 'spots_import_goabase_secret_key') <> 1 then
    raise exception 'Each required Vault secret name must exist exactly once.';
  end if;

  prepared_job_id := cron.schedule(expected_job_name, '0 */2 * * *', $command$
    do $invoke$
    declare
      project_url text;
      call_key text;
      request_id bigint;
    begin
      select decrypted_secret into strict project_url
      from vault.decrypted_secrets where name = 'spots_project_url';
      select decrypted_secret into strict call_key
      from vault.decrypted_secrets where name = 'spots_import_goabase_secret_key';
      if project_url is null or call_key is null
         or project_url !~ '^https://[a-z0-9-]+\.supabase\.co/?$'
         or left(call_key, 10) <> 'sb_secret_' or length(call_key) <= 10 then
        raise exception 'Invalid backend Vault configuration; values omitted.';
      end if;
      select net.http_post(
        url := rtrim(project_url, '/') || '/functions/v1/import-goabase',
        headers := jsonb_build_object('Content-Type', 'application/json', 'apikey', call_key),
        body := '{}'::jsonb,
        timeout_milliseconds := 120000
      ) into request_id;
      raise notice 'Goabase HTTP request queued: %', request_id;
    end;
    $invoke$;
  $command$);

  -- Atomic with schedule(): other sessions only see the inactive row at COMMIT.
  perform cron.alter_job(prepared_job_id, active := false);
  raise notice 'Prepared inactive job %, schedule 0 */2 * * *. Importer review/testing is still required before activation.', prepared_job_id;
end;
$prepare$;

commit;
