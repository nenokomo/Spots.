// Isolated local restore only. No Supabase API or remote connection is used.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const tools = path.join(process.env.LOCALAPPDATA, 'Temp/vscode-agent-codex-sandbox-UOeaJh/spots-postgres-tools');
const bin = path.join(tools, 'pgsql/bin');
const cluster = path.join(tools, 'isolated-spots-restore-v2');
const env = { ...process.env, PGHOST: '127.0.0.1', PGPORT: '55439', PGUSER: 'restore_admin',
  PGDATABASE: 'spots_restore', PGPASSWORD: '', PGSSLMODE: 'disable', PGOPTIONS: '', PGCONNECT_TIMEOUT: '5' };
function pg(tool, args, extra = {}) {
  return execFileSync(path.join(bin, `${tool}.exe`), args,
    { env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 60000, ...extra });
}
function main() {
  if (!process.argv.includes('--local-only')) throw new Error('Local restore flag required.');
  const pointer = JSON.parse(fs.readFileSync(path.join(root, 'supabase/.temp/production-backup-latest.json'), 'utf8'));
  if (pointer.production_ref !== 'yhnxdeypkbzyjappuzmv') throw new Error('Wrong backup project.');
  const dir = pointer.directory;
  const report = { production_ref: pointer.production_ref, started_at: new Date().toISOString(),
    isolated_host: '127.0.0.1', isolated_port: 55439, remote_operations: 0, results: {} };
  const resume = process.argv.includes('--resume-local-after-startup-timeout');
  if (!resume) {
    fs.mkdirSync(cluster, { recursive: false });
    pg('initdb', ['-D', cluster, '--username=restore_admin', '--auth=trust', '--no-locale', '--encoding=UTF8']);
  }
  let started = false;
  try {
    started = true;
    if (!resume) pg('pg_ctl', ['-D', cluster, '-l', path.join(cluster, 'server.log'), '-w', '-t', '30',
      '-o', '-h 127.0.0.1 -p 55439', 'start'], { stdio: 'ignore' });
    if (path.resolve(pg('psql', ['-X', '-t', '-A', '-d', 'postgres', '-c', 'show data_directory']).trim()) !== path.resolve(cluster))
      throw new Error('Wrong local cluster.');
    pg('psql', ['-X', '-d', 'postgres', '-c', "alter system set timezone='UTC'"]);
    pg('psql', ['-X', '-d', 'postgres', '-c', 'select pg_reload_conf()']);
    pg('createdb', ['spots_restore']);
    const roleSource = fs.readFileSync(path.join(dir, 'roles.no-passwords.sql'), 'utf8');
    const grantedRoles = [...new Set([...roleSource.matchAll(/^GRANT (\w+) TO .*GRANTED BY supabase_admin;/gm)].map(m => m[1]))];
    // Stock PG17 requires explicit ADMIN options for GRANTED BY even for the
    // Supabase superuser. Bootstrap only these local memberships; original backup unchanged.
    const localRoles = roleSource.replace(/^GRANT /m,
      `-- LOCAL RESTORE COMPATIBILITY ONLY: explicit Supabase admin memberships\nGRANT ${grantedRoles.join(', ')} TO supabase_admin WITH ADMIN OPTION;\nGRANT `);
    const localRoleFile = path.join(dir, 'roles.local-restore-compat.sql');
    fs.writeFileSync(localRoleFile, localRoles, { flag: 'wx' });
    pg('psql', ['-X', '-v', 'ON_ERROR_STOP=1', '-f', localRoleFile]);
    report.local_role_compatibility = 'Explicit ADMIN memberships bootstrapped for Supabase grantor on stock PostgreSQL 17; original role backup preserved.';
    // Restore user-owned public objects, owners, ACLs and all public data unchanged.
    // Platform extensions (notably Supabase Vault) are unavailable in Windows PostgreSQL.
    pg('pg_restore', ['--exit-on-error', '--schema=public', '--dbname=spots_restore', path.join(dir, 'database.full.dump')]);
    const query = sql => JSON.parse(pg('psql', ['-X', '-t', '-A', '-v', 'ON_ERROR_STOP=1', '-c', sql]).trim());
    const restored = query(`select coalesce(jsonb_agg(to_jsonb(e) order by source,source_event_id,id),'[]'::jsonb) from public.events e`);
    const preflight = JSON.parse(fs.readFileSync(path.join(root,
      'supabase/.temp/production-preflight-latest.json'), 'utf8'));
    const original = JSON.parse(fs.readFileSync(path.join(preflight.directory, 'production-snapshot.json'), 'utf8'));
    const normalize = rows => rows.map(row => Object.fromEntries(Object.entries(row).sort(([a], [b]) => a.localeCompare(b))))
      .sort((a, b) => a.id.localeCompare(b.id));
    report.results.restored_events = restored.length;
    report.results.full_event_data_and_uuids_match_preflight = JSON.stringify(normalize(restored)) ===
      JSON.stringify(normalize(original.inventory.events));
    report.results.schema_security = query(`select jsonb_build_object(
      'columns',(select count(*) from information_schema.columns where table_schema='public' and table_name='events'),
      'constraints',(select jsonb_agg(pg_get_constraintdef(oid) order by conname) from pg_constraint where conrelid='public.events'::regclass),
      'rls',(select relrowsecurity from pg_class where oid='public.events'::regclass),
      'policies',(select jsonb_agg(jsonb_build_object('name',policyname,'roles',roles,'command',cmd,'using',qual)) from pg_policies where schemaname='public' and tablename='events'),
      'anon_insert',has_table_privilege('anon','public.events','INSERT'),
      'anon_select',has_table_privilege('anon','public.events','SELECT'),
      'authenticated_insert',has_table_privilege('authenticated','public.events','INSERT'),
      'service_insert',has_table_privilege('service_role','public.events','INSERT'))`);
    const candidate = path.join(root, 'supabase/ops/03_goabase_sync_backend.sql');
    report.candidate_sha256 = crypto.createHash('sha256').update(fs.readFileSync(candidate)).digest('hex');
    // Rehearse only the planned addition on the restored production schema/data.
    pg('psql', ['-X', '-v', 'ON_ERROR_STOP=1', '-f', candidate]);
    const after = query(`select coalesce(jsonb_agg(to_jsonb(e) order by source,source_event_id,id),'[]'::jsonb) from public.events e`);
    report.results.candidate_preserved_all_event_data_and_uuids = JSON.stringify(restored) === JSON.stringify(after);
    report.results.candidate_objects = query(`select jsonb_build_object(
      'private_tables',(select count(*) from pg_tables where schemaname='spots_sync_private'),
      'private_tables_with_rls',(select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='spots_sync_private' and c.relkind='r' and c.relrowsecurity),
      'backend_rpcs',(select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('spots_goabase_begin','spots_goabase_apply','spots_goabase_release')),
      'anon_can_begin',has_function_privilege('anon','public.spots_goabase_begin()','EXECUTE'),
      'authenticated_can_begin',has_function_privilege('authenticated','public.spots_goabase_begin()','EXECUTE'),
      'service_can_begin',has_function_privilege('service_role','public.spots_goabase_begin()','EXECUTE'))`);
    if (!report.results.full_event_data_and_uuids_match_preflight || !report.results.candidate_preserved_all_event_data_and_uuids)
      throw new Error('Restore or candidate changed event data.');
    report.results.public_schema_restore_passed = true;
    report.results.full_managed_platform_restore_verified = false;
    report.limitations = ['Full archive includes managed schemas; local restore deliberately verifies public schema/data/ACLs only. Supabase-managed extensions/platform services require a compatible Supabase restore target.',
      'Role password hashes intentionally excluded; storage file bytes and project settings/Edge secrets are outside PostgreSQL backups.'];
  } finally {
    if (started) {
      pg('pg_ctl', ['-D', cluster, '-m', 'fast', '-w', 'stop'], { stdio: 'ignore' });
      report.local_server_stopped = true;
    }
    report.completed_at = new Date().toISOString();
    fs.writeFileSync(path.join(dir, 'local-restore-report.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(report));
  }
}
try { main(); } catch (error) {
  console.error(JSON.stringify({ failed: true, message: error.stderr ? String(error.stderr).slice(-1500) : error.message }));
  process.exitCode = 1;
}
