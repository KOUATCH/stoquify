// One-use checkpoint. Refuses stale receipts or a changed register; never certifies a whole workflow.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../../..'), runRoot = path.resolve(__dirname, '..');
const read = file => JSON.parse(fs.readFileSync(path.join(runRoot, file), 'utf8'));
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const manifest = read('evidence/close-denial-recovery-final-inputs.json'), bindings = {}, evidence = [], receipts = {};
for (const [kind, file] of Object.entries(manifest.receipts)) {
  const result = read(file); receipts[kind] = result;
  assert.equal(result.passed, true, file); assert.equal(result.sourceStable, true, file);
  const sources = result.sourceAfter || result.sourcesAfter; assert.ok(sources && Object.keys(sources).length);
  const supersededSources = [];
  for (const [source, expected] of Object.entries(sources)) {
    const actual = hash(fs.readFileSync(path.join(root, source)));
    if (actual !== expected) {
      const allowed = manifest.supersededBindings?.[source];
      assert.ok(allowed, `${file}: unreviewed source drift: ${source}`);
      assert.equal(expected, allowed.predecessor); assert.equal(actual, allowed.current);
      assert.equal(read(manifest.receipts.uiJest).sourceAfter[source], actual);
      supersededSources.push({ source, predecessor: expected, current: actual, refreshedBy: manifest.receipts.uiJest });
    }
    if (bindings[source]) assert.equal(bindings[source], actual, source);
    bindings[source] = actual;
  }
  evidence.push({ kind, file, sha256: hash(fs.readFileSync(path.join(runRoot, file))), supersededSources });
}
assert.deepEqual(receipts.jest.summary, { passed: 283, failed: 0, suites: 12, pending: 0 });
assert.equal(receipts.uiJest.summary.failed, 0); assert.equal(receipts.uiJest.summary.pending, 0); assert.equal(receipts.uiJest.summary.suites, 2);
assert.equal(receipts.database.checks.length, 5); assert.ok(receipts.database.checks.every(row => row.status === 'passed'));
assert.equal(receipts.database.outsideUnchanged, true); assert.equal(receipts.database.noOperationFinancialEffects, true);
assert.equal(receipts.aggregate.scopedUnchanged, true); assert.equal(receipts.aggregate.financialUnchanged, true);
assert.equal(receipts.aggregate.observations.selected.grade, 'certified'); assert.equal(receipts.aggregate.observations.aggregate.grade, 'blocked');
assert.equal(receipts.browser.journeys.length, 2); assert.ok(receipts.browser.journeys.every(row => row.passed && row.artifact.contentHashMatchesStored));
assert.equal(receipts.browser.outsideUnchanged, true); assert.equal(receipts.browser.noOperationFinancialEffects, true);
const artifacts = [manifest.report, ...manifest.visualReview, ...(manifest.retainedAttempts || [])].map(file => ({ file, sha256: hash(fs.readFileSync(path.join(runRoot, file))) }));
const registerPath = path.join(runRoot, 'WORKFLOW_REGISTER.json'), original = fs.readFileSync(registerPath);
assert.equal(hash(original), 'e6c2966789bed4f38234e87d8dfcc7a35a8f20af28e26389280c188df5b578e4', 'Reconcile changed register before checkpoint');
const register = JSON.parse(original), cash = register.workflows.find(row => row.id === 'FA-CASH-COMMAND'), pack = register.workflows.find(row => row.id === 'FA-CLOSE-PACK'), closeRead = register.workflows.find(row => row.id === 'FA-CLOSE-READ');
assert.equal(cash.status, 'In progress'); assert.equal(pack.status, 'In progress');
const run = crypto.randomUUID(), at = new Date().toISOString(), reviewFile = `evidence/close-denial-recovery-review-${run}.json`, reportFile = manifest.report;
const criteria = [
  'actual_stale_export_predecessor_rollback_reproduced',
  'authorized_certification_denial_commits_invalidation_without_export',
  'denial_retry_preserves_original_event_audit_and_outbox',
  'actual_new_assessment_and_independent_selected_run_certification_recovery',
  'en_fr_actual_denial_refresh_note_preservation_and_manual_recovery_download',
  'certified_error_awaits_refresh_without_automatic_export_retry',
];
const remaining = [
  'Cash aggregate remains blocked by retained older invalidated run after a new selected run is certified; supersession versus unresolved-obligation contract needs implementation and verification',
  'Actual zero-variance count changes evidence fingerprint without immediate producer invalidation',
  'New-run discovery/assessment races, global multi-period lock ordering, interrupted processing, full producer and outbox delivery lifecycle',
  'Whole Cash source/authority consistency and original full workflow checklist; nonempty inventory/payroll and authentic expert prerequisites',
  'Native assistive technology, true browser zoom, full inherited localization/contrast/hydration and representative production latency',
  'Full-register reconciliation and every original workflow family',
];
const review = { at, passed: true, status: 'verified_corrections_parent_workflows_open', evidence, artifacts, bindings, verifiedCriteria: criteria,
  summary: { priorFocusedTests: 283, priorSuites: 12, refreshedUiTests: receipts.uiJest.summary.passed, refreshedUiSuites: 2, databaseCases: 5, predecessorReproduction: true, browserJourneys: 2, reproducedAggregateDiscrepancy: true },
  scope: 'Durable authorized certification denial and selected-run recovery. Cash aggregate recovery, outbox delivery and complete workflow closure remain unverified.', remaining };
cash.implementationStatus = 'close_denial_retention_and_selected_run_recovery_integrated';
cash.runtimeStatus = '283_regression_baseline_47_refreshed_ui_tests_5_database_cases_en_fr_selected_recovery_aggregate_gap_reproduced';
cash.closureReview.latestScopedReview = reviewFile;
cash.closureReview.closeDenialRecoveryBindingCurrent = true;
cash.closureReview.closeAggregateRecoveryVerified = false;
cash.closureReview.closeWriteSerializationBindingCurrent = false;
cash.closureReview.closeDestinationProofBindingCurrent = false;
cash.closureReview.closeEvidenceReadBindingCurrent = false;
cash.closureReview.priorCloseEvidenceNote = 'Prior writer/read race and Cash handoff receipts remain historical after pack/Center source changed. Current focused regressions pass; this checkpoint re-verifies denial/recovery, not every earlier runtime ordering.';
cash.closureReview.verifiedCriteria = [...new Set([...(cash.closureReview.verifiedCriteria || []), ...criteria])];
cash.remaining.push(remaining[0] + '. See ' + reportFile + '.');
cash.remaining.push(remaining[1] + '. See ' + reportFile + '.');
pack.implementationStatus = 'certification_denial_invalidation_commits_and_manual_recovery_integrated';
pack.runtimeStatus = 'actual_stale_denial_retry_reassessment_and_en_fr_certifier_recovery_verified';
pack.remaining = pack.remaining.filter(value => !value.startsWith('No professional certification claim. Investigate invalidation evidence'));
pack.remaining.push('Authorized stale denial now retains evidence and selected-run recovery is verified; aggregate supersession, immediate zero-count invalidation, full delivery and complete workflow lifecycle remain. See ' + reportFile + '.');
pack.remaining.push('Existing downloaded document UUID differs from database export ID. Current watermark/hash/run/audit binding is verified; make the two-identifier contract explicit without rewriting retained artifacts. See ' + reportFile + '.');
pack.closureReview = { ...(pack.closureReview || {}), complete: false, latestScopedReview: reviewFile,
  verifiedCriteria: [...new Set([...(pack.closureReview?.verifiedCriteria || []), ...criteria])], remaining };
closeRead.runtimeStatus = 'actual_denial_refresh_and_selected_reassessment_current_proof_en_fr_verified';
for (const workflow of [cash, pack, closeRead]) workflow.evidence = [...new Set([...(workflow.evidence || []), reportFile, reviewFile])];
register.updatedAt = at;
register.executionPolicy.supportingDependency = 'FA-CLOSE-PACK: truthful close denial, retained history and recovery';
register.executionPolicy.note = 'Cash remains primary and Close Pack supporting. This checkpoint closes bounded denial/recovery criteria and reproduces aggregate supersession and zero-count producer gaps. Original families and prior receipt/invoice requirements remain retained; no workflow is closed or split.';
register.sourceReconciliation.current = false; register.sourceReconciliation.latestScopedReview = reviewFile;
const statuses = ['Queued', 'In progress', 'Verification pending', 'Blocked—engineering', 'Blocked—external', 'Complete—verified'];
register.coverage.statusCounts = Object.fromEntries(statuses.map(status => [status, register.workflows.filter(row => row.status === status).length]));
register.coverage.discoveredWorkflows = register.workflows.length; register.coverage.completeWorkflowsVerified = register.coverage.statusCounts['Complete—verified'];
assert.equal(register.workflows.length, 270); assert.equal(register.coverage.completeWorkflowsVerified, 4); assert.equal(register.coverage.statusCounts['In progress'], 2);
const updated = JSON.stringify(register, null, 2) + '\n';
const progress = `# Current progress

Updated ${at}; HEAD 62a56036a5ac9b37236a20c9b148052199069479 on codex/migration-control-plane-release-2026-08-29. Shared changes preserved. Register SHA256: ${hash(updated)}. Latest scoped evidence matches current source; full-register reconciliation remains incomplete.

**Position:** 270 discovered workflows; discovery incomplete; 191 unmapped source entries. Recorded statuses: Queued 264, In progress 2, Complete—verified 4; others zero. Historical closures have not all been revalidated. No workflow closed this turn.

| Priority | Workflow and outcome | Status | Delivered and verified | Remaining criteria | Owner | Next action |
|---|---|---|---|---|---|---|
| Primary | FA-CASH-COMMAND: truthful finance actions | In progress | Close evidence, denial retention and selected-run recovery | Aggregate history/supersession, whole-source/authority races, full lifecycle | Engineering | Resolve old blocked assessment versus current recovered proof without hiding obligations |
| Supporting | FA-CLOSE-PACK: controlled certification | In progress | Durable denial, duplicate suppression, real reassessment and independent export | Immediate zero-count invalidation, assessment races, producer/delivery lifecycle | Accounting engineering | Bind zero-variance source completion to current close invalidation |
| Next 1 | PR-17: reconciliation exceptions | Queued | Prior correction handoffs | Financial/legacy treatment and recovery | Engineering | Reconcile original closure scope |
| Next 2 | ID-04: invitation redemption | Queued | Prior authority/recipient evidence | Accessibility, onboarding, transport | Identity owner | Verify transport boundary |
| Next 3 | MC-11: permitted workspace | Queued | Selected route/action boundaries | Cross-domain transport and scanner gaps | Engineering | Preserve guards and improve diagnostics |

**Since the previous report:** Refused certification now commits its detected invalidation before returning the error. Repeated refusal retains the first event/audit/outbox; no new export is created. The client refreshes current evidence, preserves editable notes, announces EN/FR guidance and requires deliberate retries. Fresh assessment and a separate certifier recover the selected run while older records remain intact.

**Verified:** 283 tests/12 suites initially passed. The browser exposed overlong French guidance; after shortening it, ${receipts.uiJest.summary.passed} tests in the two affected UI suites, UI lint and TypeScript passed again. Unchanged service/static evidence is retained with explicit source bindings. Five database cases verified denial and recovery. Actual EN1440/FR320 journeys verified refusal, refreshed proof, retained review notes, explicit identity/retry and downloaded hash integrity. Operation financial and outside-fixture fingerprints stayed unchanged. [Detailed evidence and operating guidance](${reportFile}).

**New evidence:** A real zero-variance stock count changes the source fingerprint without immediate Close invalidation. A separate read-only check confirms the recovered selected run is certified while Cash remains blocked by retained older invalidation. These are concrete engineering gaps; selected recovery is not complete Cash recovery. Outbox enqueue is durable; delivery remains unverified.

**Remaining:** New-run discovery/assessment races, global multi-period ordering, all producers and interrupted recovery; complete Cash source/authority and lifecycle reconciliation; nonempty inventory/payroll and authentic expert country evidence; native screen reader, actual zoom, full inherited localization/contrast/hydration and production latency. Receipt/invoice legacy reconstruction and weighted-average carrying-value conflicts remain retained. All 17 original families remain in the [register](WORKFLOW_REGISTER.json). No migration, live approval, external message, payment, deployment or X1 clearance occurred. No user action blocks the next local implementation. ETA remains unreliable while discovery and full validation are incomplete.
`;
assert.ok(progress.split(/\s+/).length <= 700);
fs.writeFileSync(path.join(__dirname, `close-denial-recovery-register-before-${run}.json`), original, { flag: 'wx' });
fs.writeFileSync(path.join(runRoot, reviewFile), JSON.stringify(review, null, 2) + '\n', { flag: 'wx' });
fs.writeFileSync(registerPath, updated);
fs.writeFileSync(path.join(runRoot, 'CURRENT_PROGRESS.md'), progress);
fs.writeFileSync(path.join(__dirname, `close-denial-recovery-register-followup-${run}.json`), JSON.stringify({ at, reviewFile, registerBefore: hash(original), registerAfter: hash(updated), counts: register.coverage.statusCounts, progressWords: progress.split(/\s+/).length }, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ reviewFile, registerAfter: hash(updated), progressWords: progress.split(/\s+/).length, completeWorkflowVerified: false }));
