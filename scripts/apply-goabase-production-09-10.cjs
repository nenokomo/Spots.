// Only approved SQL 09/10, explicit production target, once per stage, no retries.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const equal=require('node:util').isDeepStrictEqual;
const root=path.resolve(__dirname,'..'),prod='yhnxdeypkbzyjappuzmv',test='nfomkdvotqtlyymomksb';
const pointer=path.join(root,'supabase/.temp/production-backend-09-10-run.json');
const candidates={
 '09':{file:'09_goabase_source_removals.sql',sha:'c12d7904f08076c9c3bbf3ee53c0785889c244ea47b4c94e88324c08065e8318'},
 '10':{file:'10_goabase_unconfirmed_status.sql',sha:'380ede89a1a8b4fc70e2e9bf9a2d839274d00ba9c9017d66731fa9028fcda92a'}
};
const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
let dir,report;
function save(name,value){fs.writeFileSync(path.join(dir,name),JSON.stringify(value,null,2)+'\n');}
function cli(args){try{
 const result=JSON.parse(execFileSync(process.execPath,[path.join(root,'node_modules/supabase/dist/supabase.js'),...args,'--output-format','json'],{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:120000}));
 if(result.error)throw new Error();return result;
}catch{throw new Error('Protected CLI operation failed; raw diagnostics withheld. Stop, no retry.');}}
function identity(){
 if(fs.readFileSync(path.join(root,'supabase/.temp/project-ref'),'utf8').trim()!==test)throw new Error('Local test link changed.');
 const p=cli(['projects','list']).projects?.find(p=>p.id===prod);
 if(p?.name!=='Spots.'||p.id===test)throw new Error('Production identity mismatch.');
 return {id:p.id,name:p.name};
}
function query(name,sql){
 const file=path.join(dir,name+'.sql');fs.writeFileSync(file,sql,{flag:'wx'});
 const result=cli(['db','query',`--remote=${prod}`,'--read-only','--file',file]).rows?.[0]?.snapshot;
 if(!result)throw new Error('Missing verification result.');save(name+'.json',result);return result;
}
function snapshot(name,stage){return query(name,`select jsonb_build_object(
 'events',(select jsonb_agg(to_jsonb(e) order by id) from public.events e),
 'lease',(select jsonb_agg(to_jsonb(l) order by singleton) from spots_sync_private.goabase_lease l),
 'versions',(select coalesce(jsonb_agg(to_jsonb(v) order by source_event_id),'[]'::jsonb) from spots_sync_private.goabase_versions v),
 'removed',${stage>=9?"(select coalesce(jsonb_agg(to_jsonb(d) order by source_event_id),'[]'::jsonb) from spots_sync_private.goabase_removed d)":"'[]'::jsonb"},
 'unconfirmed',${stage>=10?"(select coalesce(jsonb_agg(to_jsonb(q) order by source_event_id),'[]'::jsonb) from spots_sync_private.goabase_unconfirmed q)":"'[]'::jsonb"},
 'security',(select jsonb_build_object('owner',relowner,'rls',relrowsecurity,'force',relforcerowsecurity,'acl',relacl) from pg_class where oid='public.events'::regclass),
 'columns',(select jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'required',a.attnotnull,'default',pg_get_expr(d.adbin,d.adrelid)) order by a.attnum) from pg_attribute a left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum where a.attrelid='public.events'::regclass and a.attnum>0 and not a.attisdropped),
 'policies',(select jsonb_agg(to_jsonb(p) order by policyname) from pg_policies p where schemaname='public' and tablename='events'),
 'constraints',(select jsonb_agg(jsonb_build_object('type',contype,'definition',pg_get_constraintdef(oid)) order by conname) from pg_constraint where conrelid='public.events'::regclass),
 'indexes',(select jsonb_agg(to_jsonb(i) order by indexname) from pg_indexes i where schemaname='public' and tablename='events'),
 'status_type',(select format_type(atttypid,atttypmod) from pg_attribute where attrelid='public.events'::regclass and attname='status'),
 'duplicates',(select count(*) from(select source,source_event_id from public.events group by source,source_event_id having count(*)>1)d)
 ) as snapshot;`);}
function backend(name){return query(name,`select jsonb_build_object(
 'functions',(select jsonb_agg(jsonb_build_object('schema',n.nspname,'name',p.proname,'body_hash',md5(p.prosrc),'definition',pg_get_functiondef(p.oid),'owner',pg_get_userbyid(p.proowner),'definer',p.prosecdef,'config',p.proconfig,
 'public_execute',exists(select 1 from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a where a.grantee=0 and a.privilege_type='EXECUTE'),
 'rights',(select jsonb_agg(jsonb_build_object('role',r,'execute',has_function_privilege(r,p.oid,'EXECUTE')) order by r) from unnest(array['anon','authenticated','service_role']) r)) order by n.nspname,p.proname)
 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where (n.nspname='public' and p.proname like 'spots_goabase_%') or (n.nspname='spots_sync_private' and p.proname in('goabase_apply_core','goabase_apply_removals_core'))),
 'tables',(select jsonb_agg(jsonb_build_object('name',c.relname,'owner',pg_get_userbyid(c.relowner),'rls',c.relrowsecurity,
 'public_grants',exists(select 1 from aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) a where a.grantee=0),
 'rights',(select jsonb_agg(jsonb_build_object('role',r,'access',has_table_privilege(r,c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')) order by r) from unnest(array['anon','authenticated','service_role']) r)) order by c.relname)
 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='spots_sync_private' and c.relkind='r'),
 'schema_clients',(select jsonb_agg(jsonb_build_object('role',r,'usage',has_schema_privilege(r,'spots_sync_private','USAGE'),'create',has_schema_privilege(r,'spots_sync_private','CREATE')) order by r) from unnest(array['anon','authenticated'])r)
 ) as snapshot;`);}
function checkBackend(b,tables,functions){
 if(b.tables.length!==tables||b.functions.length!==functions||
 !b.tables.every(t=>t.owner==='postgres'&&t.rls&&!t.public_grants&&t.rights.every(r=>!r.access))||
 !b.functions.every(f=>f.owner==='postgres'&&f.definer&&f.config?.includes('search_path=""')&&!f.public_execute&&f.rights.every(r=>r.execute===(f.schema==='public'&&r.role==='service_role')))||
 !b.schema_clients.every(r=>!r.usage&&!r.create))throw new Error('Backend objects or privileges differ from approved state.');
}
function fn(){return cli(['functions','list',`--remote=${prod}`]).functions;}
function main(){
 const stage=process.argv[2]?.replace('--','');if(!candidates[stage])throw new Error('Choose approved stage --09 or --10.');
 identity();
 for(const c of Object.values(candidates))if(hash(path.join(root,'supabase/ops',c.file))!==c.sha)throw new Error('Approved SQL hash mismatch.');
 if(stage==='09'){
  if(fs.existsSync(pointer))throw new Error('Production run already recorded; inspect, do not repeat.');
  const backup=JSON.parse(fs.readFileSync(path.join(root,'supabase/.temp/production-backup-latest.json')));
  if(backup.production_ref!==prod||!backup.directory.startsWith(path.join(root,'supabase/backups')+path.sep))throw new Error('Wrong backup target.');
  const proof=JSON.parse(fs.readFileSync(path.join(backup.directory,'upgrade-report.json')));
  if(!proof.restore_passed||!proof.final_readonly_verified||!proof.local_sql_results?.every(r=>r.passed&&r.all_events_preserved))throw new Error('Restore/rehearsal evidence incomplete.');
  const manifest=JSON.parse(fs.readFileSync(path.join(backup.directory,'sha256-manifest.json')));
  for(const [file,sha] of Object.entries(manifest))if(hash(path.join(backup.directory,file))!==sha)throw new Error('Backup manifest mismatch.');
  dir=path.join(root,'supabase/backups','production-backend-09-10-'+new Date().toISOString().replace(/[:.]/g,'-'));fs.mkdirSync(dir);
  execFileSync('icacls.exe',[dir,'/inheritance:r','/grant:r',`${process.env.USERDOMAIN}\\${process.env.USERNAME}:(OI)(CI)F`],{stdio:'pipe'});
  report={project_ref:prod,started_at:new Date().toISOString(),backup_directory:backup.directory,backup_manifest_verified_files:Object.keys(manifest).length,env_hash:hash(path.join(root,'.env.local')),attempts:[],completed:[]};
  fs.writeFileSync(pointer,JSON.stringify({project_ref:prod,directory:dir}),{flag:'wx'});save('result.json',report);
 }else{
  const p=JSON.parse(fs.readFileSync(pointer));if(p.project_ref!==prod)throw new Error('Wrong recorded project.');dir=p.directory;
  report=JSON.parse(fs.readFileSync(path.join(dir,'result.json')));
  if(report.error||!equal(report.completed,['09']))throw new Error('Previous stage not verified or already completed.');
 }
 const before=snapshot('before-'+stage,stage==='09'?8:9),b=backend('backend-before-'+stage);
 checkBackend(b,stage==='09'?2:3,stage==='09'?3:5);
 if(before.events.length!==31||before.duplicates!==0||before.status_type!=='text'||before.constraints.some(c=>c.type==='c')||before.lease?.length!==1||before.lease[0].token!==null||before.lease[0].expires_at!=='-infinity'||before.versions.length!==0)throw new Error('Unexpected production data/status/lease state.');
 const original=JSON.parse(fs.readFileSync(path.join(report.backup_directory,'upgrade-before.json')));
 if(!equal(before.events,original.events)||!equal(before.policies,original.policies))throw new Error('Current original events/policies differ from backup.');
 const functionsBefore=fn();save('functions-before-'+stage+'.json',functionsBefore);
 const old=functionsBefore.find(f=>f.slug==='import-goabase');
 if(old?.version!==2||old.status!=='ACTIVE'||old.verify_jwt!==false||old.ezbr_sha256!=='f30f017ec6ce42eba8419bd1a8e2c5122b76fb357f27aba5f9c25e3e11a0497c')throw new Error('Unexpected production function.');
 const candidate=candidates[stage],file=path.join(root,'supabase/ops',candidate.file),frozen=path.join(dir,'approved-'+stage+'.sql');
 fs.copyFileSync(file,frozen,fs.constants.COPYFILE_EXCL);
 const target=identity();if(hash(file)!==candidate.sha||hash(frozen)!==candidate.sha)throw new Error('Candidate changed immediately before execution.');
 if(hash(path.join(root,'.env.local'))!==report.env_hash)throw new Error('App environment changed.');
 fs.writeFileSync(path.join(dir,'sql-'+stage+'-attempt.json'),JSON.stringify({target,sha256:candidate.sha,at:new Date().toISOString()}),{flag:'wx'});
 report.attempts.push(stage);save('result.json',report);
 console.log(JSON.stringify({stage,project:target,sql_sha256:candidate.sha,events_before:31,action:'Execute approved SQL once'}));
 save('sql-'+stage+'-response.json',cli(['db','query',`--remote=${prod}`,'--file',frozen,'--yes']));
 const after=snapshot('after-'+stage,Number(stage)),a=backend('backend-after-'+stage);
 if(!equal(before,after))throw new Error('Events, UUIDs, metadata or event schema/security changed unexpectedly.');
 checkBackend(a,stage==='09'?3:4,stage==='09'?5:7);
 const originalFn=b.functions.find(f=>f.schema==='public'&&f.name===(stage==='09'?'spots_goabase_apply':'spots_goabase_apply_v2'));
 const core=a.functions.find(f=>f.schema==='spots_sync_private'&&f.name===(stage==='09'?'goabase_apply_core':'goabase_apply_removals_core'));
 if(!core||core.body_hash!==originalFn?.body_hash)throw new Error('Moved core differs from previously approved implementation.');
 const newFn=a.functions.find(f=>f.schema==='public'&&f.name===(stage==='09'?'spots_goabase_apply_v2':'spots_goabase_apply_v3'));
 if(!newFn?.definition.includes(stage==='09'?'source_removed':'source_unconfirmed')||!newFn.definition.includes('is_published=false'))throw new Error('Expected status/unpublish implementation missing.');
 const functionsAfter=fn();save('functions-after-'+stage+'.json',functionsAfter);
 if(!equal(functionsBefore,functionsAfter)||hash(path.join(root,'.env.local'))!==report.env_hash||fs.readFileSync(path.join(root,'supabase/.temp/project-ref'),'utf8').trim()!==test)throw new Error('Function, app environment or local link changed.');
 report.completed.push(stage);report['validation_'+stage]={events:31,all_event_data_and_uuids_unchanged:true,event_schema_rls_grants_unchanged:true,status_values_supported:true,private_tables:a.tables.length,public_rpcs:a.functions.filter(f=>f.schema==='public').length,private_cores:a.functions.filter(f=>f.schema==='spots_sync_private').length,backend_permissions_verified:true,core_implementation_preserved:true,duplicates:0,lease_free:true,versions:0,functions_unchanged:true,app_environment_unchanged:true,local_test_link_unchanged:true,sha256:candidate.sha};
 report.updated_at=new Date().toISOString();save('result.json',report);console.log(JSON.stringify({directory:dir,...report}));
}
try{main();}catch(error){if(report){report.error=error.message;report.stopped_at=new Date().toISOString();save('result.json',report);}console.error(JSON.stringify({stopped:true,error:error.message,directory:dir}));process.exitCode=1;}
