// One explicitly authorized repeat POST, fixed test project, no automatic retry.
// Before/after snapshots contain event data and UUIDs, never credentials.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const temp = path.join(root, 'supabase/.temp');
const ref = 'nfomkdvotqtlyymomksb';
const report = { project_ref: ref, started_at: new Date().toISOString(), post_attempts: 0 };
const appHash = () => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, '.env.local'))).digest('hex');
const pair = e => JSON.stringify([e.source, e.source_event_id]);
function cli(args) {
  try {
    return JSON.parse(execFileSync(process.execPath,
      [path.join(root, 'node_modules/supabase/dist/supabase.js'), ...args, '--output-format', 'json'],
      { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 30000 }));
  } catch { throw new Error('Protected CLI operation failed; output withheld.'); }
}
function snapshot() {
  const sql = `select jsonb_build_object(
    'captured_at',clock_timestamp(),
    'events_count',(select count(*) from public.events),
    'events',coalesce((select jsonb_agg(to_jsonb(e) order by e.source,e.source_event_id,e.id) from public.events e),'[]'::jsonb),
    'versions',coalesce((select jsonb_agg(jsonb_build_object('source_event_id',v.source_event_id,
      'modified_at',v.modified_at,'payload_hash',md5(v.payload::text)) order by v.source_event_id)
      from spots_sync_private.goabase_versions v),'[]'::jsonb),
    'duplicate_source_pairs',(select count(*) from (select source,source_event_id from public.events
      group by source,source_event_id having count(*)>1) d),
    'active_leases',(select count(*) from spots_sync_private.goabase_lease where token is not null),
    'lease_expiry',(select expires_at::text from spots_sync_private.goabase_lease where singleton),
    'unique_source_index',exists(select 1 from pg_indexes where schemaname='public' and tablename='events'
      and indexname='events_source_source_event_id_key' and indexdef like 'CREATE UNIQUE INDEX%'),
    'cron_jobs',to_regclass('cron.job')) as repeat_snapshot;`;
  const value = cli(['db', 'query', sql, `--remote=${ref}`, '--read-only']).rows?.[0]?.repeat_snapshot;
  if (!value) throw new Error('Read-only snapshot unavailable.');
  return value;
}
function compare(before, after) {
  const old = new Map(before.events.map(e => [pair(e), e]));
  const current = new Map(after.events.map(e => [pair(e), e]));
  const result = { existing: before.events_count, after_count: after.events_count,
    same_uuid: 0, unchanged: 0, changed: [], added: [], removed: [], uuid_changed: [],
    version_advanced: [], version_regressions: [], equal_version_conflicts: [] };
  for (const e of before.events) {
    const next = current.get(pair(e));
    if (!next) { result.removed.push(e); continue; }
    if (e.id !== next.id) result.uuid_changed.push({ source_event_id: e.source_event_id, before: e.id, after: next.id });
    else result.same_uuid++;
    const fields = Object.keys(e).filter(k => k !== 'id' && JSON.stringify(e[k]) !== JSON.stringify(next[k]));
    if (fields.length) result.changed.push({ source_event_id: e.source_event_id, uuid: next.id,
      fields: fields.map(field => ({ field, before: e[field], after: next[field] })) });
    else result.unchanged++;
  }
  for (const e of after.events) if (!old.has(pair(e))) result.added.push(e);
  const versions = new Map(after.versions.map(v => [v.source_event_id, v]));
  for (const v of before.versions) {
    const next = versions.get(v.source_event_id);
    if (!next || Date.parse(next.modified_at) < Date.parse(v.modified_at)) result.version_regressions.push(v.source_event_id);
    else if (Date.parse(next.modified_at) > Date.parse(v.modified_at)) result.version_advanced.push(v.source_event_id);
    else if (next.payload_hash !== v.payload_hash) result.equal_version_conflicts.push(v.source_event_id);
  }
  return result;
}
async function checkChangedSources(after, comparison) {
  const checks = [];
  for (const change of comparison.changed) {
    const e = after.events.find(v => v.source === 'goabase' && v.source_event_id === change.source_event_id);
    const res = await fetch(`https://www.goabase.net/api/party/json/${e.source_event_id}`,
      { redirect: 'error', signal: AbortSignal.timeout(15000) });
    if (res.status !== 200) throw new Error('Changed-event source verification failed; no retry.');
    const { party: p } = await res.json();
    const matched = e.title === p.nameParty.trim() && Date.parse(e.starts_at) === Date.parse(p.dateStart) &&
      (e.ends_at === null ? !p.dateEnd : Date.parse(e.ends_at) === Date.parse(p.dateEnd)) &&
      e.status === p.nameStatus.toLowerCase() && e.source_url === (p.urlParty || `https://www.goabase.net/${e.source_event_id}`);
    checks.push({ source_event_id: e.source_event_id, matched });
    if (!matched) throw new Error('Changed event differs from current source; inspect without another import.');
  }
  return checks;
}
async function main() {
  if (!process.argv.includes('--confirmed-single-repeat')) throw new Error('Explicit repeat-import authorization required.');
  if (fs.readFileSync(path.join(temp, 'project-ref'), 'utf8').trim() !== ref) throw new Error('Wrong linked project.');
  const target = cli(['projects', 'list']).projects?.find(p => p.id === ref);
  if (target?.name !== 'spots. testproject' || !target.linked) throw new Error('Test project identity mismatch.');
  const fn = cli(['functions', 'list', `--remote=${ref}`]).functions?.find(f => f.slug === 'import-goabase');
  if (fn?.status !== 'ACTIVE' || fn.verify_jwt !== false) throw new Error('Unexpected function configuration.');
  report.function_version = fn.version;
  const beforeHash = appHash();
  report.before = snapshot();
  if (report.before.events_count < 1 || report.before.active_leases !== 0 || report.before.duplicate_source_pairs !== 0 ||
    !report.before.unique_source_index || report.before.events.some(e => e.source !== 'goabase') ||
    report.before.events.length !== report.before.events_count) throw new Error('Repeat-import preconditions failed.');
  // Persist every event column, id (UUID), source and source_event_id BEFORE the POST.
  fs.writeFileSync(path.join(temp, 'goabase-repeat-before.json'), JSON.stringify(report.before, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ project_ref: ref, snapshot_saved: true, before_events: report.before.events_count,
    before_versions: report.before.versions.length, active_leases: report.before.active_leases }));
  let keys = cli(['projects', 'api-keys', `--remote=${ref}`, '--reveal']).keys;
  let secret = keys?.filter(k => k.type === 'secret' && k.name === 'default');
  if (secret?.length !== 1 || !secret[0].api_key?.startsWith('sb_secret_')) throw new Error('Default secret key unavailable.');
  fs.writeFileSync(path.join(temp, 'goabase-repeat-attempt.json'), JSON.stringify({ project_ref: ref,
    started_at: report.started_at }), { flag: 'wx' });
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
    if (response.status !== 200 || report.response.error) throw new Error('Repeat import failed; no retry.');
  } finally {
    keys = secret = undefined;
    report.after = snapshot();
    fs.writeFileSync(path.join(temp, 'goabase-repeat-after.json'), JSON.stringify(report.after, null, 2) + '\n', { flag: 'wx' });
    report.comparison = compare(report.before, report.after);
    report.app_environment_unchanged = appHash() === beforeHash;
    console.log(JSON.stringify({ comparison: report.comparison, active_leases: report.after.active_leases,
      duplicates: report.after.duplicate_source_pairs, app_environment_unchanged: report.app_environment_unchanged }));
  }
  const c = report.comparison;
  if (c.removed.length || c.uuid_changed.length || c.version_regressions.length || c.equal_version_conflicts.length ||
    report.after.active_leases !== 0 || report.after.lease_expiry !== '-infinity' || report.after.duplicate_source_pairs !== 0 ||
    !report.after.unique_source_index || !report.app_environment_unchanged ||
    report.after.cron_jobs !== report.before.cron_jobs ||
    report.after.events_count !== report.before.events_count + c.added.length ||
    report.after.versions.length !== report.after.events_count || report.response.inserted !== c.added.length ||
    report.response.updated !== c.changed.length || report.response.unchanged + report.response.rejected_versions !== c.unchanged ||
    report.response.checked !== report.after.events_count) throw new Error('Repeat comparison failed; no further writes.');
  report.changed_source_checks = await checkChangedSources(report.after, c);
  report.passed = true;
}
main().catch(() => {
  // Do not expose native CLI/fetch errors: they may contain request context.
  report.passed = false;
  report.error = 'Repeat test stopped; inspect recorded status and snapshots. No retry performed.';
  console.log(JSON.stringify({ stopped: true, error: report.error }));
  process.exitCode = 1;
}).finally(() => {
  report.finished_at = new Date().toISOString();
  fs.writeFileSync(path.join(temp, 'goabase-repeat-results.json'), JSON.stringify(report, null, 2) + '\n');
});
