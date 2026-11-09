// Fixed Spots-Test target. Each approved mutation has a persistent once-only marker.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),ref='nfomkdvotqtlyymomksb';
const expectedSql='380ede89a1a8b4fc70e2e9bf9a2d839274d00ba9c9017d66731fa9028fcda92a';
const pointer=path.join(root,'supabase/.temp/test-status-run.json');
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
let dir,report;
function cli(args){
 try{const j=JSON.parse(execFileSync(process.execPath,[path.join(root,'node_modules/supabase/dist/supabase.js'),...args,'--output-format','json'],
  {cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:120000}));if(j.error)throw new Error();return j;}
 catch{throw new Error('Protected CLI operation failed; raw diagnostics withheld, no retry.');}
}
function save(name,value){fs.writeFileSync(path.join(dir,name),JSON.stringify(value,null,2)+'\n');}
function identity(){
 if(fs.readFileSync(path.join(root,'supabase/.temp/project-ref'),'utf8').trim()!==ref)throw new Error('Wrong local link.');
 const p=cli(['projects','list']).projects?.find(p=>p.id===ref);
 if(p?.name!=='spots. testproject'||!p.linked)throw new Error('Test identity mismatch.');
 return {id:p.id,name:p.name};
}
function fn(){return cli(['functions','list',`--remote=${ref}`]).functions.find(f=>f.slug==='import-goabase');}
function query(name,sql){
 const file=path.join(dir,name+'.sql');fs.writeFileSync(file,sql,{flag:'wx'});
 const data=cli(['db','query',`--remote=${ref}`,'--read-only','--file',file]).rows?.[0]?.snapshot;
 if(!data)throw new Error('Read-only result missing.');save(name+'.json',data);return data;
}
function snapshot(name,unconfirmed){return query(name,`select jsonb_build_object(
 'events',(select jsonb_agg(to_jsonb(e) order by id) from public.events e),
 'lease',(select jsonb_agg(to_jsonb(l) order by singleton) from spots_sync_private.goabase_lease l),
 'versions',(select jsonb_agg(to_jsonb(v) order by source_event_id) from spots_sync_private.goabase_versions v),
 'removed',(select coalesce(jsonb_agg(to_jsonb(d) order by source_event_id),'[]'::jsonb) from spots_sync_private.goabase_removed d),
 'unconfirmed',${unconfirmed?"(select coalesce(jsonb_agg(to_jsonb(q) order by source_event_id),'[]'::jsonb) from spots_sync_private.goabase_unconfirmed q)":"'[]'::jsonb"},
 'event_security',(select jsonb_build_object('owner',relowner,'acl',relacl,'rls',relrowsecurity,'force',relforcerowsecurity) from pg_class where oid='public.events'::regclass),
 'event_policies',(select jsonb_agg(to_jsonb(p) order by policyname) from pg_policies p where schemaname='public' and tablename='events'),
 'status_type',(select format_type(atttypid,atttypmod) from pg_attribute where attrelid='public.events'::regclass and attname='status'),
 'event_constraints',(select jsonb_agg(jsonb_build_object('type',contype,'definition',pg_get_constraintdef(oid)) order by conname) from pg_constraint where conrelid='public.events'::regclass),
 'duplicates',(select count(*) from (select source,source_event_id from public.events group by source,source_event_id having count(*)>1) d)
 ) as snapshot;`);}
function backend(name){return query(name,`select jsonb_build_object(
 'functions',(select jsonb_agg(jsonb_build_object('schema',n.nspname,'name',p.proname,'body_hash',md5(p.prosrc),'definition',pg_get_functiondef(p.oid),'owner',pg_get_userbyid(p.proowner),'definer',p.prosecdef,'config',p.proconfig,
 'public_execute',exists(select 1 from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a where a.grantee=0 and a.privilege_type='EXECUTE'),
 'rights',(select jsonb_agg(jsonb_build_object('role',r,'execute',has_function_privilege(r,p.oid,'EXECUTE')) order by r) from unnest(array['anon','authenticated','service_role']) r)) order by n.nspname,p.proname)
 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where (n.nspname='public' and p.proname like 'spots_goabase_%') or (n.nspname='spots_sync_private' and p.proname in ('goabase_apply_core','goabase_apply_removals_core'))),
 'tables',(select jsonb_agg(jsonb_build_object('name',c.relname,'owner',pg_get_userbyid(c.relowner),'rls',c.relrowsecurity,
 'public_grants',exists(select 1 from aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) a where a.grantee=0),
 'rights',(select jsonb_agg(jsonb_build_object('role',r,'access',has_table_privilege(r,c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')) order by r) from unnest(array['anon','authenticated','service_role']) r)) order by c.relname)
 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='spots_sync_private' and c.relkind='r')
 ) as snapshot;`);}
function once(stage){fs.writeFileSync(path.join(dir,stage+'-attempt.json'),JSON.stringify({project_ref:ref,at:new Date().toISOString()}),{flag:'wx'});}
function idle(s){return s.lease?.length===1&&s.lease[0].token===null&&s.lease[0].expires_at==='-infinity';}
async function main(){
 const mode=process.argv[2];if(!['--sql','--deploy','--post'].includes(mode))throw new Error('Choose exactly one approved stage.');
 identity();
 if(mode==='--sql'){
  if(fs.existsSync(pointer))throw new Error('Run already exists; inspect its result.');
    dir=path.join(root,'supabase/backups',`test-source-status-${new Date().toISOString().replace(/[:.]/g,'-')}`);fs.mkdirSync(dir);
  report={project_ref:ref,started_at:new Date().toISOString(),sql_passed:false,deploy_passed:false,post_attempts:0};
  fs.writeFileSync(pointer,JSON.stringify({directory:dir,project_ref:ref}),{flag:'wx'});
  const sql=path.join(root,'supabase/ops/10_goabase_unconfirmed_status.sql');if(hash(sql)!==expectedSql)throw new Error('Approved SQL hash mismatch.');
  report.env_hash=hash(path.join(root,'.env.local'));
  report.sources=Object.fromEntries(['index.ts','sync.ts','deno.json','deno.lock'].map(f=>[f,hash(path.join(root,'supabase/functions/import-goabase',f))]));
  const before=snapshot('before-sql',false),b=backend('backend-before');
  if(before.events.length!==34||!idle(before)||b.tables.length!==3||b.functions.length!==5||before.status_type!=='text'||before.event_constraints.some(c=>c.type==='c'))throw new Error('Unexpected initial test state/status constraints.');
  report.source_unconfirmed_supported_by_status_type_and_constraints=true;
  const oldFn=fn();if(oldFn.version!==2||oldFn.status!=='ACTIVE'||oldFn.verify_jwt!==false)throw new Error('Unexpected test deployment.');save('function-before.json',oldFn);
  const rollback=path.join(dir,'function-rollback');fs.mkdirSync(rollback);
  cli(['functions','download','import-goabase',`--remote=${ref}`,'--use-api','--workdir',rollback]);
  const frozen=path.join(dir,'approved-10.sql');fs.copyFileSync(sql,frozen,fs.constants.COPYFILE_EXCL);
  report.sql_target=identity();if(hash(frozen)!==expectedSql)throw new Error('SQL changed.');once('sql');save('result.json',report);
  save('sql-response.json',cli(['db','query',`--remote=${ref}`,'--file',frozen,'--yes']));
  const after=snapshot('after-sql',true),a=backend('backend-after');
  if(!equal(before,after))throw new Error('SQL changed existing test data/security.');
  const core=a.functions.find(f=>f.name==='goabase_apply_removals_core'),old=b.functions.find(f=>f.name==='spots_goabase_apply_v2');
  const publicFns=a.functions.filter(f=>f.schema==='public');
  if(a.tables.length!==4||publicFns.length!==5||a.functions.length!==7||!core||core.body_hash!==old.body_hash||
   !a.tables.every(t=>t.owner==='postgres'&&t.rls&&!t.public_grants&&t.rights.every(r=>!r.access))||
   !a.functions.every(f=>f.owner==='postgres'&&f.definer&&f.config?.includes('search_path=""')&&!f.public_execute&&
    f.rights.every(r=>r.execute===(f.schema==='public'&&r.role==='service_role'))))throw new Error('Backend rights/implementation verification failed.');
  report.sql_passed=true;report.sql_sha256=expectedSql;report.events_preserved_after_sql=34;
 }else{
  const saved=JSON.parse(fs.readFileSync(pointer,'utf8'));if(saved.project_ref!==ref)throw new Error('Wrong saved target.');dir=saved.directory;
  report=JSON.parse(fs.readFileSync(path.join(dir,'result.json'),'utf8'));
  if(report.error||!report.sql_passed)throw new Error('Earlier stage failed; stop.');
  for(const [f,h]of Object.entries(report.sources))if(hash(path.join(root,'supabase/functions/import-goabase',f))!==h)throw new Error('Tested candidate changed.');
  if(mode==='--deploy'){
   if(report.deploy_passed)throw new Error('Already deployed; no repeat.');
   const before=snapshot('before-deploy',true);if(!idle(before))throw new Error('Active import.');
   report.deploy_target=identity();once('deploy');
   save('deployment-response.json',cli(['functions','deploy','import-goabase',`--remote=${ref}`,'--use-api','--no-verify-jwt','--yes']));
   const active=fn();save('function-after.json',active);
   if(active.status!=='ACTIVE'||active.version!==3||active.verify_jwt!==false)throw new Error('Unexpected deployed state.');
   const deployed=path.join(dir,'deployed-source');fs.mkdirSync(deployed);
   cli(['functions','download','import-goabase',`--remote=${ref}`,'--use-api','--workdir',deployed]);
   for(const file of ['index.ts','sync.ts']){
    const norm=p=>fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n').trim();
    if(norm(path.join(root,'supabase/functions/import-goabase',file))!==norm(path.join(deployed,'supabase/functions/import-goabase',file)))throw new Error('Deployed source mismatch.');
   }
   if(!equal(before,snapshot('after-deploy',true)))throw new Error('Deployment changed test data.');
   report.deploy_passed=true;report.function=active;
  }else{
   if(!report.deploy_passed||report.post_attempts)throw new Error('POST stage not allowed.');
   const active=fn();if(active.ezbr_sha256!==report.function.ezbr_sha256||active.version!==3||active.status!=='ACTIVE'||active.verify_jwt!==false)throw new Error('Function changed.');
   const before=snapshot('before-post',true);if(!idle(before)||before.events.length!==34)throw new Error('Unexpected pre-import state.');
   let keys,secret;
   try{
    keys=cli(['projects','api-keys',`--remote=${ref}`,'--reveal']).keys;secret=keys?.filter(k=>k.type==='secret'&&k.name==='default');
    if(secret?.length!==1||!secret[0].api_key?.startsWith('sb_secret_'))throw new Error('Default secret unavailable.');
    report.post_target=identity();once('post');report.post_attempts=1;save('result.json',report);
    try{
     const response=await fetch(`https://${ref}.supabase.co/functions/v1/import-goabase`,{method:'POST',redirect:'error',signal:AbortSignal.timeout(120000),headers:{apikey:secret[0].api_key,'Content-Type':'application/json'},body:'{}'});
     report.http_status=response.status;const body=await response.json();report.response={};
     for(const key of ['inserted','updated','unchanged','rejected_versions','cancelled','postponed','discovered','checked','removed','removed_unchanged','removed_unknown','quarantined','quarantined_unchanged','skipped_unconfirmed'])if(Number.isSafeInteger(body[key])&&body[key]>=0)report.response[key]=body[key];
     if(Array.isArray(body.unconfirmed)&&body.unconfirmed.every(e=>/^[1-9]\d*$/.test(e.source_event_id)&&['missing','moved','unrecognized'].includes(e.reason)&&typeof e.source_modified_at==='string'&&/^\d{4}-\d\d-\d\dT[\d:.]+Z$/.test(e.source_modified_at)))
      report.response.unconfirmed=body.unconfirmed.map(e=>({source_event_id:e.source_event_id,reason:e.reason,source_modified_at:e.source_modified_at}));
     if(typeof body.run_id==='string'&&/^[a-f0-9-]{36}$/.test(body.run_id))report.response.run_id=body.run_id;
     if(typeof body.error==='string'&&/^[a-z0-9_]{1,100}$/.test(body.error))report.response.error=body.error;
     console.log(JSON.stringify({http_status:response.status,response:report.response}));
     if(response.status!==200||report.response.error)throw new Error('Import failed; no retry.');
    }finally{
     keys=secret=undefined;const after=snapshot('after-post',true);
     const map=new Map(after.events.map(e=>[e.source+':'+e.source_event_id,e]));
     const missing=[],identityChanges=[],removalDataChanges=[];
     for(const old of before.events){const e=map.get(old.source+':'+old.source_event_id);
      if(!e){missing.push(old.source_event_id);continue;}
      if(e.id!==old.id||e.created_at!==old.created_at)identityChanges.push(old.source_event_id);
      if(['source_removed','source_unconfirmed'].includes(e.status)&&Object.keys(old).some(k=>!['status','is_published'].includes(k)&&!equal(old[k],e[k])))removalDataChanges.push(old.source_event_id);
     }
     const removed=after.events.filter(e=>e.status==='source_removed');
     const uncertain=after.events.filter(e=>e.status==='source_unconfirmed');
     const unknownChecks=(report.response.unconfirmed??[]).map(u=>{
      const known=before.events.find(e=>e.source==='goabase'&&e.source_event_id===u.source_event_id),fresh=map.get('goabase:'+u.source_event_id);
      return {id:u.source_event_id,reason:u.reason,previously_imported:!!known,safely_hidden_or_skipped:known?!!fresh&&!fresh.is_published&&['source_removed','source_unconfirmed'].includes(fresh.status):!fresh};
     });
     report.validation={events_before:before.events.length,events_after:after.events.length,missing,identityChanges,removalDataChanges,
      duplicate_pairs:Number(after.duplicates),lease_free:idle(after),removed_ids:removed.map(e=>e.source_event_id),
      removed_unpublished:removed.every(e=>!e.is_published),removal_records:after.removed.length,source_versions:after.versions.length,
      all_nonremoved_have_source_version:after.events.filter(e=>!['source_removed','source_unconfirmed'].includes(e.status)).every(e=>after.versions.some(v=>v.source_event_id===e.source_event_id)),
      unconfirmed_ids:uncertain.map(e=>e.source_event_id),unconfirmed_hidden:uncertain.every(e=>!e.is_published),unknown_status_checks:unknownChecks,
      quarantine_records:after.unconfirmed.length,published:after.events.filter(e=>e.is_published).length,
      statuses:after.events.reduce((a,e)=>(a[e.status]=(a[e.status]??0)+1,a),{}),
      published_only_scheduled:after.events.every(e=>!e.is_published||e.status==='scheduled'),
      publication_time_valid:after.events.every(e=>!e.is_published||(e.ends_at?Date.parse(e.ends_at)>Date.now():Date.parse(e.starts_at)>=Date.now()))};
     save('result.json',report);
    }
   }finally{keys=secret=undefined;}
   const v=report.validation,c=report.response;
   if(Object.keys(c).length!==16||v.missing.length||v.identityChanges.length||v.removalDataChanges.length||v.duplicate_pairs||!v.lease_free||
    !v.removed_unpublished||!v.removed_ids.includes('118240')||!v.all_nonremoved_have_source_version||
    v.events_after!==v.events_before+c.inserted||c.checked!==c.inserted+c.updated+c.unchanged+c.rejected_versions+c.removed+c.removed_unchanged+c.removed_unknown+c.quarantined+c.quarantined_unchanged+c.skipped_unconfirmed||
    !v.unconfirmed_hidden||!v.published_only_scheduled||!v.publication_time_valid||!v.unknown_status_checks.every(e=>e.safely_hidden_or_skipped)||
    !v.unknown_status_checks.some(e=>e.id==='118652'&&e.reason==='moved')||c.rejected_versions!==0||
    c.removed+c.removed_unchanged!==v.removed_ids.length||v.removal_records!==v.removed_ids.length)throw new Error('Post-import verification mismatch; no further writes.');
   report.post_passed=true;
  }
 }
 if(hash(path.join(root,'.env.local'))!==report.env_hash)throw new Error('App environment changed.');
 report.app_environment_unchanged=true;report.finished_at=new Date().toISOString();save('result.json',report);
 console.log(JSON.stringify({stage:mode,directory:dir,...report}));
}
main().catch(error=>{if(report&&dir){report.error=error.message;report.stopped_at=new Date().toISOString();save('result.json',report);}console.error(JSON.stringify({stopped:true,error:error.message,directory:dir}));process.exitCode=1;});
