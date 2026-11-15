// Merkliste mit Konto: Abgleichsregel und Server-Aufrufe (ohne Netz).
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), test = require('node:test'), vm = require('node:vm'), ts = require('typescript');
const loaded = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/services/savedEventsSync.ts'), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { module: loaded, exports: loaded.exports });
const { reconcileSavedIds, createSavedEventsSync, isSyncableId } = loaded.exports;
const plain = (value) => JSON.parse(JSON.stringify(value));
const A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', C = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

test('local TEST events never go to the account and survive a later sign-in', () => {
  const source = fs.readFileSync(path.join(__dirname, '../src/services/testEvents.ts'), 'utf8');
  const ids = [...source.matchAll(/`(f0f0f0f0-[0-9a-f-]+)\$\{n\}`/g)].map((match) => match[1]);
  assert.ok(ids.length > 0 && ids.every((prefix) => prefix.startsWith(loaded.exports.LOCAL_TEST_ID_PREFIX)), 'TEST ids use the known prefix');
  const testEvent = 'f0f0f0f0-0000-4000-8000-000000000003';
  assert.equal(isSyncableId(testEvent), false);
  assert.deepEqual(plain(reconcileSavedIds([A, testEvent], [], false)), [testEvent], 'TEST event stays on the device');
});

test('first sync merges device and account; later the account wins; local test entries stay', () => {
  assert.deepEqual(plain(reconcileSavedIds([A, 'test-1'], [B], true)), [B, A, 'test-1']);
  assert.deepEqual(plain(reconcileSavedIds([A, 'test-1'], [B], false)), [B, 'test-1'], 'removed elsewhere stays removed');
  assert.deepEqual(plain(reconcileSavedIds([A], [A, B], true)), [A, B], 'no duplicates');
  assert.equal(isSyncableId('test-1'), false);
  assert.equal(isSyncableId(A), true);
});

test('server calls: only UUIDs are sent, at most 500; removing deletes one row; errors stay generic', async () => {
  const calls = [];
  const client = {
    rpc: async (name, args) => { calls.push({ name, args }); return { data: [B, 7, null], error: null }; },
    from: (table) => ({ delete: () => ({ eq: async (column, value) => { calls.push({ table, column, value }); return { error: null }; } }) }),
  };
  const sync = createSavedEventsSync(client);
  assert.deepEqual(plain(await sync.merge([A, 'test-1', C])), [B], 'only strings come back');
  assert.deepEqual(plain(calls[0]), { name: 'spots_sync_saved_events', args: { p_add: [A, C] } });
  await sync.merge(Array.from({ length: 600 }, () => A));
  assert.equal(calls[1].args.p_add.length, 500);
  await sync.remove('test-1');
  assert.equal(calls.length, 2, 'test entries never reach the server');
  await sync.remove(A);
  assert.deepEqual(plain(calls[2]), { table: 'saved_events', column: 'event_id', value: A });

  const failing = createSavedEventsSync({ rpc: async () => ({ data: null, error: { message: 'secret' } }),
    from: () => ({ delete: () => ({ eq: async () => ({ error: { message: 'secret' } }) }) }) });
  await assert.rejects(failing.merge([A]), (error) => /abgeglichen/.test(error.message) && !error.message.includes('secret'));
  await assert.rejects(failing.remove(A), /abgeglichen/);
});
