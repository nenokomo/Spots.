-- PREPARED ONLY. Verify production yhnxdeypkbzyjappuzmv and approval first.
-- Requires 11 and exactly one of each configured Vault name. No secret literals.
begin;
do $prepare$
declare
 prepared_id bigint;
begin
 perform pg_advisory_xact_lock(732481, 2);
 if current_database()<>'postgres' or current_user<>'postgres' then
  raise exception 'Unexpected scheduler database/owner';
 end if;
 if coalesce(current_setting('cron.timezone',true),'GMT') not in('GMT','UTC','Etc/UTC') then
  raise exception 'Cron timezone must be UTC';
 end if;
 -- Do not overwrite an existing same-name job or assume wrappers are unrelated.
 if exists(select 1 from cron.job) then
  raise exception 'Existing Cron jobs require review before this preparation';
 end if;
 if exists(select 1 from spots_sync_private.goabase_cron_dispatches) then
  raise exception 'Earlier automation attempt requires review';
 end if;
 if (select count(*) from vault.secrets where name='spots_project_url')<>1
  or (select count(*) from vault.secrets where name='spots_import_goabase_secret_key')<>1 then
  raise exception 'Required Vault names must each exist exactly once';
 end if;
 prepared_id:=cron.schedule('spots-import-goabase-2h','0 */2 * * *',$command$
do $dispatch$
declare
 scheduler_job bigint;
 attempt_id uuid:=gen_random_uuid();
 run_phase text;
 project_url text;
 call_key text;
 request bigint;
 previous spots_sync_private.goabase_cron_dispatches%rowtype;
 previous_status integer;
 previous_failed boolean;
begin
 select jobid into strict scheduler_job from cron.job
 where jobname='spots-import-goabase-2h' and username='postgres' and database='postgres';
 perform pg_advisory_xact_lock(732481,3);
 run_phase:=case when exists(select 1 from spots_sync_private.goabase_cron_dispatches where phase='controlled')
  then 'scheduled' else 'controlled' end;
 -- The first real scheduler invocation self-pauses atomically: at most one probe.
 if run_phase='controlled' then perform cron.alter_job(scheduler_job,active:=false); end if;
 begin
  -- Fail closed on a previous dispatch/HTTP error; do not enqueue another import.
  select * into previous from spots_sync_private.goabase_cron_dispatches
   order by created_at desc,id desc limit 1;
  if found then
   if previous.dispatch_error is not null or previous.request_id is null then
    raise exception 'Earlier dispatch failed; scheduler review required';
   end if;
   select status_code,coalesce(timed_out,false) or error_msg is not null
    into previous_status,previous_failed from net._http_response where id=previous.request_id;
   if not found or previous_status is distinct from 200 or previous_failed then
    raise exception 'Previous HTTP result missing/failed; scheduler review required';
   end if;
  end if;
  select decrypted_secret into strict project_url from vault.decrypted_secrets where name='spots_project_url';
  select decrypted_secret into strict call_key from vault.decrypted_secrets where name='spots_import_goabase_secret_key';
  if project_url is distinct from 'https://yhnxdeypkbzyjappuzmv.supabase.co'
   or call_key is null or call_key !~ '^sb_secret_[A-Za-z0-9_-]+$' then
   raise exception 'Invalid production Vault configuration; values withheld';
  end if;
  insert into spots_sync_private.goabase_cron_dispatches(id,job_id,phase)
   values(attempt_id,scheduler_job,run_phase);
  select net.http_post(
   url:=project_url||'/functions/v1/import-goabase',
   headers:=jsonb_build_object('Content-Type','application/json','apikey',call_key),
   body:='{}'::jsonb,timeout_milliseconds:=120000
  ) into request;
  if request is null then raise exception 'HTTP request ID missing'; end if;
  update spots_sync_private.goabase_cron_dispatches set request_id=request where id=attempt_id;
  call_key:=null;
 exception when others then
  call_key:=null;
  -- The inner subtransaction rolls back enqueue/attempt; keep a safe failure marker.
  insert into spots_sync_private.goabase_cron_dispatches(id,job_id,phase,dispatch_error)
   values(attempt_id,scheduler_job,run_phase,sqlstate) on conflict do nothing;
  perform cron.alter_job(scheduler_job,active:=false);
  raise warning 'Spots scheduler paused; diagnostic SQLSTATE %, no secret values',sqlstate;
 end;
end;
$dispatch$;
$command$);
 perform cron.alter_job(prepared_id,active:=false);
end;
$prepare$;
commit;
