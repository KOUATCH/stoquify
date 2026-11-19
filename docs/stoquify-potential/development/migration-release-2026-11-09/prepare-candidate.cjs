// Owned full-source candidate and clean OFFLINE installation preparation only.
// No build, application, database, migration, Prisma generation or lifecycle hooks.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const zlib = require('node:zlib');
const { spawnSync, execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '../../../..');
const { capture, validate, included } = require(path.join(root, 'scripts/candidate-snapshot.cjs'));
const recordPath = path.join(__dirname, 'CANDIDATE_TARGET.json');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const identities = snapshot => snapshot.files.map(({ path, sha256 }) => ({ path, sha256 }));
// Same Git selectors and inclusion predicate as candidate-snapshot, without
// retaining/decoding a second full base64 archive for each identity-only check.
function currentIdentity(directory) {
  const roots = new Set(['actions', 'app', 'components', 'config', 'hooks', 'i18n', 'lib', 'messages', 'prisma', 'public', 'services', 'src', 'types', 'validations', '_legacy-dashboard', 'tests', '__tests__', 'scripts', 'docs', 'design-system', '.github', 'vendor']);
  const selectors = fs.readdirSync(directory, { withFileTypes: true }).filter(entry => entry.isDirectory() ? roots.has(entry.name) : included(entry.name)).map(entry => entry.name);
  const paths = [...new Set(execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z', '--', ...selectors], { cwd: directory, env: osEnvironment(), maxBuffer: 30e6 }).toString().split('\0').filter(Boolean))].sort();
  return paths.filter(file => fs.existsSync(path.join(directory, file)) && included(file)).map(file => {
    const target = path.join(directory, file); if (!fs.lstatSync(target).isFile()) throw Error('Nonregular file in current source identity');
    return { path: file, sha256: sha(fs.readFileSync(target)) };
  });
}
function osEnvironment() {
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => /^(PATH|PATHEXT|SYSTEMROOT|WINDIR|TEMP|TMP|COMSPEC|USERPROFILE|LOCALAPPDATA|APPDATA|PROGRAMFILES|PROGRAMFILES\(X86\)|SYSTEMDRIVE|NUMBER_OF_PROCESSORS)$/i.test(key)));
  const unreachable = 'postgresql://synthetic@127.0.0.1:1/stoquify_local_unreachable_install?schema=public';
  return { ...env, DATABASE_URL: unreachable, DIRECT_URL: unreachable, SHADOW_DATABASE_URL: unreachable,
    GIT_TERMINAL_PROMPT: '0', GIT_CONFIG_NOSYSTEM: '1', NEXT_TELEMETRY_DISABLED: '1' };
}
function write(name, value) { fs.writeFileSync(path.join(__dirname, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' }); }
function ensureNoLinks(absolute) {
  const parsed = path.parse(path.resolve(absolute)); let cursor = parsed.root;
  for (const entry of path.resolve(absolute).slice(parsed.root.length).split(path.sep).filter(Boolean)) {
    cursor = path.join(cursor, entry);
    if (fs.existsSync(cursor) && fs.lstatSync(cursor).isSymbolicLink()) throw Error('Link in owned candidate path');
  }
}
function load() {
  const record = JSON.parse(fs.readFileSync(recordPath, 'utf8'));
  if (path.dirname(record.directory) !== path.join(root, '.codex-tmp') || !/^sales-accounting-release-20261109-[a-f0-9]{10}$/.test(path.basename(record.directory))
    || record.candidate !== path.join(record.directory, 'candidate')) throw Error('Unexpected owned candidate target');
  ensureNoLinks(record.directory); ensureNoLinks(record.candidate);
  if (!fs.realpathSync(record.directory).startsWith(fs.realpathSync(path.join(root, '.codex-tmp')) + path.sep)) throw Error('Candidate escaped owned parent');
  return record;
}
function run(label, executable, args, cwd, env, options = {}) {
  const logPath = path.join(__dirname, label + '.log'), fd = fs.openSync(logPath, 'wx');
  const startedAt = new Date().toISOString(), started = Date.now();
  const result = spawnSync(executable, args, { cwd, env, windowsHide: true, stdio: ['ignore', fd, fd], timeout: 20 * 60 * 1000, ...options });
  fs.closeSync(fd);
  const receipt = { label, executable, args, cwd, startedAt, elapsedMs: Date.now() - started, exitCode: result.status, signal: result.signal,
    error: result.error?.code || null, runnerSha256: sha(fs.readFileSync(__filename)) };
  write(label + '.execution.json', receipt);
  if (result.status !== 0) throw Error(`${label} failed (${result.status}); inspect retained nonsecret execution log`);
  return receipt;
}
function rejectPrivatePaths(snapshot) {
  for (const entry of snapshot.files) if (entry.path.split('/').some(name => name.startsWith('.env') || name === '.npmrc'
    || ['.codex-tmp', '.aws', '.private', 'browser-profile'].includes(name))
    || /(?:^|\/)(?:credentials?\.private\.json|fixture\.private\.json|build-env(?:-[^/]*)?\.json)$/i.test(entry.path)) throw Error(`Private task/configuration file in source capture: ${entry.path}`);
}
function checkInstallInputs(candidate) {
  const pkg = JSON.parse(fs.readFileSync(path.join(candidate, 'package.json'), 'utf8'));
  const lock = JSON.parse(fs.readFileSync(path.join(candidate, 'package-lock.json'), 'utf8'));
  if (pkg.workspaces || lock.lockfileVersion !== 3) throw Error('Unexpected locked installation layout');
  const archive = fs.readFileSync(path.join(candidate, 'vendor/xlsx-0.20.3.tgz'));
  const integrity = 'sha512-' + crypto.createHash('sha512').update(archive).digest('base64');
  const archiveSha256 = sha(archive);
  if (archiveSha256 !== '8dc73fc3b00203e72d176e85b50938627c7b086e607c682e8d3c22c02bb99fe8') throw Error('Vendored archive differs from reviewed vendor README');
  for (const [name, entry] of Object.entries(lock.packages)) {
    if (!entry.resolved) continue;
    if (entry.resolved === 'file:vendor/xlsx-0.20.3.tgz') { if (entry.integrity !== integrity) throw Error('Vendored archive lock integrity mismatch'); }
    else if (!entry.resolved.startsWith('https://registry.npmjs.org/')) throw Error(`Unreviewed package source: ${name}`);
  }
  const lifecycleNames = ['preinstall', 'install', 'postinstall', 'prepare', 'prepublish', 'prepublishOnly', 'prepack', 'postpack'];
  return { inputs: ['package.json', 'package-lock.json', 'vendor/xlsx-0.20.3.tgz', 'vendor/README.md'].map(file => ({ path: file, sha256: sha(fs.readFileSync(path.join(candidate, file))) })),
    vendoredArchiveSha256: archiveSha256, vendoredIntegrity: integrity, lockfileVersion: lock.lockfileVersion,
    rootLifecycleScripts: Object.fromEntries(lifecycleNames.filter(name => pkg.scripts?.[name]).map(name => [name, pkg.scripts[name]])),
    skippedLifecyclePackages: Object.entries(lock.packages).filter(([, entry]) => entry.hasInstallScript).map(([name, entry]) => ({ name, version: entry.version })) };
}
function compare(expected, actual) {
  const old = new Map(expected.map(file => [file.path, file.sha256])), current = new Map(actual.map(file => [file.path, file.sha256]));
  return [...new Set([...old.keys(), ...current.keys()])].sort().filter(file => old.get(file) !== current.get(file)).map(file => ({ path: file, before: old.get(file) || null, after: current.get(file) || null }));
}
function prepare() {
  if (fs.existsSync(recordPath)) throw Error('Refusing replacement of retained candidate target');
  const id = crypto.randomBytes(5).toString('hex'), directory = path.join(root, '.codex-tmp', `sales-accounting-release-20261109-${id}`);
  ensureNoLinks(directory);
  const disk = fs.statfsSync(path.join(root, '.codex-tmp'));
  if (disk.bavail * disk.bsize < 8 * 1024 ** 3) throw Error('At least 8GiB free required for clean candidate preparation');
  fs.mkdirSync(directory, { recursive: false });
  const candidate = path.join(directory, 'candidate');
  const record = { directory, candidate, createdAt: new Date().toISOString(), noBuild: true, noDatabase: true, installationMode: 'Separate clean offline npm ci with lifecycle hooks disabled' };
  const env = osEnvironment(), gitConfig = path.join(directory, 'empty-global.gitconfig');
  fs.writeFileSync(gitConfig, '', { flag: 'wx' }); env.GIT_CONFIG_GLOBAL = gitConfig;
  const snapshot = capture(root); rejectPrivatePaths(snapshot);
  const archive = zlib.gzipSync(JSON.stringify(snapshot));
  fs.writeFileSync(path.join(directory, 'raw-source-snapshot.json.gz'), archive, { flag: 'wx' });
  const rawIdentity = identities(snapshot);
  const rawManifest = { ...snapshot, files: snapshot.files.map(({ content, ...entry }) => entry), archiveSha256: sha(archive) };
  // Evidence stays outside the frozen source and is not copied into the candidate.
  write('CANDIDATE_TARGET.json', record);
  write('RAW_SOURCE_MANIFEST.json', rawManifest);
  console.log(`Captured ${snapshot.files.length} current source files; reconstructing the owned candidate.`);
  run('candidate-clone', 'git', ['-c', 'maintenance.auto=false', 'clone', '--no-checkout', '--shared', '--', root, candidate], root, env);
  run('candidate-read-tree', 'git', ['read-tree', 'HEAD'], candidate, env);
  for (const entry of snapshot.files) {
    const file = path.join(candidate, entry.path); fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, Buffer.from(entry.content, 'base64'), { flag: 'wx' });
  }
  const reconstructed = identities(capture(candidate));
  if (compare(rawIdentity, reconstructed).length) throw Error('Exact raw source reconstruction failed');
  return completePreparation(record, snapshot);
}
function completePreparation(record, snapshot) {
  const { candidate } = record, rawIdentity = identities(snapshot);
  if (compare(rawIdentity, identities(capture(candidate))).length) throw Error('Raw reconstruction changed before preparation finalization');
  const currentRoot = identities(capture(root));
  // This harness's newly written docs evidence is generated after the capture.
  const generated = new Set(['CANDIDATE_TARGET.json', 'RAW_SOURCE_MANIFEST.json', 'candidate-clone.execution.json', 'candidate-read-tree.execution.json'].map(name => path.relative(root, path.join(__dirname, name)).replaceAll('\\', '/')));
  const rootChanges = compare(rawIdentity, currentRoot.filter(entry => !generated.has(entry.path)));
  const nextEnvPath = path.join(candidate, 'next-env.d.ts');
  // This generated file is commonly ignored and therefore absent from capture.
  // Retain its independent hashes instead of claiming it was in the raw archive.
  const capturedNextEnv = rawIdentity.some(file => file.path === 'next-env.d.ts');
  const before = fs.readFileSync(fs.existsSync(nextEnvPath) ? nextEnvPath : path.join(root, 'next-env.d.ts'), 'utf8');
  const references = [...before.matchAll(/^\/\/\/ <reference path="\.\/(\.next[^\"]*)\/types\/routes\.d\.ts" \/>\r?$/gm)];
  if (references.length !== 1) throw Error('Review changed generated Next route type reference before normalization');
  const normalized = before.replace(references[0][0], references[0][0].replace(references[0][1], '.next'));
  fs.writeFileSync(nextEnvPath, normalized);
  const normalizedIdentity = identities(capture(candidate));
  const delta = compare(rawIdentity, normalizedIdentity);
  if (delta.some(entry => entry.path !== 'next-env.d.ts')) throw Error('Unexpected candidate source normalization');
  const inputs = checkInstallInputs(candidate);
  write('CANDIDATE_SOURCE_MANIFEST.json', { createdAt: new Date().toISOString(), candidate, head: snapshot.head, files: normalizedIdentity,
    manifestSha256: sha(JSON.stringify(normalizedIdentity)), rawArchiveSha256: sha(fs.readFileSync(path.join(record.directory, 'raw-source-snapshot.json.gz'))),
    normalization: { reason: 'Generated Next route types must use default production .next; root source retained unchanged', files: delta,
      generatedNextEnv: { path: 'next-env.d.ts', capturedInRawSource: capturedNextEnv, capturedInCandidateIdentity: normalizedIdentity.some(file => file.path === 'next-env.d.ts'), originalSha256: sha(before), normalizedSha256: sha(normalized) } },
    rootBindingAtPreparation: { matched: rootChanges.length === 0, changes: rootChanges },
    privateFilesExcluded: true, legacyAssetPolicy: 'Current policy-managed legacy uploads and aliases retained unchanged; not task credentials',
    limitation: 'Frozen current source plus reviewed generated-reference normalization; installation/build/runtime/database qualification are separate' });
  write('INSTALL_INPUT_REVIEW.json', inputs);
  if (rootChanges.length) throw Error('Root source changed during preparation; retained candidate requires review before installation/build');
  console.log(`Prepared exact owned candidate ${path.basename(record.directory)}; installation not executed.`);
}
function finalize() {
  const record = load();
  if (fs.existsSync(path.join(__dirname, 'CANDIDATE_SOURCE_MANIFEST.json'))) throw Error('Preparation already finalized; refusing overwrite');
  const archive = fs.readFileSync(path.join(record.directory, 'raw-source-snapshot.json.gz'));
  const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, 'RAW_SOURCE_MANIFEST.json'), 'utf8'));
  if (sha(archive) !== manifest.archiveSha256) throw Error('Retained raw archive digest mismatch');
  const snapshot = validate(JSON.parse(zlib.gunzipSync(archive)));
  if (compare(identities(snapshot), manifest.files).length) throw Error('Retained raw archive identity differs from raw manifest');
  return completePreparation(record, snapshot);
}
function assertFrozen(record) {
  const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, 'CANDIDATE_SOURCE_MANIFEST.json'), 'utf8'));
  const binding = manifest.rootBindingAtPreparation;
  if (!(binding.matched || binding.authorizedEvidenceOnlyDrift === true) || manifest.candidate !== record.candidate || sha(JSON.stringify(manifest.files)) !== manifest.manifestSha256) throw Error('Frozen source identity/binding is not approved');
  if (binding.authorizedEvidenceOnlyDrift === true && binding.changes.some(change => !authorizedEvidencePath(change.path))) throw Error('Evidence-only exception contains an unapproved source path');
  const changes = compare(manifest.files, currentIdentity(record.candidate));
  if (changes.length) throw Error('Candidate changed after freezing; review and record a complete new source manifest before continuing');
  if (sha(fs.readFileSync(path.join(record.candidate, 'next-env.d.ts'))) !== manifest.normalization.generatedNextEnv.normalizedSha256) throw Error('Generated Next input changed after preparation');
  return manifest;
}
function authorizedEvidencePath(relative) {
  const prefix = 'docs/stoquify-potential/development/migration-release-2026-11-09/';
  return relative.startsWith(prefix) && /\.(json|md|txt)$/.test(relative);
}
function reviewBinding() {
  const record = load(), manifestPath = path.join(__dirname, 'CANDIDATE_SOURCE_MANIFEST.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (manifest.candidate !== record.candidate || sha(JSON.stringify(manifest.files)) !== manifest.manifestSha256) throw Error('Candidate/source manifest identity mismatch');
  const changes = manifest.rootBindingAtPreparation.changes;
  if (changes.some(change => !authorizedEvidencePath(change.path))) throw Error('Root drift outside the explicitly approved qualification JSON evidence folder requires review');
  const review = { utc: new Date().toISOString(), scope: 'Only direct JSON evidence files in docs/stoquify-potential/development/migration-release-2026-11-09/',
    authorization: 'Root explicitly authorized generated nonsecret qualification JSON drift on 2026-11-09; all app/migration/config/approval/hooks remain strict',
    sourceManifestSha256: manifest.manifestSha256, changes: changes.map(change => ({ ...change, classification: 'Generated qualification evidence; outside application/source-control policy changes' })) };
  write('ROOT_BINDING_REVIEW.json', review);
  manifest.rootBindingAtPreparation.authorizedEvidenceOnlyDrift = true;
  manifest.rootBindingAtPreparation.review = { path: 'ROOT_BINDING_REVIEW.json', sha256: sha(fs.readFileSync(path.join(__dirname, 'ROOT_BINDING_REVIEW.json'))) };
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  console.log(JSON.stringify({ evidenceOnlyRootDriftReviewed: changes.length, paths: changes.map(change => change.path), applicationSourceException: false }));
}
function amendReviewedTest() {
  const record = load(), manifestPath = path.join(__dirname, 'CANDIDATE_SOURCE_MANIFEST.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (manifest.candidate !== record.candidate || sha(JSON.stringify(manifest.files)) !== manifest.manifestSha256) throw Error('Candidate/source manifest identity mismatch');
  if (compare(manifest.files, identities(capture(record.candidate))).length) throw Error('Unreviewed candidate drift before exact test amendment');
  const relative = 'actions/item/__tests__/list-items-error-responses.action.test.ts';
  const expected = 'b1d43e3ba41e0e08a7116407242c048938a1a4f96c608baac94f572db1c64455';
  const bytes = fs.readFileSync(path.join(root, relative));
  if (sha(bytes) !== expected || manifest.files.some(file => file.path === relative)) throw Error('Reviewed exact added-test identity does not match');
  const file = path.join(record.candidate, relative); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, bytes, { flag: 'wx' });
  const actual = identities(capture(record.candidate));
  const amendment = compare(manifest.files, actual);
  if (amendment.length !== 1 || amendment[0].path !== relative || amendment[0].before !== null || amendment[0].after !== expected) throw Error('Exact test amendment changed another candidate source path');
  const rootChanges = compare(actual, identities(capture(root)));
  const receipt = { utc: new Date().toISOString(), authorization: 'Root reviewed the complete mocked safe-error unit test and explicitly authorized this exact candidate-only source addition',
    rawArchiveUnchanged: true, previousManifestSha256: manifest.manifestSha256, amendments: amendment,
    candidateManifestSha256: sha(JSON.stringify(actual)), rootChanges };
  write('SOURCE_AMENDMENT.json', receipt);
  if (rootChanges.some(change => !authorizedEvidencePath(change.path))) throw Error('Root source drift beyond reviewed test and qualification evidence requires review');
  const review = { utc: new Date().toISOString(), scope: 'Only direct JSON evidence files in docs/stoquify-potential/development/migration-release-2026-11-09/',
    authorization: 'Root explicitly authorized generated nonsecret qualification JSON drift on 2026-11-09; all app/migration/config/approval/hooks remain strict',
    sourceManifestSha256: receipt.candidateManifestSha256, changes: rootChanges.map(change => ({ ...change, classification: 'Generated qualification evidence' })) };
  write('ROOT_BINDING_REVIEW.json', review);
  manifest.files = actual; manifest.manifestSha256 = receipt.candidateManifestSha256;
  manifest.sourceAmendments = [...(manifest.sourceAmendments || []), { path: 'SOURCE_AMENDMENT.json', sha256: sha(fs.readFileSync(path.join(__dirname, 'SOURCE_AMENDMENT.json'))) }];
  manifest.rootBindingAtPreparation = { matched: rootChanges.length === 0, changes: rootChanges, authorizedEvidenceOnlyDrift: true,
    review: { path: 'ROOT_BINDING_REVIEW.json', sha256: sha(fs.readFileSync(path.join(__dirname, 'ROOT_BINDING_REVIEW.json'))) } };
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  console.log(JSON.stringify({ exactReviewedSourceAmendment: amendment, candidateManifestSha256: manifest.manifestSha256, evidenceOnlyRootChanges: rootChanges.length }));
}
function finalizeReviewedAmendment() {
  const record = load(), manifestPath = path.join(__dirname, 'CANDIDATE_SOURCE_MANIFEST.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const amendment = JSON.parse(fs.readFileSync(path.join(__dirname, 'SOURCE_AMENDMENT.json'), 'utf8'));
  if (manifest.candidate !== record.candidate || manifest.manifestSha256 !== amendment.previousManifestSha256
    || sha(JSON.stringify(manifest.files)) !== manifest.manifestSha256) throw Error('Retained pre-amendment source identity mismatch');
  if (sha(fs.readFileSync(path.join(record.directory, 'raw-source-snapshot.json.gz'))) !== manifest.rawArchiveSha256) throw Error('Retained raw archive changed');
  const actual = identities(capture(record.candidate)), delta = compare(manifest.files, actual);
  if (sha(JSON.stringify(actual)) !== amendment.candidateManifestSha256 || JSON.stringify(delta) !== JSON.stringify(amendment.amendments)) throw Error('Reviewed exact candidate source amendment changed');
  const changes = compare(actual, identities(capture(root)));
  if (changes.some(change => !authorizedEvidencePath(change.path))) throw Error('Non-evidence source changed after reviewed test amendment; requires root review');
  const review = { utc: new Date().toISOString(), scope: 'Generated .json/.md/.txt evidence recursively under docs/stoquify-potential/development/migration-release-2026-11-09/** only',
    authorization: 'Root explicitly approved this bounded qualification evidence subtree recursively; no application, migration, config, approval or hooks exception',
    sourceManifestSha256: amendment.candidateManifestSha256, changes: changes.map(change => ({ ...change, classification: 'Generated owned qualification proof; intentionally not copied into the frozen candidate' })) };
  write('ROOT_BINDING_REVIEW.json', review);
  const finalization = { utc: new Date().toISOString(), rawArchiveSha256: manifest.rawArchiveSha256, rawArchiveUnchanged: true,
    retainedAmendmentSha256: sha(fs.readFileSync(path.join(__dirname, 'SOURCE_AMENDMENT.json'))), candidateManifestSha256: amendment.candidateManifestSha256,
    completeCandidateIdentityVerified: true, completeRootBindingVerifiedWithScopedEvidenceException: true, rootBindingReviewSha256: sha(fs.readFileSync(path.join(__dirname, 'ROOT_BINDING_REVIEW.json'))) };
  write('SOURCE_AMENDMENT_FINALIZED.json', finalization);
  manifest.files = actual; manifest.manifestSha256 = amendment.candidateManifestSha256;
  manifest.sourceAmendments = [
    { path: 'SOURCE_AMENDMENT.json', sha256: finalization.retainedAmendmentSha256 },
    { path: 'SOURCE_AMENDMENT_FINALIZED.json', sha256: sha(fs.readFileSync(path.join(__dirname, 'SOURCE_AMENDMENT_FINALIZED.json'))) },
  ];
  manifest.rootBindingAtPreparation = { matched: changes.length === 0, changes, authorizedEvidenceOnlyDrift: true,
    review: { path: 'ROOT_BINDING_REVIEW.json', sha256: finalization.rootBindingReviewSha256 } };
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  console.log(JSON.stringify({ reviewedCandidateSourceAmendmentFinalized: true, candidateManifestSha256: manifest.manifestSha256, evidenceOnlyRootChanges: changes.length }));
}
function copyCacheTree(from, to, statistics) {
  const stat = fs.lstatSync(from);
  if (stat.isSymbolicLink()) throw Error('Unexpected link in offline cache seed');
  if (stat.isDirectory()) { fs.mkdirSync(to); for (const name of fs.readdirSync(from)) copyCacheTree(path.join(from, name), path.join(to, name), statistics); }
  else if (stat.isFile()) { fs.copyFileSync(from, to, fs.constants.COPYFILE_EXCL); statistics.files++; statistics.bytes += stat.size; }
  else throw Error('Unexpected nonregular offline cache seed');
}
function reclaimUnfinishedCache() {
  const record = load(), cache = path.join(record.directory, 'install-private/npm-cache');
  if (fs.existsSync(path.join(__dirname, 'clean-offline-install.log')) || fs.existsSync(path.join(record.candidate, 'node_modules'))) throw Error('npm may have started; refusing unfinished-cache-only cleanup');
  ensureNoLinks(cache);
  const parent = fs.realpathSync(record.directory) + path.sep;
  if (fs.realpathSync(cache) !== path.resolve(cache) || !fs.realpathSync(cache).startsWith(parent)
    || path.relative(record.directory, cache).replaceAll('\\', '/') !== 'install-private/npm-cache') throw Error('Refusing unverified cache cleanup target');
  const before = fs.statfsSync(record.directory);
  fs.rmSync(cache, { recursive: true, force: false });
  const after = fs.statfsSync(record.directory);
  write('CACHE_COPY_INTERRUPTED.json', { utc: new Date().toISOString(), reason: 'Owned broad cache copy stopped before npm startup to preserve workspace capacity',
    reclaimedPath: cache, verifiedWithinOwnedRun: true, npmHadNotStarted: true, globalCacheUntouched: true,
    beforeFreeBytes: before.bavail * before.bsize, afterFreeBytes: after.bavail * after.bsize,
    retained: ['candidate', 'raw-source-snapshot.json.gz', 'all source and binding manifests', 'empty owned npm configuration'] });
  const lock = JSON.parse(fs.readFileSync(path.join(record.candidate, 'package-lock.json'), 'utf8'));
  const matches = (values, value) => !values || (!values.includes('!' + value) && (!values.some(item => !item.startsWith('!')) || values.includes(value)));
  const blobs = new Map(), missing = [];
  for (const [name, entry] of Object.entries(lock.packages)) {
    if (!entry.resolved?.startsWith('https://registry.npmjs.org/') || !entry.integrity?.startsWith('sha512-') || !matches(entry.os, process.platform) || !matches(entry.cpu, process.arch)) continue;
    const digest = Buffer.from(entry.integrity.slice(7), 'base64').toString('hex');
    const source = path.join('C:/Users/J COMPUTER/AppData/Local/npm-cache/_cacache/content-v2/sha512', digest.slice(0, 2), digest.slice(2, 4), digest.slice(4));
    if (!fs.existsSync(source)) { missing.push({ name, version: entry.version, resolved: entry.resolved }); continue; }
    if (!blobs.has(digest)) blobs.set(digest, { bytes: fs.statSync(source).size });
  }
  const plan = { utc: new Date().toISOString(), platform: process.platform, arch: process.arch, uniqueRequiredTarballBlobs: blobs.size,
    requiredTarballBytes: [...blobs.values()].reduce((total, blob) => total + blob.bytes, 0), missing, workspaceFreeBytes: after.bavail * after.bsize,
    qualification: 'Read-only lock-compatible tarball presence and capacity only; metadata index needs separate minimal planning; no npm installation' };
  write('MINIMAL_CACHE_PLAN.json', plan);
  console.log(JSON.stringify({ cacheReclaimed: true, freeBytes: plan.workspaceFreeBytes, uniqueRequiredTarballBlobs: plan.uniqueRequiredTarballBlobs, requiredTarballBytes: plan.requiredTarballBytes, missing: missing.length, npmStarted: false }));
}
const visualizationRoot = 'C:/Users/J COMPUTER/.codex/visualizations/2026/11/02/01a19e00-6435-7443-92d6-f2cf160728a8';
function minimalCachePath(record) {
  ensureNoLinks(visualizationRoot);
  const parent = fs.realpathSync(visualizationRoot);
  if (parent.toLowerCase() !== path.resolve(visualizationRoot).toLowerCase()) throw Error('Unexpected authorized cache workspace root');
  const cache = path.join(parent, path.basename(record.directory) + '-npm-cache');
  if (path.dirname(cache) !== parent || !/^sales-accounting-release-20261109-[a-f0-9]{10}-npm-cache$/.test(path.basename(cache))) throw Error('Unexpected minimal cache target');
  ensureNoLinks(cache); return cache;
}
function lockBlobs(record) {
  checkInstallInputs(record.candidate);
  const lock = JSON.parse(fs.readFileSync(path.join(record.candidate, 'package-lock.json'), 'utf8'));
  const matches = (values, value) => !values || (!values.includes('!' + value) && (!values.some(item => !item.startsWith('!')) || values.includes(value)));
  const blobs = new Map(); let packageCount = 0, compressedBytes = 0, unpackedTarBytesEstimate = 0;
  for (const [name, entry] of Object.entries(lock.packages)) {
    if (!entry.resolved?.startsWith('https://registry.npmjs.org/') || !matches(entry.os, process.platform) || !matches(entry.cpu, process.arch)) continue;
    if (!entry.integrity?.startsWith('sha512-')) throw Error(`Review unsupported cache integrity: ${name}`);
    packageCount++;
    const digest = Buffer.from(entry.integrity.slice(7), 'base64').toString('hex');
    const relative = path.join('_cacache/content-v2/sha512', digest.slice(0, 2), digest.slice(2, 4), digest.slice(4));
    const source = path.join('C:/Users/J COMPUTER/AppData/Local/npm-cache', relative);
    if (!fs.existsSync(source) || !fs.lstatSync(source).isFile() || fs.lstatSync(source).isSymbolicLink()) throw Error(`Lock-required offline tarball absent: ${name}@${entry.version}`);
    if (blobs.has(digest)) { blobs.get(digest).packages.push(name); continue; }
    const size = fs.statSync(source).size, fd = fs.openSync(source, 'r'), header = Buffer.alloc(2), footer = Buffer.alloc(4);
    try { fs.readSync(fd, header, 0, 2, 0); fs.readSync(fd, footer, 0, 4, size - 4); } finally { fs.closeSync(fd); }
    if (header[0] !== 0x1f || header[1] !== 0x8b) throw Error(`Expected gzip tarball cache content: ${name}`);
    const unpacked = footer.readUInt32LE(0);
    compressedBytes += size; unpackedTarBytesEstimate += unpacked;
    blobs.set(digest, { relative, source, integrity: entry.integrity, bytes: size, unpackedTarBytesEstimate: unpacked, packages: [name] });
  }
  return { blobs: [...blobs.values()], packageCount, compressedBytes, unpackedTarBytesEstimate };
}
function prepareMinimalCache() {
  const record = load(); assertFrozen(record);
  if (fs.existsSync(path.join(record.candidate, 'node_modules'))) throw Error('Candidate is not clean');
  const cache = minimalCachePath(record);
  if (fs.existsSync(cache)) throw Error('Minimal cache target must be new');
  const plan = lockBlobs(record), disk = fs.statfsSync(record.directory), cDisk = fs.statfsSync(visualizationRoot);
  const eFree = disk.bavail * disk.bsize, cFree = cDisk.bavail * cDisk.bsize;
  // Two unpacked copies cover node_modules plus traced standalone dependencies;
  // retain another 4GiB for compiler/static output and allocation overhead.
  const eRequired = plan.unpackedTarBytesEstimate * 2 + 4 * 1024 ** 3;
  const capacity = { utc: new Date().toISOString(), candidate: record.candidate, cache, compatiblePackageEntries: plan.packageCount,
    uniqueTarballBlobs: plan.blobs.length, compressedBytes: plan.compressedBytes, unpackedTarBytesEstimate: plan.unpackedTarBytesEstimate,
    estimateMethod: 'Sum of gzip footer ISIZE (modulo4GiB) for each unique lock-required tarball; estimate, not installed allocation',
    eFreeBytes: eFree, eRequiredBytes: eRequired, eRequirementMethod: '2x tar estimate plus4GiB compiler/output reserve',
    cFreeBytes: cFree, cRequiredBytes: plan.compressedBytes + 512 * 1024 ** 2, passed: eFree >= eRequired && cFree >= plan.compressedBytes + 512 * 1024 ** 2,
    broadGlobalCacheCopy: false, noNpmStarted: true };
  write('MINIMAL_CACHE_CAPACITY.json', capacity);
  if (!capacity.passed) throw Error('Insufficient owned candidate/cache storage; npm not started');
  fs.mkdirSync(cache);
  for (const blob of plan.blobs) {
    const bytes = fs.readFileSync(blob.source);
    if ('sha512-' + crypto.createHash('sha512').update(bytes).digest('base64') !== blob.integrity) throw Error('Offline cache tarball integrity mismatch');
    const destination = path.join(cache, blob.relative); fs.mkdirSync(path.dirname(destination), { recursive: true }); fs.writeFileSync(destination, bytes, { flag: 'wx' });
  }
  write('MINIMAL_OFFLINE_CACHE_SEED.json', { utc: new Date().toISOString(), cache, sourceReadOnly: true, compatiblePackageEntries: plan.packageCount,
    uniqueTarballBlobs: plan.blobs.length, compressedBytes: plan.compressedBytes, lockSha512Verified: true,
    noGlobalIndexOrWholeCacheTreeCopied: true, blobs: plan.blobs.map(({ source, ...blob }) => blob), qualification: 'Minimal lock-compatible content-addressed tarballs only; no npm installation or native lifecycle proof' });
  console.log(JSON.stringify({ minimalCachePrepared: true, cache, packageEntries: plan.packageCount, uniqueTarballBlobs: plan.blobs.length,
    compressedBytes: plan.compressedBytes, unpackedTarBytesEstimate: plan.unpackedTarBytesEstimate, eFreeBytes: eFree, eRequiredBytes: eRequired, npmStarted: false }));
}
async function importZodMetadata() {
  const record = load(), seed = JSON.parse(fs.readFileSync(path.join(__dirname, 'MINIMAL_OFFLINE_CACHE_SEED.json'), 'utf8'));
  if (seed.cache !== minimalCachePath(record)) throw Error('Unexpected owned minimal cache');
  const cacache = require(path.join(path.dirname(process.execPath), 'node_modules/npm/node_modules/cacache'));
  const source = 'C:/Users/J COMPUTER/AppData/Local/npm-cache/_cacache', destination = path.join(seed.cache, '_cacache');
  const url = 'https://registry.npmjs.org/zod', key = 'make-fetch-happen:request-cache:' + url;
  const entry = await cacache.get(source, key);
  if (entry.metadata?.url !== url) throw Error('Cached response URL differs from exact reviewed public packument');
  if (Object.keys(entry.metadata.reqHeaders || {}).some(name => /authorization|cookie/i.test(name))
    || Object.keys(entry.metadata.resHeaders || {}).some(name => /authorization|cookie/i.test(name))) throw Error('Unexpected private header in public metadata cache entry');
  const integrity = await cacache.put(destination, key, entry.data, { integrity: entry.integrity, metadata: entry.metadata });
  const copied = await cacache.get(destination, key);
  if (String(integrity) !== entry.integrity || copied.integrity !== entry.integrity || !copied.data.equals(entry.data)) throw Error('Copied public cache response identity differs');
  const receipt = { utc: new Date().toISOString(), url, key, bytes: entry.data.length, integrity: entry.integrity, bodySha256: sha(entry.data),
    sourceReadOnly: true, destination, exactIndexMetadataAndBodyCopied: true, credentialHeadersAbsent: true, networkRequest: false,
    installPolicyReview: 'CI uses npm ci without force/legacy-peer flags; prior matching-lock install used ignore-scripts/no-audit/no-fund only' };
  write('ZOD_METADATA_CACHE_IMPORT.json', receipt);
  console.log(JSON.stringify({ publicMetadataImported: url, bytes: receipt.bytes, sourceReadOnly: true, networkRequest: false }));
}
function installMinimal(attempt = 1) {
  const record = load(); assertFrozen(record);
  const seed = JSON.parse(fs.readFileSync(path.join(__dirname, 'MINIMAL_OFFLINE_CACHE_SEED.json'), 'utf8'));
  const resultName = attempt === 1 ? 'CLEAN_INSTALL_RESULT.json' : 'CLEAN_INSTALL_RESULT_ATTEMPT_2.json';
  if (![1, 2].includes(attempt) || seed.cache !== minimalCachePath(record) || !seed.lockSha512Verified
    || (attempt === 1 && fs.existsSync(path.join(record.candidate, 'node_modules'))) || fs.existsSync(path.join(__dirname, resultName))) throw Error('New clean candidate or authorized retained cache-miss retry required');
  if (attempt === 2) {
    const prior = JSON.parse(fs.readFileSync(path.join(__dirname, 'CLEAN_INSTALL_RESULT.json'), 'utf8'));
    if (prior.passed || !prior.cacheMiss || !prior.inputsUnchanged || !prior.frozenSourceUnchanged
      || !fs.existsSync(path.join(__dirname, 'ZOD_METADATA_CACHE_IMPORT.json'))) throw Error('Exact retained offline metadata-miss receipt and import required');
    ensureNoLinks(path.join(record.candidate, 'node_modules'));
  }
  const disk = fs.statfsSync(record.directory), capacity = JSON.parse(fs.readFileSync(path.join(__dirname, 'MINIMAL_CACHE_CAPACITY.json'), 'utf8'));
  if (disk.bavail * disk.bsize < capacity.eRequiredBytes) throw Error('Candidate storage reserve no longer sufficient; npm not started');
  const inputs = checkInstallInputs(record.candidate), configRoot = path.join(record.directory, 'install-private');
  const userConfig = path.join(configRoot, 'empty-user.npmrc'), globalConfig = path.join(configRoot, 'empty-global.npmrc');
  if (fs.statSync(userConfig).size || fs.statSync(globalConfig).size) throw Error('Owned npm configuration must remain empty');
  const npm = path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js'), env = osEnvironment();
  const args = [npm, 'ci', '--offline', '--ignore-scripts', '--no-audit', '--no-fund', '--registry=https://registry.npmjs.org', '--userconfig=' + userConfig, '--globalconfig=' + globalConfig, '--cache=' + seed.cache];
  const logPath = path.join(__dirname, attempt === 1 ? 'clean-minimal-offline-install.log' : 'clean-minimal-offline-install-attempt-2.log'), fd = fs.openSync(logPath, 'wx'), began = Date.now();
  console.log('Starting clean offline npm ci with only minimal verified tarballs; lifecycle hooks and network fallback disabled.');
  const result = spawnSync(process.execPath, args, { cwd: record.candidate, env, windowsHide: true, stdio: ['ignore', fd, fd], timeout: 20 * 60 * 1000 }); fs.closeSync(fd);
  const log = fs.readFileSync(logPath, 'utf8'), after = checkInstallInputs(record.candidate), unchanged = JSON.stringify(inputs.inputs) === JSON.stringify(after.inputs);
  const frozen = compare(JSON.parse(fs.readFileSync(path.join(__dirname, 'CANDIDATE_SOURCE_MANIFEST.json'), 'utf8')).files, currentIdentity(record.candidate)).length === 0;
  const versions = {}; for (const name of ['next', 'react', 'react-dom', 'prisma', '@prisma/client', 'typescript', 'argon2']) {
    const file = path.join(record.candidate, 'node_modules', name, 'package.json'); if (fs.existsSync(file)) versions[name] = JSON.parse(fs.readFileSync(file, 'utf8')).version;
  }
  const cacheMiss = /ENOTCACHED|cache mode is.*only-if-cached|not.*in.*cache/i.test(log);
  const cacheMisses = cacheMiss ? [...new Set([...log.matchAll(/https:\/\/registry\.npmjs\.org\/[^\s"'<>]+/g)].map(match => match[0]))] : [];
  const receipt = { observedAt: new Date().toISOString(), attempt, candidate: record.candidate, cache: seed.cache, node: process.version,
    command: 'npm ci --offline --ignore-scripts --no-audit --no-fund with owned empty configs and minimal SHA512-verified cache', exitCode: result.status,
    signal: result.signal, error: result.error?.code || null, elapsedMs: Date.now() - began, inputsUnchanged: unchanged, frozenSourceUnchanged: frozen,
    passed: result.status === 0 && unchanged && frozen, cacheMiss, cacheMisses, versions, skippedLifecyclePackages: inputs.skippedLifecyclePackages,
    noDatabaseApplicationBuildOrGeneration: true, limitations: ['All dependency lifecycle hooks disabled', 'No native runtime or Prisma generation established', 'No network fallback', 'Root installation untouched'] };
  write(resultName, receipt);
  if (receipt.passed) write('CLEAN_INSTALL_SELECTED.json', { attempt, result: resultName, sha256: sha(fs.readFileSync(path.join(__dirname, resultName))) });
  console.log(JSON.stringify({ attempt, result: resultName, passed: receipt.passed, exitCode: receipt.exitCode, inputsUnchanged: unchanged, frozenSourceUnchanged: frozen, cacheMiss, cacheMisses, versions }));
  if (!receipt.passed) process.exitCode = 1;
}
function install() {
  const record = load(); assertFrozen(record);
  if (fs.existsSync(path.join(record.candidate, 'node_modules')) || fs.existsSync(path.join(__dirname, 'CLEAN_INSTALL_RESULT.json'))) throw Error('Clean install requires unused candidate node_modules and receipt');
  const inputs = checkInstallInputs(record.candidate);
  const configRoot = path.join(record.directory, 'install-private'); fs.mkdirSync(configRoot);
  const userConfig = path.join(configRoot, 'empty-user.npmrc'), globalConfig = path.join(configRoot, 'empty-global.npmrc');
  fs.writeFileSync(userConfig, '', { flag: 'wx' }); fs.writeFileSync(globalConfig, '', { flag: 'wx' });
  const cache = path.join(configRoot, 'npm-cache'); fs.mkdirSync(cache);
  const sourceCache = 'C:/Users/J COMPUTER/AppData/Local/npm-cache/_cacache';
  const statistics = { files: 0, bytes: 0 };
  const copiedCache = path.join(cache, '_cacache'); fs.mkdirSync(copiedCache);
  for (const name of ['content-v2', 'index-v5']) if (fs.existsSync(path.join(sourceCache, name))) copyCacheTree(path.join(sourceCache, name), path.join(copiedCache, name), statistics);
  write('OFFLINE_CACHE_SEED.json', { source: sourceCache, destination: copiedCache, sourceReadOnly: true, statistics, copiedAt: new Date().toISOString() });
  console.log(`Prepared independent offline cache (${statistics.files} files); running clean npm ci with all lifecycle hooks disabled.`);
  const env = osEnvironment(); env.GIT_CONFIG_GLOBAL = path.join(record.directory, 'empty-global.gitconfig');
  const npm = path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js');
  if (!fs.existsSync(npm)) throw Error('Reviewed installed npm CLI is absent');
  const args = [npm, 'ci', '--offline', '--ignore-scripts', '--no-audit', '--no-fund', '--registry=https://registry.npmjs.org', '--userconfig=' + userConfig, '--globalconfig=' + globalConfig, '--cache=' + cache];
  const logPath = path.join(__dirname, 'clean-offline-install.log'), fd = fs.openSync(logPath, 'wx'), started = Date.now();
  const result = spawnSync(process.execPath, args, { cwd: record.candidate, env, windowsHide: true, stdio: ['ignore', fd, fd], timeout: 20 * 60 * 1000 }); fs.closeSync(fd);
  const after = checkInstallInputs(record.candidate), unchanged = JSON.stringify(inputs.inputs) === JSON.stringify(after.inputs);
  const log = fs.readFileSync(logPath, 'utf8');
  const cacheMisses = [...new Set([...log.matchAll(/https:\/\/registry\.npmjs\.org\/[^\s"'<>]+/g)].map(match => match[0]))];
  const versions = {};
  for (const name of ['next', 'react', 'react-dom', 'prisma', '@prisma/client', 'typescript', 'argon2']) {
    const file = path.join(record.candidate, 'node_modules', name, 'package.json'); if (fs.existsSync(file)) versions[name] = JSON.parse(fs.readFileSync(file, 'utf8')).version;
  }
  const frozenStillMatches = compare(JSON.parse(fs.readFileSync(path.join(__dirname, 'CANDIDATE_SOURCE_MANIFEST.json'), 'utf8')).files, currentIdentity(record.candidate)).length === 0;
  const receipt = { observedAt: new Date().toISOString(), candidate: record.candidate, node: process.version, command: 'npm ci --offline --ignore-scripts --no-audit --no-fund with owned empty npm configuration and independently copied cache',
    exitCode: result.status, signal: result.signal, error: result.error?.code || null, elapsedMs: Date.now() - started, inputsUnchanged: unchanged, frozenSourceUnchanged: frozenStillMatches,
    passed: result.status === 0 && unchanged && frozenStillMatches, cacheMiss: /ENOTCACHED|cache mode is.*only-if-cached|not.*in.*cache/i.test(log), cacheMisses,
    versions, skippedLifecyclePackages: inputs.skippedLifecyclePackages, rootLifecycleScripts: inputs.rootLifecycleScripts,
    noDatabaseApplicationBuildOrGeneration: true, limitations: ['All dependency lifecycle hooks disabled', 'Native/runtime readiness and Prisma generation not established', 'Offline cache availability only; no network fallback', 'Root installation untouched'] };
  write('CLEAN_INSTALL_RESULT.json', receipt);
  console.log(JSON.stringify({ passed: receipt.passed, exitCode: receipt.exitCode, inputsUnchanged: unchanged, frozenSourceUnchanged: frozenStillMatches, cacheMiss: receipt.cacheMiss, cacheMisses: receipt.cacheMiss ? cacheMisses : [], versions }));
  if (!receipt.passed) process.exitCode = 1;
}
try {
  if (process.argv.length !== 3) throw Error('Expected one reviewed preparation mode');
  if (process.argv[2] === 'prepare') prepare(); else if (process.argv[2] === 'finalize') finalize(); else if (process.argv[2] === 'review-binding') reviewBinding(); else if (process.argv[2] === 'amend-reviewed-test') amendReviewedTest(); else if (process.argv[2] === 'finalize-reviewed-amendment') finalizeReviewedAmendment(); else if (process.argv[2] === 'install') throw Error('Broad-cache install mode disabled; use the reviewed minimal cache stages'); else if (process.argv[2] === 'reclaim-unfinished-cache') reclaimUnfinishedCache(); else if (process.argv[2] === 'prepare-minimal-cache') prepareMinimalCache(); else if (process.argv[2] === 'install-minimal') installMinimal(); else if (process.argv[2] === 'retry-minimal') installMinimal(2); else if (process.argv[2] === 'import-zod-metadata') importZodMetadata().catch(error => { console.error(error.code || error.message); process.exitCode = 1; }); else throw Error('Unknown preparation mode');
} catch (error) { console.error(error.message.replace(/postgres(?:ql)?:\/\/[^\s"']+/g, '[UNREACHABLE_SYNTHETIC_DATABASE]')); process.exitCode = 1; }
