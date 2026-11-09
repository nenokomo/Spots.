// Read-only by construction: fixed targets, no link/deploy/secrets/write subcommands.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const root=path.resolve(__dirname,'..');
const prod='yhnxdeypkbzyjappuzmv';
const test='nfomkdvotqtlyymomksb';
function cli(args){
  try{return JSON.parse(execFileSync(process.execPath,
    [path.join(root,'node_modules/supabase/dist/supabase.js'),...args,'--output-format','json'],
    {cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:45000}));}
  catch{throw new Error('Read-only inspection failed; raw output withheld.');}
}
function readFileQuery(ref,filename){
  if(![prod,test].includes(ref))throw new Error('Unexpected target.');
  return cli(['db','query','--file',filename,`--remote=${ref}`,'--read-only']).rows;
}
function save(dir,name,value){fs.writeFileSync(path.join(dir,name),JSON.stringify(value,null,2)+'\n',{flag:'wx'});}
async function main(){
  if(!process.argv.includes('--confirmed-production-readonly'))throw new Error('Read-only authorization required.');
  const linked=fs.readFileSync(path.join(root,'supabase/.temp/project-ref'),'utf8').trim();
  if(linked!==test)throw new Error('Local link changed unexpectedly.');
  const envFile=path.join(root,'.env.local');
  const envHash=crypto.createHash('sha256').update(fs.readFileSync(envFile)).digest('hex');
  const projects=cli(['projects','list']).projects;
  if(projects.find(p=>p.id===prod)?.name!=='Spots.'||projects.find(p=>p.id===test)?.name!=='spots. testproject')
    throw new Error('Production/test identity mismatch.');
  const timestamp=new Date().toISOString().replace(/[:.]/g,'-');
  const dir=path.join(root,'supabase/backups',`production-preflight-${timestamp}`);
  fs.mkdirSync(dir,{recursive:true});
  const report={started_at:new Date().toISOString(),backup_directory:dir,targets:{},comparisons:{}};
  for(const [name,ref] of [['production',prod],['test',test]]){
    const structure=readFileQuery(ref,'supabase/ops/04_inspect_test_schema.sql')[0]?.inspection;
    const inventory=readFileQuery(ref,'supabase/ops/07_inspect_goabase_readonly.sql')[0]?.inventory;
    if(!structure||!inventory)throw new Error('Missing inspection result.');
    const functions=cli(['functions','list',`--remote=${ref}`]).functions;
    const target={ref,name:projects.find(p=>p.id===ref).name,structure,inventory,functions};
    if(inventory.cron_relation){
      const jobFile=path.join(dir,`${name}-cron-inspection.sql`);
      fs.writeFileSync(jobFile,`select jobid,jobname,schedule,active,database,username,
        (command ilike '%import-goabase%' or jobname ilike '%goabase%') as goabase_candidate,
        (command ilike '%vault.decrypted_secrets%') as uses_vault from cron.job order by jobid;\n`);
      target.jobs=readFileQuery(ref,jobFile);
    }else target.jobs=[];
    if(inventory.vault_relation){
      const vaultFile=path.join(dir,`${name}-vault-metadata.sql`);
      fs.writeFileSync(vaultFile,`select name,count(*) as entries from vault.secrets
        where name in ('spots_project_url','spots_import_goabase_secret_key') group by name;\n`);
      target.vault_names=readFileQuery(ref,vaultFile);
    }
    save(dir,`${name}-snapshot.json`,target);
    report.targets[name]=target;
    console.log(JSON.stringify({target:name,ref,events:inventory.events.length,columns:structure.columns.length,
      policies:structure.policies,indexes:structure.indexes,constraints:structure.constraints,
      actual_table_rights:inventory.actual_table_rights,table_inventory:inventory.table_inventory,
      function_metadata:functions,importer_rpcs:structure.importer_rpcs,extensions:inventory.extensions,
      cron_jobs:target.jobs,vault_names:target.vault_names}));
  }
  for(const field of ['columns','constraints','indexes','policies','rls']){
    report.comparisons[field]={production:report.targets.production.structure[field],test:report.targets.test.structure[field]};
  }
  const verify=readFileQuery(prod,'supabase/ops/07_inspect_goabase_readonly.sql')[0]?.inventory;
  report.production_events_unchanged_during_inspection=JSON.stringify(verify.events)===JSON.stringify(report.targets.production.inventory.events);
  report.local_link_unchanged=fs.readFileSync(path.join(root,'supabase/.temp/project-ref'),'utf8').trim()===test;
  report.app_environment_unchanged=crypto.createHash('sha256').update(fs.readFileSync(envFile)).digest('hex')===envHash;
  report.finished_at=new Date().toISOString();
  save(dir,'inspection-report.json',report);
  const manifest=Object.fromEntries(fs.readdirSync(dir).map(name=>[name,
    crypto.createHash('sha256').update(fs.readFileSync(path.join(dir,name))).digest('hex')]));
  save(dir,'sha256-manifest.json',manifest);
  fs.writeFileSync(path.join(root,'supabase/.temp/production-preflight-latest.json'),JSON.stringify({directory:dir,
    production_ref:prod,report_file:path.join(dir,'inspection-report.json')},null,2)+'\n');
  console.log(JSON.stringify({backup_directory:dir,production_events_unchanged:report.production_events_unchanged_during_inspection,
    local_link_unchanged:report.local_link_unchanged,app_environment_unchanged:report.app_environment_unchanged}));
  if(!report.production_events_unchanged_during_inspection||!report.local_link_unchanged||!report.app_environment_unchanged)
    throw new Error('State changed during read-only inspection.');
}
main().catch(()=>{console.log('Read-only preflight stopped; no writes or deployments performed.');process.exitCode=1;});
