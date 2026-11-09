const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm'),ts=require('typescript');
const root=path.join(__dirname,'..');
const mod={exports:{}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root,'supabase/functions/import-goabase/sync.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,
 {module:mod,exports:mod.exports,URL,URLSearchParams,AbortController,setTimeout,clearTimeout});
const {synchronize,mapParty}=mod.exports;
const party=(id=1001,modified='2026-11-01T00:00:00Z')=>({id,nameParty:'Removal fixture',nameStatus:'Scheduled',dateStart:'2099-01-01T00:00:00Z',dateEnd:'2099-01-01T03:00:00Z',dateModified:modified});
test('only exact same-domain same-ID deletion redirects are accepted; valid events continue',async()=>{
 for(const location of ['/party/deleted/1001','https://www.goabase.net/party/deleted/1001']){
  const calls=[];
  const result=await synchronize(['1001'],{fetcher:async(url,init)=>{
   calls.push(url.href);assert.equal(init.redirect,'manual');
   if(url.pathname.endsWith('/'))return Response.json({partylist:[{id:1002}]});
   return url.pathname.endsWith('1001')?new Response('',{status:301,headers:{location}}):Response.json({party:party(1002)});
  }});
  assert.deepEqual(Array.from(result.removed),['1001']);assert.equal(result.rows[0].source_event_id,'1002');assert.equal(calls.length,3);
 }
 for(const location of ['https://evil.example/party/deleted/1001','http://www.goabase.net/party/deleted/1001','https://www.goabase.net.evil.example/party/deleted/1001',
  'https://user:pass@www.goabase.net/party/deleted/1001','/party/deleted/1002','/party/deleted/1001?x=1','/party/deleted/1001#x','/party/deleted/1001/',
  '/party/deleted/%31%30%30%31','/party/../party/deleted/1001','https://www.goabase.net:444/party/deleted/1001']){
  await assert.rejects(synchronize(['1001'],{fetcher:async url=>url.pathname.endsWith('/')?Response.json({partylist:[]}):new Response('',{status:301,headers:{location}})}),/source_http_301/);
 }
});
test('feed redirect, missing Location, HTTP 404 and invalid JSON still abort, even alongside removal',async()=>{
 await assert.rejects(synchronize([],{fetcher:async()=>new Response('',{status:301,headers:{location:'/party/deleted/1001'}})}),/source_http_301/);
 for(const bad of [()=>new Response('',{status:301}),()=>new Response('',{status:404}),()=>new Response('{'),()=>{throw new TypeError('network');}]){
  await assert.rejects(synchronize(['1001','1002'],{fetcher:async url=>url.pathname.endsWith('/')?Response.json({partylist:[]}):
   url.pathname.endsWith('1001')?new Response('',{status:301,headers:{location:'/party/deleted/1001'}}):bad()}));
 }
});
test('SQL removal migration: UUID/data preservation, version fencing, repeat import and atomicity',{
 skip:!process.env.SPOTS_PGLITE_MODULE&&'SPOTS_PGLITE_MODULE required for full SQL tests',
},async t=>{
 const {PGlite}=require(process.env.SPOTS_PGLITE_MODULE),db=new PGlite();t.after(()=>db.close());
 await db.exec('create role anon;create role authenticated;create role service_role;');
 for(const file of ['05_create_test_events.sql','03_goabase_sync_backend.sql','09_goabase_source_removals.sql','09_goabase_source_removals.sql','10_goabase_unconfirmed_status.sql'])await db.exec(fs.readFileSync(path.join(root,'supabase/ops',file),'utf8'));
 const rpc=async(name,args=[])=> (await db.query(`select public.${name}(${args.map((_,i)=>'$'+(i+1)).join(',')}) as value`,args)).rows[0].value;
 const begin=()=>rpc('spots_goabase_begin'),release=token=>rpc('spots_goabase_release',[token]);
 const apply=(token,rows=[],removed=[])=>rpc('spots_goabase_apply_v2',[token,JSON.stringify(rows),JSON.stringify(removed)]);
 const row=(id=1001,modified)=>mapParty(party(id,modified),String(id),Date.now());
 const events=async()=> (await db.query('select * from public.events order by source_event_id')).rows;
 let original;
 await t.test('first import and confirmed removal affect only status/publication; other event imports',async()=>{
  const lease=await begin();await apply(lease.token,[row()]);original=(await events())[0];
  const result=await apply(lease.token,[row(1002)],['1001','9999']);
  assert.equal(result.removed,1);assert.equal(result.removed_unknown,1);assert.equal(result.inserted,1);
  const e=(await events())[0];assert.deepEqual(e,{...original,status:'source_removed',is_published:false});
  assert.equal((await db.query('select count(*)::int n from spots_sync_private.goabase_removed')).rows[0].n,1);
  assert.equal((await db.query("select modified_at from spots_sync_private.goabase_versions where source_event_id='1001'")).rows[0].modified_at.toISOString(),'2026-11-01T00:00:00.000Z');
  await release(lease.token);
 });
 await t.test('repeat removal and imports preserve IDs/data and original observation fence',async()=>{
  const first=await events(),fence=(await db.query('select * from spots_sync_private.goabase_removed')).rows;
  const lease=await begin(),r=await apply(lease.token,[row(1002)],['1001']);
  assert.equal(r.removed,0);assert.equal(r.removed_unchanged,1);assert.equal(r.unchanged,1);
  assert.deepEqual(await events(),first);assert.deepEqual((await db.query('select * from spots_sync_private.goabase_removed')).rows,fence);
  await release(lease.token);
 });
 await t.test('stale/equal data cannot resurrect through new or legacy RPC',async()=>{
  const lease=await begin();
  assert.equal((await apply(lease.token,[row()])).rejected_versions,1);
  assert.equal((await rpc('spots_goabase_apply',[lease.token,JSON.stringify([row()])])).rejected_versions,1);
  assert.equal((await events())[0].status,'source_removed');await release(lease.token);
 });
 await t.test('confirmed newer version restores same UUID; subsequent removal fences it again',async()=>{
  const lease=await begin(),fresh=row(1001,'2098-01-01T00:00:00Z');
  assert.equal((await apply(lease.token,[fresh])).updated,1);assert.equal((await events())[0].id,original.id);
  assert.equal((await events())[0].status,'scheduled');assert.equal((await db.query('select count(*)::int n from spots_sync_private.goabase_removed')).rows[0].n,0);
  await apply(lease.token,[],['1001']);assert.equal((await apply(lease.token,[fresh])).rejected_versions,1);await release(lease.token);
 });
 await t.test('legacy imported row without source version can be removed without fabricating dateModified',async()=>{
  await db.exec("insert into events(title,source,source_event_id,status,is_published,starts_at)values('Legacy','goabase','1003','scheduled',true,'2099-01-01')");
  const lease=await begin();await apply(lease.token,[],['1003']);
  assert.equal((await db.query("select source_modified_at from spots_sync_private.goabase_removed where source_event_id='1003'")).rows[0].source_modified_at,null);
  assert.equal((await db.query("select count(*)::int n from spots_sync_private.goabase_versions where source_event_id='1003'")).rows[0].n,0);await release(lease.token);
 });
 await t.test('invalid/duplicate/mixed batches roll back entirely and empty batches preserve removal',async()=>{
  const lease=await begin(),first=await events();
  for(const [rows,ids]of [[[row(2001)],['1002',123]],[[row(1002)],['1002']],[[],['1002','1002']]])await assert.rejects(apply(lease.token,rows,ids));
  assert.deepEqual(await events(),first);await apply(lease.token);assert.deepEqual(await events(),first);await release(lease.token);
 });
 await t.test('lease fencing rejects old owner; removal table/core RPC inaccessible to clients/backend direct',async()=>{
  const old=await begin();assert.equal(await begin(),null);
  await db.exec("update spots_sync_private.goabase_lease set expires_at=clock_timestamp()-interval '1 second'");const current=await begin();
  await assert.rejects(apply(old.token,[],['1002']),/Invalid or expired/);await release(old.token);assert.equal(await begin(),null);await release(current.token);
  for(const role of ['anon','authenticated','service_role']){
   assert.equal((await db.query("select has_table_privilege($1,'spots_sync_private.goabase_removed','SELECT,INSERT,UPDATE,DELETE') ok",[role])).rows[0].ok,false);
   assert.equal((await db.query("select has_function_privilege($1,'spots_sync_private.goabase_apply_core(uuid,jsonb)','EXECUTE') ok",[role])).rows[0].ok,false);
   assert.equal((await db.query("select has_function_privilege($1,'public.spots_goabase_apply_v2(uuid,jsonb,jsonb)','EXECUTE') ok",[role])).rows[0].ok,role==='service_role');
  }
 });
 await t.test('full handler/source/real SQL path repeats safely and releases its lease',async()=>{
  const handlerMod={exports:{}},calls=[];
  const fetcher=async url=>url.pathname.endsWith('/')?Response.json({partylist:[]}):url.pathname.endsWith('1002')?
   Response.json({party:party(1002)}):new Response('',{status:301,headers:{location:'/party/deleted/'+url.pathname.split('/').at(-1)}});
  const code=ts.transpileModule(fs.readFileSync(path.join(root,'supabase/functions/import-goabase/index.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  vm.runInNewContext(code,{module:handlerMod,exports:handlerMod.exports,Request,Response,console:{info(){},error(){}},require:id=>{
   if(id==='./sync.ts')return {...mod.exports,synchronize:ids=>synchronize(ids,{fetcher})};
   assert.equal(id,'npm:@supabase/server@1');
   return {withSupabase:(config,fn)=>{
    assert.equal(config.auth,'secret');
    return req=>fn(req,{supabaseAdmin:{rpc:async(name,args={})=>{
     calls.push(name);
     const values=name.endsWith('begin')?[]:name.endsWith('release')?[args.p_token]:[args.p_token,JSON.stringify(args.p_rows),JSON.stringify(args.p_removed_ids),JSON.stringify(args.p_unconfirmed)];
     return {data:await rpc(name,values),error:null};
    }}});
   }};
  }});
  const before=await events();
  for(let i=0;i<2;i++){
   const response=await handlerMod.exports.default.fetch(new Request('https://fixture.invalid',{method:'POST'}));
   assert.equal(response.status,200);const body=await response.json();
   assert.equal(body.removed,0);assert.equal(body.removed_unchanged,2);assert.equal(body.unchanged,1);assert.equal(body.checked,3);
   assert.deepEqual(await events(),before);
   assert.equal((await db.query('select token from spots_sync_private.goabase_lease')).rows[0].token,null);
  }
  assert.deepEqual(calls,['spots_goabase_begin','spots_goabase_apply_v3','spots_goabase_release','spots_goabase_begin','spots_goabase_apply_v3','spots_goabase_release']);
 });
});
