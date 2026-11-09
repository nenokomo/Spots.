-- PREPARED ONLY. Part of the combined approval, after inactive job/Vault verification.
-- Same single job/command; first scheduler invocation self-pauses in 12.
begin;
do $arm$
declare j bigint;
begin
 perform pg_advisory_xact_lock(732481,2);
 if (select count(*) from cron.job)<>1 or exists(select 1 from spots_sync_private.goabase_cron_dispatches) then
  raise exception 'Unexpected jobs or previous probe; stop';
 end if;
 select jobid into strict j from cron.job where jobname='spots-import-goabase-2h'
  and username='postgres' and database='postgres' and schedule='0 */2 * * *' and not active;
 perform cron.alter_job(j,schedule:='* * * * *',active:=true);
end;
$arm$;
commit;
