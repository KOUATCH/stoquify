// Local source evidence only. Never loads .env, installs dependencies, or contacts services.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const zlib = require('node:zlib');
const { execFileSync } = require('node:child_process');
const roots = new Set(['actions', 'app', 'components', 'config', 'hooks', 'i18n', 'lib', 'messages', 'prisma', 'public', 'services', 'src', 'types', 'validations', '_legacy-dashboard', 'tests', '__tests__', 'scripts', 'docs', 'design-system', '.github', 'vendor']);
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
function included(file) {
  if (file.split('/').some(p => p.startsWith('.env') || /^(node_modules|graphify-out|coverage)$/.test(p)) || /\.(pem|key|pfx|log|tsbuildinfo)$/i.test(file)) return false;
  // Local package archives are installation inputs pinned by the lockfile.
  if (file.startsWith('vendor/')) return /^vendor\/(?:[A-Za-z0-9._-]+\.tgz|README\.md)$/.test(file);
  if (!file.includes('/')) return /\.(json|[cm]?js|tsx?|md|ya?ml)$/.test(file) || ['.gitignore', '.nvmrc'].includes(file);
  return roots.has(file.split('/')[0]) && (!file.startsWith('docs/') || /\.(md|json|ya?ml|txt)$/.test(file));
}
function validate(snapshot) {
  if (snapshot.schemaVersion !== 1 || !Array.isArray(snapshot.files)) throw new Error('Unsupported snapshot');
  const seen = new Set();
  for (const entry of snapshot.files) {
    if (!entry.path || entry.path.includes('\\') || entry.path.includes(':') || entry.path.startsWith('/') || entry.path.split('/').some(p => !p || p === '.' || p === '..') || seen.has(entry.path.toLowerCase())) throw new Error('Unsafe or duplicate snapshot path');
    seen.add(entry.path.toLowerCase());
    const bytes = Buffer.from(entry.content, 'base64');
    if (bytes.length !== entry.bytes || hash(bytes) !== entry.sha256) throw new Error(`Snapshot checksum mismatch: ${entry.path}`);
  }
  return snapshot;
}
function capture(root) {
  const git = args => execFileSync('git', args, { cwd: root, maxBuffer: 30e6 }).toString();
  // Restrict traversal before asking Git to enumerate untracked files: generated
  // evidence/build trees can contain millions of files unrelated to the candidate.
  const top = fs.readdirSync(root, { withFileTypes: true });
  const selectors = top.filter(entry => entry.isDirectory() ? roots.has(entry.name) : included(entry.name)).map(entry => entry.name);
  const paths = [...new Set(git(['ls-files', '--cached', '--others', '--exclude-standard', '-z', '--', ...selectors]).split('\0').filter(Boolean))].sort();
  const files = [], excluded = top.filter(entry => !selectors.includes(entry.name)).map(entry => ({ path: entry.name + (entry.isDirectory() ? '/' : ''), reason: 'outside source candidate or secret/generated artifact pattern; subtree not traversed' }));
  for (const file of paths) {
    const absolute = path.join(root, file);
    if (!fs.existsSync(absolute)) { excluded.push({ path: file, reason: 'absent in working tree' }); continue; }
    if (!included(file)) { excluded.push({ path: file, reason: 'outside source candidate or secret/generated artifact pattern' }); continue; }
    if (!fs.lstatSync(absolute).isFile()) throw new Error(`Non-regular source file: ${file}`);
    const bytes = fs.readFileSync(absolute);
    files.push({ path: file, bytes: bytes.length, sha256: hash(bytes), content: bytes.toString('base64') });
  }
  return validate({ schemaVersion: 1, createdAt: new Date().toISOString(), head: git(['rev-parse', 'HEAD']).trim(), node: process.version, platform: process.platform, scope: 'Current source bytes including local edits and untracked source. Includes vendored package archives; excludes environment, installed dependencies, generated outputs and non-source evidence. Not a deployable or certified release.', files, excluded });
}
function restore(snapshot, destination) {
  validate(snapshot);
  if (fs.existsSync(destination)) throw new Error('Restore destination must not exist');
  fs.mkdirSync(destination, { recursive: true });
  for (const entry of snapshot.files) {
    const target = path.join(destination, entry.path);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, Buffer.from(entry.content, 'base64'), { flag: 'wx' });
  }
}
function main() {
  const [mode, artifact, destination] = process.argv.slice(2);
  if (!artifact || !['capture', 'verify', 'restore'].includes(mode) || (mode === 'restore' && !destination)) throw new Error('Usage: node scripts/candidate-snapshot.cjs capture|verify|restore <artifact.json.gz> [new-directory]');
  const snapshot = mode === 'capture' ? capture(process.cwd()) : validate(JSON.parse(zlib.gunzipSync(fs.readFileSync(artifact))));
  if (mode === 'capture') {
    fs.writeFileSync(artifact, zlib.gzipSync(JSON.stringify(snapshot)), { flag: 'wx' });
    fs.writeFileSync(artifact + '.manifest.json', JSON.stringify({ ...snapshot, files: snapshot.files.map(({ content, ...entry }) => entry), archiveSha256: hash(fs.readFileSync(artifact)) }, null, 2), { flag: 'wx' });
  }
  if (mode === 'restore') restore(snapshot, path.resolve(destination));
  console.log(JSON.stringify({ mode, head: snapshot.head, files: snapshot.files.length, migrations: snapshot.files.filter(f => f.path.startsWith('prisma/migrations/')).length, archiveSha256: hash(fs.readFileSync(artifact)) }));
}
if (require.main === module) { try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; } }
module.exports = { capture, validate, restore, included };
