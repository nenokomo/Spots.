/* global __dirname:readonly */
// Approved production automation only. All credentials arrive via stdin/RAM.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const equal=require('node:util').isDeepStrictEqual,root=path.resolve(__dirname,'..'),ref='yhnxdeypkbzyjappuzmv';
const pointer=path.join(root,'supabase/.temp/goabase-automation-run.json');
const hashes={
 '11_goabase_automation_backend.sql':'9c39ce96368116a5b8d383550b9e3bd8301a275b0cd1e83a63382423e7a2da95',
 '11b_goabase_store_vault_parameters.sql':'8c4616c406bbe661e1087384caee012e7e66ed93ee92ad67d870cc3305b6b507',
 '12_goabase_prepare_inactive_job.sql':'cdb771b42ffddd1055026583f3d74fb9a745f25ab22ef8e1b8dbeaaf6f278971',
 '13_goabase_arm_controlled_cron.sql':'f626aded1b6141a90d8eedc92bdc15f3208fed82cb6d9c4ed623aeb2339ae1f0',
 '14_goabase_activate_two_hour_cron.sql':'22193732dc2aa2b308fbe29d4c6aeabc355ef9120027775cf094521dc293fbc9'};
const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
let dir,report,headers;
const save=(name,v)=>fs.writeFileSync(path.join(dir,name),JSON.stringify(v,null,2)+'\n');
async function api(suffix,body){
 const r=await fetch('https://api.supabase.com/v1/projects'+suffix,{method:body?'POST':'GET',headers:body?{...headers,'Content-Type':'application/json'}:headers,...(body?{body:JSON.stringify(body)}:{}),redirect:'error',signal:AbortSignal.timeout(120000)});
 const value=await r.json();if(!r.ok){const e=new Error('Supabase operation HTTP '+r.status);e.safeDetail=String(value.message??value.error??'').replace(/sb_(?:secret|publishable)_[A-Za-z0-9_-]+|sbp_[A-Za-z0-9_-]+|Bearer\s+\S+/g,'[redacted]').slice(0,400);throw e;}return value;
}
async function identity(){const p=(await api('')).find(p=>p.id===ref);if(p?.name!=='Spots.')throw new Error('Production identity mismatch.');}
async function query(sql,readOnly=true,parameters=[]){const result=await api('/'+ref+'/database/query',{query:sql,read_only:readOnly,parameters});return Array.isArray(result)?result:result.rows;}
async function read(name,sql,asOwner=false){const rows=await query(sql,!asOwner);const s=rows?.[0]?.snapshot;if(!s)throw new Error('Snapshot missing.');if(name)save(name+'.json',s);return s;}
async function fn(){const f=await api('/'+ref+'/functions/import-goabase');if(f.status!=='ACTIVE'||f.version!==3||f.verify_jwt!==false||f.ezbr_sha256!=='54a39f2b3daed9cf593c5217df5ece61f63fe4f6e311b68311265f14c4806ea8')throw new Error('Production function differs.');return f;}
async function snapshot(name){return read(name,`select jsonb_build_object(
 'events',(select jsonb_agg(to_jsonb(e) order by id) from public.events e),
 'lease',(select jsonb_agg(to_jsonb(l) order by singleton) from spots_sync_private.goabase_lease l),
 'versions',(select coalesce(jsonb_agg(to_jsonb(v) order by source_event_id),'[]'::jsonb) from spots_sync_private.goabase_versions v),
 'removed',(select coalesce(jsonb_agg(to_jsonb(v) order by source_event_id),'[]'::jsonb) from spots_sync_private.goabase_removed v),
 'unconfirmed',(select coalesce(jsonb_agg(to_jsonb(v) order by source_event_id),'[]'::jsonb) from spots_sync_private.goabase_unconfirmed v),
 'policies',(select jsonb_agg(to_jsonb(p) order by policyname) from pg_policies p where schemaname='public' and tablename='events'),
 'duplicates',(select count(*) from(select source,source_event_id from public.events group by source,source_event_id having count(*)>1)d)) as snapshot;`);}
const idle=s=>s.lease?.length===1&&s.lease[0].token===null&&s.lease[0].expires_at==='-infinity'&&s.duplicates===0;
async function sqlFile(file,parameters=[]){
 await identity();await fn();const src=path.join(root,'supabase/ops',file);if(hash(src)!==hashes[file])throw new Error('Approved SQL changed.');
 fs.copyFileSync(src,path.join(dir,file),fs.constants.COPYFILE_EXCL);save(file+'.attempt.json',{target:ref,sha256:hashes[file],at:new Date().toISOString()});
 await query(fs.readFileSync(src,'utf8'),false,parameters);
}
async function jobs(){return read(null,`select jsonb_build_object('jobs',(select coalesce(jsonb_agg(jsonb_build_object('id',jobid,'name',jobname,'schedule',schedule,'active',active,'owner',username,'database',database,'command_hash',md5(command)) order by jobid),'[]'::jsonb) from cron.job)) as snapshot;`,true);}
async function pause(){await identity();await query("select cron.alter_job(jobid,active:=false) from cron.job where jobname='spots-import-goabase-2h'",false);}
async function monitor(){return read(null,`select jsonb_build_object(
 'jobs',(select coalesce(jsonb_agg(jsonb_build_object('id',jobid,'schedule',schedule,'active',active)),'[]'::jsonb) from cron.job where jobname='spots-import-goabase-2h'),
 'dispatches',(select coalesce(jsonb_agg(to_jsonb(d) order by created_at),'[]'::jsonb) from spots_sync_private.goabase_cron_dispatches d),
 'responses',(select coalesce(jsonb_agg(jsonb_build_object('request_id',d.request_id,'phase',d.phase,'status',r.status_code,'timed_out',r.timed_out,'network_error',r.error_msg is not null,'content',r.content)),'[]'::jsonb) from spots_sync_private.goabase_cron_dispatches d join net._http_response r on r.id=d.request_id),
 'history',(select coalesce(jsonb_agg(jsonb_build_object('job_id',jobid,'run_id',runid,'status',status,'start',start_time,'end',end_time) order by runid),'[]'::jsonb) from cron.job_run_details where jobid in(select jobid from cron.job where jobname='spots-import-goabase-2h'))) as snapshot;`,true);}
function sanitize(m){for(const r of m.responses){let b;try{b=JSON.parse(r.content);}catch{b={};}delete r.content;r.import={};for(const k of ['inserted','updated','unchanged','removed','removed_unchanged','removed_unknown','quarantined','quarantined_unchanged','skipped_unconfirmed','cancelled','postponed','rejected_versions','checked','discovered'])if(Number.isSafeInteger(b[k])&&b[k]>=0)r.import[k]=b[k];if(/^[a-f0-9-]{36}$/.test(b.run_id??''))r.import.run_id=b.run_id;if(/^[a-z0-9_]{1,80}$/.test(b.error??''))r.import.error=b.error;}return m;}
async function waitPhase(phase){
 const deadline=Date.now()+(phase==='controlled'?180000:3*3600000);let last=0;
 while(Date.now()<deadline){const m=sanitize(await monitor());save('monitor-'+phase+'.json',m);
  if(m.dispatches.some(d=>d.dispatch_error))throw new Error('Scheduler dispatch error; see safe SQLSTATE.');
  if(m.history.some(h=>h.status==='failed'))throw new Error('Cron history failed.');
  const r=m.responses.find(r=>r.phase===phase);
  if(r){if(r.status!==200||r.timed_out||r.network_error||r.import.error||Object.keys(r.import).length!==15)throw new Error('Scheduled HTTP/import failed.');
   const d=m.dispatches.find(d=>d.request_id===r.request_id);
   if(!d)throw new Error('Request/dispatch correlation missing.');
   // History commits may lag the asynchronous response briefly. Wait for the
   // matching time interval instead of mistaking eventual visibility for failure.
   if(!m.history.some(h=>h.job_id===d.job_id&&h.status==='succeeded'&&h.end&&Date.parse(h.start)<=Date.parse(d.created_at)+1000&&Date.parse(h.end)>=Date.parse(d.created_at)-1000)){
    await new Promise(resolve=>setTimeout(resolve,2000));continue;
   }
   const before=JSON.parse(fs.readFileSync(path.join(dir,'before-'+phase+'.json'))),after=await snapshot('after-'+phase);
   const missing=before.events.filter(o=>!after.events.some(e=>e.id===o.id&&e.source===o.source&&e.source_event_id===o.source_event_id&&e.created_at===o.created_at));
   if(!idle(after)||missing.length||after.events.length!==before.events.length+r.import.inserted||!equal(before.policies,after.policies)||after.events.some(e=>e.is_published&&(e.status!=='scheduled'||(e.ends_at?Date.parse(e.ends_at)<=Date.now():Date.parse(e.starts_at)<Date.now()))))throw new Error('Scheduled data/lease integrity mismatch.');
   if(phase==='controlled'&&(m.jobs.length!==1||m.jobs[0].active||m.dispatches.length!==1))throw new Error('Controlled job did not self-pause once.');
   report[phase]={passed:true,http_status:r.status,request_id:r.request_id,result:r.import,events_before:before.events.length,events_after:after.events.length,original_uuids_preserved:true,duplicates:after.duplicates,lease_free:true,published:after.events.filter(e=>e.is_published).length,verified_at:new Date().toISOString()};return;
  }
  if(Date.now()-last>45000){console.log(JSON.stringify({waiting_for:phase,at:new Date().toISOString(),next_regular:report.next_regular}));last=Date.now();}
  const delay=phase==='scheduled'&&Date.parse(report.next_regular)-Date.now()>60000?55000:5000;
  await new Promise(resolve=>setTimeout(resolve,delay));
 }throw new Error('Scheduled run verification timeout.');
}
async function main(){
 let token='';for await(const c of process.stdin)token+=c;token=token.trim();if(!/^sbp_[A-Za-z0-9_-]+$/.test(token))throw new Error('Management credential missing.');headers={Authorization:'Bearer '+token};token='';
 const stage=process.argv[2];if(!['setup','resume','job','probe','activate','scheduled','diagnose','platform-review','vault-check'].includes(stage))throw new Error('Unknown stage.');await identity();await fn();
 if(stage==='job'){
  const p=JSON.parse(fs.readFileSync(pointer));if(p.project_ref!==ref)throw new Error('Wrong run.');dir=p.directory;report=JSON.parse(fs.readFileSync(path.join(dir,'result.json')));
  const proof=JSON.parse(fs.readFileSync(path.join(dir,'vault-check.json')));
  if(!report.backend_created||report.setup_passed||report.error!=='Supabase operation HTTP 400'||!report.safe_detail?.includes('_crypto_aead_det_decrypt')||proof.project_ref!==ref||!proof.values_match)throw new Error('Job resume differs from documented Vault stop.');
  save('original-vault-verification-stop.json',report);
  const before=await snapshot('before-job');if(!idle(before))throw new Error('Initial data/lease mismatch.');
  if((await jobs()).jobs.length)throw new Error('Existing Cron job; no duplicate created.');
  const rest=await api('/'+ref+'/postgrest'),sv=rest.db_schema??rest.db_schemas;
  if((typeof sv!=='string'&&!Array.isArray(sv))||(Array.isArray(sv)?sv:sv.split(',')).map(s=>s.trim()).includes('net'))throw new Error('Data API boundary differs.');
  const gate=await read('before-job-gate',`select jsonb_build_object('dispatches',(select count(*) from spots_sync_private.goabase_cron_dispatches),'client_logins',(select count(*) from pg_roles where rolname in('anon','authenticated','service_role') and rolcanlogin),'private_rls',(select relrowsecurity from pg_class where oid='spots_sync_private.goabase_cron_dispatches'::regclass),'private_client_access',has_table_privilege('anon','spots_sync_private.goabase_cron_dispatches','SELECT,INSERT,UPDATE,DELETE') or has_table_privilege('authenticated','spots_sync_private.goabase_cron_dispatches','SELECT,INSERT,UPDATE,DELETE')) as snapshot;`);
  if(gate.dispatches||gate.client_logins||!gate.private_rls||gate.private_client_access)throw new Error('Existing backend boundary mismatch.');
  // Pure SELECT as postgres; no key value leaves the database and no key is created.
  const vault=(await query("select count(*)=2 and count(*) filter(where name='spots_project_url' and decrypted_secret=$1)=1 and count(*) filter(where name='spots_import_goabase_secret_key' and decrypted_secret ~ '^sb_secret_[A-Za-z0-9_-]+$')=1 as ready from vault.decrypted_secrets where name in('spots_project_url','spots_import_goabase_secret_key')",false,['https://'+ref+'.supabase.co']))[0];
  if(!vault?.ready)throw new Error('Previously verified Vault state differs.');
  await sqlFile('12_goabase_prepare_inactive_job.sql');
  const j=(await jobs()).jobs,command=fs.readFileSync(path.join(root,'supabase/ops/12_goabase_prepare_inactive_job.sql'),'utf8').match(/\$command\$([\s\S]*?)\$command\$/)?.[1];
  if(j.length!==1||j[0].name!=='spots-import-goabase-2h'||j[0].active||j[0].schedule!=='0 */2 * * *'||j[0].owner!=='postgres'||j[0].database!=='postgres'||j[0].command_hash!==crypto.createHash('md5').update(command??'').digest('hex'))throw new Error('Inactive job configuration differs from reviewed command.');
  if(!equal(before,await snapshot('after-job')))throw new Error('Job creation changed data.');
  delete report.error;delete report.safe_detail;report.job=j[0];report.vault_verified=true;report.setup_passed=true;report.resumed_at_job=true;report.updated_at=new Date().toISOString();save('result.json',report);console.log(JSON.stringify({stage,job:j[0],existing_vault_reused:true,events_unchanged:true}));return;
 }
 if(stage==='vault-check'){
  const p=JSON.parse(fs.readFileSync(pointer));if(p.project_ref!==ref)throw new Error('Wrong run.');dir=p.directory;
  let keys;try{keys=JSON.parse(execFileSync(process.execPath,[path.join(root,'node_modules/supabase/dist/supabase.js'),'projects','api-keys',`--remote=${ref}`,'--reveal','--output-format','json'],{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']})).keys;}catch{throw new Error('Protected key lookup failed.');}
  const found=keys.filter(k=>k.type==='secret'&&k.name==='default');if(found.length!==1)throw new Error('Default Secret not unique.');
  // SELECT only: false selects the authorized postgres executor, not the
  // restricted supabase_read_only_user which cannot decrypt Vault values.
  const r=(await query("select current_user as inspection_role,count(*)=2 and count(*) filter(where name='spots_project_url' and decrypted_secret=$1)=1 and count(*) filter(where name='spots_import_goabase_secret_key' and decrypted_secret=$2)=1 as values_match from vault.decrypted_secrets where name in('spots_project_url','spots_import_goabase_secret_key')",false,['https://'+ref+'.supabase.co',found[0].api_key]))[0];
  found[0].api_key=undefined;keys=undefined;
  if(!r?.values_match)throw new Error('Protected Vault comparison failed.');
  const result={project_ref:ref,inspection_role:r.inspection_role,values_match:true,sql_operation:'SELECT only; no grants or data changes',checked_at:new Date().toISOString()};save('vault-check.json',result);console.log(JSON.stringify(result));return;
 }
 if(stage==='platform-review'){
  const p=JSON.parse(fs.readFileSync(pointer));if(p.project_ref!==ref)throw new Error('Wrong run.');dir=p.directory;
  const d=await read('platform-rights-review',`select jsonb_build_object(
   'schema',(select jsonb_build_object('owner',pg_get_userbyid(nspowner),'acl',nspacl) from pg_namespace where nspname='net'),
   'tables',(select jsonb_agg(jsonb_build_object('name',c.relname,'owner',pg_get_userbyid(c.relowner),'acl',c.relacl) order by c.relname) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='net' and c.relkind='r'),
   'effective_rights',(select jsonb_agg(jsonb_build_object('role',r,'login',(select rolcanlogin from pg_roles where rolname=r),'usage',has_schema_privilege(r,'net','USAGE'),'queue_select',has_table_privilege(r,'net.http_request_queue','SELECT'),'queue_insert',has_table_privilege(r,'net.http_request_queue','INSERT'),'response_select',has_table_privilege(r,'net._http_response','SELECT'),'post_execute',has_function_privilege(r,'net.http_post(text,jsonb,jsonb,jsonb,integer)','EXECUTE')) order by r) from unnest(array['postgres','anon','authenticated','service_role'])r),
   'login_roles',(select jsonb_agg(jsonb_build_object('name',rolname,'superuser',rolsuper,'valid_until',rolvaliduntil,'expired',rolvaliduntil is not null and rolvaliduntil<clock_timestamp()) order by rolname) from pg_roles where rolcanlogin),
   'schema_settings',(select coalesce(jsonb_agg(jsonb_build_object('role',pg_get_userbyid(setrole),'database',setdatabase,'setting',s)),'[]'::jsonb) from pg_db_role_setting cross join lateral unnest(setconfig)s where s like 'pgrst.db_schemas=%' or s like 'pgrst.db_schema=%'),
   'vault_names',(select coalesce(jsonb_agg(name),'[]'::jsonb) from vault.secrets where name in('spots_project_url','spots_import_goabase_secret_key')),
   'dispatch_count',(select count(*) from spots_sync_private.goabase_cron_dispatches),
   'job_count',(select count(*) from cron.job)) as snapshot;`);
  const config=await api('/'+ref+'/postgrest');
  const raw=config.db_schema??config.db_schemas;
  if(typeof raw!=='string'&&!Array.isArray(raw))throw new Error('Data API exposed schemas unavailable; no assumption.');
  const exposed=(Array.isArray(raw)?raw:raw.split(',')).map(s=>s.trim()).filter(Boolean);
  const env=fs.readFileSync(path.join(root,'.env.local'),'utf8');
  const val=n=>env.match(new RegExp('^\\s*'+n+'\\s*=\\s*(.*?)\\s*$','m'))?.[1]?.replace(/^(["'])(.*)\1$/,'$2');
  const url=val('EXPO_PUBLIC_SUPABASE_URL'),key=val('EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
  if(url?.replace(/\/$/,'')!=='https://'+ref+'.supabase.co'||!key?.startsWith('sb_publishable_'))throw new Error('Public app project mismatch.');
  const response=await fetch(url.replace(/\/$/,'')+'/rest/v1/http_request_queue?select=id&limit=0',{method:'GET',headers:{apikey:key,'Accept-Profile':'net'},redirect:'error',signal:AbortSignal.timeout(30000)});
  const body=await response.json();
  const baseline=JSON.parse(fs.readFileSync(path.join(dir,'before-setup.json'))),current=await snapshot('after-platform-review');
  const known=new Set(['postgres','supabase_admin','authenticator','supabase_auth_admin','supabase_storage_admin','supabase_realtime_admin','supabase_replication_admin','supabase_functions_admin','supabase_read_only_user','pgbouncer','dashboard_user','supabase_etl_admin']);
  const unknown=d.login_roles.filter(r=>!known.has(r.name)&&!(r.name==='cli_login_postgres'&&r.expired));
  const result={project_ref:ref,captured_at:new Date().toISOString(),rights:d,data_api:{exposed_schemas:exposed,net_exposed:exposed.includes('net'),probe_status:response.status,probe_code:typeof body.code==='string'?body.code:null,net_rejected:response.status===406&&body.code==='PGRST106'},unclassified_login_roles:unknown,events_and_metadata_unchanged:equal(baseline,current),events:current.events.length,lease_free:idle(current),app_environment_unchanged:hash(path.join(root,'.env.local'))===JSON.parse(fs.readFileSync(path.join(dir,'result.json'))).env_hash,remote_mutations:0};
  save('platform-review.json',result);fs.writeFileSync(path.join(root,'supabase/.temp/goabase-net-platform-review.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));return;
 }
 if(stage==='diagnose'){
  const p=JSON.parse(fs.readFileSync(pointer));if(p.project_ref!==ref)throw new Error('Wrong run.');dir=p.directory;
  const baseline=JSON.parse(fs.readFileSync(path.join(dir,'before-setup.json'))),now=await snapshot('after-stop');
  const d=await read('permission-diagnosis',`select jsonb_build_object(
   'net_schema_acl',(select nspacl from pg_namespace where nspname='net'),
   'queue_acl',(select relacl from pg_class where oid='net.http_request_queue'::regclass),
   'event_triggers',(select jsonb_agg(jsonb_build_object('name',evtname,'event',evtevent,'enabled',evtenabled,'tags',evttags,'function',evtfoid::regprocedure::text)) from pg_event_trigger),
   'platform_net_grant_function',(select pg_get_functiondef(p.oid) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='extensions' and p.proname='grant_pg_net_access' limit 1),
   'vault_names',(select coalesce(jsonb_agg(name),'[]'::jsonb) from vault.secrets where name in('spots_project_url','spots_import_goabase_secret_key')),
   'dispatches',(select count(*) from spots_sync_private.goabase_cron_dispatches),
   'jobs',(select count(*) from cron.job)) as snapshot;`);
  console.log(JSON.stringify({diagnosis:d,events_and_backend_unchanged:equal(baseline,now),events:now.events.length,lease_free:idle(now),environment_unchanged:hash(path.join(root,'.env.local'))===JSON.parse(fs.readFileSync(path.join(dir,'result.json'))).env_hash}));return;
 }
 if(stage==='setup'||stage==='resume'){
  let before;
  if(stage==='resume'){
   const p=JSON.parse(fs.readFileSync(pointer));if(p.project_ref!==ref)throw new Error('Resume target differs.');dir=p.directory;report=JSON.parse(fs.readFileSync(path.join(dir,'result.json')));
   if(!report.backend_created||report.setup_passed||report.error!=='Automation permissions mismatch.')throw new Error('Resume state differs from reviewed stop.');
   save('original-permission-stop.json',report);
   fs.writeFileSync(path.join(dir,'resume-attempt.json'),JSON.stringify({project:ref,at:new Date().toISOString()}),{flag:'wx'});
   for(const [f,h]of Object.entries(hashes))if(hash(path.join(root,'supabase/ops',f))!==h)throw new Error('Revised SQL differs.');
   before=await snapshot('before-resume');if(!idle(before)||!equal(before,JSON.parse(fs.readFileSync(path.join(dir,'before-setup.json')))))throw new Error('Events/backend changed before resume.');
   const existing=await read('resume-existing-backend',"select jsonb_build_object('dispatches',(select count(*) from spots_sync_private.goabase_cron_dispatches),'vault_names',(select count(*) from vault.secrets where name in('spots_project_url','spots_import_goabase_secret_key'))) as snapshot;");
   if(existing.dispatches||existing.vault_names)throw new Error('Earlier Vault/dispatch setup found; stop.');
   delete report.error;report.resumed_under_platform_plan=true;
  }else{
  if(fs.existsSync(pointer))throw new Error('Setup already recorded; no repeat.');
  for(const [f,h]of Object.entries(hashes))if(hash(path.join(root,'supabase/ops',f))!==h)throw new Error('Approved SQL changed.');
  const backup=JSON.parse(fs.readFileSync(path.join(root,'supabase/.temp/production-backup-latest.json')));
  if(backup.production_ref!==ref)throw new Error('Backup target differs.');
  const manifest=JSON.parse(fs.readFileSync(path.join(backup.directory,'sha256-manifest.json')));for(const [f,h]of Object.entries(manifest))if(hash(path.join(backup.directory,f))!==h)throw new Error('Backup checksum mismatch.');
  dir=path.join(root,'supabase/backups','automation-'+new Date().toISOString().replace(/[:.]/g,'-'));fs.mkdirSync(dir);execFileSync('icacls.exe',[dir,'/inheritance:r','/grant:r',`${process.env.USERDOMAIN}\\${process.env.USERNAME}:(OI)(CI)F`],{stdio:'pipe'});
  report={project_ref:ref,started_at:new Date().toISOString(),env_hash:hash(path.join(root,'.env.local')),backup_manifest_verified:Object.keys(manifest).length};fs.writeFileSync(pointer,JSON.stringify({directory:dir,project_ref:ref}),{flag:'wx'});save('result.json',report);
  before=await snapshot('before-setup');if(!idle(before))throw new Error('Active lease/duplicates.');
  const inv=await read('extensions-before',"select jsonb_build_object('cron',to_regclass('cron.job'),'net',to_regclass('net._http_response'),'dispatches',to_regclass('spots_sync_private.goabase_cron_dispatches')) as snapshot");if(inv.cron||inv.net||inv.dispatches)throw new Error('Unexpected existing automation; stop.');
  await sqlFile('11_goabase_automation_backend.sql');report.backend_created=true;save('result.json',report);
  }
  if((await jobs()).jobs.length)throw new Error('Existing Cron job discovered.');
  const access=await read('backend-access',`select jsonb_build_object('extensions',(select jsonb_agg(extname order by extname) from pg_extension where extname in('pg_cron','pg_net','supabase_vault')),'rls',(select relrowsecurity from pg_class where oid='spots_sync_private.goabase_cron_dispatches'::regclass),'rights',(select jsonb_agg(jsonb_build_object('role',r,'dispatch',has_table_privilege(r,'spots_sync_private.goabase_cron_dispatches','SELECT,INSERT,UPDATE,DELETE'),'queue',has_table_privilege(r,'net.http_request_queue','SELECT'),'net_usage',has_schema_privilege(r,'net','USAGE'),'cron_usage',has_schema_privilege(r,'cron','USAGE'))) from unnest(array['anon','authenticated'])r)) as snapshot;`);
  // net ACLs are Supabase-managed defaults. Keep strict checks on our own table
  // and Cron, and check the documented API/LOGIN boundary before reading a key.
  if(access.extensions.length!==3||!access.rls||access.rights.some(r=>r.dispatch||r.cron_usage))throw new Error('Private/Cron permissions mismatch.');
  const rest=await api('/'+ref+'/postgrest'),schemaValue=rest.db_schema??rest.db_schemas;
  if(typeof schemaValue!=='string'&&!Array.isArray(schemaValue))throw new Error('Cannot verify exposed Data API schemas.');
  const schemas=(Array.isArray(schemaValue)?schemaValue:schemaValue.split(',')).map(s=>s.trim());
  if(schemas.includes('net'))throw new Error('net is exposed in Data API; stop before Vault setup.');
  const roleCheck=await read('login-boundary',`select jsonb_build_object('logins',(select jsonb_agg(jsonb_build_object('name',rolname,'expired',rolvaliduntil is not null and rolvaliduntil<clock_timestamp()) order by rolname) from pg_roles where rolcanlogin),'client_logins',(select count(*) from pg_roles where rolname in('anon','authenticated','service_role') and rolcanlogin)) as snapshot;`);
  const trusted=new Set(['postgres','supabase_admin','authenticator','supabase_auth_admin','supabase_storage_admin','supabase_realtime_admin','supabase_replication_admin','supabase_functions_admin','supabase_read_only_user','pgbouncer','dashboard_user','supabase_etl_admin']);
  if(roleCheck.client_logins||roleCheck.logins.some(r=>!trusted.has(r.name)&&!(r.name==='cli_login_postgres'&&r.expired)))throw new Error('Unclassified/direct client LOGIN role; stop before Vault setup.');
  report.platform_boundary_verified={exposed_schemas:schemas,client_roles_nologin:true,no_unclassified_login_roles:true};
  let keys;try{keys=JSON.parse(execFileSync(process.execPath,[path.join(root,'node_modules/supabase/dist/supabase.js'),'projects','api-keys',`--remote=${ref}`,'--reveal','--output-format','json'],{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']})).keys;}catch{throw new Error('Protected Default Secret lookup failed.');}
  const found=keys.filter(k=>k.type==='secret'&&k.name==='default');if(found.length!==1||!found[0].api_key?.startsWith('sb_secret_'))throw new Error('Default Secret missing.');
  await sqlFile('11b_goabase_store_vault_parameters.sql',['https://'+ref+'.supabase.co',found[0].api_key]);
  // This is a SELECT, but requires the postgres executor for Vault decryption.
  const verified=(await query("select count(*)=2 and count(*) filter(where name='spots_project_url' and decrypted_secret=$1)=1 and count(*) filter(where name='spots_import_goabase_secret_key' and decrypted_secret=$2)=1 as verified from vault.decrypted_secrets where name in('spots_project_url','spots_import_goabase_secret_key')",false,['https://'+ref+'.supabase.co',found[0].api_key]))[0].verified;keys=undefined;found[0].api_key=undefined;if(!verified)throw new Error('Vault verification failed.');report.vault_verified=true;
  await sqlFile('12_goabase_prepare_inactive_job.sql');const j=(await jobs()).jobs;if(j.length!==1||j[0].active||j[0].schedule!=='0 */2 * * *')throw new Error('Inactive job mismatch.');report.job=j[0];
  if(!equal(before,await snapshot('after-setup')))throw new Error('Setup changed events/backend state.');report.setup_passed=true;
 }else{
  const p=JSON.parse(fs.readFileSync(pointer));if(p.project_ref!==ref)throw new Error('Wrong run.');dir=p.directory;report=JSON.parse(fs.readFileSync(path.join(dir,'result.json')));if(report.error||!report.setup_passed)throw new Error('Previous stage failed.');
  if(stage==='probe'){if(report.controlled)throw new Error('Probe already recorded.');await snapshot('before-controlled');await sqlFile('13_goabase_arm_controlled_cron.sql');await waitPhase('controlled');}
  if(stage==='activate'){if(!report.controlled?.passed||report.activated)throw new Error('Activation not allowed.');await snapshot('before-scheduled');await sqlFile('14_goabase_activate_two_hour_cron.sql');const j=(await jobs()).jobs;if(j.length!==1||!j[0].active||j[0].schedule!=='0 */2 * * *')throw new Error('Activation mismatch.');report.activated=true;const n=new Date();n.setUTCMinutes(0,0,0);n.setUTCHours(Math.floor(n.getUTCHours()/2)*2+2);report.next_regular=n.toISOString();}
  if(stage==='scheduled'){if(!report.activated||report.scheduled)throw new Error('Regular verification not allowed.');await waitPhase('scheduled');report.final_jobs=(await jobs()).jobs;report.passed=report.final_jobs.length===1&&report.final_jobs[0].active&&report.final_jobs[0].schedule==='0 */2 * * *';}
 }
 if(hash(path.join(root,'.env.local'))!==report.env_hash)throw new Error('App environment changed.');await fn();report.updated_at=new Date().toISOString();save('result.json',report);console.log(JSON.stringify({stage,directory:dir,...report}));headers={};
}
main().catch(async e=>{if(report){report.error=e.message;if(e.safeDetail)report.safe_detail=e.safeDetail;try{if(report.backend_created){await pause();report.paused_after_error=true;}}catch{report.pause_unconfirmed=true;}save('result.json',report);}console.error(JSON.stringify({stopped:true,error:e.message,detail:e.safeDetail,directory:dir}));process.exitCode=1;});
