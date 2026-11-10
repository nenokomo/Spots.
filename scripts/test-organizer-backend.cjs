// Backend-only test-project runner. No production URLs, API-key lookup or Auth user creation.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),ref='nfomkdvotqtlyymomksb';
const directory=path.join(root,'supabase/.temp/organizer-accounts');
const stage=process.argv[2]??'inspect';
const hash=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
let token='';
process.stdin.setEncoding('utf8');process.stdin.on('data',chunk=>token+=chunk);
process.stdin.on('end',()=>main().catch(error=>{console.error(error.message);process.exitCode=1;}));
async function api(route,body){
 const response=await fetch(`https://api.supabase.com/v1/projects/${ref}${route}`,{
  method:body?'POST':'GET',redirect:'error',signal:AbortSignal.timeout(45000),
  headers:{Authorization:`Bearer ${token.trim()}`,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,
 });
 if(!response.ok)throw Error(`Test-project Management API HTTP ${response.status}; response withheld`);
 return response.json();
}
const query=sql=>api('/database/query',{query:sql,read_only:false}); // Authority required for role/ACL inspection; inspect SQL remains SELECT-only.
async function verifyTarget(){
 if(fs.readFileSync(path.join(root,'supabase/.temp/project-ref'),'utf8').trim()!==ref)throw Error('CLI test project mismatch');
 const project=await api('');if(project.id!==ref)throw Error('Remote test project mismatch');
 return {ref,name:project.name};
}
async function snapshot(){
 const rows=await query(`select jsonb_build_object(
 'events',coalesce((select jsonb_agg(to_jsonb(e)-'organizer_id' order by id) from public.events e),'[]'::jsonb),
 'versions',coalesce((select jsonb_agg(to_jsonb(v) order by source_event_id) from spots_sync_private.goabase_versions v),'[]'::jsonb),
 'removed',coalesce((select jsonb_agg(to_jsonb(v) order by source_event_id) from spots_sync_private.goabase_removed v),'[]'::jsonb),
 'unconfirmed',coalesce((select jsonb_agg(to_jsonb(v) order by source_event_id) from spots_sync_private.goabase_unconfirmed v),'[]'::jsonb),
 'lease',(select to_jsonb(l) from spots_sync_private.goabase_lease l where singleton)
 ) as inventory`);
 const value=rows[0].inventory;
 return {eventCount:value.events.length,eventIds:value.events.map(e=>e.id),inventoryHash:hash(value)};
}
async function inspect(){
 return query(`select jsonb_build_object(
  'account_tables',(select jsonb_agg(tablename order by tablename) from pg_tables where schemaname='public' and tablename in ('user_profiles','organizers','organizer_memberships','organizer_posts')),
  'event_columns',(select jsonb_agg(column_name order by ordinal_position) from information_schema.columns where table_schema='public' and table_name='events'),
  'event_constraints',(select jsonb_agg(jsonb_build_object('name',conname,'definition',pg_get_constraintdef(oid))) from pg_constraint where conrelid='public.events'::regclass),
  'event_policies',(select jsonb_agg(jsonb_build_object('name',policyname,'command',cmd,'roles',roles,'using',qual,'check',with_check)) from pg_policies where schemaname='public' and tablename='events'),
  'client_event_write',has_table_privilege('authenticated','public.events','INSERT,UPDATE,DELETE'),
  'account_policies',(select jsonb_agg(jsonb_build_object('table',tablename,'name',policyname,'command',cmd)) from pg_policies where schemaname='public' and tablename in ('user_profiles','organizers','organizer_memberships','organizer_posts')),
  'auth_user_count',(select count(*) from auth.users),
  'account_security',(select jsonb_agg(jsonb_build_object('table',relname,'rls',relrowsecurity)) from pg_class where relnamespace='public'::regnamespace and relname in ('user_profiles','organizers','organizer_memberships','organizer_posts')),
  'existing_spots_events',(select count(*) from public.events where source='spots')
 ) as inspection`);
}
async function main(){
 if(!['inspect','apply','verify'].includes(stage)||!/^sbp_[A-Za-z0-9_-]+$/.test(token.trim()))throw Error('Invalid runner context');
 fs.mkdirSync(directory,{recursive:true});
 const project=await verifyTarget(),before=await snapshot(),inspection=(await inspect())[0].inspection;
 const report={stage,project,before,inspection};
 if(stage==='apply'){
  if(inspection.account_tables!==null||inspection.client_event_write||inspection.existing_spots_events!==0)throw Error('Unexpected pre-existing account objects/rights; no SQL executed');
  const marker=path.join(directory,'apply-attempt.json');
  const sql=fs.readFileSync(path.join(root,'supabase/ops/15_organizer_accounts.sql'),'utf8');
  await verifyTarget();
  fs.writeFileSync(marker,JSON.stringify({project:ref,sqlHash:hash(sql),before},null,2),{flag:'wx'});
  await query(sql);
  report.after=await snapshot();
  if(report.after.inventoryHash!==before.inventoryHash)throw Error('After SQL inventory mismatch; stop and inspect');
  report.installed=(await inspect())[0].inspection;
  if(report.installed.account_tables?.length!==4)throw Error('Account tables missing');
 }
 if(stage==='verify'){
  await verifyTarget();
  const sql=fs.readFileSync(path.join(root,'supabase/ops/16_test_organizer_accounts.sql'),'utf8');
  await query(sql); // Entire fixture test is BEGIN ... ROLLBACK, including auth.users rows.
  report.after=await snapshot();
  if(report.after.inventoryHash!==before.inventoryHash)throw Error('Fixture inventory mismatch; stop');
  report.fixtureTests='passed; all fixture transactions rolled back';
 }
 if(stage==='verify'||stage==='apply'||inspection.account_tables!==null){
  report.accountCounts=(await query(`select
   (select count(*) from auth.users) as auth_users,
   (select count(*) from public.user_profiles) as private_profiles,
   (select count(*) from public.organizers) as organizers,
   (select count(*) from public.organizer_memberships) as memberships,
   (select count(*) from public.organizer_posts) as posts,
   (select count(*) from public.events where organizer_id is not null) as linked_events`))[0];
 }
 fs.writeFileSync(path.join(directory,`${stage}-result.json`),JSON.stringify(report,null,2));
 console.log(JSON.stringify({stage,project,eventCount:before.eventCount,inventoryUnchanged:!report.after||report.after.inventoryHash===before.inventoryHash,
  accountTables:(report.installed??inspection).account_tables,accountSecurity:(report.installed??inspection).account_security,
  accountCounts:report.accountCounts??null,fixtureTests:report.fixtureTests??null},null,2));
 token='';
}
