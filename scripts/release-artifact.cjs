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
function assertSafePath(relative) {
  if (typeof relative !== 'string' || !relative || relative.split('/').some(name =>
    !name || name === '.' || name === '..' || name !== name.normalize('NFC') ||
    /[\\<>:"|?*\x00-\x1f]/.test(name) || /[. ]$/.test(name) ||
    /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(name))) throw new Error('Unsafe artifact path');
}
function assertNoLinks(target, allowMissing = false) {
  const absolute = path.resolve(target), { root } = path.parse(absolute);
  let current = root;
  for (const name of absolute.slice(root.length).split(path.sep).filter(Boolean)) {
    current = path.join(current, name);
    let stat;
    try { stat = fs.lstatSync(current); } catch (error) {
      if (allowMissing && error.code === 'ENOENT') return;
      throw error;
    }
    if (stat.isSymbolicLink()) throw new Error('Artifact links are not supported');
  }
}
function assertUniquePaths(files) {
  const prefixes = new Map(), paths = new Set();
  for (const file of files) {
    assertSafePath(file.path);
    const key = file.path.toLowerCase();
    if (prefixes.has(key) && !paths.has(key)) throw new Error('Artifact file/directory conflict');
    const parts = file.path.split('/');
    for (let count = 1; count <= parts.length; count++) {
      const prefix = parts.slice(0, count).join('/'), key = prefix.toLowerCase();
      if (prefixes.has(key) && prefixes.get(key) !== prefix) throw new Error('Ambiguous artifact path case');
      prefixes.set(key, prefix);
      if (count < parts.length && paths.has(key)) throw new Error('Artifact file/directory conflict');
    }
    if (paths.has(key)) throw new Error('Duplicate artifact asset');
    paths.add(key);
  }
}
function filesUnder(root, prefix = '') {
  assertNoLinks(path.join(root, prefix));
  if (fs.lstatSync(path.join(root, prefix)).isSymbolicLink()) throw new Error('Artifact links are not supported');
  const names = fs.readdirSync(path.join(root, prefix)).sort();
  if (new Set(names.map(name => name.toLowerCase())).size !== names.length) throw new Error('Ambiguous artifact path case');
  return names.flatMap(name => {
    const relative = prefix ? `${prefix}/${name}` : name;
    assertSafePath(relative);
    if (/^\.env(?:\.|$)/.test(name) || /\.(pem|key|pfx)$/i.test(name)) throw new Error('Secret-shaped file in artifact');
    const stat = fs.lstatSync(path.join(root, relative));
    if (stat.isSymbolicLink()) throw new Error('Artifact links are not supported');
    if (stat.isDirectory()) return filesUnder(root, relative);
    if (!stat.isFile()) throw new Error('Non-regular artifact file');
    return [{ path: relative, sha256: hash(fs.readFileSync(path.join(root, relative))) }];
  });
}
function uploadLocation(relative) {
  assertSafePath(relative);
  const parts = relative.split('/'), matches = [];
  for (let index = 0; index < parts.length - 1; index++) {
    if (['public', '.private'].includes(parts[index].toLowerCase()) && parts[index + 1].toLowerCase() === 'uploads') matches.push(index);
  }
  if (!matches.length) return null;
  if (matches.length !== 1) throw new Error('Ambiguous legacy upload path');
  const index = matches[0], tail = parts.slice(index + 2);
  if (tail.length !== 2 || tail.some(name => !/^[a-zA-Z0-9._-]+$/.test(name) || name.includes('..')) ||
    !/\.(jpe?g|png|gif|webp)$/i.test(tail[1])) throw new Error('Unsupported legacy upload path');
  return { kind: parts[index].toLowerCase(), tail: tail.join('/'), index };
}
function legacyMappings(publicFiles) {
  return publicFiles.flatMap(file => {
    const source = `public/${file.path}`, location = uploadLocation(source);
    if (!location) return [];
    if (location.kind !== 'public' || location.index !== 0) throw new Error('Unexpected legacy upload source');
    return [{ source, destination: `runtime/.private/uploads/${location.tail}`, sha256: file.sha256 }];
  });
}
function privateAliasMappings(root, publicFiles, legacyUploads) {
  const policyFile = path.join(root, 'config/private-upload-aliases.json');
  assertNoLinks(policyFile, true);
  if (!fs.existsSync(policyFile)) return [];
  const policy = JSON.parse(fs.readFileSync(policyFile, 'utf8'));
  if (!Array.isArray(policy)) throw new Error('Invalid private upload alias policy');
  const aliases = policy.map(alias => {
    if (!alias || Object.keys(alias).sort().join(',') !== 'sha256,source,uploadSource') throw new Error('Invalid private upload alias policy');
    assertSafePath(alias.source); assertSafePath(alias.uploadSource);
    if (!/^public\/images\/[a-zA-Z0-9._-]+\.(jpe?g|png|gif|webp)$/i.test(alias.source) ||
      !alias.source.startsWith('public/images/') || alias.source.includes('..') ||
      !/^[a-f0-9]{64}$/.test(alias.sha256)) throw new Error('Invalid private upload alias policy');
    const original = legacyUploads.find(file => file.source === alias.uploadSource);
    const publicFile = publicFiles.find(file => 'public/' + file.path === alias.source);
    if (!original || !publicFile || original.sha256 !== alias.sha256 || publicFile.sha256 !== alias.sha256) throw new Error('Private upload alias source/hash mismatch');
    return { source: alias.source, uploadSource: alias.uploadSource, sha256: alias.sha256, destination: original.destination };
  });
  assertUniquePaths(aliases.map(alias => ({ path: alias.source })));
  return aliases;
}
function matchingPrivateAlias(relative, aliases) {
  return aliases.find(alias => relative.toLowerCase().endsWith('/' + alias.source.toLowerCase()));
}
function planCopies(root) {
  const publicFiles = filesUnder(path.join(root, 'public'));
  const legacyUploads = legacyMappings(publicFiles);
  const privateUploadAliases = privateAliasMappings(root, publicFiles, legacyUploads);
  const legacyByKey = new Map(legacyUploads.map(file => [uploadLocation(file.source).tail.toLowerCase(), file]));
  const legacyHashes = new Set(legacyUploads.map(file => file.sha256));
  const sources = [['.next/standalone', 'runtime'], ['.next/static', 'runtime/.next/static']];
  const inputs = sources.flatMap(([from, to]) => filesUnder(path.join(root, from)).map(file => ({ from: `${from}/${file.path}`, to: `${to}/${file.path}`, sha256: file.sha256 })));
  inputs.push(...publicFiles.map(file => ({ from: `public/${file.path}`, to: `runtime/public/${file.path}`, sha256: file.sha256 })));
  const copies = inputs.filter(file => {
    const alias = matchingPrivateAlias(file.to, privateUploadAliases);
    if (alias && (file.from === alias.source || file.from.startsWith('.next/standalone/'))) {
      if (!file.to.endsWith('/' + alias.source) || file.sha256 !== alias.sha256) throw new Error('Private upload alias duplicate/path mismatch');
      return false;
    }
    if (alias) throw new Error('Private upload alias outside approved input path');
    const location = uploadLocation(file.to);
    if (!location) {
      if (legacyHashes.has(file.sha256)) throw new Error('Legacy upload bytes outside private mapping');
      return true;
    }
    const original = legacyByKey.get(location.tail.toLowerCase());
    if (!original || original.sha256 !== file.sha256) throw new Error('Unmatched or changed legacy upload duplicate');
    if (location.tail !== uploadLocation(original.source).tail) throw new Error('Ambiguous legacy upload path case');
    return false;
  });
  copies.push(...legacyUploads.map(file => ({ from: file.source, to: file.destination, sha256: file.sha256 })));
  assertUniquePaths(copies.map(file => ({ path: file.to })));
  return { copies, legacyUploads, privateUploadAliases };
}
function verifyLegacyUploads(root, files, manifest) {
  if (files.some(file => uploadLocation(file.path)?.kind === 'public')) throw new Error('Public legacy uploads are forbidden in artifacts');
  if (manifest.version === 2) {
    if (!Array.isArray(manifest.legacyUploads)) throw new Error('Missing legacy upload mapping');
    for (const file of manifest.legacyUploads) {
      assertSafePath(file.source); assertSafePath(file.destination);
      if (!/^[a-f0-9]{64}$/.test(file.sha256)) throw new Error('Invalid legacy upload digest');
    }
  }
  const publicFiles = filesUnder(path.join(root, 'public'));
  const expected = legacyMappings(publicFiles);
  const privateUploadAliases = privateAliasMappings(root, publicFiles, expected);
  if (files.some(file => matchingPrivateAlias(file.path, privateUploadAliases))) throw new Error('Public private-upload aliases are forbidden in artifacts');
  if (privateUploadAliases.length || manifest.privateUploadAliases !== undefined) {
    if (JSON.stringify(privateUploadAliases) !== JSON.stringify(manifest.privateUploadAliases)) throw new Error('Private upload alias mapping mismatch');
  }
  const privateFiles = files.filter(file => uploadLocation(file.path)?.kind === '.private');
  const legacyHashes = new Set(expected.map(file => file.sha256));
  if (files.some(file => !privateFiles.includes(file) && legacyHashes.has(file.sha256))) throw new Error('Legacy upload bytes outside private mapping');
  // v1 remains valid only when it contains no legacy bytes and needs no mapping.
  if (manifest.version === 1) {
    if (expected.length || privateFiles.length || manifest.legacyUploads !== undefined || manifest.privateUploadAliases !== undefined) throw new Error('Legacy uploads require artifact manifest v2');
    return;
  }
  if (JSON.stringify(expected) !== JSON.stringify(manifest.legacyUploads)) throw new Error('Legacy upload source/mapping mismatch');
  const mappedFiles = expected.map(file => ({ path: file.destination, sha256: file.sha256 })).sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
  if (JSON.stringify(mappedFiles) !== JSON.stringify(privateFiles)) throw new Error('Legacy upload private files/mapping mismatch');
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
  assertNoLinks(root); assertNoLinks(destination, true);
  for (const directory of ['public', '.next', '.next/standalone', '.next/static']) assertNoLinks(path.join(root, directory), true);
  if (fs.existsSync(destination)) throw new Error('Artifact destination must be new');
  if (options.env?.NEXT_DIST_DIR || (!options.env && process.env.NEXT_DIST_DIR)) throw new Error('Artifact preparation requires default .next output');
  const identity = options.sourceIdentity || sourceIdentity;
  const before = identity(root);
  const publicBefore = fs.existsSync(path.join(root, 'public')) ? filesUnder(path.join(root, 'public')) : [];
  const legacyBefore = legacyMappings(publicBefore);
  const aliasesBefore = privateAliasMappings(root, publicBefore, legacyBefore);
  await (options.runScript || runScript)('build', { root, env: options.env || process.env });
  if (JSON.stringify(before) !== JSON.stringify(identity(root))) throw new Error('Source changed during build');
  assertNoLinks(path.join(root, '.next/BUILD_ID'));
  assertNoLinks(path.join(root, '.next/standalone/server.js'));
  const buildId = fs.readFileSync(path.join(root, '.next/BUILD_ID'), 'utf8').trim();
  if (!buildId || !fs.statSync(path.join(root, '.next/standalone/server.js')).isFile()) throw new Error('Complete standalone build required');
  for (const dependency of ['next', 'react', 'react-dom']) {
    if (!fs.existsSync(path.join(root, '.next/standalone/node_modules', dependency, 'package.json'))) throw new Error('Standalone runtime dependency missing: ' + dependency);
  }
  // Enumerate before writing, reject links and secret-shaped files, never overwrite a prior artifact.
  const { copies, legacyUploads, privateUploadAliases } = planCopies(root);
  if (JSON.stringify(legacyBefore) !== JSON.stringify(legacyUploads)) throw new Error('Legacy upload sources changed during build');
  if (JSON.stringify(aliasesBefore) !== JSON.stringify(privateUploadAliases)) throw new Error('Private upload alias policy changed during build');
  fs.mkdirSync(destination, { recursive: true });
  for (const file of copies) {
    assertNoLinks(path.join(root, file.from));
    const bytes = fs.readFileSync(path.join(root, file.from));
    if (hash(bytes) !== file.sha256) throw new Error('Build output changed while sealing');
    const target = path.join(destination, file.to);
    fs.mkdirSync(path.dirname(target), { recursive: true }); assertNoLinks(target, true);
    fs.writeFileSync(target, bytes, { flag: 'wx' });
  }
  const manifest = { version: 2, buildId, node: process.version, source: before, files: filesUnder(destination), legacyUploads, promotion: 'Requires separate target preflight, serialized schema promotion and deployment approval' };
  if (privateUploadAliases.length) manifest.privateUploadAliases = privateUploadAliases;
  verifyLegacyUploads(root, manifest.files, manifest);
  const bytes = Buffer.from(JSON.stringify(manifest, null, 2) + '\n');
  fs.writeFileSync(path.join(destination, 'artifact.json'), bytes, { flag: 'wx' });
  return { destination, sha256: hash(bytes), buildId, files: manifest.files.length };
}
function verify(root, destination, expectedDigest, options = {}) {
  if (!/^[a-f0-9]{64}$/.test(expectedDigest || '')) throw new Error('Trusted artifact SHA-256 required');
  assertNoLinks(root); assertNoLinks(path.join(destination, 'artifact.json'));
  const bytes = fs.readFileSync(path.join(destination, 'artifact.json'));
  if (hash(bytes) !== expectedDigest) throw new Error('Artifact manifest digest mismatch');
  const manifest = JSON.parse(bytes);
  if (![1, 2].includes(manifest.version) || !manifest.buildId || !Array.isArray(manifest.files) || !Array.isArray(manifest.source)) throw new Error('Invalid artifact manifest');
  assertUniquePaths(manifest.files);
  const files = filesUnder(destination).filter(file => file.path !== 'artifact.json');
  verifyLegacyUploads(root, files, manifest);
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
