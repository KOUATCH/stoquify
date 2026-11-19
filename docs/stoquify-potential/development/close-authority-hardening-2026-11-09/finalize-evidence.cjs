// File-only source/result binding. No application, database, generator or build.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '../../../..');
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const unitDir = path.join(__dirname, 'unit-2026-11-09T16-39-49-996Z');
const unit = read(path.join(unitDir, 'results.json')), verification = read(path.join(unitDir, 'verification.json'));
const types = read(path.join(__dirname, 'owned-types.result.json'));
const pg = read(path.join(__dirname, 'pg-LATEST.json'));
const pgSource = read(path.join(pg.evidenceDirectory, 'pg-SOURCE_MANIFEST.json'));
const probes = read(path.join(pg.evidenceDirectory, 'pg-probes.json'));
const priorManifest = path.join(root, 'docs/stoquify-potential/development/migration-release-2026-11-09/CANDIDATE_SOURCE_MANIFEST.json');
const prior = read(priorManifest), previous = new Map(prior.files.map(file => [file.path, file.sha256]));
assert(unit.success && unit.numPassedTests === 516 && unit.numFailedTests === 0 && unit.numPendingTests === 0);
assert(verification.exitCode === 0 && types.ownedOrGlobalErrorCount === 0 && types.externalDiagnosticCount === 0);
assert(pg.passed && pg.ownedClusterStopped && pg.checks.some(check => check.passedTests === 40));
assert(Object.values(probes.noFinancialOrCertificationRecords).every(count => count === 0));
const files = Object.entries(verification.sourceHashes).map(([file, testedSha256]) => {
  const current = sha(path.join(root, file)); assert.equal(current, testedSha256, `Tested source changed: ${file}`);
  if (types.sourceHashes[file]) assert.equal(types.sourceHashes[file], current);
  const databaseSource = pgSource.files.find(entry => entry.path === file);
  if (databaseSource) assert.equal(databaseSource.sha256, current);
  return { path: file, sha256: current, previousCandidateSha256: previous.get(file) || null, changedFromCandidate: previous.get(file) !== current };
});
for (const file of pgSource.files) assert.equal(sha(path.join(root, file.path)), file.sha256);
const unchanged = ['prisma/schema.prisma', 'package.json', 'package-lock.json'].map(file => {
  const current = sha(path.join(root, file)); assert.equal(current, previous.get(file)); return { path: file, sha256: current };
});
const result = { checkedAt: new Date().toISOString(), status: 'PASS_SCOPED_CLOSE_WRITE_AUTHORITY',
  gitHead: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8', windowsHide: true }).trim(),
  baseline: 'Existing dirty working tree; affected pre-change files bound to prior candidate manifest, not a clean HEAD-only change',
  previousCandidateManifestSha256: sha(priorManifest), previousCandidateSourceSha256: prior.manifestSha256,
  files, unchanged,
  unit: { evidence: path.relative(__dirname, unitDir).replaceAll('\\', '/'), suites: unit.numPassedTestSuites, passed: unit.numPassedTests, failed: unit.numFailedTests, skipped: unit.numPendingTests,
    classes: 'Real protect/context adapter tests with auth/entitlement/writers mocked; persisted authority SQL mocked; business writer transaction doubles' },
  types: { roots: types.rootNames.length, sourceFiles: types.sourceFileCount, diagnostics: types.diagnostics.length, noEmit: true, incremental: false },
  postgres: { evidence: path.relative(__dirname, pg.evidenceDirectory).replaceAll('\\', '/'), database: pg.database, passed: 40, skipped: 0, fullReplayMigrations: 121,
    schemaCertification: pg.checks.find(check => check.stage === 'fullFreshReplay').certification, ownedClusterStopped: pg.ownedClusterStopped,
    sourceClosureFiles: pgSource.files.length, sourceClosureSha256: pgSource.sourceSha256, noFinancialOrCertificationRecords: probes.noFinancialOrCertificationRecords,
    classes: 'Real helper, current module policy/RBAC and persisted authority rows, exact-PID SQL lock waits, real expiry, probe commit/rollback only' },
  notRun: ['Current-source application build', 'Browser/login journey for this patch', 'Whole-repository typecheck/test suite', 'Production migration/deployment'],
  oldArtifact: 'Prior qualified candidate/artifact remains unchanged. This patch requires a new source-bound build/qualification before release.' };
fs.writeFileSync(path.join(__dirname, 'SOURCE_AND_RESULTS.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ status: result.status, boundFiles: files.length, changedFromCandidate: files.filter(file => file.changedFromCandidate).length,
  mockedOrBoundaryTests: result.unit.passed, realPostgresTests: result.postgres.passed, typeDiagnostics: result.types.diagnostics, clusterStopped: result.postgres.ownedClusterStopped }));
