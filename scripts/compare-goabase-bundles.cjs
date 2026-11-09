// Static local ESZIP 2.3 inspection only; never execute bundled code.
// Format reference: supabase/eszip, fix-pub-vis-0-80-1, src/v2.rs.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const equal=require('node:util').isDeepStrictEqual;
const zlib=require('node:zlib');
const root=path.resolve(__dirname,'..');
const pointer=JSON.parse(fs.readFileSync(path.join(root,'supabase/.temp/goabase-bundle-inspection.json'),'utf8').replace(/^\uFEFF/,''));
const dir=pointer.directory;
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
function parse(name){
 const b=fs.readFileSync(path.join(dir,name+'.body'));let p=8;
 if(b.subarray(0,8).toString()!=='ESZIP2.3')throw new Error('Unsupported ESZIP version.');
 const u32=()=>{if(p+4>b.length)throw new Error('Bounds');const n=b.readUInt32BE(p);p+=4;return n;};
 const take=n=>{if(n<0||p+n>b.length)throw new Error('Bounds');const v=b.subarray(p,p+n);p+=n;return v;};
 const opt=take(u32());let checksum=0,size=0;
 for(let i=0;i<opt.length;i+=2){if(opt[i]===0)checksum=opt[i+1];if(opt[i]===1)size=opt[i+1];}
 function check(v,d){if(size===0)return;if(checksum===1&&size===32){if(hash(v)!==d.toString('hex'))throw new Error('Checksum mismatch');}else throw new Error('Unknown checksum format: '+checksum+'/'+size);}
 check(opt,take(size));
 const section=()=>{const v=take(u32());check(v,take(size));return v;};
 const header=section(),npm=section();let h=0;const records=[];
 const hu32=()=>{if(h+4>header.length)throw new Error('Header bounds');const n=header.readUInt32BE(h);h+=4;return n;};
 const text=()=>{const n=hu32();if(h+n>header.length)throw new Error('Header bounds');const s=header.subarray(h,h+n).toString('utf8');h+=n;return s;};
 while(h<header.length){const specifier=text(),entry=header[h++];let r={specifier,entry};
  if(entry===0){r={...r,offset:hu32(),length:hu32(),mapOffset:hu32(),mapLength:hu32(),kind:header[h++]};}
  else if(entry===1)r.target=text();else if(entry===2)r.npmId=hu32();else throw new Error('Unknown header entry');records.push(r);
 }
 const sources=take(u32()),maps=take(u32()),tail=take(b.length-p);
 for(const r of records)if(r.entry===0){
  r.source=sources.subarray(r.offset,r.offset+r.length);r.map=maps.subarray(r.mapOffset,r.mapOffset+r.mapLength);
  if(r.source.length!==r.length||r.map.length!==r.mapLength)throw new Error('Source bounds');
  if(r.length)check(r.source,sources.subarray(r.offset+r.length,r.offset+r.length+size));
  if(r.mapLength)check(r.map,maps.subarray(r.mapOffset+r.mapLength,r.mapOffset+r.mapLength+size));
 }
 return {bytes:b.length,bodyHash:hash(b),checksum,size,options:opt.toString('hex'),header,npm,sources,maps,tail,records};
}
const a=parse('test'),b=parse('production');
function ezbr(name){
 const raw=fs.readFileSync(path.join(dir,name+'.body'));
 const metadata=pointer.functions.find(f=>f.name===name);
 const variants=[];for(const quality of [6,4,5,7,8,9,10,11]){
  const compressed=Buffer.concat([Buffer.from('EZBR'),zlib.brotliCompressSync(raw,{params:{[zlib.constants.BROTLI_PARAM_QUALITY]:quality}})]);
  variants.push({quality,sha256:hash(compressed),matches_management_metadata:hash(compressed)===metadata.ezbr_sha256,compressed_bytes:compressed.length});
  if(variants.at(-1).matches_management_metadata)break;
 }
 return {algorithm:'SHA-256(EZBR + Brotli(ESZIP))',backend_compression_parameters_not_exposed:true,matching_variant:variants.find(v=>v.matches_management_metadata)??null,variants};
}
function npmPackages(buffer){
 let p=0;const u32=()=>{if(p+4>buffer.length)throw new Error('npm bounds');const n=buffer.readUInt32BE(p);p+=4;return n;};
 const str=()=>{const n=u32();if(p+n>buffer.length)throw new Error('npm bounds');const s=buffer.subarray(p,p+n).toString();p+=n;return s;};
 const packages=[];while(p<buffer.length){const id=str(),count=u32(),dependencies=[];for(let i=0;i<count;i++)dependencies.push({name:str(),index:u32()});packages.push({id,dependencies});}
 return packages.map(v=>({id:v.id,dependencies:v.dependencies.map(d=>({name:d.name,id:packages[d.index]?.id})).sort((x,y)=>x.name.localeCompare(y.name))}));
}
const npmA=npmPackages(a.npm),npmB=npmPackages(b.npm);
const brief=r=>({specifier:r.specifier,entry:r.entry,kind:r.kind,target:r.target,npmId:r.npmId,source_bytes:r.source?.length,source_sha256:r.source&&hash(r.source),source_map_bytes:r.map?.length,source_map_sha256:r.map&&hash(r.map)});
const normalizeRecords=p=>p.records.map(brief).sort((x,y)=>x.specifier.localeCompare(y.specifier));
const aa=normalizeRecords(a),bb=normalizeRecords(b);
const diffs=[];
for(const key of new Set([...aa.map(x=>x.specifier),...bb.map(x=>x.specifier)])){
 const x=aa.find(v=>v.specifier===key),y=bb.find(v=>v.specifier===key);
 if(!equal(x,y)){
  const ar=a.records.find(v=>v.specifier===key),br=b.records.find(v=>v.specifier===key);
  const d={specifier:key,test:x,production:y};
  if(ar?.source&&br?.source){try{
   const aj=JSON.parse(ar.source),bj=JSON.parse(br.source);d.json_semantically_equal=equal(aj,bj);d.json_keys=Object.keys(aj);
   fs.writeFileSync(path.join(dir,'differing-json-test-'+diffs.length+'.json'),JSON.stringify(aj,null,2));
   fs.writeFileSync(path.join(dir,'differing-json-production-'+diffs.length+'.json'),JSON.stringify(bj,null,2));
  }catch{}}
  if(ar?.source&&br?.source){
   fs.writeFileSync(path.join(dir,'difference-'+diffs.length+'-test.bin'),ar.source);
   fs.writeFileSync(path.join(dir,'difference-'+diffs.length+'-production.bin'),br.source);
  }
  diffs.push(d);
 }
}
const result={format:'ESZIP2.3',test:{bytes:a.bytes,sha256:a.bodyHash,records:a.records.length,checksum:a.checksum,checksum_size:a.size},production:{bytes:b.bytes,sha256:b.bodyHash,records:b.records.length,checksum:b.checksum,checksum_size:b.size},
 hash_verification:{test:ezbr('test'),production:ezbr('production')},
 npm_packages_test:npmA,npm_packages_production:npmB,
 options_equal:equal(a.options,b.options),npm_snapshot_bytes_equal:a.npm.equals(b.npm),npm_snapshot_bytes:a.npm.length,tail_equal:a.tail.equals(b.tail),tail_bytes:a.tail.length,
 module_order_equal:equal(a.records.map(x=>x.specifier),b.records.map(x=>x.specifier)),record_differences:diffs};
fs.writeFileSync(path.join(dir,'comparison.json'),JSON.stringify(result,null,2));
fs.writeFileSync(path.join(dir,'test-module-manifest.json'),JSON.stringify(aa,null,2));
fs.writeFileSync(path.join(dir,'production-module-manifest.json'),JSON.stringify(bb,null,2));
console.log(JSON.stringify(result));
fs.writeFileSync(path.join(dir,'test-npm-snapshot.bin'),a.npm);
fs.writeFileSync(path.join(dir,'production-npm-snapshot.bin'),b.npm);
for(const [label,parsed]of [['test',a],['production',b]]){
 const packages=parsed.records.filter(r=>r.source&&r.kind===3).flatMap(r=>{try{const j=JSON.parse(r.source);return j.name&&j.version?[{specifier:r.specifier,name:j.name,version:j.version,dependencies:j.dependencies,peerDependencies:j.peerDependencies}]:[];}catch{return [];}});
 fs.writeFileSync(path.join(dir,label+'-package-jsons.json'),JSON.stringify(packages,null,2));
}
