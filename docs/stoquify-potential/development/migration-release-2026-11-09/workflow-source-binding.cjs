// Connect separate evidence classes without relabeling earlier browser checks.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../../..');
const digest = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const prior = path.join(root, 'docs/stoquify-potential/development/authenticated-sales-accounting-2026-11-08/VERIFICATION_SUMMARY.json');
const previous = JSON.parse(fs.readFileSync(prior, 'utf8'));
const { target, manifest } = require('./candidate-validation.cjs').verifyCandidate();
const files = previous.focusedTypeRoots.map(entry => {
  const candidateSha256 = digest(path.join(target.candidate, entry.path));
  const workspaceSha256 = digest(path.join(root, entry.path));
  assert.equal(candidateSha256, entry.sha256, `Earlier workflow proof no longer binds candidate: ${entry.path}`);
  assert.equal(workspaceSha256, candidateSha256, `Workflow source changed in workspace: ${entry.path}`);
  return { path: entry.path, candidateSha256, workspaceSha256, earlierDevelopmentSha256: entry.sha256 };
});
const result = {
  checkedAt: new Date().toISOString(), passed: true, candidateSourceManifestSha256: manifest.manifestSha256,
  earlierEvidenceSha256: digest(prior), files,
  evidenceClasses: {
    earlierAuthenticatedInterface: 'Actual sign-in and financial writers in the development application; current datamodel bootstrap, not migrated schema or sealed runtime.',
    migratedFinancialKernels: 'Current frozen financial services with real PostgreSQL and all 121 migrations, supplied trusted controls and synthetic zero-tax mappings.',
    artifact: 'Separate build/runtime receipts are required. Source equality alone is not a rendered standalone runtime check.',
  },
};
fs.writeFileSync(path.join(__dirname, 'WORKFLOW_SOURCE_BINDING.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ passed: true, roots: files.length, candidateSourceManifestSha256: manifest.manifestSha256 }));
