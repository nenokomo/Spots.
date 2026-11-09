// Backup only: never link, deploy, invoke functions, or execute remote SQL writes.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const production = 'yhnxdeypkbzyjappuzmv';
const test = 'nfomkdvotqtlyymomksb';
function cli(args, timeout = 120000) {
  try {
    return execFileSync(process.execPath,
      [path.join(root, 'node_modules/supabase/dist/supabase.js'), ...args],
      { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout });
  } catch (error) {
    // CLI diagnostics can contain credentials. Never forward raw output.
    let code;
    try { code = JSON.parse(String(error.stdout)).error?.code; } catch {}
    throw new Error(`Backup command failed (exit ${error.status ?? 'unknown'}, code ${code ?? 'unavailable'}); raw diagnostics withheld.`);
  }
}
function hash(file) { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); }
function main() {
  const mode = process.argv[2];
  if (!['--download-function', '--dump'].includes(mode)) throw new Error('Explicit backup action required.');
  if (fs.readFileSync(path.join(root, 'supabase/.temp/project-ref'), 'utf8').trim() !== test)
    throw new Error('Unexpected local project link.');
  const envHash = hash(path.join(root, '.env.local'));
  const projects = JSON.parse(cli(['projects', 'list', '--output-format', 'json'])).projects;
  if (projects.find(p => p.id === production)?.name !== 'Spots.') throw new Error('Production identity mismatch.');
  const pointer = path.join(root, 'supabase/.temp/production-backup-latest.json');
  let dir;
  if (mode === '--download-function') {
    dir = path.join(root, 'supabase/backups', `production-backup-${new Date().toISOString().replace(/[:.]/g, '-')}`);
    fs.mkdirSync(path.join(dir, 'deployed-function'), { recursive: true });
    fs.writeFileSync(pointer, JSON.stringify({ directory: dir, production_ref: production }, null, 2) + '\n');
    const metadata = JSON.parse(cli(['functions', 'list', `--remote=${production}`, '--output-format', 'json'])).functions
      .filter(f => f.slug === 'import-goabase' || f.name === 'import-goabase');
    if (metadata.length !== 1) throw new Error('Expected exactly one deployed import-goabase function.');
    fs.writeFileSync(path.join(dir, 'edge-function-metadata.json'), JSON.stringify(metadata, null, 2) + '\n');
    cli(['functions', 'download', 'import-goabase', `--remote=${production}`, '--use-api',
      '--workdir', path.join(dir, 'deployed-function'), '--output-format', 'json']);
    console.log(JSON.stringify({ production_ref: production, directory: dir, function_downloaded: true }));
  } else {
    const saved = JSON.parse(fs.readFileSync(pointer, 'utf8'));
    dir = saved.directory;
    if (saved.production_ref !== production || !dir.startsWith(path.join(root, 'supabase/backups') + path.sep))
      throw new Error('Invalid backup target.');
    for (const [filename, flags] of [
      ['roles.sql', ['--role-only']], ['schema.sql', []], ['data.sql', ['--data-only', '--use-copy']],
    ]) {
      const file = path.join(dir, filename);
      if (fs.existsSync(file)) throw new Error(`Refusing to overwrite ${filename}.`);
      cli(['db', 'dump', `--remote=${production}`, ...flags, '--file', file, '--output-format', 'json'], 300000);
      if (!fs.existsSync(file) || fs.statSync(file).size === 0) throw new Error(`Empty ${filename}.`);
      console.log(JSON.stringify({ file: filename, bytes: fs.statSync(file).size, sha256: hash(file) }));
    }
  }
  if (hash(path.join(root, '.env.local')) !== envHash ||
      fs.readFileSync(path.join(root, 'supabase/.temp/project-ref'), 'utf8').trim() !== test)
    throw new Error('App configuration or local link changed.');
}
try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
