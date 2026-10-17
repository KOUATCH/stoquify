// One-use scoped checkpoint. Verify receipts and exact predecessor before writing.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../../..'), runRoot = path.resolve(__dirname, '..');
const read = file => JSON.parse(fs.readFileSync(path.join(runRoot, file), 'utf8'));
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const manifest = read('evidence/cash-close-final-inputs.json'), bindings = {}, evidence = [];
const receipts = {};
for (const [kind, file] of Object.entries(manifest.receipts)) {
  const result = read(file); receipts[kind] = result;
  assert.equal(result.passed, true, file); assert.equal(result.sourceStable, true, file);
  const sources = result.sourceAfter || result.sourcesAfter; assert.ok(sources && Object.keys(sources).length);
  for (const [source, expected] of Object.entries(sources)) {
    assert.equal(hash(fs.readFileSync(path.join(root, source))), expected, `${file}: ${source}`);
    if (bindings[source]) assert.equal(bindings[source], expected, source);
    bindings[source] = expected;
  }
  if (kind === 'database' || kind === 'browser') { assert.equal(result.outsideUnchanged, true); assert.equal(result.noFinancialWrites, true); }
  evidence.push({ kind, file, sha256: hash(fs.readFileSync(path.join(runRoot, file))) });
}
assert.equal(receipts.jest.summary.passed, 250); assert.equal(receipts.jest.summary.failed, 0); assert.equal(receipts.jest.summary.suites, 11);
assert.equal(receipts.database.checks.length, 7); assert.ok(receipts.database.checks.every(item => item.status === 'passed'));
assert.equal(receipts.browser.journeys.length, 2); assert.ok(receipts.browser.journeys.every(item => item.passed));
const registerPath = path.join(runRoot, 'WORKFLOW_REGISTER.json'), original = fs.readFileSync(registerPath);
assert.equal(hash(original), '76b55e6219bf698159775a15b5050cc646a7b6d166db1799eabed70355215ec2', 'Reconcile changed register before applying checkpoint');
const register = JSON.parse(original), workflow = register.workflows.find(item => item.id === 'FA-CASH-COMMAND'), closePack = register.workflows.find(item => item.id === 'FA-CLOSE-PACK'), closeRead = register.workflows.find(item => item.id === 'FA-CLOSE-READ');
assert.ok(workflow && closePack && closeRead); assert.equal(workflow.status, 'In progress');
const run = crypto.randomUUID(), at = new Date().toISOString(), reviewFile = `evidence/cash-close-review-${run}.json`, reportFile = 'CASH_CLOSE_EVIDENCE_2026-10-01.md';
fs.writeFileSync(path.join(__dirname, `cash-close-register-before-${run}.json`), original, { flag: 'wx' });
const review = { at, passed: true, status: 'verified_correction_parent_workflow_open', evidence, bindings,
  scope: 'Close snapshot/current retained proof/Cash trust condition read contract; no full workflow, professional, release or whole-page consistency claim.',
  summary: { focusedTests: 250, suites: 11, databaseCases: 7, browserJourneys: 2 },
  remaining: ['Actual Close destination still presents persisted CERTIFIED/100% and no high-risk blockers for missing-export fixture', 'Certification versus invalidation writer race is source-traced, not repaired or runtime reproduced', 'Whole Cash source/authority concurrent-change consistency', 'Native assistive technology, true browser zoom, comprehensive contrast and production performance', 'Full-register reconciliation and every original workflow family remain required'] };
fs.writeFileSync(path.join(runRoot, reviewFile), JSON.stringify(review, null, 2) + '\n', { flag: 'wx' });
workflow.implementationStatus = 'current_close_evidence_consistent_snapshot_and_localized_trust_recovery';
workflow.runtimeStatus = '250_focused_tests_7_close_database_cases_2_cash_guidance_browser_journeys_verified';
workflow.evidence.push(reportFile, reviewFile);
for (const key of ['aggregateSourceBindingCurrent', 'proofStateSourceBindingCurrent', 'cashCloseProofBindingCurrent', 'proofCompletenessBindingCurrent', 'presentationBindingCurrent', 'sourceCopyBindingCurrent', 'cashAccessibilityBindingCurrent', 'cashContrastBindingCurrent', 'cashDenialBindingCurrent']) workflow.closureReview[key] = false;
workflow.closureReview.closeEvidenceReadBindingCurrent = true; workflow.closureReview.latestScopedReview = reviewFile;
workflow.closureReview.verifiedCriteria = [...new Set([...workflow.closureReview.verifiedCriteria,
  'close_snapshot_current_export_and_complete_control_evidence', 'close_snapshot_repeatable_read_actual_concurrent_invalidation',
  'close_proof_current_exports_beyond_display_limit', 'close_scope_and_retained_global_obligations',
  'cash_close_review_condition_en_fr_keyboard_and_reflow', 'close_query_failure_and_successful_retry_without_financial_writes'])];
workflow.remaining.push('Current close snapshot/proof/Cash evidence claims are repaired and verified. The close-pack certification writer can still overwrite a concurrent invalidation according to source interleaving; FA-CLOSE-PACK owns the shared serialization/version fix and real two-connection reproduction. This read-side correction does not establish atomicity across all Cash sources or concurrent authority changes. See CASH_CLOSE_EVIDENCE_2026-10-01.md.');
workflow.remaining.push('Actual authorized Close destination still presents persisted CERTIFIED/100% and no high-risk journey blockers for a missing-export fixture. Cash guidance/navigation passed; destination evidence presentation did not. FA-CLOSE-READ owns alignment of its read model and status wording with current proof. See the retained actual EN destination screenshot in CASH_CLOSE_EVIDENCE_2026-10-01.md.');
closePack.remaining = [...(closePack.remaining || []), 'Source-traced certification/invalidation lost-update risk: exportClosePack reads run/control state then writes CERTIFIED from earlier metadata without a shared lock/version check. Reproduce using authentic owned certification prerequisites and a concurrent source invalidation, then preserve invalidation or reject/revalidate certification. Retain historical exports. Evidence: CASH_CLOSE_EVIDENCE_2026-10-01.md.'];
closePack.evidence = [...(closePack.evidence || []), reportFile];
closeRead.remaining = [...(closeRead.remaining || []), 'Actual Cash handoff exposed persisted CERTIFIED/100% and no high-risk blockers for an intentionally missing-export fixture. Align destination current-proof summary and status presentation, then reverify actual EN/FR handoff. Source/evidence: CASH_CLOSE_EVIDENCE_2026-10-01.md.'];
closeRead.evidence = [...(closeRead.evidence || []), reportFile];
register.updatedAt = at; register.sourceReconciliation.current = false; register.sourceReconciliation.latestScopedReview = reviewFile;
const statuses = ['Queued', 'In progress', 'Verification pending', 'Blocked—engineering', 'Blocked—external', 'Complete—verified'];
register.coverage.statusCounts = Object.fromEntries(statuses.map(status => [status, register.workflows.filter(item => item.status === status).length]));
register.coverage.discoveredWorkflows = register.workflows.length; register.coverage.completeWorkflowsVerified = register.coverage.statusCounts['Complete—verified'];
assert.equal(register.workflows.length, 270); assert.equal(register.coverage.completeWorkflowsVerified, 4);
const updated = JSON.stringify(register, null, 2) + '\n'; fs.writeFileSync(registerPath, updated);
const progress = `# Current progress

Updated ${at}; HEAD 62a56036a5ac9b37236a20c9b148052199069479 on codex/migration-control-plane-release-2026-08-29. Shared changes preserved. Register SHA256: ${hash(updated)}. Latest scoped receipts match current source; full-register reconciliation remains incomplete.

**Position:** 270 discovered workflows; discovery incomplete; 191 unmapped source entries. Recorded statuses: Queued 265, In progress 1, Complete—verified 4; others zero. Historical closures remain subject to reconciliation. No workflow closed or reopened this turn.

| Priority | Workflow and outcome | Status | Delivered and verified | Remaining criteria | Owner | Next action |
|---|---|---|---|---|---|---|
| Primary | FA-CASH-COMMAND: truthful finance actions | In progress | Current close proof, consistent snapshot, EN/FR review guidance | Whole-source/authority races, full lifecycle, accessibility and representative latency | Engineering | Complete direct Cash closure checklist and its close proof dependency |
| Supporting | FA-CLOSE-PACK: controlled certification | Queued; next supporting dependency | Reader rejects missing/invalidated exports and retains history | Certifier may overwrite concurrent invalidation; real certification prerequisites/recovery | Accounting engineering | Reproduce and correct shared write serialization/version contract |
| Next 1 | PR-17: reconciliation exceptions | Queued | Prior source/correction handoffs | Financial/legacy treatment and recovery | Engineering | Reconcile original closure scope |
| Next 2 | ID-04: invitation redemption | Queued | Prior authority/recipient evidence | Accessibility, onboarding, transport | Identity owner | Verify transport boundary |
| Next 3 | MC-11: permitted workspace | Queued | Selected route/action boundaries | Cross-domain transport and scanner gaps | Engineering | Preserve guards and improve diagnostics |

**Since the previous report:** Fixed status-only close certification and stale retained-export counting. Snapshot evidence reads now share one RepeatableRead transaction. Existing global obligations remain effective; mixed/unreviewed periods cannot inherit certification. Cash shows Review required / Examen requis with expandable source conditions and recovery actions; raw/operational zero counts are informational.

**Verified:** 250 tests/11 suites, changed-file lint, TypeScript, seven owned database cases and two actual EN/FR browser journeys. Concurrent invalidation committed on a different PostgreSQL connection; the paused read remained coherent and the next read was blocked. Missing/stale artifacts, unavailable controls, scope, failure/retry and unchanged financial/outside records passed. [Detailed results and guidance](${reportFile}).

**Plan change:** Close evidence is the current Cash dependency because a false-certification defect and a separate writer lost-update risk were found. Receipt/invoice corrections remain retained; authentic legacy treatment and weighted-average carrying-value conflicts remain in their owners' backlog, not dropped.

**Limits:** Actual Close destination still shows persisted CERTIFIED/100% and no high-risk blockers for the missing-export fixture; FA-CLOSE-READ owns this observed handoff defect. The writer race is source-traced, not yet reproduced or fixed. This transaction covers only the close snapshot. Actual certification/expert country evidence, native screen reader, true browser zoom, complete contrast/hydration checks, interrupted processing and production performance remain open. Initial test receipt saving hit sandbox EPERM; a database verifier sort-key error stopped before fixtures; both attempts are retained and corrected. No migration, live approval, external message, payment, deployment or X1 clearance occurred. All 17 workflow families remain in the [register](WORKFLOW_REGISTER.json). ETA remains unreliable while discovery and full validation are incomplete.
`;
assert.ok(progress.split(/\s+/).length <= 700); fs.writeFileSync(path.join(runRoot, 'CURRENT_PROGRESS.md'), progress);
fs.writeFileSync(path.join(__dirname, `cash-close-register-followup-${run}.json`), JSON.stringify({ at, reviewFile, registerBefore: hash(original), registerAfter: hash(updated), counts: register.coverage.statusCounts, progressWords: progress.split(/\s+/).length }, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ reviewFile, registerAfter: hash(updated), progressWords: progress.split(/\s+/).length, completeWorkflowVerified: false }));
