// Independently reconciles existing unit evidence; does not execute application code.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../../../../..'), evidence = path.resolve(__dirname, '..');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const read = relative => JSON.parse(fs.readFileSync(path.join(evidence, relative), 'utf8').replace(/^\uFEFF/, ''));
const owned = read('owned-source.json'), candidate = read('candidate.json');
const identity = hash(JSON.stringify(owned.files.map(({path, sha256}) => ({path, sha256}))));
assert.equal(identity, candidate.sourceIdentity);
for (const file of owned.files) assert.equal(hash(fs.readFileSync(path.join(root, file.path))), file.sha256);
const current = read('unit/attempt02/result.json'), currentJest = read('unit/attempt02/jest.json');
assert.equal(current.exitCode, 0); assert.deepEqual(current.changedInputs, []);
assert.equal(currentJest.numPassedTests, 224); assert.equal(currentJest.numFailedTests, 0); assert.equal(currentJest.numPendingTests, 0);
assert.equal(currentJest.testResults.length, 4);
const currentAssertions = currentJest.testResults.flatMap(suite => suite.assertionResults);
assert.equal(currentAssertions.length, 224); assert(currentAssertions.every(row => row.status === 'passed'));
for (const entry of current.inputs) assert.equal(hash(fs.readFileSync(path.join(root, entry.file))), entry.sha256);
for (const entry of current.harnessInputs) assert.equal(hash(fs.readFileSync(path.join(evidence, 'unit', entry.file))), entry.sha256);
const before = read('unit/attempt01/result.json'), beforeJest = read('unit/attempt01/jest.json');
assert.notEqual(before.exitCode, 0); assert.deepEqual(before.changedInputs, []);
assert.equal(beforeJest.numFailedTests, 9); assert.equal(beforeJest.numPendingTests, 203);
const red = beforeJest.testResults.flatMap(suite => suite.assertionResults).filter(row => row.status === 'failed');
assert.equal(red.length, 9);
for (const row of red) {
  assert(row.fullName.endsWith('redacts plain service Error'));
  assert(row.failureMessages.some(message => message.includes('PRIVATE_CANARY_7b98_customer_margin')));
}
const relocation = read('unit/baseline-source-relocation.json');
assert.equal(hash(fs.readFileSync(path.join(evidence, relocation.to))), relocation.sha256);
assert.equal(relocation.sha256, read('source-before.json').files.find(entry => entry.path === 'actions/item/items.ts').sha256);
const result = {
  reviewedAt: new Date().toISOString(), reviewer: 'r03_review', passed: true,
  candidateId: candidate.id, sourceIdentity: identity, ownedSourceHashesRecomputed: owned.files.length,
  current: { suites: 4, passed: 224, failed: 0, skipped: 0, sourceInputsRecomputed: current.inputs.length, harnessInputsRecomputed: current.harnessInputs.length },
  baseline: { expectedRed: 9, actualSentinelReturned: true, explicitlyFilteredAssertions: 203, archivedBytesMatch: true },
  suiteBreakdown: currentJest.testResults.map(suite => ({path: path.relative(root, suite.name).replaceAll('\\', '/'), tests: suite.assertionResults.length})),
  limits: ['Mocked services/guards and real normalization/schemas; no native persistence or browser proof.', 'The existing create/edit continuity tests retain their own mocks.', 'Post-write cache failures prove safe responses only, not transaction rollback.'],
};
fs.writeFileSync(path.join(__dirname, 'UNIT-RECONCILIATION.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result));
