/* global __dirname:readonly */
// Read-only production automation inventory. No keys, job commands or queue headers.
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),ref='yhnxdeypkbzyjappuzmv';
function cli(args){try{const r=JSON.parse(execFileSync(process.execPath,[path.join(root,'node_modules/supabase/dist/supabase.js'),...args,'--output-format','json'],{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:60000}));if(r.error)throw new Error();return r;}catch{throw new Error('Read-only CLI failed; protected output withheld.');}}
function identity(){const p=cli(['projects','list']).projects?.find(p=>p.id===ref);if(p?.name!=='Spots.')throw new Error('Production identity mismatch.');return{id:p.id,name:p.name};}
try{
 const target=identity();const fn=cli(['functions','list',`--remote=${ref}`]).functions.find(f=>f.slug==='import-goabase');
 const file=path.join(root,'supabase/.temp/automation-inventory-readonly.sql');
 fs.writeFileSync(file,`select jsonb_build_object(
 'extensions',(select jsonb_agg(jsonb_build_object('name',name,'available',default_version,'installed',installed_version) order by name) from pg_available_extensions where name in('pg_cron','pg_net','supabase_vault')),
 'cron_table',to_regclass('cron.job'),'http_responses',to_regclass('net._http_response'),'cron_timezone',current_setting('cron.timezone',true),
 'vault_names',(select coalesce(jsonb_agg(jsonb_build_object('name',name,'entries',entries) order by name),'[]'::jsonb) from(select name,count(*) entries from vault.secrets where name in('spots_project_url','spots_import_goabase_secret_key') group by name)v),
 'vault_access',(select jsonb_agg(jsonb_build_object('role',r,'metadata_read',has_table_privilege(r,'vault.secrets','SELECT'),'decrypted_read',has_table_privilege(r,'vault.decrypted_secrets','SELECT')) order by r) from unnest(array['anon','authenticated','service_role'])r),
 'events',(select count(*) from public.events),'published',(select count(*) from public.events where is_published),
 'duplicates',(select count(*) from(select source,source_event_id from public.events group by source,source_event_id having count(*)>1)d),
 'lease_free',(select token is null and expires_at='-infinity'::timestamptz from spots_sync_private.goabase_lease where singleton),
 'db_time',clock_timestamp(),'database',current_database(),'role',current_user) as snapshot;`);
 identity();const inventory=cli(['db','query',`--remote=${ref}`,'--read-only','--file',file]).rows?.[0]?.snapshot;
 if(!inventory)throw new Error('Inventory missing.');
 let jobs=[];
 if(inventory.cron_table){
  fs.writeFileSync(file,`select coalesce(jsonb_agg(jsonb_build_object('id',jobid,'name',jobname,'schedule',schedule,'active',active,'database',database,'owner',username,'candidate',command ilike '%import-goabase%' or jobname ilike '%goabase%','uses_vault',command ilike '%vault.decrypted_secrets%') order by jobid),'[]'::jsonb) as snapshot from cron.job;`);
  identity();jobs=cli(['db','query',`--remote=${ref}`,'--read-only','--file',file]).rows?.[0]?.snapshot;
 }
 const result={target,captured_at:new Date().toISOString(),function:{version:fn?.version,status:fn?.status,verify_jwt:fn?.verify_jwt,bundle:fn?.ezbr_sha256},inventory,jobs,remote_mutations:0};
 fs.writeFileSync(path.join(root,'supabase/.temp/goabase-automation-inventory.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}catch(error){console.error(error.message);process.exitCode=1;}
