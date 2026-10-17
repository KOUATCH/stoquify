// One-use checkpoint: exact predecessor, complete successful receipts and current sources required.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../../..'), runRoot = path.resolve(__dirname, '..');
const read = file => JSON.parse(fs.readFileSync(path.join(runRoot, file), 'utf8'));
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const manifest = read('evidence/close-write-current-final-inputs.json'), bindings = {}, evidence = [], receipts = {};
for (const [kind, file] of Object.entries(manifest.receipts)) {
  const result = read(file); receipts[kind] = result;
  assert.equal(result.passed, true, file); assert.equal(result.sourceStable, true, file);
  const sources = result.sourceAfter || result.sourcesAfter; assert.ok(sources && Object.keys(sources).length);
  for (const [source, expected] of Object.entries(sources)) {
    assert.equal(hash(fs.readFileSync(path.join(root, source))), expected, `${file}: ${source}`);
    if (bindings[source]) assert.equal(bindings[source], expected, source);
    bindings[source] = expected;
  }
  if (['readDatabase', 'writeDatabase', 'browser'].includes(kind)) assert.equal(result.outsideUnchanged, true);
  if (['readDatabase', 'browser'].includes(kind)) assert.equal(result.noFinancialWrites, true);
  evidence.push({ kind, file, sha256: hash(fs.readFileSync(path.join(runRoot, file))) });
}
assert.deepEqual(receipts.jest.summary, { passed: 247, failed: 0, suites: 10, pending: 0 });
assert.equal(receipts.readDatabase.checks.length, 7); assert.ok(receipts.readDatabase.checks.every(row => row.status === 'passed'));
assert.equal(receipts.writeDatabase.checks.length, 2); assert.ok(receipts.writeDatabase.checks.every(row => row.status === 'passed' && row.noFinancialEffectsDuringOperation && row.blocking.observed));
assert.equal(receipts.writeDatabase.predecessorComparison.reproduced, true);
assert.equal(receipts.browser.journeys.length, 2); assert.ok(receipts.browser.journeys.every(row => row.passed && row.destinationProof.recordedStatusSeparated));
const failedAttempt = read(manifest.retainedFailedAttempt); assert.equal(failedAttempt.passed, false); assert.equal(failedAttempt.summary.failed, 1);
const artifacts = [manifest.report, manifest.retainedFailedAttempt, ...manifest.visualReview].map(file => ({ file, sha256: hash(fs.readFileSync(path.join(runRoot, file))) }));
const registerPath = path.join(runRoot, 'WORKFLOW_REGISTER.json'), original = fs.readFileSync(registerPath);
assert.equal(hash(original), '7ce053c5134a1127794e455a27e4f39956cf2bd08da913c90c317732c246a58e', 'Reconcile changed register before checkpoint');
const register = JSON.parse(original), cash = register.workflows.find(row => row.id === 'FA-CASH-COMMAND'), pack = register.workflows.find(row => row.id === 'FA-CLOSE-PACK'), closeRead = register.workflows.find(row => row.id === 'FA-CLOSE-READ');
assert.ok(cash && pack && closeRead); assert.equal(cash.status, 'In progress'); assert.equal(pack.status, 'Queued');
const run = crypto.randomUUID(), at = new Date().toISOString(), reviewFile = `evidence/close-write-current-review-${run}.json`, reportFile = manifest.report;
const criteria = [
  'existing_close_run_certification_invalidation_both_lock_orderings',
  'predecessor_close_certification_lost_update_database_reproduction',
  'waiting_source_invalidation_binds_new_certified_export_and_retains_hash',
  'current_close_dashboard_complete_tenant_evidence_repeatable_read',
  'current_close_dashboard_real_read_invalidation_race',
  'current_close_dashboard_cross_tenant_relations_and_query_retry',
  'cash_to_close_en_fr_current_proof_recorded_history_reflow',
  'close_journey_and_details_share_refreshed_period_and_error_state',
];
const remaining = [
  'New-run discovery/assessment races, global multi-period lock ordering, interrupted processing and complete producer integration',
  'Denied-export invalidation evidence may roll back with the denial; investigate existing transaction contract',
  'Whole Cash source/authority consistency and original complete workflow acceptance checklist',
  'Native assistive technology, true browser zoom, full page localization/contrast/hydration and production latency',
  'Full-register reconciliation and all original workflow families',
];
const review = { at, passed: true, status: 'verified_corrections_parent_workflows_open', evidence, artifacts, bindings, verifiedCriteria: criteria,
  scope: 'Existing-run close write serialization and current-proof Cash handoff; no complete workflow or professional/release certification.',
  summary: { focusedTests: 247, suites: 10, databaseReadCases: 7, databaseWriteOrderings: 2, predecessorReproduction: true, browserJourneys: 2 }, remaining };
cash.implementationStatus = 'close_write_serialization_and_current_proof_handoff_integrated';
cash.runtimeStatus = '247_focused_tests_7_read_cases_2_write_orderings_predecessor_reproduction_2_en_fr_browser_journeys_verified';
cash.closureReview.closeEvidenceReadBindingCurrent = true;
cash.closureReview.closeWriteSerializationBindingCurrent = true;
cash.closureReview.closeDestinationProofBindingCurrent = true;
cash.closureReview.latestScopedReview = reviewFile;
cash.closureReview.verifiedCriteria = [...new Set([...(cash.closureReview.verifiedCriteria || []), ...criteria])];
cash.remaining = cash.remaining.map(value => value.startsWith('Current close snapshot/proof/Cash evidence claims are repaired')
  ? 'Existing-run certification/invalidation lost update is reproduced and corrected with both real database lock orderings. Retained exports survive. New-run discovery/assessment races, global multi-period ordering, complete producer invocation, and whole Cash source/authority consistency remain. See ' + reportFile + '.'
  : value.startsWith('Actual authorized Close destination still presents')
    ? 'Cash-to-Close current proof versus recorded history is verified in actual EN/FR desktop/mobile journeys. Journey and detail panels share live state. Complete destination lifecycle, native accessibility, broader inherited localization, and representative latency remain. See ' + reportFile + '.' : value);
pack.status = 'In progress';
pack.implementationStatus = 'existing_run_certification_and_invalidation_serialized';
pack.runtimeStatus = 'actual_ready_t4_setup_both_writer_orderings_and_predecessor_race_verified';
pack.remaining = pack.remaining.filter(value => !value.startsWith('Source-traced certification/invalidation lost-update risk:'));
pack.remaining.push('Existing-run lost update is corrected. Complete new-run discovery/assessment races, multi-period lock ordering, nonempty inventory/payroll prerequisites, full producer invocation, interrupted processing and transport lifecycle. Isolated synthetic system certification is not expert/statutory approval. See ' + reportFile + '.');
pack.closureReview = { ...(pack.closureReview || {}), complete: false, latestScopedReview: reviewFile, verifiedCriteria: criteria.slice(0, 3), remaining };
closeRead.implementationStatus = 'current_proof_read_model_and_shared_live_journey_presentation';
closeRead.runtimeStatus = 'scoped_current_proof_database_race_tenant_retry_and_actual_en_fr_cash_handoff_verified';
closeRead.remaining = closeRead.remaining.filter(value => !value.startsWith('Actual Cash handoff exposed'));
closeRead.remaining = closeRead.remaining.map(value => value.startsWith('Source collectors distinguish UNAVAILABLE;') ? 'Selected persisted current-proof freshness, coherent reads and query retry verified; full live collector, evidence-graph, history and accessibility lifecycle remain.' : value);
closeRead.remaining.push('New current-proof guidance is localized; inherited counters elsewhere on the Close page still contain English. Full localization/native accessibility and source-history lifecycle remain. See ' + reportFile + '.');
for (const workflow of [cash, pack, closeRead]) workflow.evidence = [...new Set([...(workflow.evidence || []), reportFile, reviewFile])];
register.updatedAt = at;
register.executionPolicy.supportingDependency = 'FA-CLOSE-PACK: current close evidence, certification serialization and retained history';
register.executionPolicy.note = 'Cash remains primary. Close proof became the supporting dependency after reproduced false-certification and handoff defects. Receipt/invoice corrections and unresolved legacy/carrying-value requirements remain retained in the backlog. This checkpoint closes bounded criteria, not complete workflows.';
register.sourceReconciliation.current = false; register.sourceReconciliation.latestScopedReview = reviewFile;
const statuses = ['Queued', 'In progress', 'Verification pending', 'Blocked—engineering', 'Blocked—external', 'Complete—verified'];
register.coverage.statusCounts = Object.fromEntries(statuses.map(status => [status, register.workflows.filter(row => row.status === status).length]));
register.coverage.discoveredWorkflows = register.workflows.length; register.coverage.completeWorkflowsVerified = register.coverage.statusCounts['Complete—verified'];
assert.equal(register.workflows.length, 270); assert.equal(register.coverage.completeWorkflowsVerified, 4); assert.equal(register.coverage.statusCounts['In progress'], 2);
const updated = JSON.stringify(register, null, 2) + '\n';
const progress = `# Current progress

Updated ${at}; HEAD 62a56036a5ac9b37236a20c9b148052199069479 on codex/migration-control-plane-release-2026-08-29. Shared changes preserved. Register SHA256: ${hash(updated)}. Latest scoped receipts match current source; full-register reconciliation remains incomplete.

**Position:** 270 discovered workflows; discovery incomplete; 191 unmapped source entries. Recorded statuses: Queued 264, In progress 2, Complete—verified 4; others zero. Historical closures remain subject to reconciliation. No workflow closed this turn; the supporting Close Pack workflow is now explicitly In progress.

| Priority | Workflow and outcome | Status | Delivered and verified | Remaining criteria | Owner | Next action |
|---|---|---|---|---|---|---|
| Primary | FA-CASH-COMMAND: truthful finance actions | In progress | Current close proof and EN/FR destination handoff | Whole-source/authority races, complete lifecycle, accessibility and representative latency | Engineering | Reconcile direct Cash closure checklist against current evidence |
| Supporting | FA-CLOSE-PACK: controlled certification | In progress | Both writer lock orderings, retained artifacts, real READY/T4 fixture | Denied-export audit rollback, new-run/assessment races, producer and recovery lifecycle | Accounting engineering | Trace and resolve denied-export invalidation persistence |
| Next 1 | PR-17: reconciliation exceptions | Queued | Prior source/correction handoffs | Financial/legacy treatment and recovery | Engineering | Reconcile original closure scope |
| Next 2 | ID-04: invitation redemption | Queued | Prior authority/recipient evidence | Accessibility, onboarding, transport | Identity owner | Verify transport boundary |
| Next 3 | MC-11: permitted workspace | Queued | Selected route/action boundaries | Cross-domain transport and scanner gaps | Engineering | Preserve guards and improve diagnostics |

**Since the previous report:** Fixed certification overwriting committed invalidation. Both writers lock the tenant's run; waiting invalidation targets the newly retained export. Close now separates current proof from recorded status/readiness. Journey and detail panels share refreshed state. Missing/stale proof and failed refresh no longer support current certification claims.

**Verified:** 247 tests/10 suites, lint, TypeScript and two source-contract gates; seven owned database read cases, two writer orderings, exact predecessor race reproduction, and two actual EN/FR browser journeys. PostgreSQL confirmed waiting connections; retained artifacts, financial records during operations, and outside-fixture records stayed intact. Read tests covered current proof, tenant-filtered relations, concurrent invalidation and failure/retry. [Detailed evidence and operating guidance](${reportFile}).

**Discovered and corrected:** The journey header previously retained initial proof after the details refreshed. Initial aggregate failed one test because two details still said no blockers; both are corrected and the failed receipt is retained. No workflow renamed or split to increase completion counts.

**Remaining:** Existing-run serialization does not establish new-run discovery, all producer calls, global multi-period ordering or interrupted recovery. Cash aggregate obligations may differ from one selected Close period. Native screen reader, true browser zoom, full localization/contrast/hydration and production latency remain open. Synthetic setup/approvals prove local system behavior only; nonempty payroll/inventory and expert country evidence remain separate. Receipt/invoice legacy reconstruction and weighted-average carrying-value conflicts remain retained. Full source reconciliation and all 17 workflow families remain in the [register](WORKFLOW_REGISTER.json). No migration, live approval, external message, payment, deployment or X1 clearance occurred. ETA remains unreliable while discovery and full validation are incomplete.
`;
assert.ok(progress.split(/\s+/).length <= 700);
fs.writeFileSync(path.join(__dirname, `close-write-current-register-before-${run}.json`), original, { flag: 'wx' });
fs.writeFileSync(path.join(runRoot, reviewFile), JSON.stringify(review, null, 2) + '\n', { flag: 'wx' });
fs.writeFileSync(registerPath, updated);
fs.writeFileSync(path.join(runRoot, 'CURRENT_PROGRESS.md'), progress);
fs.writeFileSync(path.join(__dirname, `close-write-current-register-followup-${run}.json`), JSON.stringify({ at, reviewFile, registerBefore: hash(original), registerAfter: hash(updated), counts: register.coverage.statusCounts, progressWords: progress.split(/\s+/).length }, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ reviewFile, registerAfter: hash(updated), progressWords: progress.split(/\s+/).length, completeWorkflowVerified: false }));
