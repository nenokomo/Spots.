// Only test may be mutated/invoked. Production access is GET metadata/body only.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process'),equal=require('node:util').isDeepStrictEqual;
const root=path.resolve(__dirname,'..'),test='nfomkdvotqtlyymomksb',prod='yhnxdeypkbzyjappuzmv';
const pointer=path.join(root,'supabase/.temp/goabase-frozen-test-run.json');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const fileHash=f=>hash(fs.readFileSync(f));let dir,report;
function cli(args){try{const j=JSON.parse(execFileSync(process.execPath,[path.join(root,'node_modules/supabase/dist/supabase.js'),...args,'--output-format','json'],{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:120000}));if(j.error)throw new Error();return j;}catch{throw new Error('Protected CLI failed; raw diagnostics withheld.');}}
function save(name,v){fs.writeFileSync(path.join(dir,name),JSON.stringify(v,null,2)+'\n');}
function identity(){if(fs.readFileSync(path.join(root,'supabase/.temp/project-ref'),'utf8').trim()!==test||cli(['projects','list']).projects.find(p=>p.id===test)?.name!=='spots. testproject')throw new Error('Test project mismatch.');}
function snap(name){
 const f=path.join(dir,name+'.sql');fs.writeFileSync(f,`select jsonb_build_object(
 'events',(select jsonb_agg(to_jsonb(e) order by id) from public.events e),
 'lease',(select jsonb_agg(to_jsonb(l) order by singleton) from spots_sync_private.goabase_lease l),
 'versions',(select jsonb_agg(to_jsonb(v) order by source_event_id) from spots_sync_private.goabase_versions v),
 'removed',(select coalesce(jsonb_agg(to_jsonb(d) order by source_event_id),'[]'::jsonb) from spots_sync_private.goabase_removed d),
 'unconfirmed',(select coalesce(jsonb_agg(to_jsonb(q) order by source_event_id),'[]'::jsonb) from spots_sync_private.goabase_unconfirmed q),
 'policies',(select jsonb_agg(to_jsonb(p) order by policyname) from pg_policies p where schemaname='public' and tablename='events'),
 'duplicates',(select count(*) from(select source,source_event_id from public.events group by source,source_event_id having count(*)>1)d)
 ) as snapshot;`,{flag:'wx'});
 const s=cli(['db','query',`--remote=${test}`,'--read-only','--file',f]).rows?.[0]?.snapshot;if(!s)throw new Error('Snapshot missing.');save(name+'.json',s);return s;
}
const idle=s=>s.lease?.length===1&&s.lease[0].token===null&&s.lease[0].expires_at==='-infinity'&&s.duplicates===0;
function once(stage){fs.writeFileSync(path.join(dir,stage+'-attempt.json'),JSON.stringify({project:test,at:new Date().toISOString()}),{flag:'wx'});}
function active(){const f=cli(['functions','list',`--remote=${test}`]).functions.find(f=>f.slug==='import-goabase');if(f?.status!=='ACTIVE'||f.verify_jwt!==false||f.ezbr_sha256!==report.release.ezbr_sha256)throw new Error('Frozen test function changed.');return f;}
async function main(){
 const mode=process.argv[2];
 if(mode==='--audit-local'){
  const p=JSON.parse(fs.readFileSync(pointer));if(p.project_ref!==test)throw new Error('Wrong run.');dir=p.directory;report=JSON.parse(fs.readFileSync(path.join(dir,'result.json')));
  if(report.error||!report.post_passed||report.post_attempts!==1)throw new Error('Verified one-time import required.');
  const before=JSON.parse(fs.readFileSync(path.join(dir,'before-post.json'))),after=JSON.parse(fs.readFileSync(path.join(dir,'after-post.json')));
  report.full_event_data_unchanged=equal(before.events,after.events);
  report.full_versions_unchanged=equal(before.versions,after.versions);
  report.full_removal_metadata_unchanged=equal(before.removed,after.removed);
  if(!report.full_event_data_unchanged||!report.full_versions_unchanged||!report.full_removal_metadata_unchanged)throw new Error('Unchanged counters disagree with snapshot.');
  report.final_local_audit_passed=true;save('result.json',report);
  console.log(JSON.stringify({post_attempts:report.post_attempts,full_event_data_unchanged:true,full_versions_unchanged:true,full_removal_metadata_unchanged:true,network_requests:0}));return;
 }
 if(!['--prepare','--deploy','--deploy-eszip','--auth','--post'].includes(mode))throw new Error('Explicit stage required.');
 identity();
 if(mode==='--prepare'){
  if(fs.existsSync(pointer))throw new Error('Test run already exists.');
  dir=path.join(root,'supabase/backups','frozen-release-test-'+new Date().toISOString().replace(/[:.]/g,'-'));fs.mkdirSync(dir);
  execFileSync('icacls.exe',[dir,'/inheritance:r','/grant:r',`${process.env.USERDOMAIN}\\${process.env.USERNAME}:(OI)(CI)F`],{stdio:'pipe'});
  const release=JSON.parse(fs.readFileSync(path.join(root,'supabase/.temp/goabase-frozen-release.json')));
  if(release.eszip_sha256!=='e160bae41b3fb10e614339720ce2606b67e8d8d9f078ee0a9102d6f153396743'||fileHash(release.artifact)!==release.eszip_sha256||fileHash(release.output)!==release.ezbr_sha256)throw new Error('Release hash mismatch.');
  report={project_ref:test,started_at:new Date().toISOString(),release,env_hash:fileHash(path.join(root,'.env.local')),post_attempts:0};
  fs.writeFileSync(pointer,JSON.stringify({directory:dir,project_ref:test}),{flag:'wx'});save('result.json',report);
  const s=snap('before-deployment');if(!idle(s)||s.events.length!==35)throw new Error('Unexpected initial test state.');
  report.prepared=true;
 }else{
  const p=JSON.parse(fs.readFileSync(pointer));if(p.project_ref!==test)throw new Error('Wrong run.');dir=p.directory;report=JSON.parse(fs.readFileSync(path.join(dir,'result.json')));
  if(mode==='--deploy-eszip'&&report.error==='Test artifact upload failed 500; no retry.'&&report.deploy_http_status===500){save('initial-upload-http500.json',report);delete report.error;report.upload_correction='Official application/vnd.denoland.eszip content type and explicit entrypoint/import map metadata';}
  if(report.error||!report.prepared)throw new Error('Previous stage failed.');
  if(mode==='--deploy'||mode==='--deploy-eszip'){
   if(report.deploy_passed)throw new Error('Already deployed.');
   let token='';for await(const chunk of process.stdin)token+=chunk;token=token.trim();if(!/^sbp_[A-Za-z0-9_-]+$/.test(token))throw new Error('Protected credential unavailable.');
   const headers={Authorization:'Bearer '+token};
   async function get(ref,body=false){const r=await fetch(`https://api.supabase.com/v1/projects/${ref}/functions/import-goabase${body?'/body':''}`,{headers,redirect:'error',signal:AbortSignal.timeout(60000)});if(!r.ok)throw new Error('Management GET failed '+r.status);return body?Buffer.from(await r.arrayBuffer()):r.json();}
   const beforeProd=await get(prod),beforeTest=await get(test),body=await get(prod,true);
   if(beforeProd.version!==3||beforeProd.status!=='ACTIVE'||beforeProd.verify_jwt!==false||beforeTest.version!==3||beforeTest.verify_jwt!==false||beforeTest.import_map!==true||hash(body)!==report.release.eszip_sha256)throw new Error('Live production/test reference differs.');
   save('production-before.json',beforeProd);save('test-before.json',beforeTest);
   if(fileHash(report.release.output)!==report.release.ezbr_sha256)throw new Error('Payload changed.');
   identity();once(mode==='--deploy-eszip'?'deploy-eszip':'deploy');save('result.json',report);
   // Fixed mutation URL: cannot target production. No source build or package resolution.
   const params=new URLSearchParams({verify_jwt:'false',ezbr_sha256:report.release.ezbr_sha256,entrypoint_path:beforeTest.entrypoint_path,import_map_path:beforeTest.import_map_path});
   const uri=`https://api.supabase.com/v1/projects/${test}/functions/import-goabase?${params}`;
   const response=await fetch(uri,{method:'PATCH',headers:{...headers,'Content-Type':'application/vnd.denoland.eszip'},body:fs.readFileSync(report.release.output),redirect:'error',signal:AbortSignal.timeout(120000)});
   report.deploy_http_status=response.status;save('result.json',report);if(response.status!==200)throw new Error('Test artifact upload failed '+response.status+'; no retry.');
   const after=await get(test),testBody=await get(test,true),afterProd=await get(prod),prodBody=await get(prod,true);
   save('test-after.json',after);save('production-after.json',afterProd);fs.writeFileSync(path.join(dir,'deployed-test.eszip'),testBody);
   report.test_function=after;report.test_eszip_sha256=hash(testBody);report.production_unchanged=equal(beforeProd,afterProd)&&hash(prodBody)===report.release.eszip_sha256;
   report.deployed_bytes_identical=testBody.equals(prodBody);
   report.security_configuration_matches=after.verify_jwt===false&&after.import_map===beforeProd.import_map;
   if(!report.deployed_bytes_identical||!report.production_unchanged||!report.security_configuration_matches||after.status!=='ACTIVE'||after.version!==4||after.ezbr_sha256!==report.release.ezbr_sha256)throw new Error('Deployed artifact/configuration comparison failed.');
   if(!equal(JSON.parse(fs.readFileSync(path.join(dir,'before-deployment.json'))),snap('after-deployment')))throw new Error('Deployment changed test data.');
   token='';delete headers.Authorization;report.deploy_passed=true;
  }else{
   if(!report.deploy_passed)throw new Error('Verified deployment required.');active();
   const keys=cli(['projects','api-keys',`--remote=${test}`,'--reveal']).keys;
   const secret=keys.filter(k=>k.type==='secret'&&k.name==='default');const pub=keys.find(k=>k.type==='publishable');
   if(secret.length!==1||!secret[0].api_key?.startsWith('sb_secret_'))throw new Error('Default secret unavailable.');
   const url=`https://${test}.supabase.co/functions/v1/import-goabase`;
   if(mode==='--auth'){
    if(report.auth_passed)throw new Error('Auth tests already done.');const before=snap('before-auth');once('auth');report.auth=[];
    for(const [name,key,expected]of [['no_key',undefined,401],['wrong_key','invalid-spots-test-key',401],['publishable',pub?.api_key,401],['default_secret',secret[0].api_key,405]]){
     if(name==='publishable'&&!key?.startsWith('sb_publishable_'))throw new Error('Publishable key missing.');
     const r=await fetch(url,{method:'GET',headers:key?{apikey:key}:{},redirect:'error',signal:AbortSignal.timeout(30000)});
     const body=await r.json();const row={case:name,status:r.status,expected};report.auth.push(row);save('result.json',report);
     if(r.status!==expected||(name==='default_secret'&&(body.error!=='POST erforderlich'||r.headers.get('allow')!=='POST')))throw new Error('Auth status/body mismatch.');
    }
    const after=snap('after-auth');if(!equal(before,after)||!idle(after))throw new Error('Auth requests changed data/lease.');report.auth_passed=true;
   }else{
    if(!report.auth_passed||report.post_attempts)throw new Error('POST not allowed.');
    const before=snap('before-post');if(!idle(before))throw new Error('Active lease.');identity();once('post');report.post_attempts=1;save('result.json',report);
    try{
     const r=await fetch(url,{method:'POST',headers:{apikey:secret[0].api_key,'Content-Type':'application/json'},body:'{}',redirect:'error',signal:AbortSignal.timeout(120000)});
     report.http_status=r.status;const body=await r.json();report.response={};
     for(const k of ['inserted','updated','unchanged','rejected_versions','cancelled','postponed','discovered','checked','removed','removed_unchanged','removed_unknown','quarantined','quarantined_unchanged','skipped_unconfirmed'])if(Number.isSafeInteger(body[k])&&body[k]>=0)report.response[k]=body[k];
     if(typeof body.error==='string'&&/^[a-z0-9_]{1,80}$/.test(body.error))report.response.error=body.error;
     if(typeof body.run_id==='string'&&/^[a-f0-9-]{36}$/.test(body.run_id))report.response.run_id=body.run_id;
     if(Array.isArray(body.unconfirmed)&&body.unconfirmed.every(e=>/^[1-9]\d*$/.test(e.source_event_id)&&['moved','missing','unrecognized'].includes(e.reason)&&/^\d{4}-\d\d-\d\dT[\d:.]+Z$/.test(e.source_modified_at)))report.response.unconfirmed=body.unconfirmed;
     save('result.json',report);if(r.status!==200||report.response.error)throw new Error('Import failed; no retry.');
    }finally{
     const after=snap('after-post');const missing=before.events.filter(o=>!after.events.some(e=>e.id===o.id&&e.source===o.source&&e.source_event_id===o.source_event_id&&e.created_at===o.created_at));
     const c=report.response??{};
     report.validation={events_before:before.events.length,events_after:after.events.length,original_uuids_preserved:missing.length===0,duplicates:after.duplicates,lease_free:idle(after),published:after.events.filter(e=>e.is_published).length,statuses:after.events.reduce((a,e)=>(a[e.status]=(a[e.status]??0)+1,a),{}),
      hidden_statuses_unpublished:after.events.every(e=>!['source_removed','source_unconfirmed','cancelled','postponed'].includes(e.status)||!e.is_published),
      removal_data_preserved:before.events.every(o=>{const e=after.events.find(e=>e.id===o.id);return !e||!['source_removed','source_unconfirmed'].includes(e.status)||Object.keys(o).every(k=>['status','is_published'].includes(k)||equal(o[k],e[k]));}),
      policies_unchanged:equal(before.policies,after.policies),versions:after.versions.length,removed_records:after.removed.length,unconfirmed_records:after.unconfirmed.length,
      count_matches:after.events.length===before.events.length+c.inserted};
     save('result.json',report);
    }
    const v=report.validation;if(report.http_status!==200||!v.original_uuids_preserved||v.duplicates||!v.lease_free||!v.hidden_statuses_unpublished||!v.removal_data_preserved||!v.policies_unchanged||!v.count_matches)throw new Error('Post-import integrity mismatch.');report.post_passed=true;
   }
  }
 }
 if(fileHash(path.join(root,'.env.local'))!==report.env_hash)throw new Error('App environment changed.');
 report.app_environment_unchanged=true;report.updated_at=new Date().toISOString();save('result.json',report);console.log(JSON.stringify({mode,directory:dir,...report}));
}
main().catch(error=>{if(report){report.error=error.message;save('result.json',report);}console.error(JSON.stringify({stopped:true,error:error.message,directory:dir}));process.exitCode=1;});
