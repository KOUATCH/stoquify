// Narrow read-only source reconstruction plus the one affected mocked Jest suite.
// Writes only NEW evidence; never edits product, historical proofs or reconciler.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict'), { spawnSync } = require('node:child_process');
const repo = path.resolve(__dirname, '../../../..'), run = path.dirname(__dirname), ts = require(path.join(repo, 'node_modules/typescript'));
const service = 'services/accounting/close-assurance.service.ts', test = 'services/accounting/__tests__/close-assurance.service.test.ts';
const oldServiceHash = 'e030758dfb31f88722ffff86919fa74697c3dededf7813b4c67b97ea3db17b3f', newServiceHash = 'e910f53100112e113d570e927709025f310641d6a5f1cfe72bcd0244dcff686c';
const oldTestHash = 'c31bb0cf4c9ca17a31d3ffd6b67513779b8aa3bd7d5c42785e35e00d1b2893fc', newTestHash = '2f041ba4a20a4cc2ca63f65752748f4ad314cf753111b30c34a388a1136026f1';
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex'), readSource = file => fs.readFileSync(path.join(repo, file), 'utf8');
const readEvidence = file => JSON.parse(fs.readFileSync(path.join(run, file), 'utf8').replace(/^\uFEFF/, ''));
const bind = file => ({ file: path.relative(run, file).replaceAll('\\', '/'), sha256: hash(fs.readFileSync(file)) });
const baselineFile = 'evidence/inventory-freshness-source-before-acaa82bf-8889-4d00-b86e-1e0c8879d47a.json';
const setupFile = 'evidence/accounting-setup-trust-review-2026-09-30.json', freshnessFile = 'evidence/cash-close-inventory-freshness-review-2026-09-30.json';
const baseline = readEvidence(baselineFile), setup = readEvidence(setupFile), freshness = readEvidence(freshnessFile);
assert.equal(hash(fs.readFileSync(path.join(run, baselineFile))), '30a29a500a2a1068bc3f269154808a0848789b0e737aaa206ccd7ac419f19ee9');
for (const review of [setup, freshness]) { assert.equal(review.sourceHashes[service], oldServiceHash); assert.equal(review.sourceHashes[test], oldTestHash); }
assert.equal(hash(baseline.sources[service]), baseline.sourceHashes[service]);
const currentService = readSource(service), currentTest = readSource(test);
assert.equal(hash(currentService), newServiceHash); assert.equal(hash(currentTest), newTestHash);
function declaration(raw) {
  const ast = ts.createSourceFile(service, raw, ts.ScriptTarget.Latest, true);
  const nodes = ast.statements.filter(node => node.name?.text === 'runCloseAssurance');
  assert.equal(nodes.length, 1); const node = nodes[0];
  return { start: node.getStart(ast), end: node.end, text: raw.slice(node.getStart(ast), node.end) };
}
const current = declaration(currentService), previous = declaration(baseline.sources[service]);
const reconstructedService = currentService.slice(0, current.start) + previous.text + currentService.slice(current.end);
assert.equal(hash(reconstructedService), oldServiceHash, 'Only runCloseAssurance may differ from the reviewed production file');
const operations = [
  { pattern: '(    closeRun: \\{\\r?\\n      create: jest.fn\\(\\),\\r?\\n)      updateMany: jest.fn\\(\\),\\r?\\n', flags: '', replacement: '$1' },
  { pattern: '(  closeRun: \\{\\r?\\n    create: jest.Mock\\r?\\n)    updateMany: jest.Mock\\r?\\n', flags: '', replacement: '$1' },
  { pattern: '^  mockDb.closeRun.updateMany.mockResolvedValue\\(\\{ count: 1 \\}\\)\\r?\\n', flags: 'm', replacement: '' },
  { pattern: '^    missingFunctionalAmountCount: 0,\\r?\\n    functionalBalanceIssue: null,\\r?\\n', flags: 'm', replacement: '' },
  { pattern: '^          status: "RUNNING",\\r?\\n', flags: 'm', replacement: '' },
  { pattern: '^    for \\(const collector of \\[mockGetPeriodClosePreflight,[^\\r\\n]*\\r?\\n[\\s\\S]*?^    \\}\\)\\)\\r?\\n', flags: 'm', replacement: '' },
  { pattern: '^  it\\("does not overwrite an in-flight source invalidation with an older READY assessment", async \\(\\) => \\{[\\s\\S]*?(?=^  it\\("defaults finding assignment to the current actor and audits the action")', flags: 'm', replacement: '' },
];
let reconstructedTest = currentTest;
for (const operation of operations) {
  assert.equal([...reconstructedTest.matchAll(new RegExp(operation.pattern, operation.flags + 'g'))].length, 1, 'Each exact test reconstruction must have one match');
  reconstructedTest = reconstructedTest.replace(new RegExp(operation.pattern, operation.flags), operation.replacement);
}
assert.equal(hash(reconstructedTest), oldTestHash, 'Existing historical assertions and fixtures must be exactly preserved apart from the documented additions');
const files = [service, test, 'services/accounting/close-assurance-pack.service.ts', 'services/accounting/__tests__/close-assurance-pack.service.test.ts', 'services/accounting/close-assurance.schemas.ts', 'services/accounting/missing-close-evidence-request-queue-contracts.ts', 'services/accounting/missing-close-evidence-response-acceptance-contracts.ts', 'services/_shared/action-errors.ts', 'lib/security/rbac-permissions.ts', 'prisma/schema.prisma', 'package.json', 'jest.config.ts', 'jest.setup.ts', path.relative(repo, __filename).replaceAll('\\', '/')];
const snapshot = () => Object.fromEntries(files.sort().map(file => [file, hash(fs.readFileSync(path.join(repo, file)))]));
const runId = crypto.randomUUID(), prefix = path.join(__dirname, `close-assessment-drift-${runId}`), before = snapshot(), startedAt = new Date().toISOString();
const args = ['node_modules/jest/bin/jest.js', '--runInBand', '--runTestsByPath', test, '--json', `--outputFile=${prefix}-jest.json`];
const command = spawnSync(process.execPath, args, { cwd: repo, encoding: 'utf8', windowsHide: true, timeout: 180000, maxBuffer: 8 * 1024 * 1024 });
fs.writeFileSync(`${prefix}.log`, (command.stdout || '') + (command.stderr || ''), { flag: 'wx' });
const after = snapshot(), sourceStable = JSON.stringify(before) === JSON.stringify(after);
const jest = fs.existsSync(`${prefix}-jest.json`) ? JSON.parse(fs.readFileSync(`${prefix}-jest.json`, 'utf8')) : null;
const newTitles = ['does not overwrite an in-flight source invalidation with an older READY assessment', 'retains a blocked failure state when collection fails before finalization', 'retains a blocked failure state when assessment persistence rolls back'];
const added = (jest?.testResults || []).flatMap(row => row.assertionResults || []).filter(row => newTitles.includes(row.title));
const passed = command.status === 0 && !command.error && sourceStable && jest?.success === true && added.length === 3 && added.every(row => row.status === 'passed');
const review = {
  at: new Date().toISOString(), startedAt, runId, workflow: 'FA-CASH-COMMAND', passed, sourceStable,
  scope: 'Exact close-assessment production/test drift review and one mocked suite; no broader workflow, database race or certification claim.',
  sourceHashesBefore: before, sourceHashes: after,
  priorImpact: [{ file: service, before: oldServiceHash, after: newServiceHash, priorReview: setupFile }, { file: test, before: oldTestHash, after: newTestHash, priorReview: setupFile }],
  productReconstruction: { method: 'Replace only the current runCloseAssurance declaration with its retained pre-freshness declaration in memory. The whole result exactly matches both later accounting-setup and inventory-freshness reviewed production hashes.', baseline: bind(path.join(run, baselineFile)), declaration: 'runCloseAssurance', reconstructedSha256: hash(reconstructedService), allOtherDeclarationsExactlyPreserved: true },
  testReconstruction: { method: 'Remove only seven exact matched additions in memory: updateMany mock/type/default, two clean functional-currency preflight fields, RUNNING assertion, ordered collection/finalization assertions, and the three new cases.', operations, reconstructedSha256: hash(reconstructedTest), historicalAssertionsOtherwiseExactlyPreserved: true },
  reviewFindings: [
    'This is a production and test delta, not a harmless test-only hash drift. No previous proof is rewritten.',
    'A tenant/period-bound RUNNING close row is persisted before evidence collection, giving concurrent source invalidation a target. The already reviewed close-pack invalidator includes RUNNING and READY states.',
    'Finalization conditionally updates only the same tenant/period/run while it remains RUNNING. A zero row count returns the current persisted run without writing checklist, evidence, findings, completion audit or completion business event from the older snapshot.',
    'Finalization and child evidence/audit records remain inside the existing transaction. The original create-then-collect ordering changes, but all production declarations outside runCloseAssurance match the retained reviewed file exactly.',
    'Collector/setup or transaction failures attempt a tenant/run-scoped RUNNING-to-BLOCKED cleanup and rethrow. Existing BLOCKED invalidation metadata is preserved because cleanup matches only RUNNING.',
    'The extended success test checks that the row is created before each collector, verifies RUNNING identity and READY conditional finalization. Three new cases check intervening invalidation, pre-finalization collection failure and transaction failure. Other historical test bytes reconstruct exactly.',
  ],
  limitations: [
    'Prisma is mocked. These assertions do not establish real PostgreSQL lock ordering, transactional rollback or cross-connection race behavior. No full close workflow is declared complete.',
    'A process crash after publishing RUNNING, or a database outage during cleanup, may leave RUNNING until a separate recovery process handles it; this suite does not test that operational recovery.',
    'The final dashboard read is returned without await inside the try block; a later read rejection is propagated to the caller and does not turn a successfully committed assessment into a failure cleanup. No read-failure recovery certification is claimed.',
    'Only this source/test pair and its explicit contract bindings were examined. Any later reconciler drift remains separately unreviewed.',
  ],
  command: { executable: process.execPath, args, exitCode: command.status, signal: command.signal, error: command.error?.code || null },
  results: { suites: jest?.numTotalTestSuites, passedTests: jest?.numPassedTests, failedTests: jest?.numFailedTests, skippedTests: jest?.numPendingTests, addedCases: added.map(row => ({ title: row.title, status: row.status })) },
  receipts: [bind(`${prefix}.log`), ...(fs.existsSync(`${prefix}-jest.json`) ? [bind(`${prefix}-jest.json`)] : [])],
  artifacts: [bind(path.join(run, baselineFile)), bind(path.join(run, setupFile)), bind(path.join(run, freshnessFile)), bind(__filename)],
  conclusion: passed ? 'Focused current source/test review supports accepting these exact two predecessor transitions within the stated mocked verification limits; it does not establish complete close lifecycle or database race assurance.' : 'The exact bridge is not supported by passing current focused evidence.',
};
fs.writeFileSync(`${prefix}-review.json`, JSON.stringify(review, null, 2) + '\n', { flag: 'wx' });
process.stdout.write(JSON.stringify({ review: bind(`${prefix}-review.json`), passed, sourceStable, results: review.results, status: command.status }) + '\n');
process.stdout.write((command.stdout || '') + (command.stderr || ''));
process.exitCode = passed ? 0 : 1;
