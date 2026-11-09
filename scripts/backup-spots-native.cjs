// Logical backup through PostgreSQL 17 tools; no remote SQL writes or deployments.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const prod = 'yhnxdeypkbzyjappuzmv';
const test = 'nfomkdvotqtlyymomksb';
const bin = path.join(process.env.LOCALAPPDATA,
  'Temp/vscode-agent-codex-sandbox-UOeaJh/spots-postgres-tools/pgsql/bin');
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
function cli(args) {
  return execFileSync(process.execPath, [path.join(root, 'node_modules/supabase/dist/supabase.js'), ...args],
    { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 45000 });
}
function main() {
  if (!process.argv.includes('--confirmed-production-backup')) throw new Error('Backup authorization required.');
  const pointer = JSON.parse(fs.readFileSync(path.join(root, 'supabase/.temp/production-backup-latest.json'), 'utf8'));
  const dir = pointer.directory;
  if (pointer.production_ref !== prod || !dir.startsWith(path.join(root, 'supabase/backups') + path.sep))
    throw new Error('Wrong backup target.');
  if (fs.readFileSync(path.join(root, 'supabase/.temp/project-ref'), 'utf8').trim() !== test)
    throw new Error('Wrong local link.');
  const envHash = hash(path.join(root, '.env.local'));
  const projects = JSON.parse(cli(['projects', 'list', '--output-format', 'json'])).projects;
  if (projects.find(p => p.id === prod)?.name !== 'Spots.') throw new Error('Wrong production identity.');
  // The official CLI supplies temporary database credentials in RAM only.
  // Never run or persist the generated shell script, or print its contents.
  const generated = cli(['db', 'dump', `--remote=${prod}`, '--dry-run']);
  const connection = {};
  for (const line of generated.split('\n')) {
    const match = /^export (PGHOST|PGPORT|PGUSER|PGPASSWORD|PGDATABASE)="([^"\\$`\r\n]*)"\s*$/.exec(line);
    if (match) connection[match[1]] = match[2];
  }
  if (Object.keys(connection).length !== 5 ||
      !(connection.PGUSER.includes(prod) || connection.PGHOST === `db.${prod}.supabase.co`))
    throw new Error('Could not safely validate project-scoped temporary connection.');
  const env = { ...process.env, ...connection, PGSSLMODE: 'require', PGCONNECT_TIMEOUT: '20',
    PGOPTIONS: '-c default_transaction_read_only=on -c statement_timeout=120000' };
  const started = new Date().toISOString();
  const archive = path.join(dir, 'database.full.dump');
  const roles = path.join(dir, 'roles.no-passwords.sql');
  if (fs.existsSync(archive) || fs.existsSync(roles)) throw new Error('Refusing to overwrite previous backup.');
  execFileSync(path.join(bin, 'pg_dump.exe'), ['--format=custom', '--role=postgres', '--no-password', '--verbose', '--file', archive],
    { env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 240000 });
  console.log(JSON.stringify({ archive_created: true, bytes: fs.statSync(archive).size, sha256: hash(archive) }));
  execFileSync(path.join(bin, 'pg_dumpall.exe'), ['--roles-only', '--no-role-passwords', '--role=postgres', '--no-password', '--file', roles],
    { env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 60000 });
  const toc = execFileSync(path.join(bin, 'pg_restore.exe'), ['--list', archive], { encoding: 'utf8' });
  fs.writeFileSync(path.join(dir, 'database.toc.txt'), toc, { flag: 'wx' });
  const report = { production_ref: prod, started_at: started, completed_at: new Date().toISOString(),
    tool_version: execFileSync(path.join(bin, 'pg_dump.exe'), ['--version'], { encoding: 'utf8' }).trim(),
    database_archive: 'database.full.dump', roles_without_passwords: 'roles.no-passwords.sql',
    full_non_system_database_dump: true, remote_sessions_read_only: true,
    excluded_schemas: [], role_passwords_excluded: true, restore_verified: false,
    app_environment_unchanged: hash(path.join(root, '.env.local')) === envHash,
    local_test_link_unchanged: fs.readFileSync(path.join(root, 'supabase/.temp/project-ref'), 'utf8').trim() === test,
    checksums: Object.fromEntries(['database.full.dump', 'roles.no-passwords.sql', 'database.toc.txt'].map(f => [f, hash(path.join(dir, f))])) };
  fs.writeFileSync(path.join(dir, 'database-backup-report.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify(report));
}
try { main(); } catch (error) {
  // Never forward CLI output, credentials, process arguments, or raw connection errors.
  const diagnostic = String(error.stderr ?? '');
  const pgError = diagnostic.match(/(?:pg_dump(?:all)?: error:|ERROR:) ([^\r\n]*)/);
  const safeReason = pgError && !/password|connection|sb_secret_|eyJ|postgres:\/\//i.test(pgError[1]) ? pgError[1] : undefined;
  console.error(JSON.stringify({ failed: true, reason: error.stderr ? safeReason ?? 'Database tool failed; connection diagnostics withheld.' : error.message }));
  process.exitCode = 1;
}
