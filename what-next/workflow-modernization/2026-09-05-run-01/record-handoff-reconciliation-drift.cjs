const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = __dirname;
const repo = path.resolve(root, '../../..');
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8').replace(/^\uFEFF/, ''));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const at = new Date().toISOString();
const source = 'services/accounting/accounting-settings.service.ts';
const expected = read('evidence/setup-rule-selection-review-2026-09-30.json').sourceHashes[source];
const actual = hash(path.join(repo, source));
assert.notEqual(actual, expected, 'This checkpoint only applies while the observed source mismatch remains');
const reviewFile = 'evidence/invoice-receipt-handoff-review-2026-09-30.json';
const review = read(reviewFile);
for (const [file, sha] of Object.entries(review.sourceHashes)) assert.equal(hash(path.join(repo, file)), sha, file);
for (const row of [...review.receipts, ...review.artifacts]) assert.equal(hash(path.join(root, row.file)), row.sha256, row.file);
const prior = read('evidence/current-reconciliation.json');
const registerPath = path.join(root, 'WORKFLOW_REGISTER.json');
assert.equal(hash(registerPath), prior.registerSha256, 'Preserve a concurrently changed register');
const register = read('WORKFLOW_REGISTER.json');
const beforeStatuses = register.workflows.map(w => [w.id, w.status]);
const failureFile = 'evidence/invoice-receipt-register-refresh-2026-09-30.json';
const failure = {
  at, passed: false, command: 'node reconcile-current-progress.cjs', exitCode: 1,
  error: 'Setup rule selection source changed: ' + source,
  firstSourceMismatch: { source, expected, actual },
  limitation: 'The reconciler stopped at this mismatch; this record does not establish that all other historical source bindings remain current.',
  correctionReview: { file: reviewFile, sha256: hash(path.join(root, reviewFile)), sourceBindingsCurrent: true },
  previousReconciliation: { file: 'evidence/current-reconciliation.json', sha256: hash(path.join(root, 'evidence/current-reconciliation.json')), at: prior.at, registerSha256: prior.registerSha256 },
  nextAction: 'Review the concurrent accounting-settings change and obtain affected evidence before refreshing the full register. Preserve historical receipts and source hashes.',
};
const cash = register.workflows.find(w => w.id === 'FA-CASH-COMMAND');
const invoice = register.workflows.find(w => w.id === 'PA-019');
assert.ok(cash && invoice);
for (const workflow of [cash, invoice]) {
  for (const file of [review.report, reviewFile, failureFile]) if (!workflow.evidence.includes(file)) workflow.evidence.push(file);
}
cash.remaining = review.remaining;
cash.closureReview.verifiedCriteria = [...new Set([...(cash.closureReview.verifiedCriteria ?? []), ...review.verifiedSubcriteria])];
cash.closureReview.invoiceReceiptHandoffBindingCurrent = true;
if (!invoice.services.includes('services/purchasing/invoice-receipt-recognition.ts')) invoice.services.push('services/purchasing/invoice-receipt-recognition.ts');
const gap = 'Verified receipt-accrual invoice allocation and frozen recovery are delivered; production receipt recognition, returned/reversed allocation release and legacy cutover remain open. See INVOICE_RECEIPT_HANDOFF_2026-09-30.md for the bounded proof and limitations.';
if (!invoice.remaining.includes(gap)) invoice.remaining.push(gap);
register.updatedAt = at;
register.sourceReconciliation = { current: false, evidence: failureFile, lastSuccessfulAt: prior.at, interpretation: 'Status counts retain the last successful closure review. Only the invoice/receipt correction has been checked at this checkpoint; full current-source reconciliation failed.' };
assert.deepEqual(register.workflows.map(w => [w.id, w.status]), beforeStatuses);
const counts = {};
for (const w of register.workflows) counts[w.status] = (counts[w.status] ?? 0) + 1;
failure.recordedStatusCounts = counts;
const report = `# Current progress

Updated ${at}; HEAD 62a56036a5ac9b37236a20c9b148052199069479 on codex/migration-control-plane-release-2026-08-29. Shared working-tree changes are preserved. Register updated with the bounded correction; **full source reconciliation failed** on a concurrent accounting-settings change. See [refresh result](${failureFile}). The [last successful reconciliation](evidence/current-reconciliation.json), dated ${prior.at}, remains historical evidence.

**Position:** 270 discovered workflows; discovery incomplete; 191 unmapped source entries in the last reconciled inventory. Recorded statuses remain: Queued 265; In progress 1; Verification pending 0; Blocked—engineering 0; Blocked—external 0; Complete—verified 4. The four prior closures have not been freshly reconciled at this checkpoint. No new workflow closed. Previously, 121 workflows explicitly reported no visit/execution and 141 had some runtime evidence, which does not establish closure.

| Priority | Workflow and outcome | Status | Delivered and verified | Remaining closure criteria | Blocker / owner | Next action |
|---|---|---|---|---|---|---|
| Primary | FA-CASH-COMMAND: reliable finance actions | In progress | Receipt/invoice accrual consumption; partial/mixed invoices; frozen recovery; EN/FR approval | Receipt producer, return allocation, proof/payroll lifecycles, accessibility and latency | Engineering | Complete receipt source/date/replay and return contracts |
| Supporting contract | Payroll calculated-input handoff | Blocked—external (statutory branch) | Actual HRIS producer chain and valid fixture export | Reviewed CNPS/IRPP; resolver integration; full financial lifecycle | Statutory reviewer + engineering | Obtain authentic review; continue unaffected engineering |
| Next 1 | PR-17: resolve reconciliation exceptions | Queued | Source review/correction handoffs | Financial/legacy treatment and UI recovery | Engineering | Reconcile prior fixes against original scope |
| Next 2 | ID-04: redeem an invitation | Queued | Prior authority/recipient evidence | Accessibility, onboarding and transport | Engineering / identity owner | Identify exact transport boundary |
| Next 3 | MC-11: use the permitted workspace | Queued | Selected route/action boundaries | Cross-domain transport and scanner gaps | Engineering | Preserve guards while improving diagnostics |

**Since the previous report:** Supplier invoices now clear verified receipt accruals without recognizing inventory twice. Partial/mixed allocation, frozen recovery, actual-account rule enforcement and derived immediate-posting audit evidence passed focused verification: 157 tests, lint, TypeScript, six owned-database scenarios, immediate-path recovery and EN desktop/FR mobile approval. [Evidence, limitations and operator guidance](${review.report}). Existing tenant rules were not replaced; automatic receipt recognition remains unimplemented. No migration, deployment or real cash operation occurred.

**Changed verification condition:** The final register check stopped because services/accounting/accounting-settings.service.ts differs from its earlier verified source. Those concurrent edits are preserved; no historical source hash was rewritten. The invoice/receipt correction's own source and evidence hashes still match. Review that change and obtain affected evidence before claiming a current full-register refresh.

**Remaining work:** Production receipt source/date/replay, return/reversal allocation and safe legacy cutover remain engineering work. CASH_DRAWER_CLOSE and EXPENSE_APPROVAL setup applicability, close certification, payroll statutory provenance, native screen-reader/zoom and representative latency remain open. Local browser timings are observations, not production certification. All 17 families remain in the [register](WORKFLOW_REGISTER.json): identity/access, modules/master data, sales/POS/inventory/purchasing, finance/reconciliation/payroll/compliance, analytics/evidence, notifications/integrations and agents. ETA is not reliable while discovery and closure validation remain incomplete.
`;
assert.ok(report.split(/\s+/).length <= 700);
const serialized = JSON.stringify(register, null, 2) + '\n';
failure.updatedRegisterSha256 = crypto.createHash('sha256').update(serialized).digest('hex');
fs.writeFileSync(path.join(root, failureFile), JSON.stringify(failure, null, 2) + '\n', { flag: 'wx' });
for (const file of ['WORKFLOW_REGISTER.json', 'CURRENT_PROGRESS.md']) fs.writeFileSync(path.join(root, file + '.retained-' + crypto.randomUUID()), fs.readFileSync(path.join(root, file)), { flag: 'wx' });
function replace(file, text) { const fd = fs.openSync(path.join(root, file), 'r+'); try { fs.writeFileSync(fd, text); fs.ftruncateSync(fd, Buffer.byteLength(text)); } finally { fs.closeSync(fd); } }
replace('WORKFLOW_REGISTER.json', serialized);
replace('CURRENT_PROGRESS.md', report);
console.log(JSON.stringify({ failureFile, recordedStatusCounts: counts, progressWords: report.split(/\s+/).length, fullReconciliationCurrent: false, correctionBindingsCurrent: true }));
