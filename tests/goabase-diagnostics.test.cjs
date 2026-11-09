const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');
const folder = path.join(__dirname, '../supabase/functions/import-goabase');
function load(name, extras = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path.join(folder, name), 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, URL, URLSearchParams, Request, Response,
    AbortController, setTimeout, clearTimeout, ...extras });
  return module.exports;
}
const sync = load('sync.ts');
async function failure(fetcher, ids = [], extra = {}) {
  try { await sync.synchronize(ids, { fetcher, ...extra }); assert.fail('Expected failure'); }
  catch (error) { assert.ok(error instanceof sync.SyncError); return error; }
}
test('deleted detail redirect retains stage/id/status and is never followed or treated as cancellation', async () => {
  const calls = [];
  const result = await sync.synchronize(['118240'], { fetcher: async (url, init) => {
    calls.push(url.href); assert.equal(init.redirect, 'manual');
    return url.pathname.endsWith('/') ? Response.json({ partylist: [] }) :
      new Response('private upstream HTML', { status: 301, headers: { location: 'https://www.goabase.net/party/deleted/118240' } });
  } });
  assert.deepEqual(Array.from(result.removed), ['118240']);
  assert.equal(result.rows.length, 0);
  assert.equal(calls.length, 2);
  assert.ok(!JSON.stringify(result).includes('private'));
});
test('untrusted redirect headers are classified without retention or following', async () => {
  const error = await failure(async () => new Response('', { status: 302,
    headers: { location: 'https://private.example/?secret=DO_NOT_LOG', 'x-private': 'DO_NOT_LOG' } }));
  assert.equal(error.diagnostic.redirect_target, 'external_or_invalid');
  assert.ok(!JSON.stringify(error.diagnostic).includes('DO_NOT_LOG'));
});
test('network, body and JSON errors are distinguishable without raw exception/body text', async () => {
  const cases = [
    [() => { throw new TypeError('SECRET_EXCEPTION'); }, 'fetch', 'network_or_redirect', null],
    [() => ({ status: 200, ok: true, text: async () => { throw new Error('SECRET_BODY'); } }), 'body', 'body_read', 200],
    [() => new Response('<html>SECRET_JSON</html>'), 'json', 'invalid_json', 200],
  ];
  for (const [fetcher, phase, kind, status] of cases) {
    const error = await failure(fetcher);
    assert.equal(error.message, 'source_network_or_json_error');
    assert.equal(error.diagnostic.phase, phase);
    assert.equal(error.diagnostic.kind, kind);
    assert.equal(error.diagnostic.http_status, status);
    assert.ok(!JSON.stringify(error.diagnostic).includes('SECRET'));
  }
});
test('later feed HTTP failure retains the exact page offset', async () => {
  const error = await failure(async url => url.searchParams.get('offset') === '0'
    ? Response.json({ partylist: [{ id: 1 }, { id: 2 }] }) : new Response('', { status: 503 }), [], { pageSize: 2 });
  assert.equal(error.diagnostic.stage, 'feed');
  assert.equal(error.diagnostic.offset, 2);
  assert.equal(error.diagnostic.http_status, 503);
  assert.equal(error.diagnostic.kind, 'http');
});
test('fetch and body timeouts retain their request phase', async () => {
  for (const [fetcher, phase, status] of [
    [() => new Promise(() => {}), 'fetch', null],
    [async () => ({ status: 200, ok: true, text: () => new Promise(() => {}) }), 'body', 200],
  ]) {
    const error = await failure(fetcher, [], { timeoutMs: 5 });
    assert.equal(error.message, 'source_timeout');
    assert.equal(error.diagnostic.kind, 'timeout');
    assert.equal(error.diagnostic.phase, phase);
    assert.equal(error.diagnostic.http_status, status);
  }
});
test('handler logs safe diagnostic, exposes only error code and releases without apply', async () => {
  const calls = [], logs = [];
  const error = await failure(async url => url.pathname.endsWith('/') ? Response.json({ partylist: [] }) :
    new Response('PRIVATE_RESPONSE', { status: 301, headers: { location: '/party/deleted/99999' } }), ['118240']);
  const handler = load('index.ts', { console: { info() {}, error: value => logs.push(value) }, require: id => {
    if (id === './sync.ts') return { ...sync, synchronize: async () => { throw error; } };
    assert.equal(id, 'npm:@supabase/server@1');
    return { withSupabase: (_, fn) => req => fn(req, { supabaseAdmin: { rpc: async name => {
      calls.push(name); return { data: name.endsWith('begin') ? { token: 'fixture', ids: [] } : null, error: null };
    } } }) };
  } });
  const response = await handler.default.fetch(new Request('https://fixture.invalid', { method: 'POST' }));
  assert.equal(response.status, 502);
  assert.deepEqual(await response.json(), { error: 'source_http_301' });
  assert.deepEqual(calls, ['spots_goabase_begin', 'spots_goabase_release']);
  const logged = JSON.parse(logs[0]);
  assert.equal(logged.source.event_id, '118240');
  assert.equal(logged.source.http_status, 301);
  assert.ok(!JSON.stringify(logs).includes('PRIVATE_RESPONSE'));
});
