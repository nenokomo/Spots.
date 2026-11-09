const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm'),ts=require('typescript');
const root=path.join(__dirname,'..'),mod={exports:{}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root,'supabase/functions/import-goabase/sync.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,
 {module:mod,exports:mod.exports,URL,URLSearchParams,AbortController,setTimeout,clearTimeout});
const {synchronize,mapParty}=mod.exports;
const party=(id=1001,extra={})=>({id,nameParty:'Status fixture',nameStatus:'Scheduled',dateStart:'2099-01-01T00:00:00Z',dateEnd:'2099-01-01T03:00:00Z',dateModified:'2026-11-01T00:00:00Z',...extra});
async function source(value){return synchronize([],{fetcher:async url=>url.pathname.endsWith('/')?
 Response.json({partylist:[{id:1001},{id:1002}]}):Response.json({party:url.pathname.endsWith('1001')?value:party(1002)})});}
test('Moved, unknown, missing/null and blank statuses are isolated; valid events continue',async()=>{
 for(const [value,reason]of [['Moved','moved'],['Mystery','unrecognized'],[null,'missing'],['','missing'],[undefined,'missing']]){
  const result=await source(party(1001,{nameStatus:value}));
  assert.equal(result.rows.length,1);assert.equal(result.rows[0].source_event_id,'1002');
  assert.equal(result.unconfirmed.length,1);assert.equal(result.unconfirmed[0].source_event_id,'1001');assert.equal(result.unconfirmed[0].reason,reason);
  assert.ok(!JSON.stringify(result.unconfirmed).includes('Mystery'));
 }
});
test('known case/whitespace variants stay known; misspelled cancellation is never scheduled',async()=>{
 const known=await source(party(1001,{nameStatus:' sChEdUlEd '}));assert.equal(known.rows.length,2);assert.equal(known.unconfirmed.length,0);
 const unknown=await source(party(1001,{nameStatus:'Canceled'}));assert.equal(unknown.rows.length,1);assert.equal(unknown.unconfirmed[0].reason,'unrecognized');
});
test('malformed records still fail despite unknown status',async()=>{
 for(const bad of [{id:999},{dateStart:'broken'},{dateModified:null},{urlParty:'https://evil.invalid/1001'},{nameStatus:123}])
  await assert.rejects(source(party(1001,{nameStatus:'Moved',...bad})));
});
test('real SQL quarantine: no new unknown events, preserve known data, legacy protection and atomicity',{
 skip:!process.env.SPOTS_PGLITE_MODULE&&'SPOTS_PGLITE_MODULE required',
},async t=>{
 const {PGlite}=require(process.env.SPOTS_PGLITE_MODULE),db=new PGlite();t.after(()=>db.close());
 await db.exec('create role anon;create role authenticated;create role service_role;');
 for(const f of ['05_create_test_events.sql','03_goabase_sync_backend.sql','09_goabase_source_removals.sql','10_goabase_unconfirmed_status.sql','10_goabase_unconfirmed_status.sql'])await db.exec(fs.readFileSync(path.join(root,'supabase/ops',f),'utf8'));
 const rpc=async(name,args=[])=> (await db.query(`select public.${name}(${args.map((_,i)=>'$'+(i+1)).join(',')}) value`,args)).rows[0].value;
 const begin=()=>rpc('spots_goabase_begin'),release=token=>rpc('spots_goabase_release',[token]);
 const apply=(token,rows=[],removed=[],unknown=[])=>rpc('spots_goabase_apply_v3',[token,JSON.stringify(rows),JSON.stringify(removed),JSON.stringify(unknown)]);
 const row=(id=1001,extra={})=>mapParty(party(id,extra),String(id),Date.now());
 const events=async()=> (await db.query('select * from events order by source_event_id')).rows;
 const q=(id,modified='2026-11-01T00:00:00Z')=>({source_event_id:String(id),reason:'moved',source_modified_at:modified});
 let original;
 await t.test('unknown new source skips; known source becomes unpublished without replacing fields',async()=>{
  const lease=await begin();await apply(lease.token,[row()]);original=(await events())[0];
  const r=await apply(lease.token,[row(1002)],[],[q(1001),q(118652)]);
  assert.equal(r.inserted,1);assert.equal(r.quarantined,1);assert.equal(r.skipped_unconfirmed,1);
  assert.deepEqual((await events())[0],{...original,status:'source_unconfirmed',is_published:false});assert.equal((await events()).length,2);
  assert.equal((await db.query('select count(*)::int n from spots_sync_private.goabase_unconfirmed')).rows[0].n,1);await release(lease.token);
 });
 await t.test('repeat quarantines preserve observation and no source version is fabricated',async()=>{
  const before=await events(),meta=(await db.query('select * from spots_sync_private.goabase_unconfirmed')).rows;
  const lease=await begin(),r=await apply(lease.token,[],[],[q(1001),q(118652)]);assert.equal(r.quarantined_unchanged,1);assert.equal(r.skipped_unconfirmed,1);
  assert.deepEqual(await events(),before);assert.deepEqual((await db.query('select * from spots_sync_private.goabase_unconfirmed')).rows,meta);
  assert.equal((await db.query("select modified_at from spots_sync_private.goabase_versions where source_event_id='1001'")).rows[0].modified_at.toISOString(),'2026-11-01T00:00:00.000Z');await release(lease.token);
 });
 await t.test('all old/new RPC paths block stale resurrection',async()=>{
  const lease=await begin();
  assert.equal((await apply(lease.token,[row()])).rejected_versions,1);
  assert.equal((await rpc('spots_goabase_apply_v2',[lease.token,JSON.stringify([row()]),'[]'])).rejected_versions,1);
  assert.equal((await rpc('spots_goabase_apply',[lease.token,JSON.stringify([row()])])).rejected_versions,1);
  assert.equal((await events())[0].is_published,false);await release(lease.token);
 });
 await t.test('new confirmed version restores original UUID and clears only quarantine fence',async()=>{
  const lease=await begin();assert.equal((await apply(lease.token,[row(1001,{dateModified:'2098-01-01T00:00:00Z'})])).updated,1);
  assert.equal((await events())[0].id,original.id);assert.equal((await events())[0].status,'scheduled');
  assert.equal((await db.query('select count(*)::int n from spots_sync_private.goabase_unconfirmed')).rows[0].n,0);await release(lease.token);
 });
 await t.test('newly observed unknown source version cannot be superseded by older known data',async()=>{
  const lease=await begin();await apply(lease.token,[],[],[q(1001,'2098-06-01T00:00:00Z')]);
  assert.equal((await apply(lease.token,[row(1001,{dateModified:'2098-03-01T00:00:00Z'})])).rejected_versions,1);
  assert.equal((await events())[0].status,'source_unconfirmed');
  assert.equal((await apply(lease.token,[row(1001,{dateModified:'2098-07-01T00:00:00Z'})])).updated,1);await release(lease.token);
 });
 await t.test('confirmed removal supersedes uncertainty; unknown never downgrades a removed event',async()=>{
  const lease=await begin();await apply(lease.token,[],[],[q(1001)]);await apply(lease.token,[],['1001']);
  assert.equal((await events())[0].status,'source_removed');assert.equal((await db.query('select count(*)::int n from spots_sync_private.goabase_unconfirmed')).rows[0].n,0);
  await apply(lease.token,[],[],[q(1001)]);assert.equal((await events())[0].status,'source_removed');await release(lease.token);
 });
 await t.test('bad/overlapping quarantine batches roll back valid upserts, old lease denied and core private',async()=>{
  const lease=await begin(),before=await events();
  for(const [rows,unknown]of [[[row(2001)],[q(1002),{source_event_id:'1003',reason:'arbitrary raw status'}]],[[row(1002)],[q(1002)]]])
   await assert.rejects(apply(lease.token,rows,[],unknown));
  assert.deepEqual(await events(),before);await release(lease.token);
  await assert.rejects(apply(lease.token,[],[],[q(1002)]),/Invalid or expired/);
  for(const role of ['anon','authenticated','service_role']){
   assert.equal((await db.query("select has_table_privilege($1,'spots_sync_private.goabase_unconfirmed','SELECT,INSERT,UPDATE,DELETE') ok",[role])).rows[0].ok,false);
   assert.equal((await db.query("select has_function_privilege($1,'spots_sync_private.goabase_apply_removals_core(uuid,jsonb,jsonb)','EXECUTE') ok",[role])).rows[0].ok,false);
   assert.equal((await db.query("select has_function_privilege($1,'public.spots_goabase_apply_v3(uuid,jsonb,jsonb,jsonb)','EXECUTE') ok",[role])).rows[0].ok,role==='service_role');
  }
 });
});
