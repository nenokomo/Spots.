// Opt-in backend integration check. Never invokes POST, changes keys or runs migrations.
// Credentials are captured from the authenticated CLI in memory only; never print CLI errors.
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const ref = 'nfomkdvotqtlyymomksb';
const endpoint = `https://${ref}.supabase.co/functions/v1/import-goabase`;
const report = { project_ref: ref, started_at: new Date().toISOString(), method: 'GET', cases: [] };
const appHash = () => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, '.env.local'))).digest('hex');

function cli(args) {
  try {
    return JSON.parse(execFileSync(process.execPath,
      [path.join(root, 'node_modules/supabase/dist/supabase.js'), ...args, '--output-format', 'json'],
      { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 30000 }));
  } catch {
    // execFileSync errors may contain secret stdout. Never expose the original error.
    throw new Error('Protected CLI operation failed; output withheld.');
  }
}

function state() {
  const sql = `select jsonb_build_object(
    'events_count',(select count(*) from public.events),
    'source_versions',(select count(*) from spots_sync_private.goabase_versions),
    'lease_rows',(select count(*) from spots_sync_private.goabase_lease),
    'active_leases',(select count(*) from spots_sync_private.goabase_lease where token is not null),
    'lease_expiry',(select expires_at::text from spots_sync_private.goabase_lease where singleton),
    'cron_jobs',to_regclass('cron.job')) as auth_state;`;
  const result = cli(['db', 'query', sql, `--remote=${ref}`, '--read-only']);
  const value = result.rows?.[0]?.auth_state;
  if (!value) throw new Error('Read-only state inspection returned no result.');
  return value;
}

async function check(name, key, accepted) {
  let response;
  try {
    response = await fetch(endpoint, { method: 'GET', redirect: 'error',
      signal: AbortSignal.timeout(20000), headers: key ? { apikey: key } : {} });
  } catch {
    report.cases.push({ name, status: null, passed: false, error: 'network_or_timeout' });
    throw new Error('Endpoint request failed; stopped without retries.');
  }
  let body;
  try { body = await response.json(); } catch { body = null; }
  const handlerResponse = name !== 'default_secret_get' ||
    (body?.error === 'POST erforderlich' && response.headers.get('allow') === 'POST');
  const entry = { name, status: response.status, passed: accepted.includes(response.status) && handlerResponse };
  // Only a restricted machine error code is retained, never arbitrary response text or headers.
  if (!entry.passed) {
    const code = body?.code;
    if (typeof code === 'string' && /^[A-Z][A-Z0-9_]{0,63}$/.test(code)) entry.error_code = code;
  }
  report.cases.push(entry);
  console.log(JSON.stringify(entry));
  if (!entry.passed) throw new Error('Unexpected authentication response; further endpoint tests stopped.');
}

async function main() {
  if (!process.argv.includes('--confirmed-test-project')) {
    throw new Error('Explicit test authorization flag is required.');
  }
  if (fs.readFileSync(path.join(root, 'supabase/.temp/project-ref'), 'utf8').trim() !== ref) {
    throw new Error('Wrong linked project.');
  }
  const projects = cli(['projects', 'list']).projects;
  const target = projects?.find(p => p.id === ref);
  if (target?.name !== 'spots. testproject' || !target.linked) throw new Error('Test project identity mismatch.');
  const functions = cli(['functions', 'list', `--remote=${ref}`]).functions;
  const fn = functions?.find(f => f.slug === 'import-goabase');
  if (fn?.status !== 'ACTIVE' || fn.verify_jwt !== false) throw new Error('Unexpected deployed function configuration.');
  report.function_version = fn.version;
  const beforeHash = appHash();
  report.before = state();
  console.log(JSON.stringify({ before: report.before }));
  if (report.before.events_count !== 0 || report.before.active_leases !== 0 || report.before.source_versions !== 0) {
    throw new Error('Expected an empty, idle test project; no endpoint tests run.');
  }

  try {
    await check('without_api_key', undefined, [401, 403]);
    await check('invalid_api_key', 'sb_secret_intentionally_invalid_spots_test_key', [401, 403]);

    let keyInfo = cli(['projects', 'api-keys', `--remote=${ref}`, '--reveal']);
    let keys = keyInfo.keys;
    let publishable = keys?.filter(k => k.type === 'publishable' && k.name === 'default');
    let secret = keys?.filter(k => k.type === 'secret' && k.name === 'default');
    if (publishable?.length !== 1 || secret?.length !== 1 ||
      !publishable[0].api_key?.startsWith('sb_publishable_') || !secret[0].api_key?.startsWith('sb_secret_')) {
      throw new Error('Expected exactly one default key of each modern type; no keys changed.');
    }
    try {
      await check('publishable_key', publishable[0].api_key, [401, 403]);
      await check('default_secret_get', secret[0].api_key, [405]);
    } finally {
      // Release references. Credentials were never written to disk or passed as process arguments.
      keyInfo = keys = publishable = secret = undefined;
    }
  } finally {
    // Read-only verification is allowed even after an unexpected endpoint response.
    report.after = state();
    report.app_environment_unchanged = appHash() === beforeHash;
    report.database_unchanged = JSON.stringify(report.before) === JSON.stringify(report.after);
    console.log(JSON.stringify({ after: report.after, database_unchanged: report.database_unchanged,
      app_environment_unchanged: report.app_environment_unchanged }));
  }
  if (!report.database_unchanged || !report.app_environment_unchanged) {
    throw new Error('State changed unexpectedly; stopped.');
  }
  report.passed = report.cases.length === 4 && report.cases.every(c => c.passed);
}

main().catch(error => {
  report.passed = false;
  // All thrown errors here have fixed, non-secret messages.
  report.error = error.message;
  console.log(JSON.stringify({ stopped: true, error: report.error }));
  process.exitCode = 1;
}).finally(() => {
  report.finished_at = new Date().toISOString();
  fs.writeFileSync(path.join(root, 'supabase/.temp/goabase-auth-results.json'), JSON.stringify(report, null, 2) + '\n');
});
