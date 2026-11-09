/* global __dirname:readonly */
// Isolated SQL control tests. Scheduler/HTTP mocks never make network requests.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const sql=n=>fs.readFileSync(path.join(root,'supabase/ops',n),'utf8');
const options={skip:!process.env.SPOTS_PGLITE_MODULE&&'SPOTS_PGLITE_MODULE required'};
async function fixture(t){
 const {PGlite}=require(process.env.SPOTS_PGLITE_MODULE),db=new PGlite();t.after(()=>db.close());
 await db.exec(`create role anon;create role authenticated;create role service_role;
 create schema cron;create schema net;create schema vault;create schema spots_sync_private;
 create table public.events(id uuid primary key,title text);
 insert into public.events values('11111111-1111-4111-8111-111111111111','Untouched fixture');
 create table cron.job(jobid bigserial primary key,jobname text unique,schedule text,command text,active boolean default true,username text default current_user,database text default current_database());
 create function cron.schedule(text,text,text) returns bigint language sql as $f$
 insert into cron.job(jobname,schedule,command) values($1,$2,$3) returning jobid $f$;
 create function cron.alter_job(job_id bigint,schedule text default null,command text default null,database text default null,username text default null,active boolean default null)
 returns void language sql as $f$ update cron.job j set schedule=coalesce($2,j.schedule),command=coalesce($3,j.command),database=coalesce($4,j.database),username=coalesce($5,j.username),active=coalesce($6,j.active) where jobid=$1 $f$;
 create table net.fake_requests(id bigserial primary key,url text,body jsonb,headers jsonb,timeout_ms integer);
 create table net._http_response(id bigint,status_code integer,timed_out boolean,error_msg text);
 create function net.http_post(url text,body jsonb default '{}',params jsonb default '{}',headers jsonb default '{}',timeout_milliseconds integer default 1000)
 returns bigint language sql as $f$ insert into net.fake_requests(url,body,headers,timeout_ms)values($1,$2,$4,$5) returning id $f$;
 create table vault.secrets(name text unique,decrypted_secret text);
 create function vault.create_secret(new_secret text,new_name text,new_description text default null)
 returns uuid language plpgsql as $f$ begin insert into vault.secrets values(new_name,new_secret);return gen_random_uuid();end $f$;
 create view vault.decrypted_secrets as select * from vault.secrets;
 insert into vault.secrets values('spots_project_url','https://yhnxdeypkbzyjappuzmv.supabase.co'),('spots_import_goabase_secret_key','sb_secret_fixture_only');
 create table spots_sync_private.goabase_lease(singleton boolean,token uuid,expires_at timestamptz);
 insert into spots_sync_private.goabase_lease values(true,null,'-infinity');`);
 // Model the real Supabase defaults instead of assuming net can be restricted.
 await db.exec(`grant usage on schema net to public;
 grant all on all tables in schema net to public;
 grant all on all sequences in schema net to public;
 grant execute on all functions in schema net to public;`);
 // Stock PGlite cannot install native Supabase extensions. Only these two
 // installation statements are omitted; the reviewed DDL/commands run unchanged.
 await db.exec(sql('11_goabase_automation_backend.sql').replace(/^create extension[^;]+;\r?\n/gm,''));
 return db;
}
const rows=async(db,s)=>(await db.query(s)).rows;
const run=async db=>{const [j]=await rows(db,'select command from cron.job');await db.exec(j.command);};
const count=async db=>Number((await rows(db,'select count(*) n from net.fake_requests'))[0].n);
test('inactive preparation, one scheduler probe, activation and HTTP failure fencing',options,async t=>{
 const db=await fixture(t),before=await rows(db,'select * from public.events');
 await db.exec(sql('12_goabase_prepare_inactive_job.sql'));
 assert.deepEqual((await rows(db,'select active,schedule from cron.job'))[0],{active:false,schedule:'0 */2 * * *'});
 await db.exec(sql('13_goabase_arm_controlled_cron.sql'));await run(db);
 assert.equal(await count(db),1);assert.equal((await rows(db,'select active from cron.job'))[0].active,false);
 const [request]=await rows(db,'select id,url,timeout_ms from net.fake_requests');
 assert.equal(request.url,'https://yhnxdeypkbzyjappuzmv.supabase.co/functions/v1/import-goabase');assert.equal(request.timeout_ms,120000);
 const [dispatch]=await rows(db,'select phase,request_id,dispatch_error from spots_sync_private.goabase_cron_dispatches');
 assert.equal(dispatch.phase,'controlled');assert.equal(dispatch.request_id,request.id);assert.equal(dispatch.dispatch_error,null);
 await db.query('insert into net._http_response values($1,200,false,null)',[request.id]);
 await db.exec(sql('14_goabase_activate_two_hour_cron.sql'));
 assert.deepEqual((await rows(db,'select active,schedule from cron.job'))[0],{active:true,schedule:'0 */2 * * *'});
 await run(db);assert.equal(await count(db),2);
 // A previous queued request with no HTTP response must prevent another enqueue.
 await run(db);assert.equal(await count(db),2);assert.equal((await rows(db,'select active from cron.job'))[0].active,false);
 assert.ok((await rows(db,'select dispatch_error from spots_sync_private.goabase_cron_dispatches')).some(r=>r.dispatch_error));
 assert.deepEqual(await rows(db,'select * from public.events'),before);
 const permissions=await rows(db,"select has_table_privilege('anon','spots_sync_private.goabase_cron_dispatches','SELECT') a,has_table_privilege('authenticated','net.fake_requests','SELECT') b,has_function_privilege('anon','cron.schedule(text,text,text)','EXECUTE') c");
 assert.deepEqual(permissions[0],{a:false,b:true,c:false});
 // PUBLIC net privileges remain intact; direct client DB logins remain forbidden.
 assert.equal(Number((await rows(db,"select count(*) n from pg_roles where rolname in('anon','authenticated','service_role') and rolcanlogin"))[0].n),0);
});
test('wrong Vault project queues nothing, self-pauses, and exposes only SQLSTATE',options,async t=>{
 const db=await fixture(t);
 await db.exec("update vault.secrets set decrypted_secret='https://nfomkdvotqtlyymomksb.supabase.co' where name='spots_project_url'");
 await db.exec(sql('12_goabase_prepare_inactive_job.sql'));await db.exec(sql('13_goabase_arm_controlled_cron.sql'));await run(db);
 assert.equal(await count(db),0);assert.equal((await rows(db,'select active from cron.job'))[0].active,false);
 const [d]=await rows(db,'select * from spots_sync_private.goabase_cron_dispatches');
 assert.match(d.dispatch_error,/^[A-Z0-9]{5}$/);assert.equal(d.request_id,null);
 assert.ok(!JSON.stringify(d).includes('sb_secret'));
 await assert.rejects(db.exec(sql('14_goabase_activate_two_hour_cron.sql')));await db.exec('rollback');
 assert.equal(await count(db),0);
});
test('existing jobs are never overwritten and HTTP 500 cannot activate regular schedule',options,async t=>{
 const db=await fixture(t);await db.exec(sql('12_goabase_prepare_inactive_job.sql'));
 const before=await rows(db,'select * from cron.job');
 await assert.rejects(db.exec(sql('12_goabase_prepare_inactive_job.sql')));await db.exec('rollback');
 assert.deepEqual(await rows(db,'select * from cron.job'),before);
 await db.exec(sql('13_goabase_arm_controlled_cron.sql'));await run(db);
 await db.exec('insert into net._http_response values(1,500,false,null)');
 await assert.rejects(db.exec(sql('14_goabase_activate_two_hour_cron.sql')));await db.exec('rollback');
 assert.equal((await rows(db,'select active from cron.job'))[0].active,false);assert.equal(await count(db),1);
});
test('Vault parameters bind safely, reject wrong project and never overwrite existing names',options,async t=>{
 const db=await fixture(t);await db.exec('delete from vault.secrets');
 const query=sql('11b_goabase_store_vault_parameters.sql');
 const bad=await db.query(query,['https://nfomkdvotqtlyymomksb.supabase.co','sb_secret_fixture_only']);
 assert.equal(Number(bad.rows[0].key_entries_created),0);
 assert.equal(Number((await rows(db,'select count(*) n from vault.secrets'))[0].n),0);
 const good=await db.query(query,['https://yhnxdeypkbzyjappuzmv.supabase.co','sb_secret_fixture_only']);
 assert.equal(Number(good.rows[0].url_entries_created),1);assert.equal(Number(good.rows[0].key_entries_created),1);
 const duplicate=await db.query(query,['https://yhnxdeypkbzyjappuzmv.supabase.co','sb_secret_replacement_fixture']);
 assert.equal(Number(duplicate.rows[0].key_entries_created),0);
 assert.equal((await db.query("select decrypted_secret=$1 as unchanged from vault.secrets where name='spots_import_goabase_secret_key'",['sb_secret_fixture_only'])).rows[0].unchanged,true);
 assert.ok(!JSON.stringify(good.rows).includes('sb_secret'));
});
