// Pure filesystem evidence; never loads environment files or contacts services.
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const owned = [
  'AGENTS.md', 'package.json', '.github/workflows/ci.yml',
  'docs/ecc/WORKFLOW.md', 'docs/ecc/test-lanes.md', 'docs/ecc/command-registry.json',
  'docs/release/ARTIFACT_SCHEMA_PROMOTION.md',
  'docs/prompt-execution/S10-S11_EXECUTION_2026-10-16.md',
  'docs/prompt-execution/S10-S11_SCOPE_2026-10-16.json',
  'services/pos/checkout.service.ts', 'services/pos/pos.schemas.ts',
  'actions/pos/checkout.actions.ts', 'hooks/posHooks/usePOSCheckoutLifecycle.ts',
  'hooks/posHooks/__tests__/checkout-lifecycle-races.test.tsx',
  'services/pos/__tests__/checkout-lifecycle.service.test.ts',
  'services/pos/__tests__/checkout-lifecycle.postgres.test.ts',
  'scripts/prisma-production-migration-gate.js', 'scripts/__tests__/prisma-production-migration-gate.test.js',
  'scripts/ci-release-readiness-gate.js', 'scripts/__tests__/ci-release-readiness-gate.test.js',
  'scripts/release-artifact.cjs', 'scripts/promote-release-schema.cjs',
  'scripts/run-s10-benchmark.cjs', 'scripts/verify-s11-local.cjs',
  'scripts/s11-fixture-build.cjs', 'scripts/verify-s11-fixture-rebuild.cjs',
  'scripts/verify-s11-artifact-runtime.cjs', 'scripts/record-s10-s11-evidence.cjs',
  'jest.s10-s11.config.cjs', 'tsconfig.s10-s11.json',
  'tests/s10-s11/lease-benchmark.postgres.test.ts', 'tests/s10-s11/renew-action.test.ts',
  'tests/s10-s11/release-artifact.test.js',
].sort();
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const [mode, evidence, archive = 'candidate-final.json.gz'] = process.argv.slice(2);
if (!/^candidate-final(?:-v\d+)?\.json\.gz$/.test(archive)) throw new Error('Unexpected final archive name');
if (mode === 'scope') {
  fs.writeFileSync('docs/prompt-execution/S10-S11_SCOPE_2026-10-16.json', JSON.stringify({ steps: ['S10', 'S11'], ownedFiles: owned, boundary: 'Only new hunks relative to the recorded shared working-tree baseline; existing unrelated edits remain owned by their authors', productionAuthorized: false, unchangedRolloutGates: ['S06', 'S07', 'S08', 'S09'], localEvidenceDoesNotAuthorizeRollout: true }, null, 2) + '\n', { flag: 'wx' });
} else if (mode === 'record' && evidence) {
  const read = name => JSON.parse(fs.readFileSync(path.join(evidence, name)));
  const snapshot = name => JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(evidence, name))));
  const before = snapshot('baseline.json.gz'), after = snapshot(archive);
  const beforeMap = new Map(before.files.map(file => [file.path, file.sha256]));
  const afterMap = new Map(after.files.map(file => [file.path, file.sha256]));
  const changed = [...afterMap].filter(([file, digest]) => beforeMap.get(file) !== digest).map(([file]) => file);
  const missing = [...beforeMap.keys()].filter(file => !afterMap.has(file));
  assert.equal(missing.length, 0, 'Baseline source removal requires review');
  for (const file of owned) assert.equal(hash(fs.readFileSync(file)), afterMap.get(file), 'Final owned source drift: ' + file);
  const testFiles = ['unit-final-v3.json', 'release-final.json', 'ci-unit.json', 'unit-concurrent-recheck.json', ...fs.readdirSync(evidence).filter(name => /-(lifecycle|pos)-.*\.json$/.test(name))];
  const tests = testFiles.map(file => { const result = read(file); assert.ok(result.success && result.numPassedTests && !result.numPendingTests && !result.numFailedTests); return { file, passed: result.numPassedTests, sha256: hash(fs.readFileSync(path.join(evidence, file))) }; });
  for (const file of ['benchmark-after-final.json', 'benchmark-plan-corrected.json']) assert.ok(read(file).cases.every(row => row.failures.length === 0 && row.recoveryDiscoverable));
  assert.equal(read('artifact-http-final.json').html, 200);
  assert.equal(read('ci-contract-final.json').summary.status, 'ready');
  const evidenceFiles = fs.readdirSync(evidence).filter(name => /\.(json|log)$/.test(name) && !name.endsWith('.manifest.json') && name !== 'evidence.json').map(file => ({ file, sha256: hash(fs.readFileSync(path.join(evidence, file))) }));
  fs.writeFileSync(path.join(evidence, 'evidence.json'), JSON.stringify({ generatedAt: new Date().toISOString(), head: after.head, baselineSha256: hash(fs.readFileSync(path.join(evidence, 'baseline.json.gz'))), finalArchive: archive, finalArchiveSha256: hash(fs.readFileSync(path.join(evidence, archive))), sourceFiles: after.files.length, owned, ownedSourceMatchesFinalArchive: true, removedBaselineFiles: missing, changedOwnedFiles: changed.filter(file => owned.includes(file)), concurrentUnownedChangesPreserved: changed.filter(file => !owned.includes(file)), tests, evidenceFiles, fullApplicationReleaseQualified: false, productionTouched: false, openGates: ['S06', 'S07', 'S08', 'S09', 'S10 operational performance/cohort qualification', 'S11 full candidate/hosted promotion qualification'] }, null, 2), { flag: 'wx' });
  console.log(JSON.stringify({ owned: owned.length, finalArchive: archive, finalArchiveSha256: hash(fs.readFileSync(path.join(evidence, archive))), concurrentUnownedChanges: changed.filter(file => !owned.includes(file)).length }));
} else throw new Error('Usage: scope | record <evidence-directory>');
