const s = require('./goabase-integration-support.cjs');
const report = { project_ref: s.ref, started_at: new Date().toISOString(), attempts: 0 };
async function main() {
  if (!process.argv.includes('--confirmed-integration-tests')) throw new Error('Explicit authorization required.');
  report.function_version = s.verifyTarget();
  report.before = s.snapshot();
  if (!s.idle(report.before)) throw new Error('Test project not idle.');
  s.persist('goabase-concurrency-before.json', report.before, true);
  const beforeHash = s.appHash();
  let key = s.secret();
  s.persist('goabase-concurrency-attempt.json', { project_ref: s.ref, started_at: report.started_at }, true);
  async function invoke(index) {
    const start = new Date().toISOString();
    const response = await fetch(`https://${s.ref}.supabase.co/functions/v1/import-goabase`, {
      method: 'POST', body: '{}', headers: { apikey: key, 'Content-Type': 'application/json' },
      redirect: 'error', signal: AbortSignal.timeout(120000),
    });
    const raw = await response.json();
    const body = {};
    for (const name of ['inserted','updated','unchanged','rejected_versions','checked','discovered','cancelled','postponed']) {
      if (Number.isSafeInteger(raw[name]) && raw[name] >= 0) body[name] = raw[name];
    }
    if (typeof raw.error === 'string' && /^[a-z0-9_]{1,100}$/.test(raw.error)) body.error = raw.error;
    if (typeof raw.run_id === 'string' && /^[0-9a-f-]{36}$/.test(raw.run_id)) body.run_id = raw.run_id;
    const result = { index, started_at: start, finished_at: new Date().toISOString(), status: response.status, body };
    console.log(JSON.stringify(result));
    return result;
  }
  try {
    report.attempts = 2;
    const results = await Promise.allSettled([invoke(1), invoke(2)]);
    report.responses = results.map(r => r.status === 'fulfilled' ? r.value : { error: 'network_or_body_failure' });
  } finally {
    key = undefined;
    report.after = s.snapshot();
    s.persist('goabase-concurrency-after.json', report.after, true);
    report.app_environment_unchanged = beforeHash === s.appHash();
  }
  const prior = new Map(report.before.events.map(e => [JSON.stringify([e.source,e.source_event_id]), e]));
  const current = new Map(report.after.events.map(e => [JSON.stringify([e.source,e.source_event_id]), e]));
  report.uuid_changes = [];
  report.removed = [];
  report.changed_source_ids = [];
  for (const [pair, old] of prior) {
    const next = current.get(pair);
    if (!next) report.removed.push(old.source_event_id);
    else {
      if (next.id !== old.id) report.uuid_changes.push(old.source_event_id);
      if (JSON.stringify(next) !== JSON.stringify(old)) report.changed_source_ids.push(old.source_event_id);
    }
  }
  report.new_source_ids = report.after.events.filter(e => !prior.has(JSON.stringify([e.source,e.source_event_id]))).map(e => e.source_event_id);
  const codes = report.responses.map(r => r.status).sort();
  const busy = report.responses.find(r => r.status === 409);
  report.passed = JSON.stringify(codes) === '[200,409]' && busy?.body.error === 'sync_already_running' &&
    s.idle(report.after) && !report.uuid_changes.length && !report.removed.length && report.app_environment_unchanged &&
    report.after.events.length === report.before.events.length + report.new_source_ids.length;
  console.log(JSON.stringify({ passed: report.passed, before: report.before.events.length, after: report.after.events.length,
    uuid_changes: report.uuid_changes, removed: report.removed, new_source_ids: report.new_source_ids,
    changed_source_ids: report.changed_source_ids, duplicates: report.after.duplicates, active_leases: report.after.active_leases }));
  if (!report.passed) throw new Error('Concurrency verification failed; no retries.');
}
main().catch(() => { report.passed = false; report.error = 'Integration test stopped; no retry.'; process.exitCode = 1; })
  .finally(() => {
    report.finished_at = new Date().toISOString();
    s.persist('goabase-concurrency-results.json', report);
    if (!report.passed) console.log('Concurrency test stopped; inspect redacted report.');
  });
