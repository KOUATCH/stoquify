// Preserve the full initial matrix and overlay only explicitly rerun tests/stages.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const read = name => JSON.parse(fs.readFileSync(path.join(__dirname, name), 'utf8'));
const tests = new Map();
for (const name of ['initial-full-results.json', 'results.json']) {
  const result = read(name); assert.equal(result.numFailedTests, 0); assert.equal(result.numFailedTestSuites, 0);
  for (const suite of result.testResults) for (const test of suite.assertionResults) if (test.status !== 'pending') tests.set(test.fullName, { name: test.fullName, status: test.status, evidence: name });
}
assert.equal(tests.size, 18); assert([...tests.values()].every(t => t.status === 'passed'));
const evidence = new Map();
for (const name of ['initial-full-reconciliation.json', 'reconciliation.json']) {
  const source = read(name);
  for (const record of source.evidence) evidence.set(record.scenario, { ...record, receiverTable: source.table, evidence: name });
}
assert.equal(evidence.size, 22);
fs.writeFileSync(path.join(__dirname, 'combined-results.json'), JSON.stringify({ at: new Date().toISOString(), tests: [...tests.values()] }, null, 2));
fs.writeFileSync(path.join(__dirname, 'combined-reconciliation.json'), JSON.stringify({ at: new Date().toISOString(), evidence: [...evidence.values()] }, null, 2));
console.log('PASS: 18 distinct passing tests, 22 evidence stages; initial run retained');
