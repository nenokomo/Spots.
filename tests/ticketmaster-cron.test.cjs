/* global __dirname:readonly */
// Echte SQL von 24_ticketmaster_cron.sql in PGlite. Cron, pg_net und Vault sind Attrappen ohne Netz.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const sql = (name) => fs.readFileSync(path.join(root, 'supabase/ops', name), 'utf8');
const options = { skip: !process.env.SPOTS_PGLITE_MODULE && 'SPOTS_PGLITE_MODULE required' };
const TEST_URL = 'https://nfomkdvotqtlyymomksb.supabase.co';
const PROD_URL = 'https://yhnxdeypkbzyjappuzmv.supabase.co';

async function fixture(t, url = TEST_URL) {
  const { PGlite } = require(process.env.SPOTS_PGLITE_MODULE);
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(`create role anon;create role authenticated;create role service_role;
  create schema cron;create schema net;create schema vault;create schema spots_sync_private;
  create table public.events(id uuid primary key,title text);
  insert into public.events values('11111111-1111-4111-8111-111111111111','Untouched fixture');
  create table cron.job(jobid bigserial primary key,jobname text unique,schedule text,command text,active boolean default true);
  insert into cron.job(jobname,schedule,command) values('spots-import-goabase-2h','0 */2 * * *','select 1');
  create function cron.schedule(text,text,text) returns bigint language sql as $f$
  insert into cron.job(jobname,schedule,command) values($1,$2,$3) returning jobid $f$;
  create function cron.alter_job(job_id bigint,schedule text default null,command text default null,database text default null,username text default null,active boolean default null)
  returns void language sql as $f$ update cron.job j set schedule=coalesce($2,j.schedule),command=coalesce($3,j.command),active=coalesce($6,j.active) where jobid=$1 $f$;
  create table net.fake_requests(id bigserial primary key,url text,body jsonb,headers jsonb,timeout_ms integer);
  create table net._http_response(id bigint,status_code integer,timed_out boolean,error_msg text);
  create function net.http_post(url text,body jsonb default '{}',params jsonb default '{}',headers jsonb default '{}',timeout_milliseconds integer default 1000)
  returns bigint language sql as $f$ insert into net.fake_requests(url,body,headers,timeout_ms)values($1,$2,$4,$5) returning id $f$;
  create table vault.secrets(name text unique,decrypted_secret text);
  create view vault.decrypted_secrets as select * from vault.secrets;`);
  await db.query(`insert into vault.secrets values('spots_project_url',$1),('spots_import_goabase_secret_key','sb_secret_fixture_only')`, [url]);
  // PGlite kann die nativen Supabase-Erweiterungen nicht installieren; nur diese Zeilen fallen weg.
  const file = sql('24_ticketmaster_cron.sql').replace(/^create extension[^;]+;\r?\n/gm, '');
  await db.exec(file);
  return { db, file };
}
const rows = async (db, s, p) => (await db.query(s, p)).rows;
const job = async (db) => (await rows(db, "select active,schedule,command from cron.job where jobname='spots-import-ticketmaster'"))[0];
const tick = async (db) => (await rows(db, 'select spots_sync_private.ticketmaster_cron_tick() as r'))[0].r;
const requests = async (db) => rows(db, 'select id,url,headers,timeout_ms from net.fake_requests order by id');
const respond = (db, id, status, timedOut = false) => db.query('insert into net._http_response values($1,$2,$3,null)', [id, status, timedOut]);
const age = (db, interval) => db.exec(`update spots_sync_private.ticketmaster_cron_dispatches set created_at=created_at-interval '${interval}'`);

test('job is prepared inactive, idempotent, and leaves other jobs and events alone', options, async (t) => {
  const { db, file } = await fixture(t);
  assert.deepEqual(await job(db), { active: false, schedule: '17 * * * *', command: 'select spots_sync_private.ticketmaster_cron_tick()' });
  await db.exec(file);
  assert.equal((await rows(db, "select count(*)::int n from cron.job where jobname='spots-import-ticketmaster'"))[0].n, 1);
  assert.deepEqual(await rows(db, "select schedule,active from cron.job where jobname='spots-import-goabase-2h'"), [{ schedule: '0 */2 * * *', active: true }]);
  assert.deepEqual(await rows(db, 'select * from public.events'), [{ id: '11111111-1111-4111-8111-111111111111', title: 'Untouched fixture' }]);
  const access = await rows(db, `select has_table_privilege('anon','spots_sync_private.ticketmaster_cron_dispatches','SELECT') a,
    has_table_privilege('service_role','spots_sync_private.ticketmaster_cron_dispatches','SELECT') b,
    has_function_privilege('anon','spots_sync_private.ticketmaster_cron_tick()','EXECUTE') c,
    has_function_privilege('service_role','spots_sync_private.ticketmaster_cron_resume()','EXECUTE') d`);
  assert.deepEqual(access[0], { a: false, b: false, c: false, d: false });
});

test('resume activates; at most one run per 6 hours; results are stored before pg_net forgets them', options, async (t) => {
  const { db } = await fixture(t);
  await db.exec('select spots_sync_private.ticketmaster_cron_resume()');
  assert.equal((await job(db)).active, true);
  assert.equal(await tick(db), 'dispatched');
  const [first] = await requests(db);
  assert.equal(first.url, `${TEST_URL}/functions/v1/import-ticketmaster`);
  assert.equal(first.headers.apikey, 'sb_secret_fixture_only');
  assert.equal(first.timeout_ms, 150000);
  assert.equal(await tick(db), 'waiting', 'no second run within the hour');
  await respond(db, first.id, 200);
  await age(db, '3 hours');
  assert.equal(await tick(db), 'waiting');
  assert.equal((await rows(db, 'select status_code from spots_sync_private.ticketmaster_cron_dispatches'))[0].status_code, 200);
  await db.exec('delete from net._http_response'); // pg_net-TTL abgelaufen
  await age(db, '3 hours');
  assert.equal(await tick(db), 'dispatched');
  assert.equal((await requests(db)).length, 2);
  const stored = await rows(db, 'select * from spots_sync_private.ticketmaster_cron_dispatches');
  assert.ok(!JSON.stringify(stored).includes('sb_secret'), 'no key in the log table');
});

test('409 (already running) is fine; 500, timeouts and missing answers pause the job until reviewed', options, async (t) => {
  const { db } = await fixture(t);
  await db.exec('select spots_sync_private.ticketmaster_cron_resume()');
  await tick(db);
  await respond(db, 1, 409);
  await age(db, '6 hours');
  assert.equal(await tick(db), 'dispatched', '409 does not pause');
  await respond(db, 2, 500);
  await age(db, '6 hours');
  assert.equal(await tick(db), 'paused');
  assert.equal((await job(db)).active, false);
  assert.equal((await requests(db)).length, 2, 'nothing new after a failure');
  assert.equal(await tick(db), 'paused', 'stays paused');

  await db.exec('select spots_sync_private.ticketmaster_cron_resume()');
  assert.equal(await tick(db), 'dispatched', 'reviewed failure no longer blocks');
  await respond(db, 3, null, true);
  assert.equal(await tick(db), 'paused', 'timeout pauses');

  await db.exec('select spots_sync_private.ticketmaster_cron_resume()');
  assert.equal(await tick(db), 'dispatched');
  await age(db, '61 minutes');
  assert.equal(await tick(db), 'paused', 'no answer after one hour pauses');
  assert.equal((await requests(db)).length, 4);
});

test('wrong or missing Vault values queue nothing and leave only an error code', options, async (t) => {
  const { db } = await fixture(t, 'https://example.org');
  await db.exec('select spots_sync_private.ticketmaster_cron_resume()');
  assert.equal(await tick(db), 'paused');
  assert.equal((await requests(db)).length, 0);
  assert.equal((await job(db)).active, false);
  const [entry] = await rows(db, 'select request_id,dispatch_error from spots_sync_private.ticketmaster_cron_dispatches');
  assert.equal(entry.request_id, null);
  assert.match(entry.dispatch_error, /^[A-Z0-9]{5}$/);

  await db.exec("delete from vault.secrets where name='spots_import_goabase_secret_key'");
  await db.query("update vault.secrets set decrypted_secret=$1 where name='spots_project_url'", [PROD_URL]);
  await db.exec('select spots_sync_private.ticketmaster_cron_resume()');
  assert.equal(await tick(db), 'paused', 'missing key');
  assert.equal((await requests(db)).length, 0);

  await db.exec("insert into vault.secrets values('spots_import_goabase_secret_key','sb_secret_fixture_only')");
  await db.exec('select spots_sync_private.ticketmaster_cron_resume()');
  assert.equal(await tick(db), 'dispatched', 'production URL is accepted as well');
  assert.equal((await requests(db))[0].url, `${PROD_URL}/functions/v1/import-ticketmaster`);
});
