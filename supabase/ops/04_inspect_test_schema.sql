-- READ ONLY. Execute with CLI v3 --read-only and the verified Spots-Test --remote=<ref>.
-- One statement: the Management API returns only the last statement's result.
-- Safe even when events, Cron, or importer RPCs are absent. Never reads secret values.
select jsonb_build_object(
  'database', current_database(),
  'inspection_role', current_user,
  'server_version', current_setting('server_version'),
  'events_table', to_regclass('public.events'),
  'cron_jobs', to_regclass('cron.job'),
  'vault_metadata', to_regclass('vault.secrets'),
  'columns', coalesce((select jsonb_agg(to_jsonb(c) order by c.ordinal_position) from (
    select ordinal_position, column_name, data_type, udt_schema, udt_name, is_nullable, column_default
    from information_schema.columns where table_schema = 'public' and table_name = 'events'
  ) c), '[]'::jsonb),
  'indexes', coalesce((select jsonb_agg(to_jsonb(i)) from (
    select indexname, indexdef from pg_indexes where schemaname = 'public' and tablename = 'events'
  ) i), '[]'::jsonb),
  'constraints', coalesce((select jsonb_agg(to_jsonb(k)) from (
    select c.conname, pg_get_constraintdef(c.oid) as definition from pg_constraint c
    join pg_class t on t.oid = c.conrelid join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public' and t.relname = 'events'
  ) k), '[]'::jsonb),
  'rls', coalesce((select jsonb_agg(to_jsonb(r)) from (
    select c.relrowsecurity as enabled, c.relforcerowsecurity as forced from pg_class c
    join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname = 'events'
  ) r), '[]'::jsonb),
  'policies', coalesce((select jsonb_agg(to_jsonb(p)) from (
    select policyname, permissive, roles, cmd, qual, with_check from pg_policies
    where schemaname = 'public' and tablename = 'events'
  ) p), '[]'::jsonb),
  'grants', coalesce((select jsonb_agg(to_jsonb(g)) from (
    select grantee, privilege_type from information_schema.role_table_grants
    where table_schema = 'public' and table_name = 'events'
  ) g), '[]'::jsonb),
  'importer_rpcs', coalesce((select jsonb_agg(to_jsonb(f)) from (
    select p.proname, pg_get_function_identity_arguments(p.oid) as arguments, p.prosecdef as security_definer
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in ('spots_goabase_begin', 'spots_goabase_apply', 'spots_goabase_release')
  ) f), '[]'::jsonb),
  'extensions', coalesce((select jsonb_agg(to_jsonb(e)) from (
    select extname, extversion from pg_extension where extname in ('pg_cron', 'pg_net', 'supabase_vault')
  ) e), '[]'::jsonb)
) as inspection;
