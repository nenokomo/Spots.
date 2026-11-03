-- READ ONLY. Run in the Supabase SQL Editor as project administrator.
-- Do not return decrypted secrets or queue headers to chat/logs.
begin transaction read only;

select current_database() as database_name, current_user as inspection_role,
       current_setting('cron.timezone', true) as cron_timezone;

select extname, extversion
from pg_extension
where extname in ('pg_cron', 'pg_net', 'supabase_vault');

select to_regclass('cron.job') as cron_jobs,
       to_regclass('cron.job_run_details') as cron_history,
       to_regclass('vault.secrets') as vault_metadata,
       to_regclass('net._http_response') as http_responses;

select indexname, indexdef
from pg_indexes
where schemaname = 'public' and tablename = 'events';

select conname, pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = 'public.events'::regclass;

-- Do not infer uniqueness from the primary UUID key: the source pair matters.
select source, source_event_id, count(*) as occurrences
from public.events
where source = 'goabase'
group by source, source_event_id
having count(*) > 1;

select count(*) as goabase_rows,
       count(*) filter (where source_event_id is null or btrim(source_event_id) = '') as missing_source_ids,
       count(*) filter (where source_url is null or source_url !~ '^https://(www\.)?goabase\.net/') as invalid_source_links,
       count(*) filter (where status in ('cancelled', 'canceled', 'postponed') and is_published) as unconfirmed_still_published
from public.events
where source = 'goabase';

select status, is_published, count(*) as event_count
from public.events
where source = 'goabase'
group by status, is_published;

commit;
