const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const root = __dirname, repo = path.resolve(root, '../../..');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const read = file => fs.readFileSync(path.join(root, file));
const sign = JSON.parse(read('evidence/signoff-closure-2026-09-27.json'));
const moduleImpact = JSON.parse(read('evidence/preparation-module-impact-2026-09-27.json'));
const history = JSON.parse(read('evidence/preparation-history-impact-2026-09-27.json'));
const auth = JSON.parse(read('evidence/preparation-auth-impact-2026-09-27.json'));
assert.ok(moduleImpact.passed && history.passed && auth.passed);
assert.equal(history.source.before, moduleImpact.sources.find(row => row.file === history.source.file).after);
assert.equal(auth.source.before, history.source.after);
const retained = new Map();
function verify(row) { const bytes = read(row.file); assert.equal(hash(bytes), row.sha256, row.file); retained.set(row.file, row); }
for (const row of [moduleImpact.closure, ...moduleImpact.receipts, ...moduleImpact.screenshots, history.parent, ...history.receipts, ...history.artifacts, auth.parent, ...auth.receipts, ...auth.screenshots]) verify(row);
for (const file of ['evidence/preparation-module-impact-2026-09-27.json', 'evidence/preparation-history-impact-2026-09-27.json', 'evidence/preparation-auth-impact-2026-09-27.json']) retained.set(file, { file, sha256: hash(read(file)) });
const sourceHashes = {};
for (const [file, original] of Object.entries(sign.sourceHashes)) {
  let expected = moduleImpact.sources.find(row => row.file === file)?.after ?? original;
  if (file === history.source.file) { assert.equal(expected, history.source.before); expected = history.source.after; }
  if (file === auth.source.file) { assert.equal(expected, auth.source.before); expected = auth.source.after; }
  assert.equal(hash(fs.readFileSync(path.join(repo, file))), expected, file);
  sourceHashes[file] = expected;
}
const checksFile = auth.receipts[0].file, checks = JSON.parse(read(checksFile));
assert.ok(checks.passed && checks.sourceStable && checks.steps.every(row => row.status === 0));
for (const [file, expected] of Object.entries(checks.sourceBefore)) {
  assert.equal(hash(fs.readFileSync(path.join(repo, file))), expected, file);
  if (!file.startsWith('messages/')) sourceHashes[file] = expected;
}
const translations = moduleImpact.translations.map(row => {
  const actual = hash(JSON.stringify(JSON.parse(fs.readFileSync(path.join(repo, row.file)))[row.namespace]));
  assert.equal(actual, row.after, row.file); return { file: row.file, namespace: row.namespace, sha256: actual };
});
const contrastFile = 'lanes/environment/preparation-module-browser-8f133387-8f32-409a-a1c6-7ad72f6e0cf5.json';
const contrast = JSON.parse(read(contrastFile)); assert.ok(contrast.passed && contrast.sourceStable && contrast.translationStable);
assert.ok(contrast.journeys.every(row => row.renderedContrast.every(size => size.measured.every(item => item.passes))));
retained.set(contrastFile, { file: contrastFile, sha256: hash(read(contrastFile)) });
const financialFile = auth.receipts[3].file, financial = JSON.parse(read(financialFile));
assert.ok(!financial.error && financial.checks.length === 5 && financial.originalUnchanged && financial.sourceStable);
const discoveryFile = auth.receipts[2].file, authFile = auth.receipts[1].file;
const criteria = [
  ['discovery_scope', 'Actual 22-run tenant-scoped list, two pages, search/empty, limited reader and EN/FR signer handoff.', [discoveryFile]],
  ['authoritative_transition', 'Source revision, readiness transition, retained receipt, audit and readiness observation commit together; preparation creates no journal.', [financialFile, history.artifacts[0].file]],
  ['current_authority', 'Active actor, tenant/object, permission, module validity/dependencies/read-only, fresh authentication and both module withdrawal orders.', [moduleImpact.receipts[1].file, moduleImpact.receipts[2].file, financialFile]],
  ['concurrency_idempotency', 'Same-command and distinct-reviewer races yield one transition; stale/borrowed keys denied; exact replay retains original receipt and current status.', [history.artifacts[0].file, financialFile]],
  ['failure_recovery', 'Audit/notification failures roll back; EN/FR dropped committed response survives reload/exact retry with one audit and no duplicate effect.', [history.artifacts[0].file, authFile, financialFile]],
  ['retained_history', '23 genuine preparations, 20/3 paging, foreign tenant/cursor denial, corrupt receipt failed read, signed history and old replay pointer stability.', [history.artifacts[0].file, history.receipts[1].file]],
  ['financial_and_source_handoff', 'Actual clearing/exception closure, independent signature/export and reversal; callback/statement recovery; missing external and legacy decision proof refuse preparation.', [financialFile, moduleImpact.receipts[4].file, history.receipts[2].file]],
  ['localized_accessible_recovery', 'Actual EN/FR three widths, keyboard/focus, semantics, reduced motion, contrast and controlled enlargement; auth success does not submit; errors clear/refocus password.', [authFile, discoveryFile, history.receipts[1].file, contrastFile]],
  ['regression_and_operations', '96 focused tests, changed-file lint, full TypeScript, exact impact chain and current operator/rollout guidance.', [checksFile]],
].map(([id, finding, evidence]) => ({ id, finding, evidence, disposition: 'verified' }));
for (const row of criteria) for (const file of row.evidence) assert.ok(retained.has(file), file);
const artifacts = ['RECONCILIATION_PREPARATION_FINAL_AUDIT_2026-09-27.md', 'RECONCILIATION_PREPARATION_OPERATING_GUIDE.md'].map(file => ({ file, sha256: hash(read(file)) }));
const report = { at: new Date().toISOString(), workflow: 'PR-19', status: 'Complete—verified', completeWorkflowVerified: true, criteria, sourceHashes, translations, receipts: [...retained.values()], artifacts,
  scope: 'Implemented reviewed-run preparation: discover, review, persist readiness, retry, inspect retained history and hand off to independent signing. No financial effect is inferred from preparation.',
  verificationLimits: ['Native screen-reader speech and browser-chrome zoom are unverified; keyboard, accessible semantics, rendered contrast, responsive reflow and controlled text enlargement are verified.', 'Local synthetic database and development browser only; no production latency, deployment, release or professional certification.', 'Missing investigation/legacy repair adapters remain PR-17 engineering work; the current preparation prerequisite rejects missing proof.', 'Readiness records are durable in-app observations. Live scheduling and exhausted-message repair remain separately registered notification operations; no external delivery claim.'] };
const output = 'evidence/preparation-closure-2026-09-27.json';
fs.writeFileSync(path.join(root, output), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ output, criteria: criteria.length, sources: Object.keys(sourceHashes).length, retainedArtifacts: retained.size, passed: true }));
