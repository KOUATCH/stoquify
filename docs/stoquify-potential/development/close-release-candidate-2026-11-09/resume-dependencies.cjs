// Resume only this run's interrupted independent copy. Never alters frozen harness/source.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { digest, hash, read, assertNoLinks, verifyCandidate } = require('./candidate-validation.cjs');
const { previousInstallation, sourceInputs, assertCapacity } = require('./candidate.cjs');
const originalPid = 18492;
const write = (name, value) => fs.writeFileSync(path.join(__dirname, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
function assertOriginalStopped() {
  try { process.kill(originalPid, 0); } catch (error) { if (error.code === 'ESRCH') return; throw error; }
  throw Error('Original owned copy PID18492 still exists; root must stop/review it before resume');
}
// Every directory is visited once. Dirent detects junctions/symlinks without
// repeating the complete ancestor lstat chain for every installed package file.
function inventory(directory) {
  const result = [];
  function visit(relative = '') {
    const entries = fs.readdirSync(path.join(directory, relative), { withFileTypes: true }).sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
    assert.equal(new Set(entries.map(entry => entry.name.toLowerCase())).size, entries.length, 'Ambiguous dependency path case');
    for (const entry of entries) {
      const name = relative ? `${relative}/${entry.name}` : entry.name;
      assert(!entry.isSymbolicLink(), 'Dependency links/junctions require separate review');
      if (entry.isDirectory()) visit(name);
      else {
        assert(entry.isFile(), 'Nonregular dependency entry');
        const bytes = fs.readFileSync(path.join(directory, name)); result.push({ path: name, bytes: bytes.length, sha256: hash(bytes) });
      }
    }
  }
  assertNoLinks(directory); assert(fs.lstatSync(directory).isDirectory()); visit();
  return result.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
}
function main() {
  assert.equal(process.argv.length, 2, 'No path, PID or authority overrides accepted'); assertOriginalStopped();
  for (const name of ['CANDIDATE_DEPENDENCIES.json', 'DEPENDENCY_COPY_MANIFEST.json', 'DEPENDENCY_RESUME_CAPACITY.json', 'DEPENDENCY_RECOVERY_STARTED.json', 'DEPENDENCY_COPY_RECOVERY.json']) assert(!fs.existsSync(path.join(__dirname, name)), 'Existing copy completion/recovery evidence requires review');
  const { target, manifest } = verifyCandidate(), previous = previousInstallation(), destination = path.join(target.candidate, 'node_modules');
  assert.equal(path.basename(target.directory), 'close-release-20261109-9cf90a4714', 'Only the exact interrupted owned run may resume');
  assert.deepEqual(sourceInputs(target.candidate), previous.inputs); assertNoLinks(destination);
  const originalRunner = target.runners.find(file => file.path === 'candidate.cjs'); assert(originalRunner); assert.equal(digest(path.join(__dirname, originalRunner.path)), originalRunner.sha256);
  const sourceBefore = inventory(previous.source), destinationBefore = inventory(destination), expected = new Map(sourceBefore.map(file => [file.path, file]));
  const existing = new Map(destinationBefore.map(file => [file.path, file]));
  for (const file of destinationBefore) assert(expected.has(file.path), 'Unexpected file in owned partial dependency copy');
  const missing = sourceBefore.filter(file => !existing.has(file.path));
  const replacements = sourceBefore.filter(file => existing.has(file.path) && (existing.get(file.path).sha256 !== file.sha256 || existing.get(file.path).bytes !== file.bytes));
  const requiredWrites = new Set([...missing, ...replacements].map(file => file.path));
  const neededBytes = [...missing, ...replacements].reduce((total, file) => total + file.bytes, 0), totalBytes = sourceBefore.reduce((total, file) => total + file.bytes, 0);
  const baseCapacity = assertCapacity('Build'), reviewPath = path.join(__dirname, 'CAPACITY_REVIEW.json'), review = read(reviewPath);
  const disk = fs.statfsSync(target.directory), freeBytes = disk.bavail * disk.bsize, requiredFreeBytes = review.minimumBuildFreeBytes + neededBytes;
  assert(Number.isSafeInteger(requiredFreeBytes) && freeBytes >= requiredFreeBytes, 'Remaining copy plus unchanged reviewed compiler/database/overhead reserve does not fit');
  const capacity = { checkedAt: new Date().toISOString(), passed: true, reviewSha256: digest(reviewPath), baseCapacity,
    minimumBuildFreeBytes: review.minimumBuildFreeBytes, neededBytes, requiredFreeBytes, freeBytes,
    missingFiles: missing.length, replacementFiles: replacements.length, skippedCorrectFiles: sourceBefore.length - requiredWrites.size,
    formula: 'Unchanged reviewed minimumBuildFreeBytes +full missing/replacement file bytes; existing correct files are not allocated twice' };
  write('DEPENDENCY_RESUME_CAPACITY.json', capacity);
  const started = { checkedAt: new Date().toISOString(), candidate: target.candidate, source: previous.source, destination,
    sourceManifestSha256: manifest.manifestSha256, originalPid, originalProcessVerifiedAbsent: true, originalRunnerSha256: originalRunner.sha256,
    newRunnerSha256: digest(__filename), previous, sourceFileListSha256: hash(JSON.stringify(sourceBefore)), partialFileListSha256: hash(JSON.stringify(destinationBefore)),
    skippedCorrectFiles: sourceBefore.length - requiredWrites.size, missingFiles: missing.length,
    replacements: replacements.map(file => ({ path: file.path, before: existing.get(file.path), after: file })),
    replacementPolicy: 'Only known owned partial-copy regular files with unchanged observed hash and nlink1 may be overwritten; unexpected paths/links fail',
    capacityReceiptSha256: digest(path.join(__dirname, 'DEPENDENCY_RESUME_CAPACITY.json')) };
  write('DEPENDENCY_RECOVERY_STARTED.json', started); assertOriginalStopped();
  console.log(JSON.stringify({ stage: 'verified-resume-plan', sourceFiles: sourceBefore.length, missingFiles: missing.length, replacements: replacements.length, neededBytes }));
  let written = 0;
  for (const file of sourceBefore) {
    if (!requiredWrites.has(file.path)) continue;
    const source = path.join(previous.source, file.path), output = path.join(destination, file.path), replacing = existing.has(file.path);
    if (replacing) {
      const stat = fs.lstatSync(output); assert(stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1, 'Replacement must remain an independent regular file');
      assert.equal(digest(output), existing.get(file.path).sha256, 'Partial destination changed after inspection');
    }
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.copyFileSync(source, output, replacing ? 0 : fs.constants.COPYFILE_EXCL);
    assert.equal(digest(output), file.sha256, 'Copied dependency checksum differs');
    written++; if (written % 10000 === 0) console.log(JSON.stringify({ stage: 'copying', written, neededFiles: requiredWrites.size }));
  }
  assert.deepEqual(inventory(previous.source), sourceBefore, 'Prior dependency source changed during recovery');
  assert.deepEqual(inventory(destination), sourceBefore, 'Complete destination/source dependency identities differ');
  verifyCandidate(); assertOriginalStopped();
  write('DEPENDENCY_COPY_MANIFEST.json', { utc: new Date().toISOString(), files: sourceBefore, fileListSha256: hash(JSON.stringify(sourceBefore)), totalBytes });
  write('DEPENDENCY_COPY_RECOVERY.json', { ...started, completedAt: new Date().toISOString(), passed: true, writtenFiles: written,
    sourceUnchanged: true, fullSourceDestinationIdentityEqual: true, originalInterruptedCopyRetained: true,
    capacity, frozenSourceArchiveAndManifestUnchanged: true, startedReceiptSha256: digest(path.join(__dirname, 'DEPENDENCY_RECOVERY_STARTED.json')) });
  write('CANDIDATE_DEPENDENCIES.json', { utc: new Date().toISOString(), passed: true, candidate: target.candidate, sourceManifestSha256: manifest.manifestSha256,
    previous, destination, capacity, files: sourceBefore.length, totalBytes, fileManifest: { path: 'DEPENDENCY_COPY_MANIFEST.json', sha256: digest(path.join(__dirname, 'DEPENDENCY_COPY_MANIFEST.json')) },
    sourceAndDestinationChecksumsEqual: true, sourceUnchanged: true, independentRegularFileCopy: true, cleanInstallPerformed: false,
    externalRecovery: { path: 'DEPENDENCY_COPY_RECOVERY.json', sha256: digest(path.join(__dirname, 'DEPENDENCY_COPY_RECOVERY.json')) },
    limitation: 'Independent checksum-verified reuse of the previous installed tree after stopping the slow original copier; not a new clean installation. Native/build/runtime qualification remains separate.' });
  console.log(JSON.stringify({ passed: true, files: sourceBefore.length, written, skipped: sourceBefore.length - written, totalBytes, cleanInstallPerformed: false }));
}
if (require.main === module) { try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; } }
