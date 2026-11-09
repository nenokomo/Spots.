// Executes only source GETs through the deployed sync algorithm; no Supabase calls.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
async function main() {
  const reportFile = path.join(root, 'supabase/.temp/goabase-source-focused-probe.json');
  if (fs.existsSync(reportFile)) throw new Error('Probe already recorded; no automatic repetition.');
  const before = JSON.parse(fs.readFileSync(path.join(root, 'supabase/backups/production-first-import-2026-11-08T16-40-09-274Z/before.json'), 'utf8'));
  const module = { exports: {} };
  // Use the captured deployed source, even if a local diagnostic candidate now exists.
  const deployed = path.join(root, 'supabase/backups/production-function-deploy-2026-11-08T16-27-36-679Z/production-deployed-source/supabase/functions/import-goabase/sync.ts');
  const code = ts.transpileModule(fs.readFileSync(deployed, 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, URL, URLSearchParams, AbortController, setTimeout, clearTimeout });
  const requests = [];
  const fetcher = async (url, init) => {
    if (url.origin !== 'https://www.goabase.net' || !url.pathname.startsWith('/api/party/json/')) throw new Error('Unexpected source target.');
    const entry = { stage: url.pathname.endsWith('/') ? 'feed' : 'detail',
      offset: url.searchParams.get('offset'), event_id: url.pathname.endsWith('/') ? null : url.pathname.split('/').at(-1), started_at: new Date().toISOString() };
    requests.push(entry);
    try {
      const r = await fetch(url, { ...init, method: 'GET' });
      entry.http_status = r.status;
      const body = await r.text();
      try { JSON.parse(body); entry.json_valid = true; } catch { entry.json_valid = false; }
      // Return to original parser without storing source data or headers in the report.
      return new Response(body, { status: r.status });
    } catch (e) { entry.fetch_or_body_error = true; entry.error_name = ['TypeError','AbortError','TimeoutError'].includes(e.name) ? e.name : 'Other'; throw e; }
    finally { entry.finished_at = new Date().toISOString(); }
  };
  const report = { started_at: new Date().toISOString(), db_operations: 0, function_calls: 0,
    stored_ids: before.events.length, requests };
  try {
    const result = await module.exports.synchronize(before.events.map(e => e.source_event_id), { fetcher });
    report.passed = true;
    report.checked = result.rows.length;
    report.discovered = result.discovered;
  } catch (e) { report.passed = false; report.error = /^[a-z0-9_]{1,100}$/.test(e.message) ? e.message : 'probe_failed'; }
  report.finished_at = new Date().toISOString();
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ ...report, requests: requests.filter(r => r.fetch_or_body_error || !r.json_valid || r.http_status !== 200), total_source_gets: requests.length }));
}
main().catch(() => { console.log('Read-only source probe stopped; diagnostics withheld.'); process.exitCode = 1; });
