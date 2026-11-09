// Read-only investigation after the single failed POST. Never invokes the function.
const fs = require('node:fs');
const path = require('node:path');
const { checkAppRead } = require('./run-production-goabase-import.cjs');
const root = path.resolve(__dirname, '..');
async function sourceProbe(url) {
  try {
    const r = await fetch(url, { method: 'GET', redirect: 'manual',
      headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(15000) });
    const body = await r.text();
    let json;
    try { json = JSON.parse(body); } catch {}
    const location = r.headers.get('location');
    return { url, status: r.status, content_type: r.headers.get('content-type'), bytes: Buffer.byteLength(body),
      json_valid: json !== undefined, partylist_count: Array.isArray(json?.partylist) ? json.partylist.length : null,
      redirect_location: location && location.startsWith('https://www.goabase.net/') ? location : null,
      json_error_code: typeof json?.error === 'string' && /^[a-z0-9_]{1,80}$/i.test(json.error) ? json.error : undefined };
  } catch (error) {
    return { url, network_error: true, error_name: error.name,
      cause_code: typeof error.cause?.code === 'string' ? error.cause.code : undefined };
  }
}
async function main() {
  const marker = JSON.parse(fs.readFileSync(path.join(root, 'supabase/.temp/production-first-post-attempt.json'), 'utf8'));
  if (marker.project_ref !== 'yhnxdeypkbzyjappuzmv') throw new Error('Wrong project.');
  const dir = marker.directory;
  const prior = JSON.parse(fs.readFileSync(path.join(dir, 'result.json'), 'utf8'));
  if (prior.post_attempts !== 1 || prior.http_status !== 502) throw new Error('Unexpected prior attempt.');
  const after = JSON.parse(fs.readFileSync(path.join(dir, 'after.json'), 'utf8'));
  const result = { investigated_at: new Date().toISOString(), remote_function_calls: 0,
    post_attempts_unchanged: 1, original_error: prior.response.error };
  // No secrets or sensitive remote error bodies are logged or persisted.
  result.app_read = await checkAppRead(after);
  result.source_feed = await sourceProbe('https://www.goabase.net/api/party/json/?country=DE&eventtype=club&limit=500&offset=0');
  result.source_sample_detail = await sourceProbe('https://www.goabase.net/api/party/json/117895');
  result.limitation = 'Local source GET probes cannot establish the exact cause of the earlier Edge-runtime failure. No import retried.';
  fs.writeFileSync(path.join(dir, 'read-only-investigation.json'), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify(result));
}
main().catch(() => { console.error('Read-only investigation stopped; raw output withheld.'); process.exitCode = 1; });
