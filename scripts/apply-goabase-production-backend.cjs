// One approved production SQL addition. No deploy, import, Cron, or retries.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const prod = 'yhnxdeypkbzyjappuzmv';
const test = 'nfomkdvotqtlyymomksb';
const expectedHash = '205b02360cd29bd2d958ba94a1cea739c46d72a022e280b239ef406c8ffd3cd3';
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const canonical = value => JSON.stringify(value, (_, v) => v && !Array.isArray(v) && typeof v === 'object'
  ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b))) : v);
let report, dir;
function cli(args) {
  try {
    return JSON.parse(execFileSync(process.execPath,
      [path.join(root, 'node_modules/supabase/dist/supabase.js'), ...args, '--output-format', 'json'],
      { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 60000 }));
  } catch (error) {
    // Do not expose raw native diagnostics or credential-bearing output.
    let structured;
    try { structured = JSON.parse(String(error.stdout)).error; } catch {}
    const message = structured?.message?.replace(/sb_(secret|publishable)_\S+|eyJ\S+/g, '[redacted]');
    throw new Error(`CLI operation failed; no automatic retry.${message ? ` ${message}` : ' Raw output withheld.'}`);
  }
}
function save(name, value) { fs.writeFileSync(path.join(dir, name), JSON.stringify(value, null, 2) + '\n'); }
function query(name, sql) {
  const file = path.join(dir, `${name}.sql`);
  fs.writeFileSync(file, sql, { flag: 'wx' });
  const result = cli(['db', 'query', `--remote=${prod}`, '--read-only', '--file', file]).rows?.[0]?.snapshot;
  if (!result) throw new Error('Read-only verification returned no snapshot.');
  save(`${name}.json`, result);
  return result;
}
function verifyProject() {
  const project = cli(['projects', 'list']).projects?.find(p => p.id === prod);
  if (project?.name !== 'Spots.' || project.id === test) throw new Error('Production identity mismatch.');
  return { id: project.id, name: project.name };
}
const snapshotSql = `select jsonb_build_object(
 'events',(select coalesce(jsonb_agg(to_jsonb(e) order by e.id),'[]'::jsonb) from public.events e),
 'event_security',jsonb_build_object(
   'columns',(select jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'not_null',a.attnotnull,'default',pg_get_expr(d.adbin,d.adrelid)) order by a.attnum) from pg_attribute a left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum where a.attrelid='public.events'::regclass and a.attnum>0 and not a.attisdropped),
   'table',(select jsonb_build_object('owner',pg_get_userbyid(relowner),'rls',relrowsecurity,'force_rls',relforcerowsecurity,'acl',relacl) from pg_class where oid='public.events'::regclass),
   'constraints',(select jsonb_agg(jsonb_build_object('name',conname,'definition',pg_get_constraintdef(oid)) order by conname) from pg_constraint where conrelid='public.events'::regclass),
   'indexes',(select jsonb_agg(jsonb_build_object('name',indexname,'definition',indexdef) order by indexname) from pg_indexes where schemaname='public' and tablename='events'),
   'policies',(select jsonb_agg(to_jsonb(p) order by policyname) from pg_policies p where schemaname='public' and tablename='events')),
 'private_schema_exists',exists(select 1 from pg_namespace where nspname='spots_sync_private'),
 'private_tables',(select coalesce(jsonb_agg(jsonb_build_object('name',c.relname,'owner',pg_get_userbyid(c.relowner),'rls',c.relrowsecurity,
   'rights',(select jsonb_agg(jsonb_build_object('role',r,'any_table_access',has_table_privilege(r,c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')) order by r) from unnest(array['anon','authenticated','service_role']) r)) order by c.relname),'[]'::jsonb) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='spots_sync_private' and c.relkind='r'),
 'rpcs',(select coalesce(jsonb_agg(jsonb_build_object('name',p.proname,'signature',pg_get_function_identity_arguments(p.oid),'owner',pg_get_userbyid(p.proowner),'security_definer',p.prosecdef,'config',p.proconfig,'definition',pg_get_functiondef(p.oid),
   'public_execute',exists(select 1 from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a where a.grantee=0 and a.privilege_type='EXECUTE'),
   'anon_execute',has_function_privilege('anon',p.oid,'EXECUTE'),'authenticated_execute',has_function_privilege('authenticated',p.oid,'EXECUTE'),'service_execute',has_function_privilege('service_role',p.oid,'EXECUTE')) order by p.proname),'[]'::jsonb) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('spots_goabase_begin','spots_goabase_apply','spots_goabase_release'))
) as snapshot;`;
function main() {
  if (!process.argv.includes('--approved-production-backend-only')) throw new Error('Explicit approval flag required.');
  const candidate = path.join(root, 'supabase/ops/03_goabase_sync_backend.sql');
  if (hash(candidate) !== expectedHash) throw new Error('Candidate differs from approved SQL.');
  const marker = path.join(root, 'supabase/.temp/production-backend-03-attempt.json');
  if (fs.existsSync(marker)) throw new Error('An execution attempt already exists. Inspect its result; do not retry.');
  const envHash = hash(path.join(root, '.env.local'));
  if (fs.readFileSync(path.join(root, 'supabase/.temp/project-ref'), 'utf8').trim() !== test) throw new Error('Unexpected local link.');
  const backup = JSON.parse(fs.readFileSync(path.join(root, 'supabase/.temp/production-backup-latest.json'), 'utf8'));
  if (backup.production_ref !== prod) throw new Error('Wrong backup project.');
  const manifest = JSON.parse(fs.readFileSync(path.join(backup.directory, 'sha256-manifest.json'), 'utf8'));
  for (const [file, digest] of Object.entries(manifest)) if (hash(path.join(backup.directory, file)) !== digest) throw new Error('Backup checksum mismatch.');
  const restore = JSON.parse(fs.readFileSync(path.join(backup.directory, 'local-restore-report.json'), 'utf8'));
  if (!restore.results.public_schema_restore_passed || restore.candidate_sha256 !== expectedHash) throw new Error('Restore evidence mismatch.');
  verifyProject();
  dir = path.join(root, 'supabase/backups', `production-backend-03-${new Date().toISOString().replace(/[:.]/g, '-')}`);
  fs.mkdirSync(dir);
  report = { project_ref: prod, started_at: new Date().toISOString(), sql_sha256: expectedHash, sql_execution_attempts: 0, outcome: 'preparing' };
  save('result.json', report);
  const before = query('before', snapshotSql);
  const previous = JSON.parse(fs.readFileSync(path.join(root, 'supabase/.temp/production-preflight-latest.json'), 'utf8'));
  const original = JSON.parse(fs.readFileSync(path.join(previous.directory, 'production-snapshot.json'), 'utf8')).inventory.events;
  const sorted = rows => [...rows].sort((a, b) => a.id.localeCompare(b.id));
  if (before.events.length !== 31 || canonical(sorted(before.events)) !== canonical(sorted(original)))
    throw new Error('Current 31 events differ from original backup; no SQL executed.');
  if (before.private_schema_exists || before.private_tables.length || before.rpcs.length)
    throw new Error('Importer objects already exist; refusing CREATE OR REPLACE.');
  const functionsBefore = cli(['functions', 'list', `--remote=${prod}`]).functions;
  save('functions-before.json', functionsBefore);
  const frozen = path.join(dir, 'approved-03.sql');
  fs.copyFileSync(candidate, frozen, fs.constants.COPYFILE_EXCL);
  report.verified_project_immediately_before_execution = verifyProject();
  if (hash(candidate) !== expectedHash || hash(frozen) !== expectedHash) throw new Error('SQL changed before execution.');
  fs.writeFileSync(marker, JSON.stringify({ project_ref: prod, directory: dir, hash: expectedHash, attempted_at: new Date().toISOString() }, null, 2), { flag: 'wx' });
  report.sql_execution_attempts = 1;
  report.outcome = 'executing';
  save('result.json', report);
  console.log(JSON.stringify({ target: prod, verified_name: 'Spots.', sql_sha256: expectedHash, before_events: before.events.length, action: 'Execute exactly approved SQL once' }));
  const execution = cli(['db', 'query', `--remote=${prod}`, '--file', frozen, '--yes']);
  save('sql-response.json', execution);
  report.sql_response_received = true;
  const after = query('after', snapshotSql);
  report.events_before = before.events.length;
  report.events_after = after.events.length;
  report.all_original_event_data_and_uuids_unchanged = canonical(before.events) === canonical(after.events);
  report.events_schema_indexes_defaults_rls_grants_unchanged = canonical(before.event_security) === canonical(after.event_security);
  const expectedTables = ['goabase_lease', 'goabase_versions'];
  report.private_tables_verified = after.private_tables.length === 2 && after.private_tables.every(t =>
    expectedTables.includes(t.name) && t.owner === 'postgres' && t.rls && t.rights.every(r => !r.any_table_access));
  report.rpcs_verified = after.rpcs.length === 3 && after.rpcs.every(f => f.owner === 'postgres' && f.security_definer &&
    f.config?.includes('search_path=""') && !f.public_execute && !f.anon_execute && !f.authenticated_execute && f.service_execute);
  const state = query('backend-state', `select jsonb_build_object(
    'lease_rows',(select count(*) from spots_sync_private.goabase_lease),
    'lease_free',(select token is null and expires_at='-infinity'::timestamptz from spots_sync_private.goabase_lease where singleton),
    'versions',(select count(*) from spots_sync_private.goabase_versions),
    'schema_client_usage',(select jsonb_agg(jsonb_build_object('role',r,'usage',has_schema_privilege(r,'spots_sync_private','USAGE'),'create',has_schema_privilege(r,'spots_sync_private','CREATE')) order by r) from unnest(array['anon','authenticated']) r),
    'private_public_table_grants',(select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace cross join lateral aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) a where n.nspname='spots_sync_private' and c.relkind='r' and a.grantee=0)
  ) as snapshot;`);
  report.initial_backend_state_verified = Number(state.lease_rows) === 1 && state.lease_free && Number(state.versions) === 0 &&
    Number(state.private_public_table_grants) === 0 && state.schema_client_usage.every(r => !r.usage && !r.create);
  const functionsAfter = cli(['functions', 'list', `--remote=${prod}`]).functions;
  save('functions-after.json', functionsAfter);
  report.edge_functions_unchanged = canonical(functionsBefore) === canonical(functionsAfter);
  report.app_environment_unchanged = hash(path.join(root, '.env.local')) === envHash;
  report.local_test_link_unchanged = fs.readFileSync(path.join(root, 'supabase/.temp/project-ref'), 'utf8').trim() === test;
  if (![report.all_original_event_data_and_uuids_unchanged, report.events_schema_indexes_defaults_rls_grants_unchanged,
    report.private_tables_verified, report.rpcs_verified, report.initial_backend_state_verified, report.edge_functions_unchanged,
    report.app_environment_unchanged, report.local_test_link_unchanged].every(Boolean)) throw new Error('Post-execution verification failed; stop, no rollback or retry attempted.');
  report.outcome = 'verified';
  report.completed_at = new Date().toISOString();
  save('result.json', report);
  console.log(JSON.stringify({ ...report, directory: dir }));
}
try { main(); } catch (error) {
  if (report) { report.outcome = 'stopped'; report.error = error.message; report.stopped_at = new Date().toISOString(); save('result.json', report); }
  console.error(JSON.stringify({ stopped: true, error: error.message, directory: dir }));
  process.exitCode = 1;
}
