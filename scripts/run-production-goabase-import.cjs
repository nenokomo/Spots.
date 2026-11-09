// Exactly one approved production POST; all other remote operations are reads.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const ts = require('typescript');
const { createClient } = require('@supabase/supabase-js');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const prod = 'yhnxdeypkbzyjappuzmv', test = 'nfomkdvotqtlyymomksb';
const report = { project_ref: prod, started_at: new Date().toISOString(), post_attempts: 0 };
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
let dir;
function cli(args) {
  try {
    const result = JSON.parse(execFileSync(process.execPath,
      [path.join(root, 'node_modules/supabase/dist/supabase.js'), ...args, '--output-format', 'json'],
      { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 45000 }));
    if (result.error) throw new Error('CLI failure.');
    return result;
  } catch { throw new Error('Protected CLI operation failed; raw diagnostics withheld.'); }
}
function save(name, value) { fs.writeFileSync(path.join(dir, name), JSON.stringify(value, null, 2) + '\n'); }
function state(name) {
  const file = path.join(dir, `${name}.sql`);
  fs.writeFileSync(file, `select jsonb_build_object(
    'events',(select coalesce(jsonb_agg(to_jsonb(e) order by id),'[]'::jsonb) from public.events e),
    'lease',(select jsonb_agg(to_jsonb(l) order by singleton) from spots_sync_private.goabase_lease l),
    'versions',(select coalesce(jsonb_agg(to_jsonb(v) order by source_event_id),'[]'::jsonb) from spots_sync_private.goabase_versions v),
    'duplicates',(select count(*) from (select source,source_event_id from public.events group by source,source_event_id having count(*)>1) d)
  ) as snapshot;`, { flag: 'wx' });
  const result = cli(['db', 'query', `--remote=${prod}`, '--read-only', '--file', file]).rows?.[0]?.snapshot;
  if (!result) throw new Error('Missing read-only database snapshot.');
  save(`${name}.json`, result);
  return result;
}
function validate(events, versions) {
  const issues = [], statuses = {}, versionIds = new Set(versions.map(v => v.source_event_id));
  let gps = 0, published = 0;
  for (const e of events) {
    const errors = [], start = Date.parse(e.starts_at), end = e.ends_at === null ? null : Date.parse(e.ends_at);
    if (!e.title?.trim()) errors.push('missing_title');
    if (!Number.isFinite(start) || (end !== null && (!Number.isFinite(end) || end <= start))) errors.push('invalid_time');
    if (![e.latitude, e.longitude].every((v, i) => v === null || typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= (i ? 180 : 90))) errors.push('invalid_gps');
    if (e.latitude !== null && e.longitude !== null) gps++;
    if (!['scheduled', 'cancelled', 'postponed'].includes(e.status)) errors.push('invalid_status');
    if (e.is_published && (e.status !== 'scheduled' || (end !== null ? end <= Date.now() : start < Date.now()))) errors.push('invalid_publication');
    if (e.source !== 'goabase' || !/^[1-9]\d*$/.test(e.source_event_id)) errors.push('invalid_source');
    if (!versionIds.has(e.source_event_id)) errors.push('missing_source_version');
    try {
      const link = new URL(e.source_url);
      if (link.origin !== 'https://www.goabase.net' || link.username || link.password || link.search || link.hash ||
          link.pathname.split('/').filter(Boolean).at(-1) !== e.source_event_id) errors.push('invalid_source_link');
    } catch { errors.push('invalid_source_link'); }
    statuses[e.status] = (statuses[e.status] ?? 0) + 1;
    if (e.is_published) published++;
    if (errors.length) issues.push({ source_event_id: e.source_event_id, errors });
  }
  return { checked: events.length, gps, published, statuses, issues };
}
async function checkAppRead(after) {
  const env = fs.readFileSync(path.join(root, '.env.local'), 'utf8');
  const value = name => {
    const match = env.match(new RegExp(`^\\s*${name}\\s*=\\s*(.*?)\\s*$`, 'm'));
    return match?.[1]?.replace(/^(["'])(.*)\1$/, '$2');
  };
  const url = value('EXPO_PUBLIC_SUPABASE_URL'), key = value('EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
  if (url?.replace(/\/$/, '') !== `https://${prod}.supabase.co` || !key?.startsWith('sb_publishable_'))
    throw new Error('App public configuration does not match approved production project.');
  // Use the real app projection and column mapping, without modifying the frontend.
  const schema = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root, 'src/services/eventSchema.ts'), 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: schema.exports });
  const { eventColumns: c, eventProjection, publishedValue } = schema.exports;
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  const now = new Date().toISOString();
  const nowMs = Date.parse(now);
  const base = () => client.from('events').select(eventProjection).eq(c.publication, publishedValue).eq(c.status, 'scheduled');
  const checks = [
    ['published', base, e => e.is_published && e.status === 'scheduled'],
    ['explore', () => base().gt(c.startsAt, now), e => e.is_published && e.status === 'scheduled' && Date.parse(e.starts_at) > nowMs],
    ['live', () => base().lte(c.startsAt, now).gt(c.endsAt, now).gte(c.latitude, -90).lte(c.latitude, 90).gte(c.longitude, -180).lte(c.longitude, 180),
      e => e.is_published && e.status === 'scheduled' && Date.parse(e.starts_at) <= nowMs && Date.parse(e.ends_at) > nowMs &&
        typeof e.latitude === 'number' && Math.abs(e.latitude) <= 90 && typeof e.longitude === 'number' && Math.abs(e.longitude) <= 180],
  ];
  const result = {};
  for (const [name, build, expected] of checks) {
    const ids = [];
    for (let offset = 0; ; offset += 200) {
      const response = await build().order(c.startsAt).order(c.id).range(offset, offset + 199).abortSignal(AbortSignal.timeout(20000));
      if (response.error || response.status !== 200 || !Array.isArray(response.data)) throw new Error('App publishable-key read failed; raw response withheld.');
      ids.push(...response.data.map(e => e.id));
      if (response.data.length < 200) break;
    }
    const expectedIds = after.events.filter(expected).map(e => e.id).sort();
    result[name] = { status: 200, count: ids.length, matches_database: JSON.stringify(ids.sort()) === JSON.stringify(expectedIds) };
    if (!result[name].matches_database) throw new Error('App query results differ from database snapshot.');
  }
  return result;
}
async function main() {
  if (!process.argv.includes('--approved-one-production-post')) throw new Error('Explicit one-POST production authorization required.');
  const marker = path.join(root, 'supabase/.temp/production-first-post-attempt.json');
  if (fs.existsSync(marker)) throw new Error('Production POST attempt already recorded; no second POST allowed.');
  if (fs.readFileSync(path.join(root, 'supabase/.temp/project-ref'), 'utf8').trim() !== test) throw new Error('Unexpected local link.');
  const target = cli(['projects', 'list']).projects?.find(p => p.id === prod);
  if (target?.name !== 'Spots.' || target.id === test) throw new Error('Wrong production identity.');
  const backup = JSON.parse(fs.readFileSync(path.join(root, 'supabase/.temp/production-backup-latest.json'), 'utf8'));
  if (backup.production_ref !== prod) throw new Error('Wrong backup target.');
  const manifest = JSON.parse(fs.readFileSync(path.join(backup.directory, 'sha256-manifest.json'), 'utf8'));
  for (const [file, expected] of Object.entries(manifest)) if (hash(path.join(backup.directory, file)) !== expected) throw new Error('Backup checksum mismatch.');
  const restore = JSON.parse(fs.readFileSync(path.join(backup.directory, 'local-restore-report.json'), 'utf8'));
  if (!restore.results.public_schema_restore_passed) throw new Error('Restore evidence missing.');
  report.backup_present_and_checksums_verified = true;
  const fn = cli(['functions', 'list', `--remote=${prod}`]).functions?.find(f => f.slug === 'import-goabase');
  if (fn?.status !== 'ACTIVE' || fn.version !== 2 || fn.verify_jwt !== false ||
      fn.ezbr_sha256 !== 'f30f017ec6ce42eba8419bd1a8e2c5122b76fb357f27aba5f9c25e3e11a0497c') throw new Error('Unexpected function version/configuration.');
  report.function_version = fn.version;
  dir = path.join(root, 'supabase/backups', `production-first-import-${new Date().toISOString().replace(/[:.]/g, '-')}`);
  fs.mkdirSync(dir);
  const envHash = hash(path.join(root, '.env.local'));
  const before = state('before');
  if (before.events.length !== 31 || before.versions.length !== 0 || Number(before.duplicates) !== 0 ||
      before.lease?.length !== 1 || before.lease[0].token !== null || before.lease[0].expires_at !== '-infinity')
    throw new Error('Unexpected initial event/lease state; no POST performed.');
  let keys, secret;
  try {
    keys = cli(['projects', 'api-keys', `--remote=${prod}`, '--reveal']).keys;
    secret = keys?.filter(k => k.type === 'secret' && k.name === 'default');
    if (secret?.length !== 1 || !secret[0].api_key?.startsWith('sb_secret_')) throw new Error('Default secret unavailable.');
    fs.writeFileSync(marker, JSON.stringify({ project_ref: prod, directory: dir, started_at: new Date().toISOString() }), { flag: 'wx' });
    report.post_attempts = 1;
    save('result.json', report);
    console.log(JSON.stringify({ project_ref: prod, backup_verified: true, before_events: 31, action: 'Exactly one POST, no retries' }));
    try {
      const response = await fetch(`https://${prod}.supabase.co/functions/v1/import-goabase`, {
        method: 'POST', redirect: 'error', signal: AbortSignal.timeout(120000),
        headers: { apikey: secret[0].api_key, 'Content-Type': 'application/json' }, body: '{}',
      });
      report.http_status = response.status;
      const body = await response.json();
      report.response = {};
      for (const key of ['inserted', 'updated', 'unchanged', 'rejected_versions', 'cancelled', 'postponed', 'discovered', 'checked'])
        if (Number.isSafeInteger(body[key]) && body[key] >= 0) report.response[key] = body[key];
      if (typeof body.run_id === 'string' && /^[0-9a-f-]{36}$/.test(body.run_id)) report.response.run_id = body.run_id;
      if (typeof body.error === 'string' && /^[a-z0-9_]{1,100}$/.test(body.error)) report.response.error = body.error;
      console.log(JSON.stringify({ http_status: report.http_status, response: report.response }));
      if (response.status !== 200 || report.response.error || Object.keys(report.response).length !== 9)
        throw new Error('Import returned an error or incomplete report; no retry.');
    } catch (error) {
      if (error.message === 'Import returned an error or incomplete report; no retry.') throw error;
      throw new Error('POST or response failed/timed out; outcome requires read-only investigation, no retry.');
    } finally {
      keys = secret = undefined;
      report.app_environment_unchanged = hash(path.join(root, '.env.local')) === envHash;
      report.local_test_link_unchanged = fs.readFileSync(path.join(root, 'supabase/.temp/project-ref'), 'utf8').trim() === test;
      const after = state('after');
      report.events_before = before.events.length;
      report.events_after = after.events.length;
      const bySource = new Map(after.events.map(e => [`${e.source}:${e.source_event_id}`, e]));
      const oldSources = new Set(before.events.map(e => `${e.source}:${e.source_event_id}`));
      const added = after.events.filter(e => !oldSources.has(`${e.source}:${e.source_event_id}`));
      const changed = [], missing = [], changedIds = [];
      for (const old of before.events) {
        const fresh = bySource.get(`${old.source}:${old.source_event_id}`);
        if (!fresh) { missing.push(old.source_event_id); continue; }
        if (old.id !== fresh.id || old.created_at !== fresh.created_at) changedIds.push(old.source_event_id);
        const fields = Object.keys(old).filter(k => JSON.stringify(old[k]) !== JSON.stringify(fresh[k]));
        if (fields.length) changed.push({ source_event_id: old.source_event_id, fields });
      }
      report.comparison = { new_events: added.length, changed_existing: changed.length, unchanged_existing: before.events.length - changed.length - missing.length,
        missing_original: missing, changed_original_identity: changedIds, new_source_ids: added.map(e => e.source_event_id), changes: changed };
      save('comparison.json', report.comparison);
      report.all_original_uuids_and_created_at_preserved = missing.length === 0 && changedIds.length === 0;
      report.duplicates = Number(after.duplicates);
      report.no_remaining_import_lock = after.lease?.length === 1 && after.lease[0].token === null && after.lease[0].expires_at === '-infinity';
      report.source_versions = after.versions.length;
      report.validation = validate(after.events, after.versions);
      save('result.json', report);
    }
  } finally { keys = secret = undefined; }
  const counts = report.response;
  if (!report.all_original_uuids_and_created_at_preserved || report.duplicates !== 0 || !report.no_remaining_import_lock ||
      report.validation.issues.length || !report.app_environment_unchanged || !report.local_test_link_unchanged ||
      report.events_after !== report.events_before + counts.inserted || report.comparison.new_events !== counts.inserted ||
      report.comparison.changed_existing !== counts.updated || report.comparison.unchanged_existing !== counts.unchanged ||
      counts.checked !== counts.inserted + counts.updated + counts.unchanged + counts.rejected_versions ||
      report.source_versions !== report.events_after || counts.rejected_versions !== 0)
    throw new Error('Post-import verification mismatch; stopped without further writes.');
  report.app_read = await checkAppRead(JSON.parse(fs.readFileSync(path.join(dir, 'after.json'), 'utf8')));
  report.passed = true;
}
module.exports = { checkAppRead };
if (require.main === module) main().catch(error => {
  report.passed = false;
  report.error = error.message;
  console.error(JSON.stringify({ stopped: true, error: error.message }));
  process.exitCode = 1;
}).finally(() => {
  report.finished_at = new Date().toISOString();
  if (dir) save('result.json', report);
  console.log(JSON.stringify({ ...report, directory: dir }));
});
