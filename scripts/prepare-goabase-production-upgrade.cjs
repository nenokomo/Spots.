// Authorized backup/read-only production inspection; SQL rehearsal is LOCAL ONLY.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),prod='yhnxdeypkbzyjappuzmv',test='nfomkdvotqtlyymomksb';
const bin=path.join(process.env.LOCALAPPDATA,'Temp/vscode-agent-codex-sandbox-UOeaJh/spots-postgres-tools/pgsql/bin');
const pointer=path.join(root,'supabase/.temp/production-backup-latest.json');
const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const equal=require('node:util').isDeepStrictEqual;
const expected={
 '09_goabase_source_removals.sql':'c12d7904f08076c9c3bbf3ee53c0785889c244ea47b4c94e88324c08065e8318',
 '10_goabase_unconfirmed_status.sql':'380ede89a1a8b4fc70e2e9bf9a2d839274d00ba9c9017d66731fa9028fcda92a'
};
let dir,report;
function cli(args){try{return JSON.parse(execFileSync(process.execPath,[path.join(root,'node_modules/supabase/dist/supabase.js'),...args,'--output-format','json'],{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:120000}));}catch{throw new Error('Protected CLI read failed; raw diagnostics withheld.');}}
function save(name,value){fs.writeFileSync(path.join(dir,name),JSON.stringify(value,null,2)+'\n');}
function remote(name){
 const file=path.join(dir,name+'.sql');
 fs.writeFileSync(file,`select jsonb_build_object(
 'events',(select jsonb_agg(to_jsonb(e) order by id) from public.events e),
 'lease',(select jsonb_agg(to_jsonb(l) order by singleton) from spots_sync_private.goabase_lease l),
 'versions',(select coalesce(jsonb_agg(to_jsonb(v) order by source_event_id),'[]'::jsonb) from spots_sync_private.goabase_versions v),
 'policies',(select jsonb_agg(to_jsonb(p) order by policyname) from pg_policies p where schemaname='public' and tablename='events'),
 'security',(select jsonb_build_object('rls',relrowsecurity,'acl',relacl,'owner',relowner) from pg_class where oid='public.events'::regclass),
 'constraints',(select jsonb_agg(jsonb_build_object('type',contype,'definition',pg_get_constraintdef(oid)) order by conname) from pg_constraint where conrelid='public.events'::regclass),
 'status_type',(select format_type(atttypid,atttypmod) from pg_attribute where attrelid='public.events'::regclass and attname='status'),
 'functions',(select jsonb_agg(jsonb_build_object('name',p.proname,'body_hash',md5(p.prosrc)) order by p.proname) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'spots_goabase_%')
 ) as snapshot;`,{flag:'wx'});
 const s=cli(['db','query',`--remote=${prod}`,'--read-only','--file',file]).rows?.[0]?.snapshot;
 if(!s)throw new Error('Missing production read result.');save(name+'.json',s);return s;
}
function child(file,args){try{return execFileSync(process.execPath,[path.join(root,'scripts',file),...args],{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:300000});}catch{throw new Error('Backup tool failed; protected diagnostics withheld; no retry.');}}
function identity(){
 if(fs.readFileSync(path.join(root,'supabase/.temp/project-ref'),'utf8').trim()!==test)throw new Error('Local CLI link mismatch.');
 if(cli(['projects','list']).projects?.find(p=>p.id===prod)?.name!=='Spots.')throw new Error('Production identity mismatch.');
}
async function main(){
 const mode=process.argv[2];if(!['--backup-readonly','--restore-local','--verify-final-readonly'].includes(mode))throw new Error('Choose explicit backup, local restore or read-only final verification.');
 if(mode==='--verify-final-readonly'){
  identity();const p=JSON.parse(fs.readFileSync(pointer));dir=p.directory;
  if(p.production_ref!==prod)throw new Error('Wrong final verification target.');
  report=JSON.parse(fs.readFileSync(path.join(dir,'upgrade-report.json')));
  if(!report.restore_passed)throw new Error('Successful restore required.');
  const before=JSON.parse(fs.readFileSync(path.join(dir,'upgrade-before.json')));
  if(!equal(remote('upgrade-final'),before))throw new Error('Production changed during local verification.');
  const file=path.join(dir,'database-owner.sql');fs.writeFileSync(file,"select pg_get_userbyid(datdba) as owner from pg_database where datname=current_database();",{flag:'wx'});
  report.production_database_owner=cli(['db','query',`--remote=${prod}`,'--read-only','--file',file]).rows?.[0]?.owner;
  if(report.production_database_owner!=='postgres')throw new Error('Local database ownership differs from production.');
  const f=cli(['functions','list',`--remote=${prod}`]).functions.find(x=>x.slug==='import-goabase');
  if(f?.version!==report.function.version||f?.ezbr_sha256!==report.function.bundle||f?.verify_jwt!==false)throw new Error('Production function changed.');
  report.final_readonly_verified=true;report.final_verified_at=new Date().toISOString();
  report.app_environment_unchanged=hash(path.join(root,'.env.local'))===report.env_hash;
  if(!report.app_environment_unchanged)throw new Error('App environment changed.');
  save('upgrade-report.json',report);
  const native=JSON.parse(fs.readFileSync(path.join(dir,'database-backup-report.json')));
  Object.assign(native,{archive_fully_decoded:true,public_and_private_import_schema_restore_verified:true,full_managed_platform_restore_verified:false,restore_report:'upgrade-report.json'});
  save('database-backup-report.json',native);
  fs.writeFileSync(path.join(dir,'RESTORE.md'),`# Production backup / 08 November 2026\n\nProject: ${prod} (Spots.).\n\nFull logical PostgreSQL 17.11 archive: database.full.dump. No schema exclusions. Entire archive decoded to database.full.sql. Roles exported without password hashes. Deployed import-goabase v2 source, Deno config/lock and verify_jwt=false configuration saved in deployed-function; metadata/bundle fingerprint in edge-function-metadata.json. No API/Edge secrets exported.\n\n## Verified restore\n\nIsolated PostgreSQL 17.11 on 127.0.0.1:55440, now stopped. Selected archived public and spots_sync_private schemas, including private schema TOC entry, owners, data, constraints, RLS and ACLs, restored. All 31 event rows and UUIDs identical to fresh read-only production snapshot. Original lease/versions included. SQL candidates 09 then 10 applied only locally as postgres; all event data unchanged, backend permissions verified. Exact hashes and results in upgrade-report.json. Production rechecked read-only after local rehearsal, still unchanged.\n\n## Local compatibility and limitations\n\nStock PG17 requires explicit ADMIN memberships for Supabase grantor. Separate local role compatibility files preserve original role backup. Isolated database ownership set to postgres, matching actual production owner, so pg_database_owner has correct permissions. Initial local attempts stopped on schema selection, JSON key order and role/database ownership issues; these were corrected in the local restore runner, not in production or frozen SQL.\n\nFull managed Supabase platform restore NOT verified; managed extensions/platform services need a compatible Supabase target. Storage file bytes, API/Edge secrets, role passwords and external provider/project settings are outside this backup. No independent off-device copy made.\n\n## Recovery\n\nDo not execute a full restore against production without separate approval. For recovery, restore archive and roles in a compatible isolated Supabase environment first. For an isolated stock-PG rehearsal, include the schema's own TOC entry when selecting app schema objects; see restore-app-schemas.toc.txt and prepare-goabase-production-upgrade.cjs. Migration candidates remain separate files; original archive is unchanged. Restore event data only after comparing later writes, never overwrite the entire live table blindly.\n\nFunction rollback sources/configuration are saved, but no rollback deployment has been performed; source plus lockfile and recorded server bundle fingerprint are not a saved deployable binary bundle. Backend additions are compatible wrappers; leave them in place rather than dropping version/removal/quarantine metadata. Any production restore, rollback deployment or removal requires separate approval.\n`,{flag:'wx'});
  function files(folder){return fs.readdirSync(folder,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(folder,e.name)):[path.join(folder,e.name)]);}
  const manifest=Object.fromEntries(files(dir).filter(f=>!f.includes(path.sep+'.temp'+path.sep)&&path.basename(f)!=='sha256-manifest.json').map(f=>[path.relative(dir,f).replaceAll('\\','/'),hash(f)]));
  save('sha256-manifest.json',manifest);
  for(const [f,sha] of Object.entries(manifest))if(hash(path.join(dir,f))!==sha)throw new Error('Final manifest mismatch.');
  console.log(JSON.stringify({production_ref:prod,final_readonly_verified:true,event_count:report.event_count,production_database_owner:report.production_database_owner,verified_files:Object.keys(manifest).length,app_environment_unchanged:true}));return;
 }
 if(mode==='--backup-readonly'){
  identity();const envHash=hash(path.join(root,'.env.local'));
  child('backup-spots-production.cjs',['--download-function']);
  const p=JSON.parse(fs.readFileSync(pointer));dir=p.directory;
  if(p.production_ref!==prod)throw new Error('Wrong backup pointer.');
  // Restrict inheritance before exporting full database contents.
  execFileSync('icacls.exe',[dir,'/inheritance:r','/grant:r',`${process.env.USERDOMAIN}\\${process.env.USERNAME}:(OI)(CI)F`],{stdio:'pipe'});
  report={production_ref:prod,started_at:new Date().toISOString(),remote_read_only:true,env_hash:envHash,sql_hashes:{},restore_passed:false};
  save('upgrade-report.json',report);
  for(const [file,sha] of Object.entries(expected)){
   const original=path.join(root,'supabase/ops',file);if(hash(original)!==sha)throw new Error('Candidate hash mismatch.');
   fs.copyFileSync(original,path.join(dir,'candidate-'+file),fs.constants.COPYFILE_EXCL);report.sql_hashes[file]=sha;
  }
  const before=remote('upgrade-before');
  if(before.events.length!==31||before.lease?.[0]?.token!==null||before.status_type!=='text')throw new Error('Production baseline mismatch.');
  child('backup-spots-native.cjs',['--confirmed-production-backup']);
  const after=remote('upgrade-after');
  if(!equal(before,after))throw new Error('Production changed during backup; investigate snapshot consistency.');
  const f=JSON.parse(fs.readFileSync(path.join(dir,'edge-function-metadata.json')))[0];
  const live=cli(['functions','list',`--remote=${prod}`]).functions.find(x=>x.slug==='import-goabase');
  if(!equal(f,live)||f.status!=='ACTIVE'||f.version!==2||f.verify_jwt!==false)throw new Error('Function changed or unexpected production version.');
  const src=path.join(dir,'deployed-function/supabase/functions/import-goabase');
  if(!/withSupabase\(\{\s*auth:\s*["']secret["']/.test(fs.readFileSync(path.join(src,'index.ts'),'utf8')))throw new Error('Saved handler auth mismatch.');
  fs.writeFileSync(path.join(dir,'deployed-function/supabase/config.toml'),'[functions.import-goabase]\nverify_jwt = false\nentrypoint = "./functions/import-goabase/index.ts"\n',{flag:'wx'});
  report.function={version:f.version,status:f.status,verify_jwt:f.verify_jwt,bundle:f.ezbr_sha256};
  report.event_count=before.events.length;report.production_unchanged=true;
  report.app_environment_unchanged=hash(path.join(root,'.env.local'))===envHash;
  if(!report.app_environment_unchanged)throw new Error('App environment changed.');
  report.backup_passed=true;report.backup_finished_at=new Date().toISOString();save('upgrade-report.json',report);
  console.log(JSON.stringify({directory:dir,...report}));return;
 }
 // LOCAL-ONLY branch: deliberately no CLI, remote credentials or remote connections.
 const p=JSON.parse(fs.readFileSync(pointer));dir=p.directory;
 if(p.production_ref!==prod)throw new Error('Wrong restore backup.');
 report=JSON.parse(fs.readFileSync(path.join(dir,'upgrade-report.json')));
 if(!report.backup_passed||report.restore_passed)throw new Error('Backup incomplete or restore already recorded.');
 if(report.local_restore_error){save('restore-attempt-'+Date.now()+'.json',report);delete report.local_restore_error;}
 const cluster=path.join(root,'supabase/.temp','restore-upgrade-'+Date.now());
 const env={...process.env,PGHOST:'127.0.0.1',PGPORT:'55440',PGUSER:'restore_admin',PGDATABASE:'spots_restore',PGPASSWORD:'',PGSSLMODE:'disable',PGOPTIONS:'',PGCONNECT_TIMEOUT:'5'};
 function pg(tool,args,extra={}){return execFileSync(path.join(bin,tool+'.exe'),args,{env,encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:60000,...extra});}
 function q(sql){return JSON.parse(pg('psql',['-X','-t','-A','-v','ON_ERROR_STOP=1','-c',sql]).trim());}
 let started=false;
 try{
  pg('initdb',['-D',cluster,'--username=restore_admin','--auth=trust','--no-locale','--encoding=UTF8']);
  pg('pg_ctl',['-D',cluster,'-l',path.join(cluster,'server.log'),'-w','-t','30','-o','-h 127.0.0.1 -p 55440','start'],{stdio:'ignore'});started=true;
  if(path.resolve(pg('psql',['-X','-t','-A','-d','postgres','-c','show data_directory']).trim())!==path.resolve(cluster))throw new Error('Wrong local cluster.');
  pg('createdb',['spots_restore']);env.PGOPTIONS='-c timezone=UTC';
  const roles=fs.readFileSync(path.join(dir,'roles.no-passwords.sql'),'utf8');
  const grants=[...new Set([...roles.matchAll(/^GRANT (\w+) TO .*GRANTED BY supabase_admin;/gm)].map(m=>m[1]))];
  const localRoles=path.join(dir,'roles.local-restore-compat-'+Date.now()+'.sql');
  fs.writeFileSync(localRoles,roles.replace(/^GRANT /m,`-- Local stock PG17 grantor compatibility only\nGRANT ${grants.join(', ')} TO supabase_admin WITH ADMIN OPTION;\nGRANT `),{flag:'wx'});
  pg('psql',['-X','-v','ON_ERROR_STOP=1','-f',localRoles]);
  // Public is owned by pg_database_owner in the archive; make the isolated
  // database postgres-owned so the real migration role has identical ownership.
  pg('psql',['-X','-v','ON_ERROR_STOP=1','-c','alter database spots_restore owner to postgres']);
  report.local_compatibility=['Explicit ADMIN memberships for Supabase grantor on stock PG17','Isolated database owned by postgres so pg_database_owner resolves to the migration role'];
  const archive=path.join(dir,'database.full.dump');
  // pg_restore schema filtering omits the schema's own TOC entry. Select the
  // archived schema entry and its scoped objects explicitly, preserving ownership.
  const toc=pg('pg_restore',['--list',archive]);
  const selected=toc.split(/\r?\n/).filter(line=>/^;/.test(line)||/ (public|spots_sync_private) /.test(line)).join('\n')+'\n';
  const list=path.join(dir,'restore-app-schemas.toc.txt');fs.writeFileSync(list,selected);
  pg('pg_restore',['--exit-on-error','--use-list',list,'--dbname=spots_restore',archive]);
  const eventQuery="select coalesce(jsonb_agg(to_jsonb(e) order by id),'[]'::jsonb) from public.events e";
  const original=JSON.parse(fs.readFileSync(path.join(dir,'upgrade-before.json')));
  const restored=q(eventQuery);
  if(!equal(restored,original.events))throw new Error('Restored event data/UUID mismatch.');
  report.restored_event_data_and_uuids_identical=true;
  report.restore_scope=['public','spots_sync_private'];
  report.local_sql_results=[];
  for(const [file,sha] of Object.entries(expected)){
   const candidate=path.join(dir,'candidate-'+file);if(hash(candidate)!==sha)throw new Error('Frozen candidate changed.');
   // Match the production CLI's postgres migration role, not bootstrap superuser.
   pg('psql',['-X','-v','ON_ERROR_STOP=1','-c','set role postgres','-f',candidate]);
   if(!equal(q(eventQuery),restored))throw new Error('Local migration changed original events.');
   report.local_sql_results.push({file,sha256:sha,passed:true,all_events_preserved:true});
  }
  report.backend=q(`select jsonb_build_object(
   'tables',(select jsonb_agg(jsonb_build_object('name',c.relname,'rls',c.relrowsecurity,
    'client_access',has_table_privilege('anon',c.oid,'SELECT,INSERT,UPDATE,DELETE') or has_table_privilege('authenticated',c.oid,'SELECT,INSERT,UPDATE,DELETE'),
    'service_direct_access',has_table_privilege('service_role',c.oid,'SELECT,INSERT,UPDATE,DELETE')) order by c.relname) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='spots_sync_private' and c.relkind='r'),
   'functions',(select jsonb_agg(jsonb_build_object('schema',n.nspname,'name',p.proname,'owner',pg_get_userbyid(p.proowner),'definer',p.prosecdef,'config',p.proconfig,
    'public_access',exists(select 1 from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a where a.grantee=0 and a.privilege_type='EXECUTE'),
    'anon',has_function_privilege('anon',p.oid,'EXECUTE'),'authenticated',has_function_privilege('authenticated',p.oid,'EXECUTE'),'service',has_function_privilege('service_role',p.oid,'EXECUTE')) order by n.nspname,p.proname)
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace where (n.nspname='public' and p.proname like 'spots_goabase_%') or (n.nspname='spots_sync_private' and p.proname in ('goabase_apply_core','goabase_apply_removals_core'))))`);
  if(report.backend.tables.length!==4||!report.backend.tables.every(t=>t.rls&&!t.client_access&&!t.service_direct_access)||report.backend.functions.length!==7||!report.backend.functions.every(f=>f.owner==='postgres'&&f.definer&&f.config?.includes('search_path=""')&&!f.public_access&&!f.anon&&!f.authenticated&&f.service===(f.schema==='public')))throw new Error('Restored migration permissions mismatch.');
  report.rls_probes=[];
  const id=restored[0].id;if(!/^[a-f0-9-]{36}$/.test(id))throw new Error('Invalid restored UUID.');
  for(const status of ['source_removed','source_unconfirmed'])for(const published of [false,true]){
   // Rollback-only fixture on the isolated restore, preserving original data.
   const out=pg('psql',['-X','-t','-A','-q','-v','ON_ERROR_STOP=1','-c',`begin; update public.events set status='${status}',is_published=${published} where id='${id}'; set local role anon; select count(*) from public.events where id='${id}'; rollback;`]).trim();
   if(!/^[01]$/.test(out))throw new Error('Unexpected isolated RLS probe output.');
   report.rls_probes.push({status,is_published:published,anon_visible:Number(out)});
  }
  if(!equal(q(eventQuery),restored))throw new Error('Local rollback fixtures changed events.');
  pg('pg_restore',['--file',path.join(dir,'database.full.sql'),archive]);
  const sql=fs.readFileSync(path.join(dir,'database.full.sql'),'utf8');
  const counts=[...sql.matchAll(/^COPY (\S+) \([^\n]+\) FROM stdin;\r?\n([\s\S]*?)^\\\.$/gm)].map(m=>({table:m[1],rows:m[2].split(/\r?\n/).filter(Boolean).length}));
  save('archive-data-counts.json',counts);
  report.archive_fully_decoded=true;report.archive_table_data_sections=counts.length;
  report.archive_sha256=hash(archive);report.full_managed_platform_restore_verified=false;
  report.restore_passed=true;
 }catch(error){
  report.local_restore_error=error.stderr?'Local PostgreSQL operation failed; protected diagnostics withheld.':error.message;
  throw error;
 }finally{
  if(started){pg('pg_ctl',['-D',cluster,'-m','fast','-w','stop'],{stdio:'ignore'});report.local_server_stopped=true;}
  report.finished_at=new Date().toISOString();save('upgrade-report.json',report);
 }
 function files(folder){return fs.readdirSync(folder,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(folder,e.name)):[path.join(folder,e.name)]);}
 const manifest=Object.fromEntries(files(dir).filter(f=>!f.includes(path.sep+'.temp'+path.sep)&&path.basename(f)!=='sha256-manifest.json').map(f=>[path.relative(dir,f).replaceAll('\\','/'),hash(f)]));
 save('sha256-manifest.json',manifest);
 for(const [f,sha] of Object.entries(manifest))if(hash(path.join(dir,f))!==sha)throw new Error('Manifest verification failed.');
 console.log(JSON.stringify({directory:dir,...report,verified_files:Object.keys(manifest).length}));
}
main().catch(error=>{console.error(JSON.stringify({failed:true,reason:error.stderr?'Protected tool failed; raw diagnostics withheld.':error.message}));process.exitCode=1;});
