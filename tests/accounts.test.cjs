const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),test=require('node:test'),vm=require('node:vm'),ts=require('typescript');
const {createClient}=require('@supabase/supabase-js');
function load(file,dependencies={}){
 const module={exports:{}};
 const source=fs.readFileSync(path.join(__dirname,'..',file),'utf8');
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,
  {module,exports:module.exports,URL,require:id=>{if(id in dependencies)return dependencies[id];throw Error('Unexpected runtime dependency '+id);}});
 return module.exports;
}
const {createAccountActions}=load('src/features/accounts/auth.ts');
const {accountConfigurationError}=load('src/features/accounts/configuration.ts');
test('account configuration rejects production, lookalike domains, missing configuration and secret-shaped keys',()=>{
 for(const url of [undefined,'https://yhnxdeypkbzyjappuzmv.supabase.co','https://nfomkdvotqtlyymomksb.supabase.co.evil.example','http://nfomkdvotqtlyymomksb.supabase.co'])assert(accountConfigurationError(url,'sb_publishable_fixture'));
 assert(accountConfigurationError('https://nfomkdvotqtlyymomksb.supabase.co','service-role-placeholder'));
 assert.equal(accountConfigurationError('https://nfomkdvotqtlyymomksb.supabase.co','sb_publishable_fixture'),null);
});
test('one Auth SDK handles signup, email-confirmation state, password login, PKCE and local logout without organizer metadata',async()=>{
 const calls=[];
 const auth={};for(const name of ['signUp','signInWithPassword','exchangeCodeForSession','signOut'])auth[name]=async arg=>{calls.push({name,arg});return {data:{session:null},error:null};};
 const actions=createAccountActions({auth});
 assert.equal((await actions.register(' user@example.invalid ','eightchars','meine-app://account')).requiresEmailConfirmation,true);
 await actions.signIn('user@example.invalid','eightchars');await actions.confirm('controlled-code');await actions.signOut();
 assert.equal(calls.map(c=>c.name).join(','),'signUp,signInWithPassword,exchangeCodeForSession,signOut');
 assert.equal(calls[0].arg.email,'user@example.invalid');
 assert.equal(calls[0].arg.options.emailRedirectTo,'meine-app://account');
 assert.equal('data' in calls[0].arg.options,false);
 assert.equal(calls[3].arg.scope,'local');
 auth.signUp=async()=>({data:{session:{user:{id:'confirmed-user'}}},error:null});
 assert.equal((await actions.register('user@example.invalid','eightchars','meine-app://account')).requiresEmailConfirmation,false);
});
test('invalid credentials stop before SDK calls; upstream errors are not exposed with tokens or account details',async()=>{
 let calls=0;
 const fail=async()=>{calls++;return {error:{message:'sensitive upstream details'},data:{session:null}};};
 const actions=createAccountActions({auth:{signUp:fail,signInWithPassword:fail,signOut:fail,exchangeCodeForSession:fail}});
 await assert.rejects(actions.register('invalid','eightchars','meine-app://account'),/gültige E-Mail/);
 await assert.rejects(actions.signIn('user@example.invalid','short'),/acht Zeichen/);assert.equal(calls,0);
 await assert.rejects(actions.signIn('user@example.invalid','eightchars'),error=>!error.message.includes('sensitive'));
 await assert.rejects(actions.register('user@example.invalid','eightchars','meine-app://account'),/Registrierung nicht möglich/);
 await assert.rejects(actions.confirm('bad-code'),/ungültig/);await assert.rejects(actions.signOut(),/Abmeldung fehlgeschlagen/);
});
test('public organizer reader projects no private identity and explicitly filters published Spots-owned data',async()=>{
 const calls=[];
 const fixture={id:'public-organizer',slug:'public-slug',display_name:'Public name',biography:null,city:'Berlin',
  avatar_url:'javascript:alert(1)',website_url:'https://example.org',is_published:true,created_at:'2030-01-01',updated_at:'2030-01-01',email:'private@example.invalid',user_id:'private-user'};
 const client=createClient('https://example.supabase.co','sb_publishable_fixture',{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:async url=>{
  const parsed=new URL(url);calls.push(parsed);
  if(parsed.pathname.endsWith('/organizers'))return Response.json(fixture);
  return Response.json([]);
 }}});
 const {createPublicOrganizerReader}=load('src/services/organizers.ts',{'../lib/supabase':{getSupabase:()=>client}});
 const reader=createPublicOrganizerReader(client),profile=await reader.profile({slug:'public-slug'});
 assert.equal(profile.displayName,'Public name');assert.equal(profile.avatarUrl,null);assert.equal(profile.websiteUrl,'https://example.org/');
 assert.equal('userId' in profile,false);assert.equal('email' in profile,false);
 await reader.events('public-organizer');await reader.posts('public-organizer');
 assert.equal(calls.length,3);
 assert.equal(calls[0].searchParams.get('is_published'),'eq.true');
 assert.equal(calls[1].searchParams.get('source'),'eq.spots');
 assert.equal(calls[1].searchParams.get('organizer_id'),'eq.public-organizer');
 assert.equal(calls[1].searchParams.get('organizers.is_published'),'eq.true');
 assert.equal(calls[2].searchParams.get('organizers.is_published'),'eq.true');
 assert(calls.every(url=>!/(user_profiles|memberships|auth)/.test(url.pathname)));
});
