const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.join(__dirname, '../supabase/functions/import-goabase');
const NOW = Date.parse('2030-06-01T12:00:00Z');
function load(name, extras = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path.join(root, name), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, URL, URLSearchParams,
    Request, Response, AbortController, setTimeout, clearTimeout, console: { info() {}, error() {} },
    ...extras }, { filename: name });
  return module.exports;
}
const { synchronize, mapParty } = load('sync.ts');
function party(overrides = {}) {
  return { id: 1001, nameParty: 'Isolated fixture', nameStatus: 'Scheduled',
    dateStart: '2030-06-01T14:00:00Z', dateEnd: '2030-06-01T18:00:00Z',
    dateModified: '2030-05-31T10:00:00Z', nameTown: 'Fixture town', geoLat: '49.009',
    geoLon: '8.404', ...overrides };
}
function upstream(parties, options = {}) {
  const requests = [];
  const details = new Map(parties.map(p => [String(p.id), p]));
  return { requests, details, fetcher: async (url, init) => {
    requests.push({ url, init });
    if (options.override) {
      const result = await options.override(url, init);
      if (result) return result;
    }
    if (url.pathname.endsWith('/')) {
      const offset = Number(url.searchParams.get('offset'));
      const limit = Number(url.searchParams.get('limit'));
      return Response.json({ partylist: (options.list ?? parties).slice(offset, offset + limit) });
    }
    const value = details.get(url.pathname.split('/').at(-1));
    return value ? Response.json({ party: value }) : new Response('', { status: 404 });
  } };
}
function run(source, ids = [], options = {}) {
  return synchronize(ids, { fetcher: source.fetcher, now: () => NOW, ...options });
}

test('pagination uses record offsets, loads over 50 and fetches each detail', async () => {
  const source = upstream(Array.from({ length: 55 }, (_, i) => party({ id: i + 1 })));
  const result = await run(source, [], { pageSize: 30 });
  assert.equal(result.rows.length, 55);
  assert.equal(result.discovered, 55);
  assert.deepEqual(source.requests.filter(r => r.url.search).map(r => r.url.searchParams.get('offset')), ['0', '30']);
  assert.equal(source.requests[0].url.searchParams.get('country'), 'DE');
  assert.equal(source.requests[0].url.searchParams.get('eventtype'), 'club');
  assert.ok(source.requests.every(r => r.init.signal));
});

test('documented maximum offset uses an overlapping final page without duplicate details', async () => {
  const source = upstream(Array.from({ length: 510 }, (_, i) => party({ id: i + 1 })));
  const result = await run(source);
  assert.equal(result.rows.length, 510);
  assert.deepEqual(source.requests.filter(r => r.url.search).map(r => r.url.searchParams.get('offset')), ['0', '40']);
});

test('full final page and ignored offsets fail explicitly rather than claim completeness', async () => {
  const full = upstream(Array.from({ length: 540 }, (_, i) => party({ id: i + 1 })));
  await assert.rejects(run(full), /source_pagination_limit/);
  const stuck = upstream([], { override: url => url.search
    ? Response.json({ partylist: [party({ id: 1 }), party({ id: 2 })] }) : null });
  await assert.rejects(run(stuck, [], { pageSize: 2 }), /source_pagination_stalled/);
});

test('deduplicates discovery and known IDs before detail requests', async () => {
  const source = upstream([party()], { list: [party(), party()] });
  assert.equal((await run(source, ['1001', '1001'])).rows.length, 1);
  assert.equal(source.requests.length, 2);
});

test('stored events missing from future list are checked for cancellation and postponement', async () => {
  for (const status of ['Cancelled', 'Postponed']) {
    const source = upstream([party({ nameStatus: status })], { list: [] });
    const result = await run(source, ['1001']);
    assert.equal(result.rows[0].status, status.toLowerCase());
    assert.equal(result.rows[0].is_published, false);
  }
});

test('changed title/date/GPS and canonical original link are mapped', async () => {
  const value = party({ nameParty: 'Changed fixture', dateStart: '2030-06-02T14:00:00+02:00',
    dateEnd: '2030-06-02T18:00:00+02:00', geoLat: 50, urlParty: 'https://www.goabase.net/party/fixture/1001' });
  const row = (await run(upstream([value]))).rows[0];
  assert.equal(row.title, 'Changed fixture');
  assert.equal(row.starts_at, '2030-06-02T12:00:00.000Z');
  assert.equal(row.latitude, 50);
  assert.equal(row.source_url, value.urlParty);
  assert.equal(row.status, 'scheduled');
  assert.equal(row.is_published, true);
});

test('expired events unpublish; no end invents no live duration', () => {
  assert.equal(mapParty(party({ dateStart: '2030-06-01T10:00:00Z', dateEnd: '2030-06-01T12:00:00Z' }), '1001', NOW).is_published, false);
  assert.equal(mapParty(party({ dateStart: '2030-06-01T10:00:00Z', dateEnd: null }), '1001', NOW).is_published, false);
  assert.equal(mapParty(party({ dateEnd: null }), '1001', NOW).ends_at, null);
});

test('GPS rejects booleans, whitespace and out-of-range values', () => {
  const row = mapParty(party({ geoLat: ' ', geoLon: false }), '1001', NOW);
  assert.equal(row.latitude, null);
  assert.equal(row.longitude, null);
  assert.equal(mapParty(party({ geoLat: 91 }), '1001', NOW).latitude, null);
});

test('invalid records, timezone, source versions and links reject the batch', async () => {
  for (const value of [null, party({ nameParty: 123 }), party({ dateStart: '2030-06-01T14:00:00' }),
    party({ dateModified: null }), party({ dateEnd: '2030-06-01T14:00:00Z' }),
    party({ urlParty: 'https://evil.invalid/1001' }),
    party({ urlParty: 'https://www.goabase.net/party/wrong/99' })]) {
    await assert.rejects(run(upstream([party()], { override: url =>
      url.search ? null : Response.json({ party: value }) })));
  }
});

test('HTTP 429/500, network/JSON errors, invalid lists and missing detail fail safely', async () => {
  for (const override of [() => new Response('', { status: 429 }),
    () => new Response('', { status: 500 }), () => { throw new Error('private failure'); },
    () => new Response('{'), () => Response.json({ other: [] })]) {
    await assert.rejects(run(upstream([], { override })));
  }
  await assert.rejects(run(upstream([]), ['1001']), /source_http_404/);
});

test('later page failure rejects before detail or commit', async () => {
  const source = upstream([party({ id: 1 }), party({ id: 2 })], { override: url =>
    url.searchParams.get('offset') === '2' ? new Response('', { status: 503 }) : null });
  await assert.rejects(run(source, [], { pageSize: 2 }), /source_http_503/);
  assert.equal(source.requests.length, 2);
});

test('timeout bounds fetch and body reading, even when upstream ignores abort', async () => {
  await assert.rejects(synchronize([], { fetcher: () => new Promise(() => {}), timeoutMs: 5 }), /source_timeout/);
  await assert.rejects(synchronize([], { fetcher: async () => ({ ok: true, text: () => new Promise(() => {}) }), timeoutMs: 5 }), /source_timeout/);
});

test('overall budget and stored ID capacity stop work explicitly', async () => {
  let tick = 0;
  await assert.rejects(synchronize([], { fetcher: upstream([]).fetcher, now: () => tick++ * 100, budgetMs: 1 }), /sync_deadline_exceeded/);
  await assert.rejects(run(upstream([]), Array.from({ length: 5001 }, (_, i) => String(i + 1))), /sync_capacity_exceeded/);
});

function handlerHarness({ sourceError = false, busy = false, dbError = false } = {}) {
  const calls = [];
  let auth;
  const admin = { rpc: async (name, args) => {
    calls.push({ name, args });
    if (name.endsWith('begin')) return { data: busy ? null : { token: 'fixture-token', ids: [] }, error: dbError ? {} : null };
    return { data: { inserted: 0 }, error: null };
  } };
  const module = load('index.ts', { require: id => {
    if (id === './sync.ts') return { SyncError: load('sync.ts').SyncError,
      synchronize: async () => { if (sourceError) throw new Error('secret/internal'); return { rows: [], discovered: 0 }; } };
    assert.equal(id, 'npm:@supabase/server@1');
    return { withSupabase: (config, handler) => { auth = config; return req => handler(req, { supabaseAdmin: admin }); } };
  } });
  return { calls, auth, invoke: (method = 'POST') => module.default.fetch(new Request('https://fixture.invalid', { method })) };
}

test('handler retains default secret auth, rejects GET before any RPC', async () => {
  const h = handlerHarness();
  assert.equal(h.auth.auth, 'secret');
  assert.equal((await h.invoke('GET')).status, 405);
  assert.equal(h.calls.length, 0);
});

test('handler rejects parallel or missing backend and never falls back to direct writes', async () => {
  for (const [options, status] of [[{ busy: true }, 409], [{ dbError: true }, 503]]) {
    const h = handlerHarness(options);
    assert.equal((await h.invoke()).status, status);
    assert.equal(h.calls.filter(c => c.name.endsWith('apply')).length, 0);
  }
});

test('source failure never applies events, releases lease and hides internal details', async () => {
  const h = handlerHarness({ sourceError: true });
  const response = await h.invoke();
  assert.equal(response.status, 500);
  assert.equal((await response.json()).error, 'sync_failed');
  assert.deepEqual(h.calls.map(c => c.name), ['spots_goabase_begin', 'spots_goabase_release']);
});

test('successful handler commits exactly once then releases', async () => {
  const h = handlerHarness();
  assert.equal((await h.invoke()).status, 200);
  assert.deepEqual(h.calls.map(c => c.name), ['spots_goabase_begin', 'spots_goabase_apply_v3', 'spots_goabase_release']);
});
