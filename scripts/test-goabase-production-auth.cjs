// Approved production GET tests only. No POST, RPC calls, deployments or SQL writes.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const prod = 'yhnxdeypkbzyjappuzmv', test = 'nfomkdvotqtlyymomksb';
const endpoint = `https://${prod}.supabase.co/functions/v1/import-goabase`;
const report = { project_ref: prod, method: 'GET', started_at: new Date().toISOString(), cases: [] };
let dir;
const appHash = () => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, '.env.local'))).digest('hex');
function cli(args) {
  try {
    const result = JSON.parse(execFileSync(process.execPath,
      [path.join(root, 'node_modules/supabase/dist/supabase.js'), ...args, '--output-format', 'json'],
      { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 45000 }));
    if (result.error) throw new Error('CLI error.');
    return result;
  } catch { throw new Error('Protected CLI operation failed; raw output withheld.'); }
}
function save(name, data) { fs.writeFileSync(path.join(dir, name), JSON.stringify(data, null, 2) + '\n'); }
function state(name) {
  const file = path.join(dir, `${name}.sql`);
  fs.writeFileSync(file, `select jsonb_build_object(
    'events',(select coalesce(jsonb_agg(to_jsonb(e) order by id),'[]'::jsonb) from public.events e),
    'lease',(select jsonb_agg(to_jsonb(l) order by singleton) from spots_sync_private.goabase_lease l),
    'versions',(select count(*) from spots_sync_private.goabase_versions)
  ) as snapshot;`, { flag: 'wx' });
  const snapshot = cli(['db', 'query', `--remote=${prod}`, '--read-only', '--file', file]).rows?.[0]?.snapshot;
  if (!snapshot) throw new Error('Read-only database snapshot missing.');
  save(`${name}.json`, snapshot);
  return snapshot;
}
async function check(name, key, expected) {
  let response, body;
  try {
    response = await fetch(endpoint, { method: 'GET', redirect: 'error',
      headers: key ? { apikey: key } : {}, signal: AbortSignal.timeout(20000) });
    try { body = await response.json(); } catch { body = null; }
  } catch {
    report.cases.push({ name, expected, status: null, passed: false, error: 'network_or_timeout' });
    throw new Error('GET request failed; no retry, remaining tests stopped.');
  }
  const handler = name !== 'default_secret_get' ||
    (body?.error === 'POST erforderlich' && response.headers.get('allow') === 'POST');
  const result = { name, expected, status: response.status, passed: response.status === expected && handler };
  if (name === 'default_secret_get') {
    result.expected_handler_body = body?.error === 'POST erforderlich';
    result.allow_post = response.headers.get('allow') === 'POST';
  }
  // Never retain arbitrary response bodies, headers, or any key values.
  report.cases.push(result);
  save('result.json', report);
  console.log(JSON.stringify(result));
  if (!result.passed) throw new Error('Unexpected GET authentication response; remaining tests stopped.');
}
async function main() {
  if (!process.argv.includes('--approved-production-get-only')) throw new Error('Explicit production GET authorization required.');
  const marker = path.join(root, 'supabase/.temp/production-goabase-get-auth-attempt.json');
  if (fs.existsSync(marker)) throw new Error('GET test attempt already recorded; do not rerun without review.');
  if (fs.readFileSync(path.join(root, 'supabase/.temp/project-ref'), 'utf8').trim() !== test) throw new Error('Unexpected local link.');
  const target = cli(['projects', 'list']).projects?.find(p => p.id === prod);
  if (target?.name !== 'Spots.' || target.id === test) throw new Error('Wrong production identity.');
  const fn = cli(['functions', 'list', `--remote=${prod}`]).functions?.find(f => f.slug === 'import-goabase');
  if (fn?.status !== 'ACTIVE' || fn.version !== 2 || fn.verify_jwt !== false ||
      fn.ezbr_sha256 !== 'f30f017ec6ce42eba8419bd1a8e2c5122b76fb357f27aba5f9c25e3e11a0497c')
    throw new Error('Unexpected deployed production function; no GET tests.');
  report.function_version = fn.version;
  dir = path.join(root, 'supabase/backups', `production-auth-get-${new Date().toISOString().replace(/[:.]/g, '-')}`);
  fs.mkdirSync(dir);
  const envHash = appHash();
  const before = state('before');
  const prior = JSON.parse(fs.readFileSync(path.join(root, 'supabase/.temp/production-preflight-latest.json'), 'utf8'));
  const original = JSON.parse(fs.readFileSync(path.join(prior.directory, 'production-snapshot.json'), 'utf8')).inventory.events;
  const canonical = rows => JSON.stringify([...rows].sort((a, b) => a.id.localeCompare(b.id)), (_, v) =>
    v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b))) : v);
  if (before.events.length !== 31 || canonical(before.events) !== canonical(original) ||
      Number(before.versions) !== 0 || before.lease?.length !== 1 || before.lease[0].token !== null || before.lease[0].expires_at !== '-infinity')
    throw new Error('Unexpected event/lease state; no GET requests performed.');
  fs.writeFileSync(marker, JSON.stringify({ project_ref: prod, directory: dir, started_at: new Date().toISOString() }), { flag: 'wx' });
  try {
    await check('without_api_key', undefined, 401);
    await check('invalid_api_key', 'sb_secret_intentionally_invalid_spots_production_auth_test', 401);
    let keyInfo, keys, publishable, secret;
    try {
      keyInfo = cli(['projects', 'api-keys', `--remote=${prod}`, '--reveal']);
      keys = keyInfo.keys;
      publishable = keys?.filter(k => k.type === 'publishable' && k.name === 'default');
      secret = keys?.filter(k => k.type === 'secret' && k.name === 'default');
      if (publishable?.length !== 1 || secret?.length !== 1 ||
          !publishable[0].api_key?.startsWith('sb_publishable_') || !secret[0].api_key?.startsWith('sb_secret_'))
        throw new Error('Expected one default publishable and secret key; no keys changed.');
      await check('publishable_key', publishable[0].api_key, 401);
      await check('default_secret_get', secret[0].api_key, 405);
    } finally { keyInfo = keys = publishable = secret = undefined; }
  } finally {
    // Always perform this read-only check, even if an unexpected response stops GETs.
    const after = state('after');
    report.events_before = before.events.length;
    report.events_after = after.events.length;
    report.all_event_data_and_uuids_unchanged = canonical(before.events) === canonical(after.events);
    report.lease_and_versions_unchanged = JSON.stringify(before.lease) === JSON.stringify(after.lease) && before.versions === after.versions;
    report.no_remaining_import_lock = after.lease?.length === 1 && after.lease[0].token === null && after.lease[0].expires_at === '-infinity';
    report.source_versions = after.versions;
    report.app_environment_unchanged = appHash() === envHash;
    report.local_test_link_unchanged = fs.readFileSync(path.join(root, 'supabase/.temp/project-ref'), 'utf8').trim() === test;
    save('result.json', report);
  }
  if (![report.all_event_data_and_uuids_unchanged, report.lease_and_versions_unchanged,
    report.no_remaining_import_lock, report.app_environment_unchanged, report.local_test_link_unchanged].every(Boolean))
    throw new Error('Post-test state differs; stopped without write/cleanup operations.');
  report.passed = report.cases.length === 4 && report.cases.every(c => c.passed);
}
main().catch(error => {
  report.passed = false;
  report.error = error.message; // Only fixed, non-secret errors are thrown above.
  console.error(JSON.stringify({ stopped: true, error: error.message }));
  process.exitCode = 1;
}).finally(() => {
  report.finished_at = new Date().toISOString();
  if (dir) save('result.json', report);
  console.log(JSON.stringify({ ...report, directory: dir }));
});
