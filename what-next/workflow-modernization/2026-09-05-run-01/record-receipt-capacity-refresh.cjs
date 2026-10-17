const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = __dirname, repo = path.resolve(root, '../../..');
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8').replace(/^\uFEFF/, ''));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const at = new Date().toISOString();
const source = 'services/accounting/__tests__/close-assurance-pack.service.test.ts';
const expected = read('evidence/setup-rule-selection-review-2026-09-30.json').sourceHashes[source];
const actual = hash(path.join(repo, source));
assert.notEqual(actual, expected);
const reviewFile = 'evidence/receipt-capacity-review-2026-09-30.json', review = read(reviewFile);
for (const [file, sha] of Object.entries(review.sourceHashes)) assert.equal(hash(path.join(repo, file)), sha, file);
for (const row of [...review.receipts, ...review.artifacts]) assert.equal(hash(path.join(root, row.file)), row.sha256, row.file);
const previousRefresh = read('evidence/invoice-receipt-register-refresh-2026-09-30.json');
assert.equal(hash(path.join(root, 'WORKFLOW_REGISTER.json')), previousRefresh.updatedRegisterSha256, 'Preserve a concurrent register update');
const prior = read('evidence/current-reconciliation.json'), register = read('WORKFLOW_REGISTER.json');
const statusesBefore = register.workflows.map(w => [w.id, w.status]);
const failureFile = 'evidence/receipt-capacity-register-refresh-2026-09-30.json';
const failure = {
  at, passed: false, command: 'node reconcile-current-progress.cjs', exitCode: 1,
  error: 'Setup rule selection source changed: ' + source,
  firstSourceMismatch: { source, expected, actual },
  limitation: 'The reconciler stopped at this test-source mismatch before register writes. Other historical bindings have not all been refreshed. The receipt/invoice correction has its own current source and runtime evidence.',
  correctionReview: { file: reviewFile, sha256: hash(path.join(root, reviewFile)), sourceBindingsCurrent: true },
  previousReconciliation: { file: 'evidence/current-reconciliation.json', sha256: hash(path.join(root, 'evidence/current-reconciliation.json')), at: prior.at, registerSha256: prior.registerSha256 },
  nextAction: 'Review the exact concurrent close-assurance test delta and affected verification before claiming a current full-register refresh. Preserve prior receipts and source hashes.',
};
const cash = register.workflows.find(w => w.id === 'FA-CASH-COMMAND');
assert.ok(cash && cash.status === 'In progress');
cash.remaining = review.remaining;
cash.closureReview.verifiedCriteria = [...new Set([...(cash.closureReview.verifiedCriteria ?? []), ...review.verifiedSubcriteria])];
cash.closureReview.receiptCapacityBindingCurrent = true;
cash.implementationStatus = 'receipt_replay_preserves_posted_accounting_and_invoice_capacity_excludes_net_uninvoiced_returns';
cash.runtimeStatus = 'receipt_capacity_focused_tests_ten_owned_database_scenarios_four_en_fr_application_journeys_verified';
for (const workflow of register.workflows.filter(w => w.id === cash.id || w.services?.some(file => ['services/purchasing/ap-control.service.ts', 'services/purchasing/invoice-preparation.service.ts', 'services/purchasing/invoice-correction.service.ts', 'services/inventory/inventory-stock-event.service.ts'].includes(file)))) {
  for (const file of [review.report, reviewFile, failureFile]) if (!workflow.evidence.includes(file)) workflow.evidence.push(file);
  if (workflow.services?.some(file => file.startsWith('services/purchasing/')) && !workflow.services.includes('services/purchasing/receipt-invoice-capacity.ts')) workflow.services.push('services/purchasing/receipt-invoice-capacity.ts');
}
register.updatedAt = at;
register.executionPolicy.supportingDependency = 'receipt/invoice accounting contract within FA-CASH-COMMAND';
register.sourceReconciliation = { current: false, evidence: failureFile, lastSuccessfulAt: prior.at, interpretation: 'Recorded workflow statuses retain the earlier closure audit; this checkpoint verifies the receipt replay/capacity correction, not every historical closure.' };
assert.deepEqual(register.workflows.map(w => [w.id, w.status]), statusesBefore);
const counts = {};
for (const workflow of register.workflows) counts[workflow.status] = (counts[workflow.status] ?? 0) + 1;
const unmapped = register.entrySourceReconciliation.filter(e => !e.matchedWorkflowIds.length).length;
failure.recordedStatusCounts = counts;
const report = `# Current progress

Updated ${at}; HEAD 62a56036a5ac9b37236a20c9b148052199069479 on codex/migration-control-plane-release-2026-08-29. Shared changes are preserved. The receipt/invoice correction has current evidence; **full-register source reconciliation stopped** at a changed close-assurance test. See [refresh result](${failureFile}). The [last successful reconciliation](evidence/current-reconciliation.json), ${prior.at}, remains historical.

**Position:** ${register.workflows.length} discovered workflows; discovery incomplete; ${unmapped} unmapped entries in the existing inventory. Recorded statuses: Queued ${counts.Queued}; In progress ${counts['In progress']}; Verification pending 0; Blocked—engineering 0; Blocked—external 0; Complete—verified ${counts['Complete—verified']}. Prior closures have not all been freshly reconciled. No new workflow closed. The prior audit recorded ${prior.unvisitedIds.length} explicitly unvisited workflows and ${prior.workflowsWithSomeRuntimeEvidence.length} with some runtime evidence; those labels do not establish closure.

| Priority | Workflow and outcome | Status | Delivered and verified | Remaining closure criteria | Blocker / owner | Next action |
|---|---|---|---|---|---|---|
| Primary | FA-CASH-COMMAND: reliable finance actions | In progress | Receipt replay protection; net-return invoice capacity; stale/concurrent rejection; EN/FR recovery | Receipt accounting, return allocation, proof/payroll lifecycles, accessibility and latency | Engineering | Complete receipt recognition source/date and return accounting |
| Supporting contract | Receipt/invoice accounting within FA-CASH-COMMAND | In progress | Exact reversal capacity and posted replay preservation | Whole-receipt source, effective date, verified return accrual release and currency | Engineering / accounting owner | Preserve original effects through recognition and recovery |
| Next 1 | PR-17: resolve reconciliation exceptions | Queued | Prior source review/correction handoffs | Financial/legacy treatment and UI recovery | Engineering | Reconcile prior fixes against original scope |
| Next 2 | ID-04: redeem an invitation | Queued | Prior authority/recipient evidence | Accessibility, onboarding and transport | Engineering / identity owner | Identify exact transport boundary |
| Next 3 | MC-11: use the permitted workspace | Queued | Selected route/action boundaries | Cross-domain transport and scanner gaps | Engineering | Preserve guards while improving diagnostics |

**Since the previous report:** Stock replay preserves finalized receipt accounting. Preparation, correction and approval subtract net uninvoiced returns; exact reversals restore capacity once. Passed: 192 tests in ten suites, lint, TypeScript, ten owned-database scenarios and four English desktop/French mobile application journeys. Both correction journeys used actual password verification. [Changes, evidence and operating guidance](${review.report}). Failed test/browser attempts remain retained with their harness corrections. No migration, deployment or real payment occurred.

**Changed verification condition:** The earlier accounting-settings drift has an exact impact review and relevant passing regressions. The wider register now stops on services/accounting/__tests__/close-assurance-pack.service.test.ts. Review its delta before refreshing historical closure claims. Current correction source/evidence hashes match. Visual inspection also found a long supplier reference overflowing the English review dialog; it remains UX work despite passing document-width assertions.

**Remaining work:** Receipt recognition, source-owned return accrual release, non-stock/legacy treatment and removal of the unverified XAF return-posting assumption remain engineering work. Setup applicability, close proof, authentic CNPS/IRPP review, complete accessibility and representative latency remain open. Local timings are observations, not production certification. All 17 families remain in the [register](WORKFLOW_REGISTER.json): identity/access, modules/master data, sales/POS/inventory/purchasing, finance/reconciliation/payroll/compliance, analytics/evidence, notifications/integrations and agents. ETA is not reliable while discovery and closure validation remain incomplete.
`;
assert.ok(report.split(/\s+/).length <= 700);
const serialized = JSON.stringify(register, null, 2) + '\n';
failure.updatedRegisterSha256 = crypto.createHash('sha256').update(serialized).digest('hex');
fs.writeFileSync(path.join(root, failureFile), JSON.stringify(failure, null, 2) + '\n', { flag: 'wx' });
for (const file of ['WORKFLOW_REGISTER.json', 'CURRENT_PROGRESS.md']) fs.writeFileSync(path.join(root, file + '.retained-' + crypto.randomUUID()), fs.readFileSync(path.join(root, file)), { flag: 'wx' });
for (const [file, content] of [['WORKFLOW_REGISTER.json', serialized], ['CURRENT_PROGRESS.md', report]]) {
  const fd = fs.openSync(path.join(root, file), 'r+');
  try { fs.writeFileSync(fd, content); fs.ftruncateSync(fd, Buffer.byteLength(content)); } finally { fs.closeSync(fd); }
}
console.log(JSON.stringify({ failureFile, recordedStatusCounts: counts, progressWords: report.split(/\s+/).length, fullReconciliationCurrent: false, correctionBindingsCurrent: true }));
