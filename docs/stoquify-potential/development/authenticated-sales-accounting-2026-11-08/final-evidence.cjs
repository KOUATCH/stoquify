// File-only consistency check; no application configuration, environment or DB.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../../..');
const read = name => JSON.parse(fs.readFileSync(path.join(__dirname, name), 'utf8').replace(/^\uFEFF/, ''));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const controls = read('controls-final.results.json'), pos = read('pos-ui.results.json'), types = read('owned-types.result.json');
assert.equal(controls.numFailedTests + pos.numFailedTests, 0);
assert.equal(controls.numPassedTests, 67); assert.equal(pos.numPassedTests, 45);
assert.equal(types.ownedDiagnosticCount + types.globalDiagnosticCount + types.externalDiagnosticCount, 0);
const provenance = read('SOURCE_PROVENANCE.json');
const bindings = types.rootNames.map(relative => {
  const current = hash(path.join(root, relative));
  assert.equal(provenance.files.find(item => item.path === relative)?.sha256, current);
  assert.equal(hash(path.join(provenance.sourceRoot, relative)), current);
  assert.equal(types.sourceHashes[relative], current);
  return { path: relative, sha256: current };
});
const positions = ['after-sale', 'after-collection', 'after-reversal'].map(stage => {
  const data = read(`${stage}.json`); assert.equal(data.status, 'PASS');
  return { stage, receivable: data.customer.currentBalance, bank: data.accountBalancesDebitMinusCredit.TEST_BANK || '0.00', journalCount: data.journalCount };
});
const shutdown = read('SHUTDOWN_CHECK.json'); assert.equal(shutdown.remainingListeners.length, 0);
assert.equal(read('APPLICATION_STOPPED.json').ownedClusterStopped, true);
const result = { checkedAt: new Date().toISOString(), status: 'PASS', mockedTestsPassed: 112, focusedTypeRoots: bindings,
  authenticatedPositions: positions, ownedRuntimeStopped: true, remainingOwnedListeners: 0,
  limitation: 'Current-source synthetic development proof; migration history, custom triggers, production artifact and statutory qualification remain separate.' };
fs.writeFileSync(path.join(__dirname, 'VERIFICATION_SUMMARY.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ status: result.status, mockedTestsPassed: 112, matchingSourceRoots: bindings.length, ownedRuntimeStopped: true }));
