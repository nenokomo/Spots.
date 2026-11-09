-- PREPARED ONLY. Parameterized backend execution, after combined approval.
-- $1: exact production URL; $2: existing production Default Secret (RAM only).
-- Never interpolate parameters into SQL/files/argv/logs. Returns counts, no values.
with lock as materialized (
 select pg_advisory_xact_lock(732481,2)
), allowed as materialized (
 select true as ok from lock
 where $1::text='https://yhnxdeypkbzyjappuzmv.supabase.co'
  and $2::text ~ '^sb_secret_[A-Za-z0-9_-]+$'
  and not exists(select 1 from vault.secrets
   where name in('spots_project_url','spots_import_goabase_secret_key'))
), url_entry as materialized (
 select vault.create_secret($1::text,'spots_project_url','Spots production scheduler URL') as id
 from allowed where ok
), key_entry as materialized (
 select vault.create_secret($2::text,'spots_import_goabase_secret_key','Existing Default Secret for Spots importer') as id
 from url_entry
)
select (select count(*) from url_entry) as url_entries_created,
 (select count(*) from key_entry) as key_entries_created;
