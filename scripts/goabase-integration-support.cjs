// Backend-only helpers. Never print native CLI errors or credential-bearing objects.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const temp = path.join(root, 'supabase/.temp');
const ref = 'nfomkdvotqtlyymomksb';
function cli(args) {
  try {
    return JSON.parse(execFileSync(process.execPath,
      [path.join(root, 'node_modules/supabase/dist/supabase.js'), ...args, '--output-format', 'json'],
      { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 45000 }));
  } catch (error) {
    // Query diagnostics contain no API-key results. Never persist key-command output.
    if (args[0] === 'db' && args[1] === 'query') {
      try {
        const failure = JSON.parse(String(error.stdout)).error;
        if (failure && typeof failure.message === 'string') {
          const message = failure.message
            .replace(/sb_(?:secret|publishable)_[A-Za-z0-9_-]+/g, '[redacted]')
            .replace(/Bearer\s+\S+/gi, 'Bearer [redacted]')
            .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[redacted]');
          fs.writeFileSync(path.join(temp, 'goabase-query-diagnostic.json'), JSON.stringify({
            code: failure.code, message,
          }, null, 2) + '\n');
        }
      } catch { /* Never expose a native error if structured redaction fails. */ }
    }
    throw new Error('Protected CLI operation failed; output withheld.');
  }
}
function verifyTarget() {
  if (fs.readFileSync(path.join(temp, 'project-ref'), 'utf8').trim() !== ref) throw new Error('Wrong linked project.');
  const p = cli(['projects', 'list']).projects?.find(p => p.id === ref);
  if (!p?.linked || p.name !== 'spots. testproject') throw new Error('Wrong test project identity.');
  const f = cli(['functions', 'list', `--remote=${ref}`]).functions?.find(f => f.slug === 'import-goabase');
  if (f?.status !== 'ACTIVE' || f.verify_jwt !== false) throw new Error('Unexpected deployed function.');
  return f.version;
}
function secret() {
  const keys = cli(['projects', 'api-keys', `--remote=${ref}`, '--reveal']).keys;
  const found = keys?.filter(k => k.type === 'secret' && k.name === 'default');
  if (found?.length !== 1 || !found[0].api_key?.startsWith('sb_secret_')) throw new Error('Default secret unavailable.');
  return found[0].api_key;
}
function query(sql, readOnly = true) {
  // SQL beginning with a -- comment is interpreted as a flag if passed positionally.
  const filename = path.join(temp, `integration-query-${crypto.randomUUID()}.sql`);
  fs.writeFileSync(filename, sql);
  return cli(['db', 'query', '--file', filename, `--remote=${ref}`, ...(readOnly ? ['--read-only'] : ['--yes'])]);
}
function snapshot() {
  const s = query(`select jsonb_build_object(
    'events',coalesce((select jsonb_agg(to_jsonb(e) order by e.source,e.source_event_id,e.id) from public.events e),'[]'::jsonb),
    'versions',coalesce((select jsonb_agg(to_jsonb(v) order by source_event_id) from spots_sync_private.goabase_versions v),'[]'::jsonb),
    'active_leases',(select count(*) from spots_sync_private.goabase_lease where token is not null),
    'lease_expiry',(select expires_at::text from spots_sync_private.goabase_lease where singleton),
    'duplicates',(select count(*) from (select source,source_event_id from public.events group by source,source_event_id having count(*)>1) d),
    'cron_jobs',to_regclass('cron.job')) as snapshot;`).rows?.[0]?.snapshot;
  if (!s) throw new Error('Snapshot unavailable.');
  return s;
}
function persist(name, value, exclusive = false) {
  fs.writeFileSync(path.join(temp, name), JSON.stringify(value, null, 2) + '\n', exclusive ? { flag: 'wx' } : undefined);
}
function appHash() { return crypto.createHash('sha256').update(fs.readFileSync(path.join(root, '.env.local'))).digest('hex'); }
function idle(s) { return s.active_leases === 0 && s.lease_expiry === '-infinity' && s.duplicates === 0; }
module.exports = { root, temp, ref, cli, verifyTarget, secret, query, snapshot, persist, appHash, idle };
