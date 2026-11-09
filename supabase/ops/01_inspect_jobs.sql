-- READ ONLY. Run only after 00 confirms cron.job and vault.secrets exist.
-- Use an admin role that can see all jobs, not only its own cron RLS rows.
begin transaction read only;

-- Intentionally omit command: existing jobs might contain inline credentials.
-- Inspect ALL names for wrappers, not only the automatically detected candidates.
select jobid, jobname, schedule, active, database, username,
       (command ilike '%import-goabase%' or jobname ilike '%goabase%') as goabase_candidate,
       (command ilike '%vault.decrypted_secrets%') as uses_vault
from cron.job
order by jobid;

select jobid, runid, status, start_time, end_time
from cron.job_run_details
where jobid in (
  select jobid from cron.job
  where command ilike '%import-goabase%' or jobname ilike '%goabase%'
)
order by start_time desc
limit 20;

-- Names only: do not select secret/decrypted_secret or HTTP request headers.
select name, count(*) as entries
from vault.secrets
where name in ('spots_project_url', 'spots_import_goabase_secret_key')
group by name;

commit;
