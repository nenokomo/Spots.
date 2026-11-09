// Only public Goabase GETs. No Supabase calls, imports, headers or full bodies logged.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const file=path.join(root,'supabase/.temp/goabase-status-investigation.json');
function status(p){
 const present=Object.hasOwn(p,'nameStatus'),v=p.nameStatus;
 return {present,type:v===null?'null':typeof v,value:typeof v==='string'&&/^[A-Za-z _-]{0,64}$/.test(v)?v:null,
   supported:typeof v==='string'&&['scheduled','cancelled','postponed'].includes(v.trim().toLowerCase())};
}
async function get(url){
 const r=await fetch(url,{method:'GET',redirect:'manual',headers:{Accept:'application/json'},signal:AbortSignal.timeout(15000)});
 const text=await r.text();let data;try{data=JSON.parse(text);}catch{}
 return {r,data};
}
async function main(){
 if(fs.existsSync(file))throw new Error('Investigation already captured; no automatic repetition.');
 const run=JSON.parse(fs.readFileSync(path.join(root,'supabase/.temp/test-removals-run.json'),'utf8'));
 if(run.project_ref!=='nfomkdvotqtlyymomksb')throw new Error('Unexpected saved reference.');
 const before=JSON.parse(fs.readFileSync(path.join(run.directory,'before-post.json'),'utf8'));
 const spec=await get('https://www.goabase.net/api/schema/goabase.json');
 const list=await get('https://www.goabase.net/api/party/json/?country=DE&eventtype=club&limit=500&offset=0');
 if(spec.r.status!==200||list.r.status!==200||!Array.isArray(list.data?.partylist)||list.data.partylist.length>=500)throw new Error('Incomplete source evidence.');
 const report={captured_at:new Date().toISOString(),method:'GET',supabase_operations:0,
   specification:{version:spec.data.info.version,nameStatus:spec.data.components.schemas.EventBase.properties.nameStatus,
     required:spec.data.components.schemas.EventBase.required.includes('nameStatus')},
   feed:{status:200,count:list.data.partylist.length,entries:list.data.partylist.map(p=>({id:String(p.id),status:status(p)}))},details:[]};
 const ids=[...new Set([...before.events.map(e=>e.source_event_id),...list.data.partylist.map(p=>String(p.id))])];
 const queue=[...ids];
 await Promise.all(Array.from({length:3},async()=>{while(queue.length){
  const id=queue.shift();if(!/^[1-9]\d*$/.test(id))throw new Error('Unexpected source ID.');
  const {r,data}=await get('https://www.goabase.net/api/party/json/'+id);
  const row={id,http_status:r.status,json_valid:!!data};
  if(data?.party){row.response_id=String(data.party.id);row.status=status(data.party);
   row.title=typeof data.party.nameParty==='string'?data.party.nameParty.slice(0,160):null;}
  if(r.status>=300&&r.status<400){const target=new URL(r.headers.get('location')??'',r.url);
   row.confirmed_deleted=target.origin==='https://www.goabase.net'&&target.pathname==='/party/deleted/'+id&&!target.search&&!target.hash;}
  report.details.push(row);
 }}));
 report.details.sort((a,b)=>a.id.localeCompare(b.id));
 report.anomalies=report.details.filter(d=>d.status&&!d.status.supported).map(d=>({...d,list_entry:report.feed.entries.find(e=>e.id===d.id)??null}));
 fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({captured_at:report.captured_at,specification:report.specification,feed_count:report.feed.count,
   details_checked:report.details.length,anomalies:report.anomalies,other_http_errors:report.details.filter(d=>d.http_status!==200)}));
}
main().catch(()=>{console.error('Read-only status investigation failed; raw response withheld.');process.exitCode=1;});
