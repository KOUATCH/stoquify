// File-only independent verification of the retained source/amendment chain.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '../../../..');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const digest = file => hash(fs.readFileSync(file));
function read(name) { assert(/^[A-Z_]+\.json$/.test(name)); return JSON.parse(fs.readFileSync(path.join(__dirname, name), 'utf8')); }
function receipt(entry) { assert(/^[A-Z_]+\.json$/.test(entry.path)); assert.equal(digest(path.join(__dirname, entry.path)), entry.sha256); return read(entry.path); }
function identity(candidate, manifest) {
  const { included } = require(path.join(root, 'scripts/candidate-snapshot.cjs'));
  const knownRoots = new Set(manifest.files.filter(file => file.path.includes('/')).map(file => file.path.split('/')[0]));
  const selectors = fs.readdirSync(candidate, { withFileTypes: true }).filter(entry => entry.isDirectory()
    ? knownRoots.has(entry.name) || included(entry.name + '/__candidate_probe__.json')
    : included(entry.name)).map(entry => entry.name);
  const names = [...new Set(execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z', '--', ...selectors], { cwd: candidate, maxBuffer: 30e6 }).toString().split('\0').filter(Boolean))].sort();
  return names.filter(name => included(name) && fs.existsSync(path.join(candidate, name))).map(name => {
    assert(fs.lstatSync(path.join(candidate, name)).isFile());
    return { path: name, sha256: digest(path.join(candidate, name)) };
  });
}
function verifyCandidate() {
  const target = read('CANDIDATE_TARGET.json'), manifest = read('CANDIDATE_SOURCE_MANIFEST.json'), raw = read('RAW_SOURCE_MANIFEST.json');
  const owned = fs.realpathSync(path.join(root, '.codex-tmp')) + path.sep;
  assert(fs.realpathSync(target.directory).startsWith(owned));
  assert(/^sales-accounting-release-20261109-[a-f0-9]{10}$/.test(path.basename(target.directory)));
  assert.equal(target.candidate, path.join(target.directory, 'candidate')); assert.equal(manifest.candidate, target.candidate);
  assert.equal(digest(path.join(target.directory, 'raw-source-snapshot.json.gz')), raw.archiveSha256);
  assert.equal(manifest.rawArchiveSha256, raw.archiveSha256);
  assert.equal(hash(JSON.stringify(manifest.files)), manifest.manifestSha256);
  const amendmentEntry = manifest.sourceAmendments.find(item => item.path === 'SOURCE_AMENDMENT.json');
  const finalEntry = manifest.sourceAmendments.find(item => item.path === 'SOURCE_AMENDMENT_FINALIZED.json');
  assert(amendmentEntry && finalEntry);
  const amendment = receipt(amendmentEntry), finalized = receipt(finalEntry);
  assert(amendment.rawArchiveUnchanged && finalized.rawArchiveUnchanged);
  assert.equal(finalized.rawArchiveSha256, raw.archiveSha256);
  assert.equal(finalized.retainedAmendmentSha256, amendmentEntry.sha256);
  assert.equal(finalized.candidateManifestSha256, manifest.manifestSha256);
  assert(finalized.completeCandidateIdentityVerified && finalized.completeRootBindingVerifiedWithScopedEvidenceException);
  const approved = { path: 'actions/item/__tests__/list-items-error-responses.action.test.ts', before: null, after: 'b1d43e3ba41e0e08a7116407242c048938a1a4f96c608baac94f572db1c64455' };
  assert.deepEqual(amendment.amendments, [approved]);
  const expected = new Map(raw.files.map(item => [item.path, item.sha256]));
  assert(!expected.has(approved.path)); expected.set(approved.path, approved.after);
  const reconstructed = [...expected].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([name, sha256]) => ({ path: name, sha256 }));
  assert.deepEqual(manifest.files, reconstructed);
  const binding = manifest.rootBindingAtPreparation;
  assert(binding.authorizedEvidenceOnlyDrift === true);
  const review = receipt(binding.review);
  assert.equal(review.sourceManifestSha256, manifest.manifestSha256);
  assert.equal(finalized.rootBindingReviewSha256, binding.review.sha256);
  const prefix = 'docs/stoquify-potential/development/migration-release-2026-11-09/';
  assert(Array.isArray(review.changes));
  for (const change of review.changes) assert(change.path.startsWith(prefix) && /\.(json|md|txt)$/.test(change.path) && !change.path.split('/').includes('..'));
  assert.deepEqual(identity(target.candidate, manifest), manifest.files, 'Frozen candidate source changed');
  return { target, manifest };
}
module.exports = { verifyCandidate, identity };
if (require.main === module) { try { const { manifest } = verifyCandidate(); console.log(JSON.stringify({ verified: true, files: manifest.files.length, manifestSha256: manifest.manifestSha256 })); } catch (error) { console.error(error.message); process.exitCode = 1; } }
