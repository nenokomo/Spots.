const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),test=require('node:test');
const root=path.resolve(__dirname,'..');
test('organizer SQL: private profiles, owner/editor/stranger/anon RLS, immutable imports and rolled-back fixtures',{
 skip:!process.env.SPOTS_PGLITE_MODULE&&'Set SPOTS_PGLITE_MODULE for actual SQL RLS tests',
},async t=>{
 const {PGlite}=require(process.env.SPOTS_PGLITE_MODULE),db=new PGlite();t.after(()=>db.close());
 await db.exec(`create role anon;create role authenticated;create role service_role;
 create schema auth;create table auth.users(id uuid primary key,email text);
 create function auth.uid() returns uuid language sql stable as $f$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $f$;
 grant usage on schema auth to anon,authenticated;`);
 const sql=name=>fs.readFileSync(path.join(root,'supabase/ops',name),'utf8');
 await db.exec(sql('05_create_test_events.sql'));
 await db.exec(sql('03_goabase_sync_backend.sql'));
 await db.exec(sql('09_goabase_source_removals.sql'));
 await db.exec(sql('10_goabase_unconfirmed_status.sql'));
 await db.exec(`insert into events(id,title,source,source_event_id,starts_at,status,is_published)
 values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Existing imported event','goabase','123456','2099-01-01T00:00:00Z','scheduled',true)`);
 const before=(await db.query('select to_jsonb(e) as data from events e')).rows;
 await db.exec(sql('15_organizer_accounts.sql'));
 assert.deepEqual((await db.query(`select to_jsonb(e)-'organizer_id' as data from events e`)).rows,before);
 await t.test('unchanged Goabase RPC still updates its source and preserves UUID with the new nullable organizer column',async importedCase=>{
  await db.exec('begin');
  importedCase.after(()=>db.exec('rollback'));
  const lease=(await db.query('select spots_goabase_begin() value')).rows[0].value;
  const row={source:'goabase',source_event_id:'123456',source_url:'https://www.goabase.net/123456',
   title:'Legitimate source change',city:null,category:'club',starts_at:'2099-01-01T00:00:00Z',ends_at:null,
   latitude:null,longitude:null,image_url:null,status:'scheduled',is_published:true,source_modified_at:'2026-11-09T00:00:00Z'};
  const result=(await db.query('select spots_goabase_apply_v3($1,$2::jsonb,$3::jsonb,$4::jsonb) value',[lease.token,JSON.stringify([row]),'[]','[]'])).rows[0].value;
  assert.equal(result.updated,1);
  await db.query('select spots_goabase_release($1)',[lease.token]);
  const stored=(await db.query('select id,title,organizer_id from events')).rows[0];
  assert.equal(stored.id,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');assert.equal(stored.organizer_id,null);
  assert.equal(stored.title,row.title);
 });
 await db.exec(sql('16_test_organizer_accounts.sql'));
 assert.equal((await db.query('select count(*)::int n from auth.users')).rows[0].n,0);
 assert.equal((await db.query('select count(*)::int n from organizers')).rows[0].n,0);
 assert.deepEqual((await db.query(`select to_jsonb(e)-'organizer_id' as data from events e`)).rows,before);
 await assert.rejects(db.exec(sql('15_organizer_accounts.sql')),/already exist/);
 await db.exec('rollback');
});
