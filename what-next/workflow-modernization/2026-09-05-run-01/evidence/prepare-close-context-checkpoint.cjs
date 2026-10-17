const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const run = path.resolve(__dirname, '..'), root = path.resolve(run, '../../..'), sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
if (process.argv[2] !== '--prepare') { console.log('Inert: --prepare and five receipt paths required'); process.exit(0); }
const refs = process.argv.slice(3); assert.equal(refs.length, 5);
const receipts = {}, sources = {};
const results = refs.map(name => {
  const file = path.resolve(run, name); assert.ok(file.startsWith(run + path.sep));
  const bytes = fs.readFileSync(file), value = JSON.parse(bytes); receipts[name] = sha(bytes);
  assert.equal(value.passed, true); assert.equal(value.sourceStable, true); assert.deepEqual(value.sourceBefore, value.sourceAfter);
  for (const [file, hash] of Object.entries(value.sourceAfter)) {
    assert.equal(sha(fs.readFileSync(path.join(root, file))), hash, file);
    if (sources[file]) assert.equal(sources[file], hash); sources[file] = hash;
  }
  return value;
});
assert.equal(results[0].summary.passed, 609); assert.equal(results[0].summary.failed, 0);
assert.equal(results[1].phase, 'typecheck'); assert.equal(results[2].phase, 'lint'); assert.equal(results[3].checks.length, 18);
assert.equal(results[4].journeys.length, 2);
for (const value of results.slice(3)) { assert.equal(value.outsideUnchanged, true); assert.equal(value.financialUnchanged, true); }
assert.ok(results[3].checks.every(row => row.passed));
assert.equal(results[3].checks[4].result.postPreviewConflictRefused, true);
assert.equal(results[3].checks[5].result.responseAndAcceptanceReplayExact, true);
assert.equal(results[3].checks[6].result.noFalseInvestigation, true);
assert.equal(results[3].checks[0].result.investigation.records, 2);
assert.equal(results[3].checks[0].result.investigation.repeatableRevision, true);
assert.equal(results[3].checks[7].result.actualAcceptance, true);
assert.equal(results[3].checks[8].result.actualResponse, true);
assert.equal(results[3].checks[9].result.staleAuthorizationRefused, true);
assert.equal(results[3].checks[10].result.retainedAuthorizations, 1);
assert.equal(results[3].checks[11].result.actualAcceptanceSeparatelyVerified, true);
assert.equal(results[3].checks[12].result.findingUnchanged, true);
for (const index of [13, 14]) for (const flag of ['exactRetry', 'changedRetryRefused', 'wrongActorAndTenantDenied', 'insufficientRoleDenied', 'authorizationRefused', 'originalsAndFindingRetained']) assert.equal(results[3].checks[index].result[flag], true);
for (const index of [15, 16]) assert.equal(results[3].checks[index].result.terminalOutcomes, 1);
assert.equal(results[3].checks[17].result.approvedOutcomePreserved, true);
for (const journey of results[4].journeys) {
  for (const flag of ['responseRefusedWithoutEffects', 'responseDraftRetained', 'acceptanceRefusedWithoutEffects', 'reviewDraftRetained', 'investigationHistoryRetained']) assert.equal(journey[flag], true);
  assert.equal(journey.viewports.length, 3); for (const view of journey.viewports) assert.ok(view.content <= view.width + 1 && view.pageWidth <= view.viewport + 1);
  assert.equal(journey.investigationReadWithoutMutation, true);
  for (const flag of ['proposalRecordedWithoutChangingEvidence', 'recoveryIndependentlyAuthorized', 'recoveredAcceptanceCompleted', 'originalRecordsRetained']) assert.equal(journey[flag], true);
  assert.equal(journey.proposalWithdrawn, true); assert.equal(journey.proposalRejected, true);
  for (const flag of ['unsentDraftRestoredWithoutSubmission', 'pendingReloadReplayedExactly', 'reviewReloadRequiresConfirmation', 'unrelatedDraftPreserved']) assert.equal(journey[flag], true);
  assert.equal(journey.investigationViewports.length, 3);
  assert.equal(journey.recoveryViewports.length, 3);
  for (const view of journey.recoveryViewports) assert.ok(view.content <= view.width + 1 && view.pageWidth <= view.viewport + 1);
  for (const view of journey.investigationViewports) assert.ok(view.content <= view.width + 1 && view.pageWidth <= view.viewport + 1);
}
const registerBefore = fs.readFileSync(path.join(run, 'WORKFLOW_REGISTER.json')), progressBefore = fs.readFileSync(path.join(run, 'CURRENT_PROGRESS.md'));
assert.equal(sha(registerBefore), '8655d28315864f182e906221aa419f9d33b46f3f31c1ea3db6eb3c4ada7ab85b');
assert.equal(sha(progressBefore), 'b9d41d0a953f50348146fa5424927a43e34d14d7db944ffc810bf2acfdc2f2c2');
const register = JSON.parse(registerBefore), at = new Date().toISOString(), report = 'CLOSE_RECOVERY_DRAFTS_2026-10-04.md';
for (const row of register.workflows.filter(row => ['FA-CASH-COMMAND', 'FA-CLOSE-PACK'].includes(row.id))) {
  row.evidence = [...new Set([...row.evidence, report, ...refs])];
  row.recoveryDrafts = { updatedAt: at, report, focusedTests: 609, runtimeChecks: 18, browserJourneys: 2, scopedRestoration: true, unknownOutcomeExactReplay: true, confirmationReset: true, unrelatedInputPreserved: true, workflowClosure: false };
  row.remaining = row.remaining.filter(item => !item.startsWith('Close evidence recovery now supports explicit proposer withdrawal'));
  row.remaining.push(`Close recovery inputs and exact pending commands now restore from validated, scoped tab storage after re-inspection. Actual committed-response-loss replay avoids duplicate proposals; confirmations are not restored. Storage expiry/privacy limits are explicit. Read-only pending-retry disabled presentation, unavailable-requester reassignment, delegated context, broader authority interleavings, notification delivery, high-volume history and full accessibility/zoom remain open. See ${report}.`);
}
register.updatedAt = at;
const counts = Object.fromEntries(['Queued', 'In progress', 'Verification pending', 'Blocked—engineering', 'Blocked—external', 'Complete—verified'].map(status => [status, register.workflows.filter(row => row.status === status).length]));
assert.equal(register.workflows.length, 270); assert.equal(counts['Queued'], 264); assert.equal(counts['Complete—verified'], 4); assert.equal(counts['In progress'], 2);
const nextRegister = Buffer.from(JSON.stringify(register, null, 2) + '\n');
const progress = `# Current progress

Updated ${at}; branch codex/migration-control-plane-release-2026-08-29, HEAD 62a56036a5ac9b37236a20c9b148052199069479. Register SHA256: ${sha(nextRegister)}. Shared changes preserved.

**Position:** 270 workflows /17 families; discovery incomplete; 191 unmapped entries. Queued 264; In progress 2; Complete—verified 4; other statuses zero. No new workflow closure or denominator change.

| Priority | Workflow and outcome | Status | Verified progress | Remaining closure | Next action |
|---|---|---|---|---|---|
| Primary | FA-CASH-COMMAND: truthful financial actions | In progress | Cash/Close recovery and current authority | All producers, authority and complete recovery | Complete remaining recovery boundaries |
| Supporting | FA-CLOSE-PACK: trustworthy retained evidence | In progress | Recovery decisions and interrupted-draft restoration | Reassignment, remaining races/accessibility and delivery | Complete unavailable-requester recovery and handoffs |
| Next 1 | PR-17: reconciliation exceptions | Queued | Prior scoped handoffs | Financial/legacy treatment and recovery | Reconcile original closure scope |
| Next 2 | ID-04: invitation redemption | Queued | Prior authority/recipient evidence | Accessibility, onboarding and transport | Verify transport |
| Next 3 | MC-11: permitted workspace | Queued | Selected route/action boundaries | Cross-domain transport and scanner gaps | Preserve guards; improve diagnostics |

**Since the previous report:** Recovery selections, reasons, reviewer notes and unconfirmed commands survive reload in the same browser tab, scoped to the server-returned actor, organization, period and request. Current inspection is required before restoration. Passwords and confirmations are excluded; a changed snapshot requires fresh review. Pending commands retain their exact retry key and never submit automatically. Storage failures are visible. No workflow was discovered, reopened or closed.

**Verification:** 609 focused tests, no-emit TypeScript and lint passed. Eighteen owned-database regressions preserve recovery and terminal-decision controls. Actual EN/FR journeys restore unsent drafts without submission, deliberately lose the response after a committed proposal, reload and explicitly replay the same command without duplication. Reviewer notes restore with confirmation unchecked; successful authorization preserves other unsent input. Withdrawal, rejection and normal acceptance still complete. Source, original-record, financial and outside-fixture checks pass. Detailed receipts and limits appear in the [draft record](${report}).

**Remaining:** Correction where no valid chain matches the finding state, reassignment after the original requester leaves, delegated context, diagnostics, full accessibility/zoom, further authority races and delivery. Draft restoration uses tab storage with a 24-hour expiry check, not encrypted or cross-device storage. Investigation remains bounded to 100 records/audits and latest 20 recovery events; no complete-history or high-volume certification. Bank import/provenance, bank finalization, concurrent evidence reuse and original cash/purchase/Close handoffs remain. Other producers, draft freshness, manual-session/legacy-role authority, signing/publication races, country/payroll evidence and capacity remain required. The all-period manual-posting helper rejected by automatic approval review remains unapplied pending the existing approval request.

All workflow families and queued requirements remain in the [register](WORKFLOW_REGISTER.json), including identity/modules, finance, sales/POS, inventory/purchasing, payroll, compliance/reporting, notifications/integrations and AI. No migration, reset, deployment, live activation, real payment, external message or X1 clearance occurred. Full goal remains active; ETA is not reliable.
`;
assert.ok(progress.split(/\s+/).length <= 700);
const directory = path.join(run, 'evidence', 'close-context-checkpoint-' + crypto.randomUUID()); fs.mkdirSync(directory);
for (const [name, bytes] of Object.entries({ 'WORKFLOW_REGISTER.json': registerBefore, 'CURRENT_PROGRESS.md': progressBefore, 'NEXT_WORKFLOW_REGISTER.json': nextRegister, 'NEXT_CURRENT_PROGRESS.md': progress })) fs.writeFileSync(path.join(directory, name), bytes, { flag: 'wx' });
const receipt = { at, receipts, sources, counts, workflowClosures: 0, registerBefore: sha(registerBefore), progressBefore: sha(progressBefore), registerAfter: sha(nextRegister), progressAfter: sha(Buffer.from(progress)) };
fs.writeFileSync(path.join(directory, 'prepared-publication.json'), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' }); console.log(JSON.stringify({ prepared: directory, registerAfter: receipt.registerAfter, progressAfter: receipt.progressAfter }));
