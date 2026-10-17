// One-use scoped checkpoint. Refuses unverified/stale receipts or a changed register.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../../..'), runRoot = path.resolve(__dirname, '..');
const read = file => JSON.parse(fs.readFileSync(path.join(runRoot, file), 'utf8'));
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const manifest = read('evidence/receipt-treatment-final-inputs.json');
const receipts = Object.fromEntries(Object.entries(manifest.receipts).map(([key, file]) => [key, { file, value: read(file) }]));
const bindings = {}, evidence = [], supersededBindings = [];
for (const [key, { file, value }] of Object.entries(receipts)) {
  assert.equal(value.passed, true, file); assert.equal(value.sourceStable, true, file);
  const sources = value.sourceAfter || value.sourcesAfter; assert.ok(sources && Object.keys(sources).length, file);
  for (const [source, expected] of Object.entries(sources)) {
    if (key === 'jest' && ['components/purchasing/InvoiceLedgerRecoveryWorkbench.tsx', 'components/purchasing/__tests__/InvoiceLedgerRecoveryWorkbench.test.tsx'].includes(source)) {
      supersededBindings.push({ file, source, sha256: expected, replacement: receipts.ui.file, reason: 'Later focus correction; replace ten earlier UI results with eleven current focused results. The other 299 service tests remain current.' }); continue;
    }
    assert.equal(hash(fs.readFileSync(path.join(root, source))), expected, `${file}: current ${source}`);
    if (bindings[source]) assert.equal(bindings[source], expected, source);
    bindings[source] = expected;
  }
  if (key === 'database' || key === 'browser') assert.equal(value.originalUnchanged, true, file);
  evidence.push({ kind: key, file, sha256: hash(fs.readFileSync(path.join(runRoot, file))) });
}
assert.equal(receipts.jest.value.summary.passed, 309); assert.equal(receipts.jest.value.summary.failed, 0);
assert.equal(receipts.ui.value.summary.passed, 11); assert.equal(receipts.ui.value.summary.failed, 0);
assert.equal(receipts.cashBrowser.value.views.length, 12); assert.ok(receipts.cashBrowser.value.views.every(row => row.passed));
assert.equal(receipts.cashBrowser.value.noFinancialMutations, true); assert.equal(receipts.cashBrowser.value.outsideFixtureUnchanged, true);
assert.equal(receipts.database.value.checks.length, 4); assert.ok(receipts.database.value.checks.every(row => row.status === 'passed'));
assert.equal(receipts.browser.value.journeys.length, 2); assert.ok(receipts.browser.value.journeys.every(row => row.passed));
const registerPath = path.join(runRoot, 'WORKFLOW_REGISTER.json'), original = fs.readFileSync(registerPath);
assert.equal(hash(original), '279d4b84689aa9e38d0503fc03c5f401c0b725eced6dac134e9b9bd08f689fec', 'Register predecessor changed; reconcile before writing');
const register = JSON.parse(original), workflow = register.workflows.find(row => row.id === 'FA-CASH-COMMAND'); assert.ok(workflow);
const run = crypto.randomUUID(), at = new Date().toISOString(), reviewFile = `evidence/receipt-treatment-review-${run}.json`;
fs.writeFileSync(path.join(__dirname, `receipt-treatment-register-before-${run}.json`), original, { flag: 'wx' });
const reportFile = 'RECEIPT_SOURCE_TREATMENT_2026-10-01.md';
const review = { at, status: 'verified_corrections_parent_workflow_open', passed: true, scope: 'Receipt source treatment, exact approved-price credits and Cash denial presentation. No full-register or release certification.',
  head: '62a56036a5ac9b37236a20c9b148052199069479', evidence, bindings, supersededBindings,
  summary: { focusedTests: 341, suites: 14, basis: '299 unchanged accounting/service tests + 11 current recovery UI tests + 31 current Cash tests; superseded attempts are not added', databaseJourneys: 4, cashDenialJourneys: 12, invoiceGuidanceJourneys: 2 },
  limitations: ['Full workflow/source reconciliation remains incomplete', 'No native screen-reader or actual browser-zoom certification', 'Axe incomplete contrast and development issue badge remain explicit', 'No production/cache-enabled performance closure', 'Statutory treatment selection requires the accounting owner', 'Authentic legacy and weighted-average carrying-value conflicts remain review-controlled'], reportFile };
fs.writeFileSync(path.join(runRoot, reviewFile), JSON.stringify(review, null, 2) + '\n', { flag: 'wx' });
workflow.implementationStatus = 'versioned_nonstock_zero_receipt_and_source_bound_price_credit_treatment_with_localized_cash_denials';
workflow.runtimeStatus = '341_focused_tests_4_database_12_cash_denial_2_invoice_guidance_journeys_verified';
workflow.evidence.push(reportFile, reviewFile);
workflow.closureReview.completeWorkflowVerified = false;
workflow.closureReview.sourceTreatmentBindingCurrent = true; workflow.closureReview.cashDenialBindingCurrent = true;
for (const key of ['fractionalReceiptBindingCurrent', 'operationalReceiptBindingCurrent', 'receiptCapacityBindingCurrent', 'invoiceReceiptHandoffBindingCurrent']) workflow.closureReview[key] = false;
workflow.closureReview.latestScopedReview = reviewFile;
const verified = ['fresh_mixed_and_nonstock_invoice_source_treatment_without_inventory_inflation', 'nonstock_explicit_tenant_leaf_currency_and_control_account_enforcement', 'original_zero_receipt_positive_invoice_return_credit_exact_reversal', 'authenticated_independent_invoice_price_credit_source_chain', 'nonstock_stale_preview_recovery_exact_retry_and_unchanged_approval', 'cash_denial_single_landmark_localized_keyboard_doubled_text_two_paths_en_fr_three_widths', 'nonstock_recovery_en_fr_actual_password_guidance_and_retained_history'];
workflow.closureReview.verifiedCriteria = [...new Set([...(workflow.closureReview.verifiedCriteria || []), ...verified])];
workflow.remaining[0] = 'Fresh mixed/non-stock invoices and originally-zero receipts now have source-bound treatment, actual account/currency/control checks, exact approved-price credit/reversal and owned runtime evidence. Authentic legacy reconstruction, mixed unverified source treatment, weighted-average carrying-value versus receipt-claim conflicts, tenant-specific statutory account decisions, CASH_DRAWER_CLOSE/EXPENSE_APPROVAL setup and complete downstream lifecycles remain open.';
workflow.remaining[2] = 'Cash route/service denials now have one main landmark, EN/FR recovery, keyboard navigation and normal/doubled-text geometry at 320/768/1440px. Native screen reader, actual browser zoom, incomplete automated contrast measurements, non-text contrast, full hydration/console checks and remaining payroll accessibility stay open. A development issue badge is not cleared by zero pageerror events.';
workflow.remaining[workflow.remaining.length - 1] = 'Full-register source reconciliation remains incomplete after source-treatment and Cash denial changes. Earlier receipt milestones remain retained historical evidence; current focused corrections do not recertify every older lifecycle claim. Real close-assessment races, interrupted-process recovery and complete lifecycle evidence remain open. See the latest scoped review and unchanged original closure checklist.';
register.updatedAt = at; register.sourceReconciliation.current = false; register.sourceReconciliation.latestScopedReview = reviewFile;
const statuses = ['Queued', 'In progress', 'Verification pending', 'Blocked—engineering', 'Blocked—external', 'Complete—verified'];
register.coverage.statusCounts = Object.fromEntries(statuses.map(status => [status, register.workflows.filter(row => row.status === status).length]));
register.coverage.discoveredWorkflows = register.workflows.length; register.coverage.completeWorkflowsVerified = register.coverage.statusCounts['Complete—verified'];
assert.equal(register.workflows.length, 270); assert.equal(register.coverage.completeWorkflowsVerified, 4);
const updated = JSON.stringify(register, null, 2) + '\n'; fs.writeFileSync(registerPath, updated);
const progress = `# Current progress

Updated ${at}; HEAD 62a56036a5ac9b37236a20c9b148052199069479 on codex/migration-control-plane-release-2026-08-29. Shared changes preserved. Register SHA256: ${hash(updated)}. Latest corrections have current source-bound evidence; full-register reconciliation remains incomplete.

**Position:** 270 discovered workflows; discovery incomplete; 191 unmapped source entries. Recorded statuses: Queued 265, In progress 1, Complete—verified 4; all others zero. Prior closures remain historical pending full reconciliation. No new workflow closed or was reopened.

| Priority | Workflow and outcome | Status | Delivered and verified | Remaining closure criteria | Owner | Next action |
|---|---|---|---|---|---|---|
| Primary | FA-CASH-COMMAND: truthful finance actions | In progress | Two denial paths localized, one main landmark, keyboard and doubled text at three widths | Current full-source/proof/concurrent-change evidence; native accessibility, zoom, contrast and representative latency | Engineering | Reconcile direct Cash source/failure/proof requirements against its original closure checklist |
| Supporting | Receipt/invoice accounting | In progress | Mixed/non-stock treatment; zero receipt through approved invoice, return, credit and exact reversal | Authentic legacy/mixed-unproven sources, weighted-average carrying-value conflicts, statutory treatment and complete lifecycle | Engineering/accounting | Preserve verified contract; resolve remaining high-impact valuation requirement without removing its guard |
| Next 1 | PR-17: reconciliation exceptions | Queued | Prior source/correction handoffs | Financial/legacy treatment and recovery | Engineering | Reconcile original closure scope |
| Next 2 | ID-04: invitation redemption | Queued | Prior authority/recipient evidence | Accessibility, onboarding, transport | Identity owner | Verify transport boundary |
| Next 3 | MC-11: permitted workspace | Queued | Selected route/action boundaries | Cross-domain transport and scanner gaps | Engineering | Preserve guards and improve diagnostics |

**Since the previous report:** Non-stock amounts no longer inherit inventory treatment. Explicit tenant rules must resolve to permitted active leaf accounts with compatible currency. Current v3 proof preserves non-stock and genuine no-journal receipt sources; v1/v2 records are not rewritten. Credits of independently approved price differences require matching authenticated invoice/return proof. Missing or forged evidence remains blocked. Recovery now explains the accounting owner's next action in EN/FR.

**Verified:** 341 tests across 14 distinct suites, changed-file lint and TypeScript; four owned database journeys; twelve Cash denial browser journeys; EN1440/FR320 actual invoice-recovery guidance with password verification, focus return after background refresh and retained history. Final sources and records outside isolated fixtures remained unchanged. No schema migration was needed. [Milestone and evidence](RECEIPT_SOURCE_TREATMENT_2026-10-01.md).

**Failures and limits:** Browser testing found doubled-text mobile clipping and focus lost when recovery closed during refresh; both were corrected and reverified. An early aggregate run passed tests but failed source stability during the final credit edit; the frozen rerun passed. Final review added receivables-account and incompatible-currency rejection checks. Failed attempts remain retained. Native screen reader, true browser zoom, unresolved contrast measurements, development hydration/console issues, concurrency, authentic close/payroll proof and expert CNPS/IRPP provenance remain open. No deployment, real payment, external message or simulated X1 clearance occurred. All 17 workflow families remain in the [register](WORKFLOW_REGISTER.json); downstream ownership is clarified in the milestone report without dropping requirements. ETA remains unreliable while discovery and full validation are incomplete.
`;
assert.ok(progress.split(/\s+/).length <= 700); fs.writeFileSync(path.join(runRoot, 'CURRENT_PROGRESS.md'), progress);
fs.writeFileSync(path.join(__dirname, `receipt-treatment-register-followup-${run}.json`), JSON.stringify({ at, reviewFile, registerBefore: hash(original), registerAfter: hash(updated), counts: register.coverage.statusCounts, progressWords: progress.split(/\s+/).length }, null, 2), { flag: 'wx' });
console.log(JSON.stringify({ reviewFile, registerAfter: hash(updated), progressWords: progress.split(/\s+/).length, completeWorkflowVerified: false }));
