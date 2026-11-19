// Checks all evidence links/names/indices in the final matrix without running app code.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const evidence = path.resolve(__dirname, '..');
const read = file => JSON.parse(fs.readFileSync(path.join(evidence, file), 'utf8').replace(/^\uFEFF/, ''));
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const matrix = read('verification-matrix.json');
const candidate = read('candidate.json');
assert.equal(matrix.candidateId, candidate.id); assert.equal(matrix.handlers.length, 9);
for (const row of matrix.handlers) {
  assert(row.inventoryProvenance.includes('pre-repair'));
  const source = fs.readFileSync(path.resolve(__dirname, '../../../../../..', row.currentSource.path));
  assert.equal(hash(source), row.currentSource.sha256);
  assert(source.toString('utf8').split(/\r?\n/)[row.currentSource.line - 1].includes('function ' + row.inventory.handler + '('));
}
const unit = read('unit/attempt02/jest.json').testResults.flatMap(suite => suite.assertionResults);
const native = read('database/native-jest-retry02.json').testResults.flatMap(suite => suite.assertionResults);
const observations = read('database/native-observations-retry02.json').observations;
const unitRows = [...matrix.handlers.flatMap(row => row.unitAssertions), ...matrix.sharedUnitAssertions];
const nativeRows = matrix.handlers.flatMap(row => row.nativeAssertions);
assert.equal(unitRows.length, 212); assert.equal(new Set(unitRows.map(row => row.name)).size, 212);
assert.equal(nativeRows.length, 43); assert.equal(new Set(nativeRows.map(row => row.name)).size, 43);
assert.deepEqual([...new Set(nativeRows.map(row => row.observationIndex))].sort((a,b) => a-b), Array.from({length:43}, (_value,index) => index));
for (const row of unitRows) {
  const found = unit.filter(test => test.fullName === row.name);
  assert.equal(found.length, 1); assert.equal(found[0].status, row.status); assert.equal(row.status, 'passed');
}
for (const row of nativeRows) {
  const found = native.filter(test => test.fullName === row.name);
  assert.equal(found.length, 1); assert.equal(found[0].status, row.status); assert.equal(row.status, 'passed');
  assert.equal(observations[row.observationIndex].name, row.observationName);
}
for (const entry of matrix.evidenceHashes) assert.equal(hash(fs.readFileSync(path.join(evidence, entry.path))), entry.sha256);
const result = {
  reviewedAt: new Date().toISOString(), reviewer:'r03_review', passed:true, candidateId:candidate.id,
  handlers:9, mappedUnitAssertions:212, compatibleExistingAssertions:unit.length-unitRows.length,
  mappedNativeAssertions:43, mappedNativeObservationIndices:43, evidenceHashesRecomputed:matrix.evidenceHashes.length,
  matrixSha256:hash(fs.readFileSync(path.join(evidence,'verification-matrix.json'))),
  scope:'Nine historical catches only; sibling list action remains a distinct unresolved obligation.',
};
fs.writeFileSync(path.join(__dirname,'MATRIX-RECONCILIATION.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));
