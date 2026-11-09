-- PREPARED ONLY. Execute once after verified controlled HTTP 200 and data integrity.
begin;
do $activate$
declare j bigint;
begin
 perform pg_advisory_xact_lock(732481,2);
 if (select count(*) from cron.job)<>1
  or (select count(*) from spots_sync_private.goabase_cron_dispatches)<>1 then
  raise exception 'Unexpected jobs/dispatches; stop';
 end if;
 select jobid into strict j from cron.job where jobname='spots-import-goabase-2h'
  and username='postgres' and database='postgres' and not active;
 if not exists(select 1 from spots_sync_private.goabase_cron_dispatches d
  join net._http_response r on r.id=d.request_id
  where d.job_id=j and d.phase='controlled' and d.dispatch_error is null
   and r.status_code=200 and not coalesce(r.timed_out,false) and r.error_msg is null) then
  raise exception 'Controlled HTTP success missing';
 end if;
 if not exists(select 1 from spots_sync_private.goabase_lease
  where singleton and token is null and expires_at='-infinity'::timestamptz) then
  raise exception 'Importer lease not free';
 end if;
 perform cron.alter_job(j,schedule:='0 */2 * * *',active:=true);
end;
$activate$;
commit;
