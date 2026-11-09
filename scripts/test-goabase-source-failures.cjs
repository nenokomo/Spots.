// Controlled upstream failures: actual handler/source code locally, real test DB lease RPCs.
// No extra requests to the deployed import endpoint; event-write RPC is blocked defensively.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { createClient } = require('@supabase/supabase-js');
const s = require('./goabase-integration-support.cjs');
const report = { project_ref: s.ref, started_at: new Date().toISOString(), cases: [],
  handler_local: true, upstream_mocked: true, database_real: true };
function load(name, extras) {
  const module = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(s.root,
    'supabase/functions/import-goabase',name),'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { module,exports:module.exports,URL,URLSearchParams,Request,Response,AbortController,
    setTimeout,clearTimeout,console:{info(){},error(){}}, ...extras });
  return module.exports;
}
async function main() {
  if (!process.argv.includes('--confirmed-integration-tests')) throw new Error('Explicit authorization required.');
  report.function_version=s.verifyTarget();
  report.before=s.snapshot();
  if (!s.idle(report.before)) throw new Error('Test project is not idle.');
  const beforeHash=s.appHash();
  s.persist('goabase-source-failures-attempt.json',{started_at:report.started_at,project_ref:s.ref},true);
  let key=s.secret();
  let client=createClient(`https://${s.ref}.supabase.co`,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  key=undefined;
  const failures=[
    ['http_503',502,'source_http_503',async()=>new Response('',{status:503})],
    ['http_429',502,'source_http_429',async()=>new Response('',{status:429})],
    ['network_failure',502,'source_network_or_json_error',async()=>{throw new Error('Isolated upstream fixture');}],
    ['malformed_json',502,'source_network_or_json_error',async()=>new Response('{')],
    ['invalid_list',502,'invalid_source_page',async()=>Response.json({other:[]})],
    ['later_page_503',502,'source_http_503',async url=>url.searchParams.get('offset')==='0'
      ?Response.json({partylist:Array.from({length:500},(_,i)=>({id:String(800000+i)}))})
      :new Response('',{status:503})],
    ['missing_detail_404',502,'source_http_404',async url=>url.pathname.endsWith('/')
      ?Response.json({partylist:[]}):new Response('',{status:404})],
    ['upstream_timeout',504,'source_timeout',()=>new Promise(()=>{})],
  ];
  try {
    for(const [name,status,error,fetcher] of failures) {
      const before=s.snapshot();
      const calls=[];
      const errors=[];
      const admin={rpc:async(name,args)=>{
        calls.push(name);
        if(!['spots_goabase_begin','spots_goabase_release'].includes(name)) {
          throw new Error('Unexpected event-write RPC blocked in failure test');
        }
        const result=await client.rpc(name,args);
        if(result.error) errors.push({rpc:name,code:result.error.code});
        return result;
      }};
      const source=load('sync.ts',{fetch:async(url,init)=>{
        if(url.origin!=='https://www.goabase.net') throw new Error('Unexpected fixture host');
        return fetcher(url,init);
      }});
      const handler=load('index.ts',{require:id=>{
        if(id==='./sync.ts')return source;
        if(id!=='npm:@supabase/server@1')throw new Error('Unexpected module');
        return {withSupabase:(config,fn)=>{
          if(config.auth!=='secret')throw new Error('Auth mode changed');
          return req=>fn(req,{supabaseAdmin:admin});
        }};
      }}).default.fetch;
      const response=await handler(new Request('https://fixture.invalid/import-goabase',{method:'POST'}));
      const body=await response.json();
      const after=s.snapshot();
      const unchanged=JSON.stringify(before)===JSON.stringify(after);
      const result={name,status:response.status,error:body.error,expected_status:status,
        database_unchanged:unchanged,active_leases:after.active_leases,rpcs:calls,rpc_errors:errors,
        passed:response.status===status&&body.error===error&&unchanged&&s.idle(after)&&errors.length===0&&
          JSON.stringify(calls)==='["spots_goabase_begin","spots_goabase_release"]'};
      report.cases.push(result);
      console.log(JSON.stringify(result));
      if(!result.passed)throw new Error('Source failure integration mismatch');
    }
  } finally {
    client=undefined;
    report.after=s.snapshot();
    report.database_unchanged=JSON.stringify(report.before)===JSON.stringify(report.after);
    report.app_environment_unchanged=beforeHash===s.appHash();
  }
  report.passed=report.cases.length===8&&report.database_unchanged&&report.app_environment_unchanged;
  if(!report.passed)throw new Error('Final source failure verification failed');
}
main().catch(()=>{
  report.passed=false;report.error='Source failure test stopped; no retries or event cleanup.';
  process.exitCode=1;console.log(report.error);
}).finally(()=>{
  report.finished_at=new Date().toISOString();s.persist('goabase-source-failures-results.json',report);
});
