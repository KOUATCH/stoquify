// Narrow, immutable verification of the concurrent close-invalidation delta.
// This runner reads product sources and prior evidence; it writes only new evidence.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../../../..');
const run = path.dirname(__dirname);
const ts = require(path.join(root, 'node_modules/typescript'));
const id = crypto.randomUUID();
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const abs = file => path.join(root, file);
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const relative = file => path.relative(run, file).replaceAll('\\', '/');
const bind = file => ({ file: relative(file), sha256: hash(fs.readFileSync(file)) });
const save = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const product = 'services/accounting/close-assurance-pack.service.ts';
const test = 'services/accounting/__tests__/close-assurance-pack.service.test.ts';
const driftFile = path.join(__dirname, 'close-assurance-test-drift-2026-09-30.json');
const oldSourceFile = path.join(__dirname, 'accounting-setup-export-before-ed0d0af2-9f0b-4784-b67c-08f4c12d38cd.json');
const setupReviewFile = path.join(__dirname, 'accounting-setup-trust-review-2026-09-30.json');
const selectionReviewFile = path.join(__dirname, 'setup-rule-selection-review-2026-09-30.json');
const drift = read(driftFile), prior = read(oldSourceFile), setup = read(setupReviewFile), selection = read(selectionReviewFile);
const currentTest = fs.readFileSync(abs(test), 'utf8');
assert.equal(hash(currentTest), drift.source.after);
let reconstructedTest = currentTest;
for (const operation of drift.deterministicReconstruction.operations) {
  const matches = [...reconstructedTest.matchAll(new RegExp(operation.pattern, operation.flags + 'g'))];
  assert.equal(matches.length, 1, 'Every retained test reconstruction operation must have exactly one match');
  reconstructedTest = reconstructedTest.replace(new RegExp(operation.pattern, operation.flags), operation.replacement);
}
assert.equal(hash(reconstructedTest), drift.source.before);
assert.equal(hash(reconstructedTest), setup.sourceHashes[test]);
assert.equal(hash(reconstructedTest), selection.sourceHashes[test]);
assert.equal(hash(prior.sources[product]), prior.sourceHashes[product]);
function declarations(source) {
  const ast = ts.createSourceFile(product, source, ts.ScriptTarget.Latest, true);
  return ast.statements.map(node => ({ name: node.name?.text, start: node.getStart(ast), end: node.end, text: source.slice(node.getStart(ast), node.end) }));
}
const currentProduct = fs.readFileSync(abs(product), 'utf8');
const oldDeclarations = declarations(prior.sources[product]), currentDeclarations = declarations(currentProduct);
const changedNames = ['recordCloseCertificationInvalidationInTx', 'closeInvalidationTargetsInTx'];
let reconstructedProduct = currentProduct;
for (const node of currentDeclarations.filter(node => changedNames.includes(node.name)).sort((a, b) => b.start - a.start)) {
  const old = oldDeclarations.find(old => old.name === node.name);
  assert.ok(old);
  reconstructedProduct = reconstructedProduct.slice(0, node.start) + old.text + reconstructedProduct.slice(node.end);
}
assert.equal(hash(reconstructedProduct), setup.sourceHashes[product]);
for (const name of ['recordCloseCertificationInvalidationsForSourceInTx', 'recordCloseCertificationInvalidationsForSource']) {
  assert.equal(currentDeclarations.find(node => node.name === name).text, oldDeclarations.find(node => node.name === name).text);
}
const callerFiles = [
  'services/accounting/journal-close-invalidation.service.ts',
  'services/inventory/inventory-close-invalidation.service.ts',
];
const sources = [product, test, ...callerFiles,
  'services/accounting/__tests__/journal-close-invalidation.service.test.ts',
  'services/events/business-event.service.ts', 'services/events/business-event.schemas.ts',
  'services/events/business-event-anomaly.service.ts', 'services/_shared/action-errors.ts',
  'lib/security/rbac-permissions.ts', 'prisma/schema.prisma', 'package.json',
  'jest.config.ts', 'jest.setup.ts', path.relative(root, __filename).replaceAll('\\', '/'),
];
const sourceHashes = () => Object.fromEntries(sources.sort().map(file => [file, hash(fs.readFileSync(abs(file)))]));
const before = sourceHashes();
const startedAt = new Date().toISOString();
const jestFile = path.join(__dirname, `close-assurance-bridge-jest-${id}.json`);
const args = ['node_modules/jest/bin/jest.js', '--runInBand', '--runTestsByPath', test,
  'services/accounting/__tests__/journal-close-invalidation.service.test.ts', '--json', `--outputFile=${jestFile}`];
const command = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8', timeout: 300000, maxBuffer: 8 * 1024 * 1024, windowsHide: true });
const logFile = path.join(__dirname, `close-assurance-bridge-jest-${id}.log`);
fs.writeFileSync(logFile, (command.stdout || '') + (command.stderr || ''), { flag: 'wx' });
const after = sourceHashes(), stable = JSON.stringify(before) === JSON.stringify(after);
const jest = fs.existsSync(jestFile) ? read(jestFile) : null;
const addedTests = (jest?.testResults || []).flatMap(suite => suite.assertionResults || []).filter(test => /invalidates a (RUNNING|READY|CERTIFIED|EXPORTED) assessment on a new source event even without an export/.test(test.title));
const passed = command.status === 0 && stable && jest?.success === true && addedTests.length === 4 && addedTests.every(test => test.status === 'passed');
const review = {
  at: new Date().toISOString(), startedAt, passed, workflow: 'FA-CASH-COMMAND',
  scope: 'Narrow close-invalidation source/test review and focused mocked suites; no workflow closure or certification.',
  sourceStable: stable, sourceHashes: after, sourceHashesBefore: before,
  priorImpact: [
    { file: product, before: hash(reconstructedProduct), after: after[product], priorReview: relative(setupReviewFile) },
    { file: test, before: hash(reconstructedTest), after: after[test], priorReview: relative(selectionReviewFile) },
  ],
  productReconstruction: {
    method: 'Replace only the two named current declarations with their exact retained baseline declaration text in memory; the complete result matches the historical reviewed product hash.',
    baseline: bind(oldSourceFile), declarations: changedNames,
    predecessorSha256: hash(reconstructedProduct), matchesHistoricalReviewedSource: true,
    publicWrapperAndTransactionalDispatcherUnchanged: true, allOtherDeclarationsExactlyPreserved: true,
  },
  testReconstruction: {
    method: 'Apply exactly one match for each of the four retained regex operations in memory; the complete result matches both setup review predecessor hashes.',
    predecessorSha256: hash(reconstructedTest), operations: drift.deterministicReconstruction.operations,
    existingAssertionsExactlyPreserved: true,
  },
  reviewFindings: [
    'Target discovery still requires organization plus a supplied period ID or date-overlap filter. The state predicate now includes RUNNING, READY, CERTIFIED and EXPORTED; the existing certified-export branch remains.',
    'The invalidation writer changes the same four live/usable states to BLOCKED and records EVIDENCE_STALE metadata with source identity. Previously it only changed CERTIFIED.',
    'Runs without exports receive durable run/event/audit invalidation evidence; export metadata is changed only when an organization/run-scoped export is found.',
    'Public and transactional source dispatchers, source-code definitions, existing evidence construction and all other product declarations are unchanged against the exact predecessor.',
    'The unchanged journal caller supplies tenant, posting period/date and journal identity; its reversal helper targets each distinct affected period. The unchanged inventory caller supplies tenant, period/date and document hash in the source transaction.',
    'The four new cases discriminate the previous CERTIFIED-only query from the current query, require invalidatedCount=1 and BLOCKED run/source metadata, and require no export mutation when no export exists.',
  ],
  command: { executable: process.execPath, args, exitCode: command.status, signal: command.signal, error: command.error?.message || null },
  results: { suites: jest?.numTotalTestSuites, passedSuites: jest?.numPassedTestSuites, tests: jest?.numTotalTests, passedTests: jest?.numPassedTests, failedTests: jest?.numFailedTests, addedCases: addedTests.map(test => ({ title: test.title, status: test.status })) },
  receipts: fs.existsSync(jestFile) ? [bind(jestFile), bind(logFile)] : [bind(logFile)],
  artifacts: [bind(driftFile), bind(oldSourceFile), bind(setupReviewFile), bind(selectionReviewFile), bind(__filename)],
  conclusion: passed ? 'The current focused evidence justifies bridging these exact historical product and test hashes. It does not justify broader workflow completion or certify unrelated caller behavior.' : 'The bridge is not established; inspect terminal test and binding results.',
  limitations: [
    'Prisma is mocked in the focused suites. Organization/period predicates and absent-export behavior are asserted, but real database filtering, concurrent assessment/source changes and whole-workflow recovery are not newly verified here.',
    'The journal wrapper suite has three focused caller-contract cases; inventory caller review is source inspection only. Other source dispatchers inherit the common helper but are not independently revalidated by this review.',
    'No product, historical evidence, migration, database, reconciler or workflow status was changed by this runner.',
  ],
};
const reviewFile = path.join(__dirname, `close-assurance-test-bridge-review-${id}.json`);
save(reviewFile, review);
console.log(JSON.stringify({ file: relative(reviewFile), sha256: hash(fs.readFileSync(reviewFile)), passed, sourceStable: stable, results: review.results }));
if (!passed) process.exitCode = 1;
