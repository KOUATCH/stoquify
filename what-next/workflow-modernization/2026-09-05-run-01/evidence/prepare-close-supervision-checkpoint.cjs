const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const run = path.resolve(__dirname, '..'), root = path.resolve(run, '../../..'), sha = value => crypto.createHash('sha256').update(value).digest('hex');
if (process.argv[2] !== '--prepare') { console.log('Inert: --prepare and five passing receipt paths required'); process.exit(0); }
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
assert.equal(results[0].summary.passed, 626); assert.equal(results[0].summary.failed, 0); assert.equal(results[0].summary.skipped, 0);
assert.equal(results[1].phase, 'typecheck'); assert.equal(results[2].phase, 'lint'); assert.equal(results[3].checks.length, 7);
assert.ok(results[3].checks.every(row => row.passed)); assert.equal(results[4].journeys.length, 2);
for (const value of results.slice(3)) { assert.equal(value.outsideUnchanged, true); assert.equal(value.financialUnchanged, true); }
for (const flag of ['originalRequesterInactiveThroughout', 'managerDiscoveredRequest', 'ownTrackingStayedSeparate', 'crossTenantDenied', 'ordinaryUserDenied', 'replacementExactRetry', 'newRecipientResponded', 'independentAcceptance', 'originalRequestPreserved']) assert.equal(results[3].checks[6].result[flag], true);
for (const journey of results[4].journeys) {
  assert.equal(journey.passed, true);
  for (const flag of ['managerDiscoveredRequest', 'ownTrackingStayedSeparate', 'draftRetained', 'formerRecipientQueueRemoved', 'newRecipientResponded', 'acceptedHistoryRetained', 'originalRequesterInactiveThroughout', 'originalRequestPreservedThroughAcceptance']) assert.equal(journey[flag], true);
  assert.equal(journey.viewports.length, 3);
  for (const view of journey.viewports) assert.ok(view.content <= view.width + 1 && view.pageWidth <= view.viewport + 1 && view.reducedMotion);
  for (const screenshot of journey.screenshots) assert.ok(fs.existsSync(path.join(run, 'lanes/environment', screenshot)));
}
const registerBefore = fs.readFileSync(path.join(run, 'WORKFLOW_REGISTER.json')), progressBefore = fs.readFileSync(path.join(run, 'CURRENT_PROGRESS.md'));
assert.equal(sha(registerBefore), '34fca0d606aea9f79f3eddbf420088ddb8e1925936f15374cf6a9f46c8f11048');
assert.equal(sha(progressBefore), 'cfee2706f56c13d67bb7686291ed00126627f28f9984fc52ba25e564338089a8');
const register = JSON.parse(registerBefore), at = new Date().toISOString(), report = 'CLOSE_REQUEST_SUPERVISION_2026-10-04.md';
assert.ok(fs.existsSync(path.join(run, report)));
for (const row of register.workflows.filter(row => ['FA-CASH-COMMAND', 'FA-CLOSE-PACK'].includes(row.id))) {
  row.evidence = [...new Set([...row.evidence, report, ...refs])];
  row.requestSupervision = { updatedAt: at, report, focusedTests: 626, runtimeChecks: 7, browserJourneys: 2, departedRequesterHandoff: true, originalAuthorshipPreserved: true, readOnlyPendingRetryDisabled: true, workflowClosure: false };
  row.remaining = row.remaining.filter(item => !item.startsWith('Close recovery inputs and exact pending commands now restore'));
  row.remaining.push(`Another manager with current Close read, request and assignment permissions can discover and continue other authors' requests after the requester leaves. Original authorship is preserved; response and independent acceptance remain separate controls. Read-only restored recovery retries are visibly disabled. Notification targeting/delivery after departure, delegated context, further authority interleavings, high-volume history and full accessibility/zoom remain open. Tab draft expiry/privacy limits remain. See ${report}.`);
}
register.updatedAt = at;
const counts = Object.fromEntries(['Queued', 'In progress', 'Verification pending', 'Blocked—engineering', 'Blocked—external', 'Complete—verified'].map(status => [status, register.workflows.filter(row => row.status === status).length]));
assert.equal(register.workflows.length, 270); assert.equal(counts.Queued, 264); assert.equal(counts['In progress'], 2); assert.equal(counts['Complete—verified'], 4);
const nextRegister = Buffer.from(JSON.stringify(register, null, 2) + '\n');
const progress = `# Current progress

Updated ${at}; branch codex/migration-control-plane-release-2026-08-29, HEAD 62a56036a5ac9b37236a20c9b148052199069479. Register SHA256: ${sha(nextRegister)}. Shared changes preserved.

**Position:** 270 workflows /17 families; discovery incomplete; 191 unmapped entries. Queued 264; In progress 2; Complete—verified 4; other statuses zero. No workflow closure or denominator change.

| Priority | Workflow and outcome | Status | Verified progress | Remaining closure | Blocker/owner; next action |
|---|---|---|---|---|---|
| Primary | FA-CASH-COMMAND: truthful financial actions | In progress | Cash/Close recovery and current authority | All producers, authority and complete recovery | Engineering; complete recovery boundaries |
| Supporting | FA-CLOSE-PACK: trustworthy retained evidence | In progress | Another manager continues a departed requester's work | Delivery, delegated context, remaining races/accessibility | Engineering; trace notification ownership and delivery |
| Next 1 | PR-17: reconciliation exceptions | Queued | Prior scoped handoffs | Financial/legacy treatment and recovery | Engineering; reconcile original closure scope |
| Next 2 | ID-04: invitation redemption | Queued | Prior authority/recipient evidence | Accessibility, onboarding and transport | Engineering; verify transport |
| Next 3 | MC-11: permitted workspace | Queued | Selected route/action boundaries | Cross-domain transport and scanner gaps | Engineering; preserve guards and improve diagnostics |

**Since the previous report:** Added a server-owned, permission-controlled view of other colleagues' Close requests, separate from personally authored requests. Managers can find and change an unanswered request's response owner even when its original requester is inactive. The original author, request and deadline remain unchanged. The service checks current permissions before and after reading, isolates cursors and permits inspection without changes in a read-only module. Restored uncertain recovery submissions now have a visibly disabled retry button under read-only access. No workflow was discovered, reopened or closed.

**Verification:** 626 focused tests, no-emit TypeScript and lint passed. Seven owned-database checks cover recipient changes, retry, concurrency and the departed-requester handoff. Actual EN/FR application journeys discover the work as another manager, preserve the replacement draft after reload, reassign, respond and independently accept with the original requester inactive throughout. Keyboard actions, focus feedback, reduced motion and 1440/768/320px reflow passed. Source, original-record, financial and outside-fixture checks passed. Receipts, screenshots, development timings and limits are recorded once in the [supervision report](${report}). An initial mistyped receipt hash stopped the browser harness before fixture mutation; its failed receipt is retained.

**Remaining:** Response notifications still name the original requester; supervision does not establish delivery to a replacement manager. Correction where no valid chain matches the finding state, delegated context, diagnostics, full accessibility/zoom and further authority races remain. Tab draft storage retains its 24-hour expiry/privacy limits. Investigation remains bounded to 100 records/audits and the latest 20 recovery events. Bank import/provenance, finalization, concurrent evidence reuse and original cash/purchase/Close handoffs remain. Other producers, freshness, manual-session/legacy-role authority, signing/publication races, country/payroll evidence and capacity remain required. The all-period manual-posting helper rejected by automatic approval review remains unapplied pending the existing approval request.

All workflow families remain in the [register](WORKFLOW_REGISTER.json), including identity/modules, finance, sales/POS, inventory/purchasing, payroll, compliance/reporting, notifications/integrations and AI. No migration, reset, deployment, live activation, real payment, external message or X1 clearance occurred. Full goal remains active; ETA is not reliable.
`;
assert.ok(progress.split(/\s+/).length <= 700);
const directory = path.join(run, 'evidence', 'close-supervision-checkpoint-' + crypto.randomUUID()); fs.mkdirSync(directory);
for (const [name, bytes] of Object.entries({ 'WORKFLOW_REGISTER.json': registerBefore, 'CURRENT_PROGRESS.md': progressBefore, 'NEXT_WORKFLOW_REGISTER.json': nextRegister, 'NEXT_CURRENT_PROGRESS.md': progress })) fs.writeFileSync(path.join(directory, name), bytes, { flag: 'wx' });
const receipt = { at, receipts, sources, counts, workflowClosures: 0, registerBefore: sha(registerBefore), progressBefore: sha(progressBefore), registerAfter: sha(nextRegister), progressAfter: sha(Buffer.from(progress)) };
fs.writeFileSync(path.join(directory, 'prepared-publication.json'), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' }); console.log(JSON.stringify({ prepared: directory, registerAfter: receipt.registerAfter, progressAfter: receipt.progressAfter }));
