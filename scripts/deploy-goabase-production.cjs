// Deploy exactly one reviewed function to the explicit production project. No invocation.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const prod = 'yhnxdeypkbzyjappuzmv', test = 'nfomkdvotqtlyymomksb';
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const normalized = file => fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n').trim();
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
let dir, report;
function cli(args) {
  try {
    const result = JSON.parse(execFileSync(process.execPath,
      [path.join(root, 'node_modules/supabase/dist/supabase.js'), ...args, '--output-format', 'json'],
      { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 120000 }));
    if (result.error) throw new Error('CLI reported failure.');
    return result;
  } catch { throw new Error('CLI operation failed; raw output withheld, no automatic retry.'); }
}
function save(name, data) { fs.writeFileSync(path.join(dir, name), JSON.stringify(data, null, 2) + '\n'); }
function project() {
  const p = cli(['projects', 'list']).projects?.find(p => p.id === prod);
  if (p?.name !== 'Spots.' || p.id === test) throw new Error('Wrong production identity.');
  return { id: p.id, name: p.name };
}
function functions(ref) { return cli(['functions', 'list', `--remote=${ref}`]).functions; }
function download(ref, folder) {
  fs.mkdirSync(folder, { recursive: true });
  cli(['functions', 'download', 'import-goabase', `--remote=${ref}`, '--use-api', '--workdir', folder]);
  return path.join(folder, 'supabase/functions/import-goabase');
}
function snapshot(name) {
  const sql = path.join(dir, `${name}.sql`);
  fs.writeFileSync(sql, `select jsonb_build_object(
    'events',(select jsonb_agg(to_jsonb(e) order by id) from public.events e),
    'lease',(select jsonb_agg(to_jsonb(l) order by singleton) from spots_sync_private.goabase_lease l),
    'versions',(select count(*) from spots_sync_private.goabase_versions)) as snapshot;`);
  const data = cli(['db', 'query', `--remote=${prod}`, '--read-only', '--file', sql]).rows?.[0]?.snapshot;
  if (!data) throw new Error('Missing database snapshot.');
  save(`${name}.json`, data);
  return data;
}
function main() {
  if (!process.argv.includes('--approved-production-function-only')) throw new Error('Explicit deployment authorization required.');
  const marker = path.join(root, 'supabase/.temp/production-goabase-deploy-attempt.json');
  if (fs.existsSync(marker)) throw new Error('Deployment attempt already recorded; inspect, do not retry.');
  if (fs.readFileSync(path.join(root, 'supabase/.temp/project-ref'), 'utf8').trim() !== test) throw new Error('Unexpected local link.');
  const envHash = hash(path.join(root, '.env.local'));
  project();
  dir = path.join(root, 'supabase/backups', `production-function-deploy-${new Date().toISOString().replace(/[:.]/g, '-')}`);
  fs.mkdirSync(dir);
  report = { production_ref: prod, started_at: new Date().toISOString(), deploy_attempts: 0, outcome: 'preparing' };
  const beforeFunctions = functions(prod), testFunctions = functions(test);
  save('production-functions-before.json', beforeFunctions);
  save('test-functions-before.json', testFunctions);
  const tested = testFunctions.find(f => f.slug === 'import-goabase');
  if (tested?.version !== 1 || tested.status !== 'ACTIVE' || tested.verify_jwt !== false ||
      tested.ezbr_sha256 !== 'f30f017ec6ce42eba8419bd1a8e2c5122b76fb357f27aba5f9c25e3e11a0497c')
    throw new Error('Test deployment no longer matches integration-tested version.');
  const testedSource = download(test, path.join(dir, 'test-reference'));
  const local = path.join(root, 'supabase/functions/import-goabase');
  const files = ['index.ts', 'sync.ts'];
  report.source_hashes = Object.fromEntries(files.map(file => {
    if (normalized(path.join(local, file)) !== normalized(path.join(testedSource, file)))
      throw new Error(`Local ${file} differs from tested deployed source; stopped before deployment.`);
    return [file, hash(path.join(local, file))];
  }));
  const handler = normalized(path.join(local, 'index.ts'));
  if (!handler.includes('withSupabase({ auth: "secret" }') || !handler.includes('req.method !== "POST"'))
    throw new Error('Expected authentication/method guard missing.');
  const config = fs.readFileSync(path.join(root, 'supabase/config.toml'), 'utf8');
  if (!/\[functions\.import-goabase\]\s*verify_jwt\s*=\s*false\s*entrypoint\s*=\s*"\.\/functions\/import-goabase\/index\.ts"/.test(config))
    throw new Error('Unexpected function configuration.');
  const old = download(prod, path.join(dir, 'production-rollback-source'));
  report.previous_source_sha256 = hash(path.join(old, 'index.ts'));
  const before = snapshot('database-before');
  if (before.events.length !== 31 || Number(before.versions) !== 0 || before.lease?.length !== 1 || before.lease[0].token !== null)
    throw new Error('Unexpected current database/lease state; no deployment.');
  report.project_verified_immediately_before_deploy = project();
  for (const file of files) if (hash(path.join(local, file)) !== report.source_hashes[file]) throw new Error('Candidate changed.');
  fs.writeFileSync(marker, JSON.stringify({ project_ref: prod, directory: dir, attempted_at: new Date().toISOString() }), { flag: 'wx' });
  report.deploy_attempts = 1;
  save('result.json', report);
  console.log(JSON.stringify({ target: prod, name: 'Spots.', function: 'import-goabase', tested_source_matches: true, auth: 'secret', verify_jwt: false }));
  const deployed = cli(['functions', 'deploy', 'import-goabase', `--remote=${prod}`, '--use-api', '--no-verify-jwt', '--yes']);
  save('deployment-response.json', deployed);
  const afterFunctions = functions(prod), afterTestFunctions = functions(test);
  save('production-functions-after.json', afterFunctions);
  const active = afterFunctions.find(f => f.slug === 'import-goabase');
  const previous = beforeFunctions.find(f => f.slug === 'import-goabase');
  report.deployed_function = active;
  report.deployed_bundle_matches_tested = active?.ezbr_sha256 === tested.ezbr_sha256;
  report.active_and_jwt_disabled = active?.status === 'ACTIVE' && active.verify_jwt === false && active.id === previous.id && active.version > previous.version;
  report.other_production_functions_unchanged = same(beforeFunctions.filter(f => f.slug !== 'import-goabase'), afterFunctions.filter(f => f.slug !== 'import-goabase'));
  report.test_functions_unchanged = same(testFunctions, afterTestFunctions);
  const deployedSource = download(prod, path.join(dir, 'production-deployed-source'));
  report.deployed_source_matches_tested = files.every(file => normalized(path.join(deployedSource, file)) === normalized(path.join(testedSource, file)));
  const after = snapshot('database-after');
  report.database_events_lease_versions_unchanged = same(before, after);
  report.events_before = before.events.length;
  report.events_after = after.events.length;
  report.app_environment_unchanged = hash(path.join(root, '.env.local')) === envHash;
  report.local_test_link_unchanged = fs.readFileSync(path.join(root, 'supabase/.temp/project-ref'), 'utf8').trim() === test;
  if (![report.active_and_jwt_disabled, report.deployed_bundle_matches_tested, report.other_production_functions_unchanged, report.test_functions_unchanged,
    report.deployed_source_matches_tested, report.database_events_lease_versions_unchanged,
    report.app_environment_unchanged, report.local_test_link_unchanged].every(Boolean)) throw new Error('Post-deployment verification failed; stop without retry or invocation.');
  report.outcome = 'verified';
  report.completed_at = new Date().toISOString();
  save('result.json', report);
  console.log(JSON.stringify({ ...report, directory: dir }));
}
try { main(); } catch (error) {
  if (report) { report.outcome = 'stopped'; report.error = error.message; save('result.json', report); }
  console.error(JSON.stringify({ stopped: true, message: error.message, directory: dir }));
  process.exitCode = 1;
}
