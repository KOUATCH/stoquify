// Independent reconciliation of completed native receipts; no database connections.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../../../../..'), evidence = path.resolve(__dirname, '..');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const read = relative => JSON.parse(fs.readFileSync(path.join(evidence, relative), 'utf8').replace(/^\uFEFF/, ''));
const report = read('database/native-result-retry02.json'), jest = read('database/native-jest-retry02.json'), observations = read('database/native-observations-retry02.json').observations;
assert.equal(report.passed, true); assert.equal(report.testExitCode, 0); assert.equal(report.migrationsVerified, 121);
assert.equal(report.sourceUnchanged, true); assert.equal(report.migrationsUnchanged, true);
assert.deepEqual(report.sourceBefore, report.sourceAfter);
assert.deepEqual(report.tests, { total: 43, passed: 43, failed: 0, pending: 0 });
assert.equal(jest.numPassedTests, 43); assert.equal(jest.numFailedTests, 0); assert.equal(jest.numPendingTests, 0);
const assertions = jest.testResults.flatMap(suite => suite.assertionResults);
assert.equal(assertions.length, 43); assert(assertions.every(row => row.status === 'passed'));
const relocation = read('database/test-source-relocation-retry02.json');
const originalPath = path.join(evidence, relocation.originalPath);
assert.equal(hash(fs.readFileSync(path.join(evidence, relocation.archivedPath))), relocation.sha256);
let archivesUsed = 0;
for (const entry of report.sourceBefore) {
  let file = path.join(root, entry.path);
  if (file === originalPath) { file = path.join(evidence, relocation.archivedPath); archivesUsed++; }
  assert.equal(hash(fs.readFileSync(file)), entry.sha256, 'Current source differs: ' + entry.path);
}
assert.equal(archivesUsed, 1);
for (const entry of report.migrations) {
  assert.equal(hash(fs.readFileSync(path.join(root, 'prisma/migrations', entry.path))), entry.sha256);
  assert.equal(hash(fs.readFileSync(path.join(report.target.cluster, '../schema/migrations', entry.path))), entry.sha256);
}
assert.equal(report.migrations.length, 122);
assert.equal(observations.length, 43);
const denied = observations.filter(row => row.response?.success === false);
assert.equal(denied.length, 32);
let auditedEffects = 0;
for (const row of denied) {
  assert.equal(Object.keys(row.before).length, 24); assert.deepEqual(row.before, row.after);
  assert.equal(typeof row.response.error, 'string'); assert(!('data' in row.response));
  assert(!JSON.stringify(row.response).includes('P04R03_PRIVATE_DATABASE_DETAIL_SENTINEL'));
  assert(Number.isSafeInteger(row.securityAuditRowsAdded) && row.securityAuditRowsAdded >= 0);
  auditedEffects += row.securityAuditRowsAdded;
}
const positives = observations.filter(row => row.expectedMutationVerified === true);
assert.equal(positives.length, 9); assert(positives.every(row => row.foreignItemUnchanged === true));
const forgedList = observations.find(row => row.name === 'list:forged-organization');
assert.equal(forgedList.actorTenantOnly, true); assert.deepEqual(forgedList.before, forgedList.after);
const stock = observations.find(row => row.name === 'stock:authorized-nonzero');
assert.equal(stock.submittedAdjustment, true); assert.equal(stock.postedStockOrLedger, false); assert.equal(stock.foreignItemUnchanged, true);
for (const name of ['inventory_levels', 'inventory_transactions', 'ledger_posting_batches']) assert.deepEqual(stock.before[name], stock.after[name]);
assert.equal(stock.after.stock_adjustments.count - stock.before.stock_adjustments.count, 1);
assert.equal(stock.after.stock_adjustment_lines.count - stock.before.stock_adjustment_lines.count, 1);
assert.equal(report.cleanup.clusterStopped, true); assert.equal(report.cleanup.portReleased, true); assert.deepEqual(report.remainingClients, []);
assert(!fs.existsSync(path.join(report.target.cluster, 'postmaster.pid')));
const owner = JSON.parse(fs.readFileSync(path.join(report.target.cluster, '../owner.json'), 'utf8'));
assert.equal(owner.state, 'stopped'); assert.equal(owner.ownedPid, report.target.ownedPid);
const result = {
  reviewedAt: new Date().toISOString(), reviewer: 'r03_review', passed: true,
  candidateId: read('candidate.json').id, testsPassed: 43, failed: 0, skipped: 0,
  sourceHashesRecomputed: report.sourceBefore.length, archivedTestHashesRecomputed: archivesUsed,
  migrationFilesRecomputedAtSourceAndScaffold: report.migrations.length, migrationsVerified: 121,
  observations: 43, deniedBusinessSnapshotPairs: 32, relationGroupsPerPair: 24, comparedBusinessRelationsUnchanged: true,
  explicitSecurityAuditRowsAcrossDeniedCases: auditedEffects, authorizedHandlerPositiveCases: 9,
  forgedListTenantPositive: true, nonzeroStockSubmissionPositive: true, realStockPolicyAndTriggerRollback: true,
  cleanup: { ...report.cleanup, port: report.target.port, ownedPid: report.target.ownedPid, postmasterPidAbsentAtReview: true, ownerState: owner.state, remainingClients: 0 },
  receiptHashes: ['database/native-result-retry02.json', 'database/native-jest-retry02.json', 'database/native-observations-retry02.json'].map(file => ({path: file, sha256: hash(fs.readFileSync(path.join(evidence, file)))})),
  limits: ['Better Auth/Next transport/cache stubbed; no signed-cookie HTTP/browser proof.', 'Business no-change assertion covers the24named relation groups; security audits deliberately excluded and counted.', 'Initial EACCES and retry01snapshot-schema failures retained and not treated as passing evidence.'],
};
fs.writeFileSync(path.join(__dirname, 'NATIVE-RECONCILIATION.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result));
