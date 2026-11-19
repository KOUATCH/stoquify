// Build once, copy only runtime assets, and bind them to exact source bytes.
// No migration or deployment command is invoked here.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');
const { execFile } = require('node:child_process');
const { capture } = require('./candidate-snapshot.cjs');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const sourceIdentity = root => capture(root).files.map(({ path, sha256 }) => ({ path, sha256 }));
function filesUnder(root, prefix = '') {
  if (fs.lstatSync(path.join(root, prefix)).isSymbolicLink()) throw new Error('Artifact links are not supported');
  return fs.readdirSync(path.join(root, prefix)).sort().flatMap(name => {
    const relative = prefix ? `${prefix}/${name}` : name;
    if (/^\.env(?:\.|$)/.test(name) || /\.(pem|key|pfx)$/i.test(name)) throw new Error('Secret-shaped file in artifact');
    const stat = fs.lstatSync(path.join(root, relative));
    if (stat.isSymbolicLink()) throw new Error('Artifact links are not supported');
    if (stat.isDirectory()) return filesUnder(root, relative);
    if (!stat.isFile()) throw new Error('Non-regular artifact file');
    return [{ path: relative, sha256: hash(fs.readFileSync(path.join(root, relative))) }];
  });
}
function runScript(name, { root = process.cwd(), env = process.env, signal } = {}) {
  if (!env.npm_execpath || !fs.existsSync(env.npm_execpath)) throw new Error('Invoke through the named npm script');
  signal?.throwIfAborted();
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [env.npm_execpath, 'run', name], { cwd: root, env, stdio: 'inherit', shell: false, windowsHide: true, detached: process.platform !== 'win32' });
    const abort = () => {
      if (!child.pid) return;
      // Kill only this owned command tree, including the migration grandchild.
      if (process.platform === 'win32') execFile('taskkill', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true }, () => {});
      else { try { process.kill(-child.pid, 'SIGTERM'); } catch { /* Already exited. */ } }
    };
    signal?.addEventListener('abort', abort, { once: true });
    const cleanup = () => signal?.removeEventListener('abort', abort);
    child.on('error', error => { cleanup(); reject(error); });
    child.on('exit', code => { cleanup(); code === 0 && !signal?.aborted ? resolve() : reject(new Error(`${name} failed (${code})`)); });
  });
}
async function prepare(root, destination, options = {}) {
  root = path.resolve(root); destination = path.resolve(destination);
  if (fs.existsSync(destination)) throw new Error('Artifact destination must be new');
  if (options.env?.NEXT_DIST_DIR || (!options.env && process.env.NEXT_DIST_DIR)) throw new Error('Artifact preparation requires default .next output');
  const identity = options.sourceIdentity || sourceIdentity;
  const before = identity(root);
  await (options.runScript || runScript)('build', { root, env: options.env || process.env });
  if (JSON.stringify(before) !== JSON.stringify(identity(root))) throw new Error('Source changed during build');
  const buildId = fs.readFileSync(path.join(root, '.next/BUILD_ID'), 'utf8').trim();
  if (!buildId || !fs.statSync(path.join(root, '.next/standalone/server.js')).isFile()) throw new Error('Complete standalone build required');
  for (const dependency of ['next', 'react', 'react-dom']) {
    if (!fs.existsSync(path.join(root, '.next/standalone/node_modules', dependency, 'package.json'))) throw new Error('Standalone runtime dependency missing: ' + dependency);
  }
  // Enumerate before writing, reject links and secret-shaped files, never overwrite a prior artifact.
  const sources = [['.next/standalone', 'runtime'], ['.next/static', 'runtime/.next/static'], ['public', 'runtime/public']];
  const copies = sources.flatMap(([from, to]) => filesUnder(path.join(root, from)).map(file => ({ from: `${from}/${file.path}`, to: `${to}/${file.path}`, sha256: file.sha256 })));
  if (new Set(copies.map(file => file.to)).size !== copies.length) throw new Error('Duplicate artifact asset');
  fs.mkdirSync(destination, { recursive: true });
  for (const file of copies) {
    const bytes = fs.readFileSync(path.join(root, file.from));
    if (hash(bytes) !== file.sha256) throw new Error('Build output changed while sealing');
    const target = path.join(destination, file.to);
    fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, bytes, { flag: 'wx' });
  }
  const manifest = { version: 1, buildId, node: process.version, source: before, files: filesUnder(destination), promotion: 'Requires separate target preflight, serialized schema promotion and deployment approval' };
  const bytes = Buffer.from(JSON.stringify(manifest, null, 2) + '\n');
  fs.writeFileSync(path.join(destination, 'artifact.json'), bytes, { flag: 'wx' });
  return { destination, sha256: hash(bytes), buildId, files: manifest.files.length };
}
function verify(root, destination, expectedDigest, options = {}) {
  if (!/^[a-f0-9]{64}$/.test(expectedDigest || '')) throw new Error('Trusted artifact SHA-256 required');
  const bytes = fs.readFileSync(path.join(destination, 'artifact.json'));
  if (hash(bytes) !== expectedDigest) throw new Error('Artifact manifest digest mismatch');
  const manifest = JSON.parse(bytes);
  if (manifest.version !== 1 || !manifest.buildId || !Array.isArray(manifest.files) || !Array.isArray(manifest.source)) throw new Error('Invalid artifact manifest');
  const files = filesUnder(destination).filter(file => file.path !== 'artifact.json');
  if (JSON.stringify(files) !== JSON.stringify(manifest.files)) throw new Error('Artifact bytes changed');
  if (JSON.stringify((options.sourceIdentity || sourceIdentity)(root)) !== JSON.stringify(manifest.source)) throw new Error('Artifact source/migration identity mismatch');
  return manifest;
}
if (require.main === module) {
  const [mode, destination, digest] = process.argv.slice(2);
  Promise.resolve().then(() => {
    if (mode === 'prepare' && destination && !digest) return prepare(process.cwd(), destination);
    if (mode === 'verify' && destination && digest) { const manifest = verify(process.cwd(), destination, digest); return { verified: true, buildId: manifest.buildId }; }
    throw new Error('Usage: prepare <new-directory> | verify <directory> <trusted-sha256>');
  }).then(result => console.log(JSON.stringify(result))).catch(error => { console.error(error.message); process.exitCode = 1; });
}
module.exports = { prepare, verify, runScript, sourceIdentity, filesUnder };
