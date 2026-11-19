// Last source/SDK census after qualification. File/Git reads and one new receipt.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const h = require('./candidate-validation.cjs');
assert.deepEqual(process.argv.slice(2), ['capture']);
const retained = h.osEnvironment(); for (const key of Object.keys(process.env)) delete process.env[key]; Object.assign(process.env, retained);
const runtime = h.read('RUNTIME_QUALIFICATION.json');
assert(runtime.passed && runtime.ownedClusterStopped && runtime.applicationStopped && runtime.portsReleased && runtime.artifactUnchanged);
const { target, manifest } = h.verifyCandidate(), raw = h.read('RAW_SOURCE_MANIFEST.json'), native = h.read('CANDIDATE_NATIVE_READINESS.json'), unit = h.read('UNIT_QUALIFICATION.json');
assert(unit.passed && unit.sourceAndSdkUnchanged && unit.sourceManifestSha256 === manifest.manifestSha256);
function files(directory) {
  h.noLinks(directory);
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name); h.noLinks(file);
    return entry.isDirectory() ? files(file) : [{ path: file, sha256: h.digest(file), bytes: fs.statSync(file).size }];
  }).sort((a, b) => a.path.localeCompare(b.path));
}
assert.deepEqual(files(native.defaultClient), unit.sdkFiles, 'Candidate SDK changed');
assert.deepEqual(files(path.join(h.root, 'node_modules/.prisma/client')).map(({ path, sha256 }) => ({ path, sha256 })), native.sharedBefore, 'Shared root SDK changed');
// verifyCandidate has just checked the complete candidate identity against this
// exact array, including raw-archive binding and the generated Next reference.
const currentCandidateIdentity = manifest.files;
const currentRootIdentity = h.identity(h.root), rootEvidenceChanges = h.changes(raw.files, currentRootIdentity);
assert(rootEvidenceChanges.every(entry => h.isEvidence(entry.path)), 'Root source drift exceeds generated evidence');
for (const directory of [target.directory, target.candidate, path.join(target.candidate, 'prisma')]) assert(!fs.existsSync(path.join(directory, '.env')));
const output = path.join(__dirname, 'FINAL_SOURCE_BINDING.json');
fs.writeFileSync(output, JSON.stringify({ capturedAt: new Date().toISOString(), passed: true, candidate: target.candidate,
  sourceManifestSha256: manifest.manifestSha256, currentCandidateIdentity, currentRootIdentity, rootEvidenceChanges,
  candidateSdkFiles: unit.sdkFiles, sharedRootSdkFiles: native.sharedBefore, candidateAndRootSdkUnchanged: true, privateEnvironmentFilesAbsent: true,
  runtimeQualificationSha256: h.digest(path.join(__dirname, 'RUNTIME_QUALIFICATION.json')),
  sourceVerifier: { path: path.join(__dirname, 'candidate-validation.cjs'), sha256: h.digest(path.join(__dirname, 'candidate-validation.cjs')) },
  runner: { path: __filename, sha256: h.digest(__filename) },
  classification: 'Final Git-aware candidate/root source and SDK census after owned-service cleanup; no build, database or application operation',
}, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ captured: true, candidateFiles: currentCandidateIdentity.length, rootFiles: currentRootIdentity.length, applicationSourceDrift: 0, receiptSha256: h.digest(output) }));
