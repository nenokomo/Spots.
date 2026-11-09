const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const s = require('./goabase-integration-support.cjs');
const report = { project_ref: s.ref, started_at: new Date().toISOString() };
const prefix = process.argv.includes('--after-cli-argument-fix') ? 'goabase-fixture-cli-fixed' : 'goabase-fixture';
function sourceModule() {
  const module = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(s.root,
    'supabase/functions/import-goabase/sync.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { module, exports: module.exports, URL, URLSearchParams, AbortController, setTimeout, clearTimeout });
  return module.exports;
}
async function prepare() {
  const { synchronize } = sourceModule();
  const base = { id: '999990000000001', nameParty: 'Isolated integration fixture', nameTown: 'Fixture city A',
    nameStatus: 'Scheduled', dateStart: '2099-06-01T14:00:00Z', dateEnd: '2099-06-01T18:00:00Z',
    geoLat: 49.5, geoLon: 8.5, dateModified: '2026-11-01T10:00:00Z' };
  const definitions = {
    scheduled: {},
    changed: { nameParty: 'Changed isolated fixture', nameTown: 'Fixture city B', geoLat: 50.5, geoLon: 9.5,
      dateStart: '2099-07-01T14:00:00Z', dateEnd: '2099-07-01T18:00:00Z', dateModified: '2026-11-02T10:00:00Z' },
    cancelled: { nameStatus: 'Cancelled', dateModified: '2026-11-03T10:00:00Z' },
    postponed: { nameStatus: 'Postponed', dateModified: '2026-11-04T10:00:00Z' },
    rescheduled: { dateStart: '2099-08-01T14:00:00Z', dateEnd: '2099-08-01T18:00:00Z', dateModified: '2026-11-05T10:00:00Z' },
  };
  const states = {};
  for (const [name, changes] of Object.entries(definitions)) {
    const party = { ...base, ...changes };
    const result = await synchronize([base.id], { fetcher: async url => {
      if (url.origin !== 'https://www.goabase.net') throw new Error('Unexpected fixture URL');
      return Response.json(url.pathname.endsWith('/') ? { partylist: name === 'scheduled' ? [party] : [] } : { party });
    } });
    states[name] = result.rows[0];
  }
  return fs.readFileSync(path.join(s.root,'supabase/ops/06_test_goabase_fixtures.sql'),'utf8')
    .replace('__GOABASE_FIXTURE_STATES__',JSON.stringify(states));
}
async function main() {
  const sql = await prepare();
  fs.writeFileSync(path.join(s.temp,'goabase-fixture-test.sql'),sql);
  if (process.argv.includes('--prepare-only')) { console.log('Fixture SQL prepared locally; no remote requests.'); return; }
  if (!process.argv.includes('--confirmed-integration-tests')) throw new Error('Explicit authorization required.');
  s.verifyTarget();
  report.before = s.snapshot();
  if (!s.idle(report.before)) throw new Error('Test project not idle.');
  s.persist(`${prefix}-before.json`,report.before,true);
  const beforeHash = s.appHash();
  s.persist(`${prefix}-attempt.json`,{project_ref:s.ref,started_at:report.started_at},true);
  try {
    report.database = s.query(sql,false).rows?.[0]?.fixture_results;
    console.log(JSON.stringify(report.database));
  } finally {
    report.after = s.snapshot();
    report.database_unchanged = JSON.stringify(report.before) === JSON.stringify(report.after);
    report.app_environment_unchanged = beforeHash === s.appHash();
  }
  report.passed = report.database?.passed === true && report.database?.cases.length === 11 &&
    report.database_unchanged && report.app_environment_unchanged;
  if (!report.passed) throw new Error('Fixture checks failed.');
}
if (require.main === module) main().catch(() => {
  report.passed = false; report.error = 'Fixture test stopped; no retry or uncontrolled cleanup.';
  process.exitCode = 1; console.log(report.error);
}).finally(() => {
  if (!process.argv.includes('--prepare-only')) {
    report.finished_at = new Date().toISOString(); s.persist(`${prefix}-results.json`,report);
  }
});
module.exports = { prepare };
