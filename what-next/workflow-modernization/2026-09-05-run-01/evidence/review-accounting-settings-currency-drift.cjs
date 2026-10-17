// Source-only declaration review. No product writes, database access or tests.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const crypto = require('node:crypto'), assert = require('node:assert/strict'), ts = require('typescript');
const run = path.resolve(__dirname, '..'), root = path.resolve(run, '../../..');
const file = 'services/accounting/accounting-settings.service.ts';
const oldHash = '44c4704a1e67c348c7b7751825e97b5676ee89f6414fe476d7d826e9cbdaf233';
const currentHash = '6c83166480f23945be1a54ddcd42b11314950b897cf3113b99a28e532824dc04';
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const inputs = [
  { file: 'evidence/setup-rule-selection-before-13df1895-7062-4223-b5d6-5f384a2006d8.json', sha256: 'ce5c09a41626ad56879d07401b0cbba10cbbce5364b025d2f1d892a73d0dfa22' },
  { file: 'apply-setup-rule-readiness.cjs', sha256: '15d244c258016598b7f30b71fbf58f52c280292a2e91c37cf7702a25d48744e2' },
];
for (const input of inputs) assert.equal(hash(fs.readFileSync(path.join(run, input.file))), input.sha256, 'Retained reconstruction input changed: ' + input.file);
const baseline = JSON.parse(fs.readFileSync(path.join(run, inputs[0].file), 'utf8').replace(/^\uFEFF/, ''));
const produced = {};
// Run the retained transformation against an in-memory filesystem only. Both
// original target paths resolve to archived content, never current source.
const memoryFs = {
  readFileSync(target) {
    const absolute = path.resolve(target);
    if (absolute === path.join(run, inputs[0].file)) return JSON.stringify(baseline);
    const relative = path.relative(root, absolute).replace(/\\/g, '/');
    assert.ok(Object.prototype.hasOwnProperty.call(baseline.sources, relative), 'Unexpected reconstruction read: ' + relative);
    return baseline.sources[relative];
  },
  openSync(target, mode) { assert.equal(mode, 'r+'); return target; },
  writeFileSync(target, content) {
    const relative = path.relative(root, target).replace(/\\/g, '/');
    assert.ok(Object.prototype.hasOwnProperty.call(baseline.sources, relative));
    produced[relative] = content;
  },
  ftruncateSync() {}, closeSync() {},
};
vm.runInNewContext(fs.readFileSync(path.join(run, inputs[1].file), 'utf8'), {
  require(name) {
    if (name === 'node:fs') return memoryFs;
    if (name === 'node:path') return path;
    if (name === 'node:assert/strict') return assert;
    throw new Error('Unexpected reconstruction module: ' + name);
  },
  __dirname: run, Buffer, console: { log() {} },
}, { timeout: 10000 });
const before = produced[file], after = fs.readFileSync(path.join(root, file), 'utf8');
assert.equal(hash(before), oldHash, 'Reconstructed predecessor must exactly match the verified review');
assert.equal(hash(after), currentHash, 'Current settings source changed; inspect a new delta before publishing review');
function declarations(content) {
  const source = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true);
  return new Map(source.statements.map((node, index) => [
    ts.isImportDeclaration(node) ? 'import:' + node.moduleSpecifier.text : node.name?.text ||
      (ts.isVariableStatement(node) ? node.declarationList.declarations[0].name.getText(source) : 'statement:' + index),
    node.getText(source),
  ]));
}
const previous = declarations(before), current = declarations(after);
const changed = [...previous.keys()].filter(name => current.has(name) && current.get(name) !== previous.get(name));
const added = [...current.keys()].filter(name => !previous.has(name));
const deleted = [...previous.keys()].filter(name => !current.has(name));
const unchanged = [...previous.keys()].filter(name => current.get(name) === previous.get(name));
assert.deepEqual(changed, ['import:@/services/_shared/action-errors', 'ensureAccountingSettings', 'updateAccountingSettings']);
assert.deepEqual(added, []); assert.deepEqual(deleted, []);
for (const name of ['REQUIRED_ACCOUNTING_MAPPINGS', 'REQUIRED_DEFAULT_JOURNAL_TYPES', 'REQUIRED_READY_POSTING_PURPOSES', 'REQUIRED_READY_POSTING_SOURCES', 'collectAccountingSetupReadinessIssues', 'getAccountingSetupReadiness', 'markAccountingSetupReady']) assert.ok(unchanged.includes(name), name + ' must remain exactly unchanged');
const snapshotFile = 'evidence/accounting-settings-currency-before-2026-09-30.json';
const reviewFile = 'evidence/accounting-settings-currency-declaration-impact-2026-09-30.json';
const snapshot = JSON.stringify([{ file, path: file, sha256: oldHash, content: before }], null, 2) + '\n';
fs.writeFileSync(path.join(run, snapshotFile), snapshot, { flag: 'wx' });
const neededTests = [
  { file: 'services/accounting/__tests__/accounting-settings.service.test.ts', scope: 'Unchanged readiness, controls and selected-rule rejection regression' },
  { file: 'services/accounting/__tests__/journal-currency-regression.service.test.ts', scope: 'Currency-change rejection at NOT_STARTED/IN_PROGRESS/READY/LOCKED; normalized same-currency edit; organization-denomination initialization; related journal functional-currency contract' },
];
const review = {
  at: new Date().toISOString(), workflow: 'FA-CASH-COMMAND', scope: 'Read-only source review of concurrent accounting settings dependency',
  verificationStatus: 'source-only; tests not run by this review',
  reconstructionInputs: inputs,
  predecessorSnapshot: { file: snapshotFile, sha256: hash(snapshot) },
  reviewScript: { file: 'evidence/review-accounting-settings-currency-drift.cjs', sha256: hash(fs.readFileSync(__filename)) },
  priorImpact: [{ file, before: oldHash, after: currentHash, priorReview: snapshotFile }],
  declarationImpact: [{ file, changed, added, deleted, unchanged, allOtherDeclarationsExactlyPreserved: true }],
  changes: [
    'Import NotFoundError for missing organization/settings source.',
    'Initialize baseCurrency from normalized organization.currency instead of hardcoded XAF; reject missing organization.',
    'On an explicit baseCurrency edit, load current settings; reject missing settings and any normalized denomination change as requiring controlled migration. Same normalized currency and unrelated fields retain existing behavior.',
  ],
  neededTests: neededTests.map(test => ({ ...test, currentSha256: hash(fs.readFileSync(path.join(root, test.file))) })),
  evidenceLimitations: [
    'Existing setup-rule evidence binds the predecessor hash; it does not directly test changed currency initialization/update behavior.',
    'The currency regression file defines six settings cases (four setup-state variants plus same-currency and initialization). Its presence is not evidence that they passed.',
    'Missing-organization and missing-settings branches, audit outcomes and actual action/database execution are not established by source inspection.',
    'No matching current-source passed receipt was found in the narrowly inspected workflow RUN evidence/environment or named accounting report directories; no repository-wide author search was performed.',
  ],
};
fs.writeFileSync(path.join(run, reviewFile), JSON.stringify(review, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ snapshotFile, reviewFile, reconstructedHash: oldHash, currentHash, changed, readinessDeclarationsUnchanged: true, verificationStatus: review.verificationStatus }));
