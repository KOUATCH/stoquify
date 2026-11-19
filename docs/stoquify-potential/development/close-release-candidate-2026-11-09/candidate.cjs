// New candidate and independent dependency COPY only; no npm/build/app/database operation.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), zlib = require('node:zlib'), assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const controls = require('./candidate-validation.cjs');
const { root, priorEvidence, hash, digest, read, osEnvironment, assertNoLinks, safeSourcePath, identity, compare, generatedEvidenceAddition, hardeningBinding, normalizeNextEnv, verifyCandidate } = controls;
const GiB = 1024 ** 3;
function write(name, value) { fs.writeFileSync(path.join(__dirname, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' }); }
function sourceInputs(directory) {
  return ['package.json', 'package-lock.json', 'prisma/schema.prisma', 'vendor/xlsx-0.20.3.tgz', 'vendor/README.md', 'scripts/ensure-prisma-client.js', 'scripts/candidate-snapshot.cjs'].map(name => ({ path: name, sha256: digest(path.join(directory, name)) }));
}
function migrationInputs(directory) {
  const parent = path.join(directory, 'prisma/migrations'); assertNoLinks(parent);
  return fs.readdirSync(parent).sort().filter(name => fs.existsSync(path.join(parent, name, 'migration.sql'))).map(name => {
    const relative = `prisma/migrations/${name}/migration.sql`; assertNoLinks(path.join(directory, relative));
    return { path: relative, sha256: digest(path.join(directory, relative)) };
  });
}
function previousInstallation() {
  const prior = require(path.join(priorEvidence, 'candidate-validation.cjs')).verifyCandidate();
  const selectedPath = path.join(priorEvidence, 'CLEAN_INSTALL_SELECTED.json'), selected = read(selectedPath);
  assert(/^CLEAN_INSTALL_RESULT(?:_ATTEMPT_2)?\.json$/.test(selected.result));
  const installPath = path.join(priorEvidence, selected.result); assert.equal(digest(installPath), selected.sha256);
  const install = read(installPath), nativePath = path.join(priorEvidence, 'CANDIDATE_NATIVE_READINESS.json'), native = read(nativePath);
  assert(install.passed && install.inputsUnchanged && install.frozenSourceUnchanged && native.passed);
  assert.equal(install.candidate, prior.target.candidate); assert.equal(install.node, process.version);
  assert.deepEqual(sourceInputs(prior.target.candidate), sourceInputs(root), 'Reviewed installation/schema inputs changed');
  const migrations = migrationInputs(root); assert.deepEqual(migrationInputs(prior.target.candidate), migrations, 'Prior generated installation migration catalog differs');
  const generatedSchema = path.join(prior.target.candidate, 'node_modules/.prisma/client/schema.prisma'); assertNoLinks(generatedSchema);
  const { schemaTokens } = require(path.join(root, 'scripts/ensure-prisma-client.js'));
  const sourceTokens = schemaTokens(fs.readFileSync(path.join(root, 'prisma/schema.prisma'), 'utf8'));
  assert.equal(schemaTokens(fs.readFileSync(generatedSchema, 'utf8')), sourceTokens, 'Copied default Prisma client schema tokens differ from current source');
  assertNoLinks(path.join(prior.target.candidate, 'node_modules'));
  return { source: path.join(prior.target.candidate, 'node_modules'), candidate: prior.target.candidate,
    sourceManifestSha256: prior.manifest.manifestSha256, inputs: sourceInputs(root), node: process.version,
    migrations: { count: migrations.length, manifestSha256: hash(JSON.stringify(migrations)) }, generatedPrismaSchemaSha256: digest(generatedSchema), schemaTokensSha256: hash(sourceTokens),
    receipts: [{ path: selectedPath, sha256: digest(selectedPath) }, { path: installPath, sha256: digest(installPath) }, { path: nativePath, sha256: digest(nativePath) }] };
}
function dependencyFiles(directory, withHashes = false, prefix = '') {
  const absolute = path.join(directory, prefix); assertNoLinks(absolute); const names = fs.readdirSync(absolute).sort();
  assert.equal(new Set(names.map(name => name.toLowerCase())).size, names.length, 'Ambiguous dependency path case');
  return names.flatMap(name => {
    const relative = prefix ? `${prefix}/${name}` : name, file = path.join(directory, relative), stat = fs.lstatSync(file);
    assert(!stat.isSymbolicLink(), 'Installed dependency links require review');
    if (stat.isDirectory()) return dependencyFiles(directory, withHashes, relative);
    assert(stat.isFile(), 'Nonregular installed dependency');
    return [{ path: relative, bytes: stat.size, ...(withHashes ? { sha256: digest(file) } : {}) }];
  });
}
function capacityPlan() {
  const previous = previousInstallation(), files = dependencyFiles(previous.source), disk = fs.statfsSync(path.join(root, '.codex-tmp'));
  const bytes = files.reduce((total, file) => total + file.bytes, 0), freeBytes = disk.bavail * disk.bsize;
  const plan = { utc: new Date().toISOString(), source: previous.source, priorSourceManifestSha256: previous.sourceManifestSha256,
    dependencyFiles: files.length, dependencyBytes: bytes, freeBytes, minimumFreeBytes: Math.max(8 * GiB, bytes + 4 * GiB),
    compilerReserveBytes: 4 * GiB, reservePolicy: 'Prior 8GiB floor retained; at least dependency copy plus4GiB compiler reserve. Separate artifact volume capacity remains required.',
    passed: freeBytes >= Math.max(8 * GiB, bytes + 4 * GiB), sourceInputs: previous.inputs,
    limitations: ['Measured file bytes exclude filesystem allocation overhead; conservative reserve retained.', 'Dependency reuse is not a clean installation or new supply-chain qualification.'], noCopyOrApplicationProcessStarted: true };
  write('DEPENDENCY_CAPACITY_PLAN.json', plan); console.log(JSON.stringify(plan));
}
function assertCapacity(stage, measured = {}) {
  assert(['Preparation', 'Copy', 'Build'].includes(stage));
  const disk = fs.statfsSync(path.join(root, '.codex-tmp')), free = disk.bavail * disk.bsize, reviewPath = path.join(__dirname, 'CAPACITY_REVIEW.json');
  if (!fs.existsSync(reviewPath)) {
    assert(free >= Math.max(8 * GiB, (measured.dependencyBytes || 0) + 4 * GiB), 'No approved measured capacity review; prior8GiB floor retained'); return;
  }
  assertNoLinks(reviewPath); const review = read(reviewPath);
  assert.equal(review['approvedFor' + stage], true, 'This stage lacks reviewed capacity'); assert.deepEqual(review.sourceInputs, sourceInputs(root));
  assert(Array.isArray(review.measurements) && review.measurements.length > 0);
  for (const entry of review.measurements) { const absolute = path.resolve(root, entry.path); assertNoLinks(absolute); assert.equal(digest(absolute), entry.sha256, 'Capacity measurement receipt changed'); }
  // Root-reviewed full prior .next/artifact inventory, before bounded cache reclamation.
  assert(review.compilerReserveBytes >= Math.ceil(2314425776 * 1.5) + GiB);
  assert(review.artifactReserveBytes >= Math.ceil(262411837 * 1.5) + GiB);
  assert(review.additionalDatabaseReserveBytes >= 256 * 1024 ** 2);
  const requirement = review.compilerReserveBytes + review.additionalDatabaseReserveBytes +
    (stage === 'Preparation' ? (measured.sourceBytes || 0) + (measured.rawArchiveBytes || 0) : 0) +
    (stage === 'Build' ? 0 : (measured.dependencyBytes || 0));
  const minimum = review['minimum' + stage + 'FreeBytes'];
  assert(Number.isSafeInteger(minimum) && minimum >= requirement, 'Reviewed minimum does not cover the measured stage peak');
  assert(free >= minimum, 'Measured candidate/compiler capacity requirement is not met');
  assertNoLinks(review.artifactRoot); const artifactDisk = fs.statfsSync(review.artifactRoot);
  assert(Number.isSafeInteger(review.minimumArtifactFreeBytes) && review.minimumArtifactFreeBytes >= review.artifactReserveBytes);
  assert(artifactDisk.bavail * artifactDisk.bsize >= review.minimumArtifactFreeBytes, 'Measured artifact-volume reserve is not available');
  return { reviewSha256: digest(reviewPath), freeBytes: free, minimumFreeBytes: minimum };
}
function git(label, args, cwd, env) {
  const log = path.join(__dirname, label + '.log'), fd = fs.openSync(log, 'wx'), began = Date.now();
  const result = spawnSync('git', ['-c', 'maintenance.auto=false', ...args], { cwd, env, windowsHide: true, stdio: ['ignore', fd, fd], timeout: 120000 }); fs.closeSync(fd);
  write(label + '.execution.json', { utc: new Date().toISOString(), args, cwd, exitCode: result.status, signal: result.signal, error: result.error?.code || null, elapsedMs: Date.now() - began });
  assert.equal(result.status, 0, 'Candidate Git reconstruction failed; retained log available');
}
function prepare() {
  assert(!fs.existsSync(path.join(__dirname, 'CANDIDATE_TARGET.json')), 'Refusing to replace a retained candidate');
  const previous = previousInstallation();
  const { capture } = require(path.join(root, 'scripts/candidate-snapshot.cjs')), snapshot = capture(root);
  for (const file of snapshot.files) safeSourcePath(file.path);
  const rawIdentity = snapshot.files.map(({ path: name, sha256 }) => ({ path: name, sha256 })); hardeningBinding(rawIdentity);
  const archive = zlib.gzipSync(JSON.stringify(snapshot)), directory = path.join(root, '.codex-tmp', 'close-release-20261109-' + crypto.randomBytes(5).toString('hex'));
  const dependencyBytes = dependencyFiles(previous.source).reduce((total, file) => total + file.bytes, 0);
  const capacity = assertCapacity('Preparation', { dependencyBytes, sourceBytes: snapshot.files.reduce((total, file) => total + file.bytes, 0), rawArchiveBytes: archive.length });
  assertNoLinks(directory, true); assert(!fs.existsSync(directory)); fs.mkdirSync(directory);
  const env = osEnvironment();
  const globalConfig = path.join(directory, 'empty-global.gitconfig'); fs.writeFileSync(globalConfig, '', { flag: 'wx' });
  Object.assign(env, { GIT_TERMINAL_PROMPT: '0', GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: globalConfig });
  fs.writeFileSync(path.join(directory, 'raw-source-snapshot.json.gz'), archive, { flag: 'wx' });
  write('RAW_SOURCE_MANIFEST.json', { ...snapshot, files: snapshot.files.map(({ content, ...file }) => file), archiveSha256: hash(archive) });
  completePreparation({ snapshot, archive, directory, previous, capacity, env });
}
function completePreparation({ snapshot, archive, directory, previous, capacity, env, retry = false, recovery }) {
  const candidate = path.join(directory, 'candidate'), rawIdentity = snapshot.files.map(({ path: name, sha256 }) => ({ path: name, sha256 }));
  const hardening = hardeningBinding(rawIdentity), suffix = retry ? '-retry' : '';
  assertNoLinks(candidate, true); assert(!fs.existsSync(candidate), 'Candidate must be absent before reconstruction');
  git('candidate-clone' + suffix, ['clone', '--no-checkout', '--shared', '--', root, candidate], root, env);
  git('candidate-read-tree' + suffix, ['read-tree', 'HEAD'], candidate, env);
  for (const file of snapshot.files) { const absolute = path.join(candidate, file.path); fs.mkdirSync(path.dirname(absolute), { recursive: true }); assertNoLinks(absolute, true); fs.writeFileSync(absolute, Buffer.from(file.content, 'base64'), { flag: 'wx' }); }
  assert.deepEqual(identity(candidate), rawIdentity, 'Raw candidate reconstruction differs');
  const candidateNext = path.join(candidate, 'next-env.d.ts'), capturedNext = snapshot.files.some(file => file.path === 'next-env.d.ts');
  const before = fs.readFileSync(capturedNext ? candidateNext : path.join(root, 'next-env.d.ts'), 'utf8'), normalized = normalizeNextEnv(before);
  fs.mkdirSync(path.join(directory, 'generated-inputs'));
  fs.writeFileSync(path.join(directory, 'generated-inputs/next-env.original.d.ts'), before, { flag: 'wx' });
  fs.writeFileSync(candidateNext, normalized, capturedNext ? undefined : { flag: 'wx' });
  const normalizedIdentity = identity(candidate), delta = compare(rawIdentity, normalizedIdentity);
  assert(delta.every(file => file.path === 'next-env.d.ts'), 'Unexpected source normalization');
  const changes = compare(rawIdentity, identity(root));
  assert(changes.every(generatedEvidenceAddition), 'Workspace source changed during reconstruction');
  const target = { createdAt: new Date().toISOString(), directory, candidate, noBuild: true, noDatabase: true,
    dependencyMode: 'Independent checksum-verified copy of previously qualified installed dependencies; not a new clean installation',
    priorCandidate: previous.candidate, capacity, rawManifestSha256: digest(path.join(__dirname, 'RAW_SOURCE_MANIFEST.json')),
    ...(recovery ? { preparationRecovery: recovery } : {}),
    runners: ['candidate.cjs', 'candidate-validation.cjs'].map(name => ({ path: name, sha256: digest(path.join(__dirname, name)) })) };
  write('CANDIDATE_TARGET.json', target);
  write('CANDIDATE_SOURCE_MANIFEST.json', { createdAt: new Date().toISOString(), candidate, head: snapshot.head, files: normalizedIdentity,
    manifestSha256: hash(JSON.stringify(normalizedIdentity)), rawArchiveSha256: hash(archive), hardeningEvidence: hardening,
    normalization: { reason: 'Default production .next route reference; generated input independently retained when Git ignored', files: delta,
      generatedNextEnv: { path: 'next-env.d.ts', capturedInRawSource: capturedNext, originalSha256: hash(before), normalizedSha256: hash(normalized) } },
    rootBindingAtPreparation: { matchedExceptNewOwnedEvidence: true, generatedEvidenceAdditions: changes }, privateFilesExcluded: true,
    limitation: 'Frozen current source only. Reused dependencies, full build, artifact and runtime qualification are separate evidence.' });
  verifyCandidate();
  console.log(JSON.stringify({ prepared: true, candidate, files: normalizedIdentity.length, manifestSha256: hash(JSON.stringify(normalizedIdentity)), dependencyCopyPerformed: false, noDatabaseOrBuild: true }));
}
function resumePreparation() {
  for (const name of ['CANDIDATE_TARGET.json', 'CANDIDATE_SOURCE_MANIFEST.json', 'PREPARATION_RESUME.json', 'candidate-read-tree.execution.json', 'candidate-read-tree.log', 'candidate-clone-retry.execution.json', 'candidate-clone-retry.log']) {
    assert(!fs.existsSync(path.join(__dirname, name)), 'Retained completion or retry exists; refusing replacement');
  }
  const executionPath = path.join(__dirname, 'candidate-clone.execution.json'), logPath = path.join(__dirname, 'candidate-clone.log');
  assertNoLinks(executionPath); assertNoLinks(logPath); const failed = read(executionPath), candidate = failed.args?.[5];
  assert.equal(failed.cwd, root); assert.equal(failed.exitCode, 128); assert.equal(failed.signal, null); assert.equal(failed.error, null);
  const directory = path.dirname(candidate || '');
  assert.equal(path.dirname(directory), path.join(root, '.codex-tmp')); assert(/^close-release-20261109-[a-f0-9]{10}$/.test(path.basename(directory)));
  assert.equal(candidate, path.join(directory, 'candidate')); assert.deepEqual(failed.args, ['clone', '--no-checkout', '--shared', '--', root, candidate]);
  assert(/NtCreateDirectoryObject[\s\S]*0xC0000022/.test(fs.readFileSync(logPath, 'utf8')), 'Only the reviewed MSYS sandbox clone refusal can resume');
  assertNoLinks(directory); assertNoLinks(candidate, true); assert(!fs.existsSync(candidate), 'Partial candidate requires separate review; no cleanup performed');
  assert.equal(fs.realpathSync(directory).toLowerCase(), path.resolve(directory).toLowerCase());
  assert.deepEqual(fs.readdirSync(directory).sort(), ['empty-global.gitconfig', 'raw-source-snapshot.json.gz']);
  const globalConfig = path.join(directory, 'empty-global.gitconfig'); assertNoLinks(globalConfig); assert.equal(fs.readFileSync(globalConfig, 'utf8'), '');
  const rawPath = path.join(__dirname, 'RAW_SOURCE_MANIFEST.json'), archivePath = path.join(directory, 'raw-source-snapshot.json.gz'); assertNoLinks(rawPath); assertNoLinks(archivePath);
  const raw = read(rawPath), archive = fs.readFileSync(archivePath); assert.equal(hash(archive), raw.archiveSha256);
  const { validate } = require(path.join(root, 'scripts/candidate-snapshot.cjs')), snapshot = validate(JSON.parse(zlib.gunzipSync(archive)));
  for (const file of snapshot.files) safeSourcePath(file.path);
  assert.deepEqual(raw, { ...snapshot, files: snapshot.files.map(({ content, ...file }) => file), archiveSha256: hash(archive) }, 'Retained raw source/manifest chain changed');
  const rawIdentity = snapshot.files.map(({ path: name, sha256 }) => ({ path: name, sha256 })), changes = compare(rawIdentity, identity(root));
  assert(changes.every(generatedEvidenceAddition), 'Workspace source changed outside new owned evidence since raw capture');
  hardeningBinding(rawIdentity);
  const previous = previousInstallation(), dependencyBytes = dependencyFiles(previous.source).reduce((total, file) => total + file.bytes, 0);
  const capacity = assertCapacity('Preparation', { dependencyBytes, sourceBytes: snapshot.files.reduce((total, file) => total + file.bytes, 0), rawArchiveBytes: archive.length });
  const recovery = { path: 'PREPARATION_RESUME.json' };
  write(recovery.path, { utc: new Date().toISOString(), directory, candidate, rawArchiveSha256: hash(archive), rawManifestSha256: digest(rawPath),
    failedClone: { execution: { path: 'candidate-clone.execution.json', sha256: digest(executionPath) }, log: { path: 'candidate-clone.log', sha256: digest(logPath) }, exitCode: failed.exitCode },
    candidateAbsentBeforeResume: true, initialFilesUnchanged: true, originalFailure: 'MSYS NtCreateDirectoryObject0xC0000022 sandbox refusal', generatedEvidenceAdditions: changes, capacity });
  recovery.sha256 = digest(path.join(__dirname, recovery.path));
  const env = { ...osEnvironment(), GIT_CONFIG_GLOBAL: globalConfig };
  completePreparation({ snapshot, archive, directory, previous, capacity, env, retry: true, recovery });
}
function copyDependencies() {
  const { target, manifest } = verifyCandidate(), previous = previousInstallation();
  assert.deepEqual(sourceInputs(target.candidate), previous.inputs);
  const destination = path.join(target.candidate, 'node_modules'); assertNoLinks(destination, true); assert(!fs.existsSync(destination), 'Dependency copy destination must be new');
  const files = dependencyFiles(previous.source, true), bytes = files.reduce((total, file) => total + file.bytes, 0), capacity = assertCapacity('Copy', { dependencyBytes: bytes });
  fs.mkdirSync(destination);
  for (const file of files) {
    const source = path.join(previous.source, file.path), output = path.join(destination, file.path); assertNoLinks(source);
    assert.equal(digest(source), file.sha256, 'Prior installation changed before copy'); fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.copyFileSync(source, output, fs.constants.COPYFILE_EXCL); assert.equal(digest(output), file.sha256, 'Dependency copy checksum mismatch');
  }
  assert.deepEqual(dependencyFiles(previous.source, true), files, 'Prior installation changed during copy');
  assert.deepEqual(dependencyFiles(destination, true), files, 'Copied installation identity differs');
  verifyCandidate();
  write('DEPENDENCY_COPY_MANIFEST.json', { utc: new Date().toISOString(), files, fileListSha256: hash(JSON.stringify(files)), totalBytes: bytes });
  write('CANDIDATE_DEPENDENCIES.json', { utc: new Date().toISOString(), passed: true, candidate: target.candidate, sourceManifestSha256: manifest.manifestSha256,
    previous, destination, capacity, files: files.length, totalBytes: bytes, fileManifest: { path: 'DEPENDENCY_COPY_MANIFEST.json', sha256: digest(path.join(__dirname, 'DEPENDENCY_COPY_MANIFEST.json')) },
    sourceAndDestinationChecksumsEqual: true, sourceUnchanged: true, independentRegularFileCopy: true, cleanInstallPerformed: false,
    limitation: 'Copies the previously qualified installed dependency bytes under identical package/lock/schema/vendor inputs; this run does not establish a new clean install. Native readiness/build/runtime need separate current-candidate checks.' });
  console.log(JSON.stringify({ copied: true, files: files.length, totalBytes: bytes, cleanInstallPerformed: false }));
}
module.exports = { sourceInputs, migrationInputs, previousInstallation, dependencyFiles, assertCapacity };
if (require.main === module) {
  try { assert.equal(process.argv.length, 3); const mode = process.argv[2]; if (mode === 'plan-dependencies') capacityPlan(); else if (mode === 'prepare') prepare(); else if (mode === 'resume-prepare') resumePreparation(); else if (mode === 'copy-dependencies') copyDependencies(); else throw new Error('Expected plan-dependencies|prepare|resume-prepare|copy-dependencies'); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
