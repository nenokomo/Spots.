const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

const filename = path.join(__dirname, '../supabase/functions/import-goabase/index.ts');
const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const now = Date.parse('2030-06-01T12:00:00Z');
class FixedDate extends Date { static now() { return now; } }

function party(overrides = {}) {
  return {
    id: 1001, nameParty: 'Isolated test fixture', nameStatus: 'Scheduled',
    dateStart: '2030-06-01T14:00:00Z', dateEnd: '2030-06-01T18:00:00Z',
    nameTown: 'Test location', geoLat: '49.009', geoLon: '8.404',
    ...overrides,
  };
}

// Run the supplied handler itself. No network, credentials, Supabase or real writes.
// The wrapper is substituted: these tests DO NOT validate its authentication.
// The in-memory table assumes the required UNIQUE(source, source_event_id).
function harness(initialParties = [], options = {}) {
  let parties = initialParties;
  const state = { auth: null, requests: [], writes: [], rows: new Map(), nextId: 1 };
  const module = { exports: {} };
  const admin = {
    from(table) {
      assert.equal(table, 'events');
      return {
        async upsert(rows, config) {
          state.writes.push({ rows, config });
          assert.equal(config.onConflict, 'source,source_event_id');
          if (options.dbError) return { error: { message: options.dbError } };
          const keys = rows.map(row => `${row.source}:${row.source_event_id}`);
          if (new Set(keys).size !== keys.length) return { error: { message: 'ON CONFLICT DO UPDATE command cannot affect row a second time' } };
          for (const row of rows) {
            const key = `${row.source}:${row.source_event_id}`;
            const previous = state.rows.get(key);
            state.rows.set(key, { id: `fixture-row-${state.nextId++}`, status: 'scheduled', ...previous, ...row });
          }
          return { error: null };
        },
      };
    },
  };
  const context = vm.createContext({
    module, exports: module.exports, URL, Request, Response, Date: FixedDate,
    require(id) {
      assert.equal(id, 'npm:@supabase/server@1');
      return {
        withSupabase(auth, handler) {
          state.auth = auth;
          return req => handler(req, { supabaseAdmin: admin });
        },
      };
    },
    async fetch(url, init) {
      state.requests.push({ url: new URL(url), init });
      if (options.fetchError) throw new Error('Simulated upstream failure');
      const body = options.rawBody ?? JSON.stringify(options.payload ?? { partylist: parties });
      return new Response(body, { status: options.httpStatus ?? 200 });
    },
  });
  vm.runInContext(output, context, { filename });
  return {
    state,
    setParties(value) { parties = value; },
    invoke(method = 'POST') { return module.exports.default.fetch(new Request('https://fixture.invalid/import-goabase', { method })); },
  };
}

test('handler declares secret auth and targets only German club events', async () => {
  const h = harness([party()]);
  const response = await h.invoke();
  assert.equal(response.status, 200);
  assert.equal(h.state.auth.auth, 'secret');
  const { url, init } = h.state.requests[0];
  assert.equal(url.origin, 'https://www.goabase.net');
  assert.equal(url.searchParams.get('country'), 'DE');
  assert.equal(url.searchParams.get('eventtype'), 'club');
  assert.equal(init?.signal, undefined); // Current handler has no upstream timeout.
});

test('repeat and changed snapshots use the same conflict key and preserve stored identity', async () => {
  const h = harness([party()]);
  await h.invoke();
  const id = h.state.rows.get('goabase:1001').id;
  await h.invoke();
  assert.equal(h.state.rows.size, 1);
  assert.equal(h.state.rows.get('goabase:1001').id, id);
  h.setParties([party({ nameParty: 'Changed fixture', dateStart: '2030-06-02T14:00:00Z', dateEnd: '2030-06-02T18:00:00Z', geoLat: 50 })]);
  await h.invoke();
  assert.equal(h.state.rows.size, 1);
  const event = h.state.rows.get('goabase:1001');
  assert.equal(event.id, id);
  assert.equal(event.title, 'Changed fixture');
  assert.equal(event.starts_at, '2030-06-02T14:00:00.000Z');
  assert.equal(event.latitude, 50);
});

test('an explicit returned cancellation unpublishes the row but does not update status', async () => {
  const h = harness([party()]);
  await h.invoke();
  h.setParties([party({ nameStatus: 'Cancelled' })]);
  await h.invoke();
  const event = h.state.rows.get('goabase:1001');
  assert.equal(event.is_published, false);
  assert.equal(event.status, 'scheduled'); // Existing DB status remains stale.
  assert.equal('status' in h.state.writes[1].rows[0], false);
});

test('a cancellation missing from the future list cannot be detected by this handler', async () => {
  const h = harness([party()]);
  await h.invoke();
  h.setParties([]);
  const response = await h.invoke();
  assert.equal((await response.json()).imported, 0);
  assert.equal(h.state.rows.get('goabase:1001').is_published, true);
  assert.equal(h.state.requests.length, 2); // No detail/status reconciliation calls.
});

test('handler stops at its first 50-record page, without offset or reconciliation', async () => {
  const h = harness(Array.from({ length: 50 }, (_, index) => party({ id: index + 1 })));
  await h.invoke();
  assert.equal(h.state.rows.size, 50);
  assert.equal(h.state.requests.length, 1);
  assert.equal(h.state.requests[0].url.searchParams.get('limit'), '50');
  assert.equal(h.state.requests[0].url.searchParams.has('offset'), false);
});

test('duplicate source ids within one response are forwarded and can fail the entire upsert', async () => {
  const h = harness([party(), party({ nameParty: 'Duplicate fixture' })]);
  const response = await h.invoke();
  assert.equal(response.status, 500);
  assert.equal(h.state.writes[0].rows.length, 2);
  assert.equal(h.state.rows.size, 0);
});

test('invalid identity/start records are skipped and nullable/out-of-range GPS is handled', async () => {
  const h = harness([party({ id: 'bad' }), party({ id: 2, nameParty: ' ' }), party({ id: 3, dateStart: 'bad' }), party({ id: 4, geoLat: 91, geoLon: null })]);
  const response = await h.invoke();
  assert.equal((await response.json()).imported, 1);
  const event = h.state.rows.get('goabase:4');
  assert.equal(event.latitude, null);
  assert.equal(event.longitude, null);
});

test('zero duration and whitespace coordinates reveal current validation gaps', async () => {
  const h = harness([party({ dateEnd: '2030-06-01T14:00:00Z', geoLat: ' ', geoLon: false })]);
  await h.invoke();
  const event = h.state.rows.get('goabase:1001');
  assert.equal(event.starts_at, event.ends_at);
  assert.equal(event.latitude, 0);
  assert.equal(event.longitude, 0);
});

test('upstream HTTP and format errors are explicit and do not write events', async () => {
  for (const options of [{ httpStatus: 503 }, { payload: { other: [] } }]) {
    const h = harness([party()], options);
    assert.equal((await h.invoke()).status, 502);
    assert.equal(h.state.writes.length, 0);
  }
});

test('malformed JSON, network failures and malformed records escape the handler error path', async () => {
  for (const [parties, options] of [ [[], { rawBody: '{' }], [[], { fetchError: true }], [[null], {}], [[party({ nameParty: 123 })], {}] ]) {
    const h = harness(parties, options);
    await assert.rejects(h.invoke());
    assert.equal(h.state.writes.length, 0);
  }
});

test('raw database errors are returned and GET also triggers an import', async () => {
  const h = harness([party()], { dbError: 'Simulated internal database detail' });
  const response = await h.invoke('GET');
  assert.equal(response.status, 500);
  assert.equal((await response.json()).error, 'Simulated internal database detail');
  assert.equal(h.state.writes.length, 1);
});

test('a later stale source snapshot can overwrite a newer cancellation', async () => {
  const h = harness([party({ nameStatus: 'Cancelled' })]);
  await h.invoke();
  assert.equal(h.state.rows.get('goabase:1001').is_published, false);
  h.setParties([party({ nameStatus: 'Scheduled' })]);
  await h.invoke();
  assert.equal(h.state.rows.get('goabase:1001').is_published, true);
  assert.equal(h.state.writes[1].config.onConflict, 'source,source_event_id');
});
