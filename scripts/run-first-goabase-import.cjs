// Explicitly authorized, single POST against the fixed test project; no retries.
// A persistent non-secret attempt marker prevents accidentally running a second import.
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const ref = 'nfomkdvotqtlyymomksb';
const report = { project_ref: ref, started_at: new Date().toISOString(), post_attempts: 0 };
const temp = path.join(root, 'supabase/.temp');
const appHash = () => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, '.env.local'))).digest('hex');

function cli(args) {
  try {
    return JSON.parse(execFileSync(process.execPath,
      [path.join(root, 'node_modules/supabase/dist/supabase.js'), ...args, '--output-format', 'json'],
      { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 30000 }));
  } catch { throw new Error('Protected CLI operation failed; credential-bearing output withheld.'); }
}

function audit() {
  const sql = `select jsonb_build_object(
    'events_count',(select count(*) from public.events),
    'goabase_count',(select count(*) from public.events where source='goabase'),
    'source_versions',(select count(*) from spots_sync_private.goabase_versions),
    'active_leases',(select count(*) from spots_sync_private.goabase_lease where token is not null),
    'lease_rows',(select count(*) from spots_sync_private.goabase_lease),
    'lease_expiry',(select expires_at::text from spots_sync_private.goabase_lease where singleton),
    'cron_jobs',to_regclass('cron.job'),
    'duplicate_source_pairs',(select count(*) from (
      select source,source_event_id from public.events group by source,source_event_id having count(*)>1
    ) d),
    'unique_source_index',exists(select 1 from pg_indexes where schemaname='public' and tablename='events'
      and indexname='events_source_source_event_id_key' and indexdef like 'CREATE UNIQUE INDEX%'),
    'rpc_count',(select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      where n.nspname='public' and p.proname in ('spots_goabase_begin','spots_goabase_apply','spots_goabase_release')),
    'events',coalesce((select jsonb_agg(to_jsonb(e) order by e.source_event_id) from (
      select e.id,e.title,e.city,e.starts_at,e.ends_at,e.latitude,e.longitude,e.status,e.is_published,
        e.source,e.source_event_id,e.source_url,v.modified_at as source_modified_at
      from public.events e left join spots_sync_private.goabase_versions v on v.source_event_id=e.source_event_id
    ) e),'[]'::jsonb)) as import_audit;`;
  const result = cli(['db', 'query', sql, `--remote=${ref}`, '--read-only']);
  if (!result.rows?.[0]?.import_audit) throw new Error('Read-only import audit returned no result.');
  return result.rows[0].import_audit;
}

function validate(auditResult) {
  const issues = [];
  let withGps = 0;
  let published = 0;
  const statuses = {};
  const ids = new Set();
  for (const e of auditResult.events) {
    const errors = [];
    if (!e.title?.trim()) errors.push('missing_title');
    const start = Date.parse(e.starts_at);
    const end = e.ends_at === null ? null : Date.parse(e.ends_at);
    if (!Number.isFinite(start) || (end !== null && (!Number.isFinite(end) || end <= start))) errors.push('invalid_time');
    if (![e.latitude, e.longitude].every((v, i) => v === null ||
      (typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= (i === 0 ? 90 : 180)))) errors.push('invalid_gps');
    if (e.latitude !== null && e.longitude !== null) withGps++;
    if (!['scheduled', 'cancelled', 'postponed'].includes(e.status)) errors.push('invalid_status');
    if (e.is_published && (e.status !== 'scheduled' ||
      (end !== null ? end <= Date.now() : start < Date.now()))) errors.push('invalid_publication');
    if (!Number.isFinite(Date.parse(e.source_modified_at))) errors.push('missing_source_version');
    if (e.source !== 'goabase' || !/^[1-9]\d*$/.test(e.source_event_id)) errors.push('invalid_source_id');
    try {
      const url = new URL(e.source_url);
      if (url.origin !== 'https://www.goabase.net' || url.username || url.password || url.search || url.hash ||
        url.pathname.split('/').filter(Boolean).at(-1) !== e.source_event_id) errors.push('invalid_source_link');
    } catch { errors.push('invalid_source_link'); }
    if (ids.has(e.source_event_id)) errors.push('duplicate_id');
    ids.add(e.source_event_id);
    if (e.is_published) published++;
    statuses[e.status] = (statuses[e.status] ?? 0) + 1;
    if (errors.length) issues.push({ source_event_id: e.source_event_id, errors });
  }
  return { checked: auditResult.events.length, with_gps: withGps, published, statuses, issues };
}

async function main() {
  if (!process.argv.includes('--confirmed-first-post')) throw new Error('Explicit first-import authorization required.');
  if (fs.readFileSync(path.join(temp, 'project-ref'), 'utf8').trim() !== ref) throw new Error('Wrong linked project.');
  const target = cli(['projects', 'list']).projects?.find(p => p.id === ref);
  if (target?.name !== 'spots. testproject' || !target.linked) throw new Error('Test project identity mismatch.');
  const fn = cli(['functions', 'list', `--remote=${ref}`]).functions?.find(f => f.slug === 'import-goabase');
  if (fn?.status !== 'ACTIVE' || fn.verify_jwt !== false) throw new Error('Unexpected function configuration.');
  report.function_version = fn.version;
  const beforeHash = appHash();
  report.before = audit();
  console.log(JSON.stringify({ project: ref, before_events: report.before.events_count,
    before_versions: report.before.source_versions, before_active_leases: report.before.active_leases }));
  if (report.before.events_count !== 0 || report.before.source_versions !== 0 || report.before.active_leases !== 0 ||
    report.before.rpc_count !== 3 || !report.before.unique_source_index) throw new Error('First-import preconditions not met.');
  if (fs.existsSync(path.join(temp, 'goabase-first-import-attempt.json'))) throw new Error('A first import was already attempted; no second POST allowed.');
  let keys = cli(['projects', 'api-keys', `--remote=${ref}`, '--reveal']).keys;
  let secret = keys?.filter(k => k.type === 'secret' && k.name === 'default');
  if (secret?.length !== 1 || !secret[0].api_key?.startsWith('sb_secret_')) throw new Error('Default secret key unavailable; no keys changed.');
  // Exclusive creation makes a second invocation fail before sending another POST.
  fs.writeFileSync(path.join(temp, 'goabase-first-import-attempt.json'), JSON.stringify({ project_ref: ref,
    started_at: report.started_at, function_version: fn.version }), { flag: 'wx' });
  try {
    report.post_attempts = 1;
    const response = await fetch(`https://${ref}.supabase.co/functions/v1/import-goabase`, {
      method: 'POST', body: '{}', redirect: 'error', signal: AbortSignal.timeout(120000),
      headers: { apikey: secret[0].api_key, 'Content-Type': 'application/json' },
    });
    report.http_status = response.status;
    const body = await response.json();
    report.response = {};
    for (const key of ['inserted','updated','unchanged','rejected_versions','cancelled','postponed','discovered','checked']) {
      if (Number.isSafeInteger(body[key]) && body[key] >= 0) report.response[key] = body[key];
    }
    if (typeof body.run_id === 'string' && /^[0-9a-f-]{36}$/.test(body.run_id)) report.response.run_id = body.run_id;
    if (typeof body.error === 'string' && /^[a-z0-9_]{1,100}$/.test(body.error)) report.response.error = body.error;
    console.log(JSON.stringify({ http_status: report.http_status, response: report.response }));
    if (response.status !== 200 || report.response.error) throw new Error('Import failed; no retry or deployment attempted.');
  } catch (error) {
    if (error.message === 'Import failed; no retry or deployment attempted.') throw error;
    throw new Error('Import request/body failed or timed out; outcome requires read-only inspection, no retry.');
  } finally {
    keys = secret = undefined;
    report.after = audit();
    report.validation = validate(report.after);
    report.app_environment_unchanged = appHash() === beforeHash;
    console.log(JSON.stringify({ after_events: report.after.events_count, after_versions: report.after.source_versions,
      active_leases: report.after.active_leases, duplicates: report.after.duplicate_source_pairs,
      validation: report.validation, app_environment_unchanged: report.app_environment_unchanged }));
  }
  if (report.after.active_leases !== 0 || report.after.lease_expiry !== '-infinity' ||
    report.after.duplicate_source_pairs !== 0 || report.validation.issues.length || !report.app_environment_unchanged ||
    report.after.events_count !== report.response.inserted || report.after.source_versions !== report.after.goabase_count ||
    report.response.checked !== report.after.goabase_count || report.response.updated !== 0 || report.response.rejected_versions !== 0) {
    throw new Error('Post-import verification mismatch; no further writes attempted.');
  }
  report.passed = true;
}

main().catch(error => {
  report.passed = false;
  report.error = error.message;
  console.log(JSON.stringify({ stopped: true, error: report.error }));
  process.exitCode = 1;
}).finally(() => {
  report.finished_at = new Date().toISOString();
  fs.writeFileSync(path.join(temp, 'goabase-first-import-results.json'), JSON.stringify(report, null, 2) + '\n');
});
