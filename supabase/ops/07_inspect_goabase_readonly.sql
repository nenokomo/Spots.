-- READ ONLY: one SELECT, use CLI --read-only with an explicitly verified target ID.
-- No secret values, job commands, function bodies, or Vault payloads are returned.
select jsonb_build_object(
  'captured_at',clock_timestamp(),
  'events',coalesce((select jsonb_agg(to_jsonb(e) order by source,source_event_id,id) from public.events e),'[]'::jsonb),
  'source_pair_duplicates',coalesce((select jsonb_agg(to_jsonb(d)) from (
    select source,source_event_id,count(*) as occurrences from public.events
    group by source,source_event_id having count(*)>1) d),'[]'::jsonb),
  'table_inventory',coalesce((select jsonb_agg(jsonb_build_object(
    'schema',n.nspname,'table',c.relname,'kind',c.relkind,'owner',pg_get_userbyid(c.relowner),
    'rls_enabled',c.relrowsecurity,'force_rls',c.relforcerowsecurity))
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname in ('public','spots_sync_private') and c.relkind in ('r','p','v','m')),'[]'::jsonb),
  'schema_inventory',coalesce((select jsonb_agg(nspname) from pg_namespace
    where nspname in ('spots_sync_private','cron','net','vault')),'[]'::jsonb),
  'extensions',coalesce((select jsonb_agg(jsonb_build_object('name',extname,'version',extversion)) from pg_extension),'[]'::jsonb),
  'cron_timezone',current_setting('cron.timezone',true),
  'actual_table_rights',(select jsonb_agg(jsonb_build_object('role',r.role_name,
    'schema',n.nspname,'table',c.relname,
    'select',has_table_privilege(r.role_name,c.oid,'SELECT'),
    'insert',has_table_privilege(r.role_name,c.oid,'INSERT'),
    'update',has_table_privilege(r.role_name,c.oid,'UPDATE'),
    'delete',has_table_privilege(r.role_name,c.oid,'DELETE'),
    'truncate',has_table_privilege(r.role_name,c.oid,'TRUNCATE'),
    'references',has_table_privilege(r.role_name,c.oid,'REFERENCES'),
    'trigger',has_table_privilege(r.role_name,c.oid,'TRIGGER')))
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
    cross join (values('anon'),('authenticated'),('service_role')) r(role_name)
    where c.relkind in ('r','p') and ((n.nspname='public' and c.relname='events') or n.nspname='spots_sync_private')),
  'event_triggers',coalesce((select jsonb_agg(jsonb_build_object('name',t.tgname,'enabled',t.tgenabled,
    'internal',t.tgisinternal,'function_schema',pn.nspname,'function',p.proname))
    from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace
    join pg_proc p on p.oid=t.tgfoid join pg_namespace pn on pn.oid=p.pronamespace
    where n.nspname='public' and c.relname='events'),'[]'::jsonb),
  'referencing_constraints',coalesce((select jsonb_agg(jsonb_build_object('schema',n.nspname,
    'table',c.relname,'constraint',k.conname,'definition',pg_get_constraintdef(k.oid)))
    from pg_constraint k join pg_class c on c.oid=k.conrelid join pg_namespace n on n.oid=c.relnamespace
    where k.confrelid=to_regclass('public.events')),'[]'::jsonb),
  'public_function_inventory',coalesce((select jsonb_agg(jsonb_build_object('schema',n.nspname,
    'name',p.proname,'arguments',pg_get_function_identity_arguments(p.oid),'owner',pg_get_userbyid(p.proowner),
    'security_definer',p.prosecdef,'settings',p.proconfig,
    'anon_execute',has_function_privilege('anon',p.oid,'EXECUTE'),
    'authenticated_execute',has_function_privilege('authenticated',p.oid,'EXECUTE'),
    'service_role_execute',has_function_privilege('service_role',p.oid,'EXECUTE')))
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname in ('public','spots_sync_private') and p.prokind in ('f','p')),'[]'::jsonb),
  'cron_relation',to_regclass('cron.job'),
  'vault_relation',to_regclass('vault.secrets')
) as inventory;
