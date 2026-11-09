// Offline release packaging. Uses an immutable, fully resolved production ESZIP.
// No npm/JSR resolution, compilation, credentials or deployment in this command.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),zlib=require('node:zlib');
const root=path.resolve(__dirname,'..');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const expected='e160bae41b3fb10e614339720ce2606b67e8d8d9f078ee0a9102d6f153396743';
const pointer=process.argv[2]?null:JSON.parse(fs.readFileSync(path.join(root,'supabase/.temp/goabase-bundle-inspection.json'),'utf8').replace(/^\uFEFF/,''));
const artifact=process.argv[2]?path.resolve(process.argv[2]):path.join(pointer.directory,'production.body'),body=fs.readFileSync(artifact);
if(sha(body)!==expected||body.subarray(0,8).toString()!=='ESZIP2.3')throw new Error('Production artifact differs from frozen release.');
const file=path.join(root,'supabase/functions/import-goabase/production-v3.release.json');
let manifest;
if(fs.existsSync(file)){
 manifest=JSON.parse(fs.readFileSync(file));
 if(manifest.eszip_sha256!==expected||manifest.build.node!==process.version||manifest.build.brotli!==process.versions.brotli)throw new Error('Release/toolchain differs from frozen manifest.');
}else{
 const reference=path.join(root,'supabase/backups/bundle-inspection-2026-11-08T18-11-14-982Z');
 if(sha(fs.readFileSync(path.join(reference,'production.body')))!==expected)throw new Error('Original reference changed.');
 const comparison=JSON.parse(fs.readFileSync(path.join(reference,'comparison.json')));
 const modules=JSON.parse(fs.readFileSync(path.join(reference,'production-module-manifest.json')));
 manifest={release:'Spots production import-goabase v3',production_ref:'yhnxdeypkbzyjappuzmv',format:'ESZIP2.3',eszip_sha256:expected,
 auth:'secret',key_name:'default',verify_jwt:false,
 deno_configuration:{embedded_module:'static:import-goabase/deno.json',sha256:'fc9fc38c21441b7f67a91280ed28b8ca4ad67fc69d713db441f5c0fd9a6abf9f',content:{compilerOptions:{strict:true}}},
 packages:comparison.npm_packages_production,modules,
 build:{method:'Offline packaging of frozen, fully resolved ESZIP; no source rebuild or package resolution',node:process.version,brotli:process.versions.brotli,quality:6,
  source_rebuild_allowed:false,note:'The historical deno.lock does not describe this remote artifact. Do not use source/API deploy to reproduce this release.'}};
 fs.writeFileSync(file,JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});
}
const pack=()=>Buffer.concat([Buffer.from('EZBR'),zlib.brotliCompressSync(body,{params:{[zlib.constants.BROTLI_PARAM_QUALITY]:6}})]);
const packed=pack();if(!packed.equals(pack())||!zlib.brotliDecompressSync(packed.subarray(4)).equals(body))throw new Error('Packaging reproducibility/roundtrip failed.');
const out=process.argv[3]?path.resolve(process.argv[3]):path.join(path.dirname(artifact),'production-v3.ezbr');
if(fs.existsSync(out)){if(!fs.readFileSync(out).equals(packed))throw new Error('Existing release payload differs.');}else fs.writeFileSync(out,packed,{flag:'wx'});
const result={artifact,output:out,eszip_sha256:expected,ezbr_sha256:sha(packed),packages:manifest.packages.length,modules:manifest.modules.length,reproducible:true,network_requests:0};
fs.writeFileSync(path.join(root,'supabase/.temp/goabase-frozen-release.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));
