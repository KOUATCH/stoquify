// Record scoped Jest evidence and bind it to the inspected local source bytes.
// No application imports, environment loading, database or network access.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const root = path.resolve(__dirname, '../../..');
const read = file => JSON.parse(fs.readFileSync(path.join(__dirname, file), 'utf8'));
const digest = file => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
const before = read('review-tools-before.json'), after = read('review-tools-after.json');
const sourceFiles = [
  'scripts/statutory-country-pack-review-preflight.js',
  'scripts/statutory-country-pack-review-package.js',
  'scripts/statutory-country-pack-production-gate.js',
  'scripts/__tests__/statutory-country-pack-review-preflight.test.js',
  'scripts/__tests__/statutory-country-pack-review-package.test.js',
  'scripts/__tests__/statutory-country-pack-production-gate.test.js',
  'scripts/jest.payroll-review-tools.config.cjs',
].map(file => ({ file, sha256: digest(file) }));
const summary = result => ({ passed: result.success, suites: result.numTotalTestSuites, tests: result.numTotalTests, passedTests: result.numPassedTests, failedTests: result.numFailedTests });
const result = {
  generatedAt: new Date().toISOString(), workItem: 'ENG-10',
  status: after.success && after.numFailedTests === 0 && after.numTotalTestSuites === 3 ? 'COMPLETED_ENGINEERING' : 'PENDING_ENGINEERING',
  evidenceClass: 'PURE_NODE_UNIT_TESTS_WITH_SYNTHETIC_FILESYSTEM_FIXTURES',
  command: 'node node_modules/jest/bin/jest.js --config scripts/jest.payroll-review-tools.config.cjs --runInBand --json --outputFile docs/database-seed/payroll-unblock-workpapers/review-tools-after.json',
  sideEffects: 'Jest cache, synthetic OS temporary files and explicit JSON output only; isolated configuration has no Next/env/application setup.',
  before: summary(before), after: summary(after), sourceFiles,
  testArtifacts: ['review-tools-before.json', 'review-tools-after.json'].map(name => ({ file: `docs/database-seed/payroll-unblock-workpapers/${name}`, sha256: digest(`docs/database-seed/payroll-unblock-workpapers/${name}`) })),
  completed: [
    'MORE_EVIDENCE_REQUIRED is a recordable family response, never approval.',
    'EXPERT_REVIEWED and REGULATOR_CONFIRMED are accepted transitioned states only with complete approval bindings; legacy APPROVED is rejected.',
    'Preflight condition 11 requires the shared signature/checker validator; the total remains 12 conditions.',
    'Pending source production flags and invalid or overbroad approval intervals are rejected.',
    'Fixture hash readiness rejects empty/scalar independent reviews and duplicate/unnamed families.',
    'Signature checks reject missing reviewer identity and same-person checker records.',
  ],
  remaining: [
    { ids: ['ENG-01'], input: 'Reviewed calculation contract and independent expected-result fixtures for tax-year/YTD, adjustments, corrections/reversals, ordering and refunds.', owner: 'Qualified reviewer and payroll owner' },
    { ids: ['ENG-02', 'ENG-03', 'ENG-04', 'ENG-05', 'ENG-06'], dependency: 'ENG-01', work: 'Implement authoritative history and adjustment binding, completeness/year basis, concurrency/order, correction identities and stored base/refund behavior.' },
    { ids: ['ENG-07'], dependency: 'ENG-01 through ENG-06 plus approved pack/admission fixtures', work: 'Integrated service, real PostgreSQL concurrency/replay and downstream lifecycle evidence.' },
    { ids: ['ENG-08'], dependency: 'ENG-01 through ENG-07, approved date-effective pack/admission, ENG-09 scope', work: 'Replace September-only runner with controlled chronological lifecycle for the agreed months; verify replay without duplicates. No speculative lifecycle implementation was added.' },
    { ids: ['ENG-09'], input: 'Explicit October pending scope or complete supported inputs beyond October 28 for the October 31 pay date.', owner: 'Dataset owner' },
  ],
  notRun: { realPostgreSQL: 'NOT_RUN', browser: 'NOT_RUN', broadBuild: 'NOT_RUN', actualSignatureAuthentication: 'NOT_PERFORMED', productionReleaseGate: 'NOT_RUN; its synthetic unit suite ran' },
  nonClaims: ['No canonical manifest, approval template, pack authority, application payroll behavior, database or runtime configuration changed.', 'These structural checks do not authenticate a real signature or establish statutory correctness.'],
};
fs.writeFileSync(path.join(__dirname, 'engineering-results.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ status: result.status, before: result.before, after: result.after }));
if (result.status !== 'COMPLETED_ENGINEERING') process.exitCode = 1;
