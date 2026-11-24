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
const {accountConfigurationError,accountMode,accountProject}=load('src/features/accounts/configuration.ts');
test('account configuration rejects lookalike domains, missing configuration and secret-shaped keys',()=>{
 for(const url of [undefined,'https://example.supabase.co','https://nfomkdvotqtlyymomksb.supabase.co.evil.example','http://nfomkdvotqtlyymomksb.supabase.co','https://yhnxdeypkbzyjappuzmv.supabase.co.evil.example'])assert(accountConfigurationError(url,'sb_publishable_fixture'));
 assert(accountConfigurationError('https://nfomkdvotqtlyymomksb.supabase.co','service-role-placeholder'));
 assert(accountConfigurationError('https://yhnxdeypkbzyjappuzmv.supabase.co','sb_secret_placeholder'));
 assert.equal(accountConfigurationError('https://nfomkdvotqtlyymomksb.supabase.co','sb_publishable_fixture'),null);
});
test('Spots-Test has full accounts; released production only the team login, development production everything; sessions are kept per project',()=>{
 assert.equal(accountMode('https://nfomkdvotqtlyymomksb.supabase.co'),'full');
 assert.equal(accountMode('https://yhnxdeypkbzyjappuzmv.supabase.co'),'team');
 assert.equal(accountMode('https://example.supabase.co'),null);
 assert.equal(accountMode('https://yhnxdeypkbzyjappuzmv.supabase.co',false),'team');
 assert.equal(accountMode('https://yhnxdeypkbzyjappuzmv.supabase.co',true),'full');
 assert.equal(accountMode('https://nfomkdvotqtlyymomksb.supabase.co',false),'full');
 assert.equal(accountMode('https://example.supabase.co',true),null);
 // Die App darf den Entwicklungsmodus nur aus __DEV__ ableiten, nie fest einschalten.
 assert.match(fs.readFileSync(path.join(__dirname,'..','src/features/accounts/client.ts'),'utf8'),/accountMode\(url, __DEV__\)/);
 assert.equal(accountConfigurationError('https://yhnxdeypkbzyjappuzmv.supabase.co','sb_publishable_fixture'),null);
 assert.equal(accountProject(' https://yhnxdeypkbzyjappuzmv.supabase.co '),'yhnxdeypkbzyjappuzmv');
 assert.notEqual(accountProject('https://yhnxdeypkbzyjappuzmv.supabase.co'),accountProject('https://nfomkdvotqtlyymomksb.supabase.co'));
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
test('password reset never reveals accounts, new passwords need eight characters, deleting removes the account then the local session',async()=>{
 const calls=[];
 const record=(name,result={error:null})=>async(...args)=>{calls.push({name,args});return result;};
 const auth={resetPasswordForEmail:record('reset'),updateUser:record('update',{data:{},error:null}),signOut:record('signOut')};
 const actions=createAccountActions({auth,rpc:record('rpc')});
 await actions.requestPasswordReset(' user@example.invalid ','meine-app://account?reset=1');
 const plain=v=>JSON.parse(JSON.stringify(v));
 assert.deepEqual(plain(calls[0].args),['user@example.invalid',{redirectTo:'meine-app://account?reset=1'}]);
 await assert.rejects(actions.requestPasswordReset('kein-mail','meine-app://account'),/gültige E-Mail/);
 await assert.rejects(actions.updatePassword('short'),/acht Zeichen/);
 await actions.updatePassword('eightchars');
 assert.deepEqual(plain(calls[1].args),[{password:'eightchars'}]);
 await actions.deleteAccount();
 assert.deepEqual(calls.slice(2).map(c=>c.name),['rpc','signOut']);
 assert.equal(calls[2].args[0],'spots_delete_my_account');
 assert.deepEqual(plain(calls[3].args),[{scope:'local'}]);
 assert.equal(calls.length,4,'invalid input made no SDK calls');
 // Fehler: Rate-Limit verständlich, sonst neutral; misslungenes Löschen meldet nichts als erledigt und meldet nicht ab.
 const limited=createAccountActions({auth:{resetPasswordForEmail:async()=>({error:{status:429,message:'secret upstream'}})}});
 await assert.rejects(limited.requestPasswordReset('user@example.invalid','x'),error=>/Zu viele/.test(error.message)&&!error.message.includes('secret'));
 let signedOut=false;
 const failing=createAccountActions({auth:{signOut:async()=>{signedOut=true;return {error:null};}},rpc:async()=>({error:{message:'secret'}})});
 await assert.rejects(failing.deleteAccount(),/nicht gelöscht/);
 assert.equal(signedOut,false);
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
