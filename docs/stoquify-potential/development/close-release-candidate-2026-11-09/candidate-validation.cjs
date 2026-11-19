// File-only identity checks. No application imports, dependency install or database access.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '../../../..');
const evidencePrefix = path.relative(root, __dirname).replaceAll('\\', '/') + '/';
const priorEvidence = path.join(root, 'docs/stoquify-potential/development/migration-release-2026-11-09');
const hardeningEvidence = 'docs/stoquify-potential/development/close-authority-hardening-2026-11-09/SOURCE_AND_RESULTS.json';
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const digest = file => hash(fs.readFileSync(file));
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const osEnvironment = () => ({ ...Object.fromEntries(Object.entries(process.env).filter(([key]) => /^(PATH|PATHEXT|SYSTEMROOT|WINDIR|TEMP|TMP|COMSPEC|USERPROFILE|LOCALAPPDATA|APPDATA|PROGRAMFILES|PROGRAMFILES\(X86\)|SYSTEMDRIVE|NUMBER_OF_PROCESSORS)$/i.test(key))), GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: process.platform === 'win32' ? 'NUL' : '/dev/null', GIT_TERMINAL_PROMPT: '0' });
function assertNoLinks(absolute, missing = false) {
  const resolved = path.resolve(absolute), parsed = path.parse(resolved); let cursor = parsed.root;
  for (const part of resolved.slice(parsed.root.length).split(path.sep).filter(Boolean)) {
    cursor = path.join(cursor, part);
    let stat;
    try { stat = fs.lstatSync(cursor); } catch (error) { if (missing && error.code === 'ENOENT') return; throw error; }
    assert(!stat.isSymbolicLink(), 'Links are forbidden in owned paths');
  }
}
function safeSourcePath(relative) {
  assert(typeof relative === 'string' && relative && !relative.includes('\\') && !relative.includes(':') && !relative.startsWith('/'));
  const parts = relative.split('/');
  assert(parts.every(part => part && part !== '.' && part !== '..'), 'Unsafe source path');
  assert(!parts.some(part => part.startsWith('.env') || ['.npmrc', '.codex-tmp', '.aws', '.private', 'browser-profile'].includes(part)), 'Private path in source capture');
  assert(!/(?:^|\/)(?:credentials?\.private\.json|fixture\.private\.json|build-env(?:-[^/]*)?\.json)$|\.(?:pem|key|pfx)$/i.test(relative), 'Private source input');
}
function identity(directory) {
  const { included } = require(path.join(root, 'scripts/candidate-snapshot.cjs'));
  const selectors = fs.readdirSync(directory, { withFileTypes: true }).filter(entry => entry.isDirectory() ? entry.name === 'vendor' || included(entry.name + '/__candidate_probe__.json') : included(entry.name)).map(entry => entry.name);
  const names = [...new Set(execFileSync('git', ['-c', 'maintenance.auto=false', 'ls-files', '--cached', '--others', '--exclude-standard', '-z', '--', ...selectors], { cwd: directory, env: osEnvironment(), maxBuffer: 30e6 }).toString().split('\0').filter(Boolean))].sort();
  return names.filter(name => included(name) && fs.existsSync(path.join(directory, name))).map(name => {
    safeSourcePath(name); const absolute = path.join(directory, name); assertNoLinks(absolute); assert(fs.lstatSync(absolute).isFile());
    return { path: name, sha256: digest(absolute) };
  });
}
function compare(before, after) {
  const old = new Map(before.map(file => [file.path, file.sha256])), current = new Map(after.map(file => [file.path, file.sha256]));
  return [...new Set([...old.keys(), ...current.keys()])].sort().filter(name => old.get(name) !== current.get(name)).map(name => ({ path: name, before: old.get(name) || null, after: current.get(name) || null }));
}
function generatedEvidenceAddition(change) {
  return change.before === null && change.after !== null && change.path.startsWith(evidencePrefix) && /\.(json|md)$/.test(change.path) && !change.path.split('/').some(part => part === '..');
}
function hardeningBinding(files) {
  const absolute = path.join(root, hardeningEvidence), evidence = read(absolute);
  assert.equal(evidence.status, 'PASS_SCOPED_CLOSE_WRITE_AUTHORITY'); assert.equal(evidence.files.length, 9);
  const captured = new Map(files.map(file => [file.path, file.sha256]));
  for (const file of [...evidence.files, ...evidence.unchanged]) {
    safeSourcePath(file.path); assert.equal(digest(path.join(root, file.path)), file.sha256, 'Hardening evidence no longer binds workspace');
    assert.equal(captured.get(file.path), file.sha256, 'Hardened source omitted from candidate');
  }
  return { path: hardeningEvidence, sha256: digest(absolute), files: evidence.files, unchanged: evidence.unchanged };
}
function normalizeNextEnv(text) {
  const refs = [...text.matchAll(/^\/\/\/ <reference path="\.\/(\.next[^\"]*)\/types\/routes\.d\.ts" \/>\r?$/gm)];
  assert.equal(refs.length, 1, 'Review generated Next route reference before normalization');
  return text.replace(refs[0][0], refs[0][0].replace(refs[0][1], '.next'));
}
function verifyCandidate() {
  assertNoLinks(__dirname);
  const target = read(path.join(__dirname, 'CANDIDATE_TARGET.json')), manifest = read(path.join(__dirname, 'CANDIDATE_SOURCE_MANIFEST.json'));
  assert.equal(path.dirname(target.directory), path.join(root, '.codex-tmp'));
  assert(/^close-release-20261109-[a-f0-9]{10}$/.test(path.basename(target.directory)));
  assert.equal(target.candidate, path.join(target.directory, 'candidate')); assert.equal(manifest.candidate, target.candidate);
  assertNoLinks(target.candidate); assert.equal(fs.realpathSync(target.directory).toLowerCase(), path.resolve(target.directory).toLowerCase());
  for (const file of target.runners) assert.equal(digest(path.join(__dirname, file.path)), file.sha256, 'Prepared harness changed');
  const rawPath = path.join(__dirname, 'RAW_SOURCE_MANIFEST.json'); assert.equal(digest(rawPath), target.rawManifestSha256);
  const raw = read(rawPath), archive = path.join(target.directory, 'raw-source-snapshot.json.gz');
  assert.equal(digest(archive), raw.archiveSha256); assert.equal(manifest.rawArchiveSha256, raw.archiveSha256);
  if (target.preparationRecovery) {
    assert.equal(target.preparationRecovery.path, 'PREPARATION_RESUME.json');
    const recoveryPath = path.join(__dirname, target.preparationRecovery.path); assertNoLinks(recoveryPath); assert.equal(digest(recoveryPath), target.preparationRecovery.sha256);
    const recovery = read(recoveryPath); assert.equal(recovery.directory, target.directory); assert.equal(recovery.candidate, target.candidate);
    assert.equal(recovery.rawArchiveSha256, raw.archiveSha256); assert.equal(recovery.rawManifestSha256, target.rawManifestSha256);
    assert(recovery.candidateAbsentBeforeResume && recovery.initialFilesUnchanged); assert.equal(recovery.failedClone.exitCode, 128);
    assert.equal(recovery.failedClone.execution.path, 'candidate-clone.execution.json'); assert.equal(recovery.failedClone.log.path, 'candidate-clone.log');
    for (const file of [recovery.failedClone.execution, recovery.failedClone.log]) { assertNoLinks(path.join(__dirname, file.path)); assert.equal(digest(path.join(__dirname, file.path)), file.sha256); }
  }
  assert.equal(hash(JSON.stringify(manifest.files)), manifest.manifestSha256);
  const expected = raw.files.map(({ path: name, sha256 }) => { safeSourcePath(name); return { path: name, sha256 }; });
  const next = manifest.normalization.generatedNextEnv;
  const originalFile = path.join(target.directory, 'generated-inputs/next-env.original.d.ts'); assertNoLinks(originalFile);
  const original = fs.readFileSync(originalFile, 'utf8'), normalized = normalizeNextEnv(original);
  assert.equal(hash(original), next.originalSha256); assert.equal(hash(normalized), next.normalizedSha256);
  assert.equal(digest(path.join(target.candidate, 'next-env.d.ts')), next.normalizedSha256);
  assert.equal(digest(path.join(root, 'next-env.d.ts')), next.originalSha256, 'Ignored workspace Next input changed');
  const captured = expected.find(file => file.path === 'next-env.d.ts'); assert.equal(Boolean(captured), next.capturedInRawSource);
  if (captured) { assert.equal(captured.sha256, next.originalSha256); captured.sha256 = next.normalizedSha256; }
  assert.deepEqual(manifest.files, expected, 'Unreviewed candidate source normalization');
  assert.deepEqual(identity(target.candidate), manifest.files, 'Frozen candidate source changed');
  const binding = hardeningBinding(manifest.files); assert.deepEqual(binding, manifest.hardeningEvidence);
  const rootChanges = compare(raw.files, identity(root));
  assert(rootChanges.every(generatedEvidenceAddition), 'Workspace source changed beyond new owned JSON/Markdown evidence');
  return { target, manifest, rootBinding: { matchedExceptNewOwnedEvidence: true, generatedEvidenceAdditions: rootChanges } };
}
module.exports = { root, priorEvidence, hash, digest, read, osEnvironment, assertNoLinks, safeSourcePath, identity, compare, generatedEvidenceAddition, hardeningBinding, normalizeNextEnv, verifyCandidate };
if (require.main === module) {
  try { const { manifest, rootBinding } = verifyCandidate(); console.log(JSON.stringify({ verified: true, files: manifest.files.length, manifestSha256: manifest.manifestSha256, generatedEvidenceAdditions: rootBinding.generatedEvidenceAdditions.length })); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
