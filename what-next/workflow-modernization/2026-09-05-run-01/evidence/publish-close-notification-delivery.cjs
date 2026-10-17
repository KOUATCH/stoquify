"use strict";
// Inert without --publish. Guard both checkpoint files and all cited bindings.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
if (process.argv[2] !== '--publish') { console.log('Prepared only; use --publish to validate and publish this checkpoint.'); process.exit(0); }
const runDir = path.resolve(__dirname, '..'), root = path.resolve(runDir, '../../..'), sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const registerFile = path.join(runDir, 'WORKFLOW_REGISTER.json'), progressFile = path.join(runDir, 'CURRENT_PROGRESS.md');
const beforeRegister = fs.readFileSync(registerFile), beforeProgress = fs.readFileSync(progressFile);
assert.equal(sha(beforeRegister), 'b0ab148b2ad706d480684441cf948e60baf15b18e78fbc6db96c399a7c2e82ba');
assert.equal(sha(beforeProgress), 'fff4ffafd85af7494ff61293ec91542a9d5d1af04d7fb2e5874f344c1d12acfb');
const names = {
  jest: 'evidence/close-evidence-recovery-jest-182ff2bf-f1ba-4f67-900d-3e1a821f8a42.json',
  typecheck: 'evidence/close-evidence-recovery-typecheck-39ab6fdf-b285-4b7b-84a1-a08593958c30.json',
  lint: 'evidence/close-evidence-recovery-lint-af9d7fe8-366c-473f-b6cb-97e8095e4005.json',
  runtime: 'lanes/environment/close-notification-delivery-75b10daf-13e8-4919-bde6-8a8f2385ea0f.json',
  browser: 'lanes/environment/close-notification-delivery-browser-c52118d3-2cd0-4cfd-8f38-de86cd7b3c65.json',
  migration: 'lanes/environment/close-notification-schema-793968df-1727-48c3-8c42-8f82b348bee9.json',
  catalog: 'evidence/close-notification-migration-catalog.json', risk: 'evidence/close-notification-migration-risk.json',
};
const receipts = {}, bindings = {};
for (const [key, name] of Object.entries(names)) {
  const bytes = fs.readFileSync(path.join(runDir, name)), record = JSON.parse(bytes); receipts[key] = record; bindings[name] = sha(bytes);
  if (['jest', 'typecheck', 'lint', 'runtime', 'browser'].includes(key)) {
    assert.equal(record.passed, true); assert.equal(record.sourceStable, true);
    for (const [file, hash] of Object.entries(record.sourceAfter)) assert.equal(sha(fs.readFileSync(path.join(root, file))), hash, 'Stale source: ' + file);
  }
}
assert.equal(receipts.jest.summary.passed, 673); assert.equal(receipts.jest.summary.failed, 0); assert.equal(receipts.jest.summary.suites, 27);
assert.equal(receipts.runtime.checks.length, 8); assert.ok(receipts.runtime.checks.every(row => row.passed));
for (const key of ['runtime', 'browser']) for (const flag of ['outsideUnchanged', 'financialUnchanged']) assert.equal(receipts[key][flag], true);
assert.equal(receipts.browser.journeys.length, 2);
for (const row of receipts.browser.journeys) {
  for (const flag of ['passed', 'keyboardRefresh', 'transportFailureClearsRows', 'retryRecovered', 'sourceRecordsUnchanged']) assert.equal(row[flag], true);
  assert.equal(row.screenshots.length, 3);
  for (const name of row.screenshots) bindings['lanes/environment/' + name] = sha(fs.readFileSync(path.join(runDir, 'lanes/environment', name)));
}
assert.equal(sha(fs.readFileSync(path.join(root, receipts.browser.build.file))), receipts.browser.build.sha256);
assert.equal(receipts.migration.passed, true); assert.equal(receipts.migration.database, 'stoquify_local_registration_20260906_01');
const migrationHash = sha(fs.readFileSync(path.join(root, 'prisma/migrations/20261004000000_close_evidence_notifications/migration.sql')));
assert.equal(receipts.migration.checksum, migrationHash); assert.equal(receipts.risk.sqlSha256, migrationHash); assert.equal(receipts.risk.findings.length, 0); assert.equal(receipts.catalog.status, 'ready');
const register = JSON.parse(beforeRegister), now = new Date().toISOString(), report = 'CLOSE_NOTIFICATION_DELIVERY_2026-10-04.md';
assert.equal(register.workflows.length, 270); assert.equal(register.discoveryComplete, false);
const counts = {};
for (const row of register.workflows) counts[row.status] = (counts[row.status] || 0) + 1;
assert.equal(counts['Complete—verified'], 4); assert.equal(counts['In progress'], 2); assert.equal(counts.Queued, 264);
for (const id of ['FA-CASH-COMMAND', 'FA-CLOSE-PACK']) {
  const row = register.workflows.find(item => item.id === id); assert.equal(row.status, 'In progress');
  row.notificationDelivery = { updatedAt: now, report, focusedTests: 673, runtimeChecks: 8, browserJourneys: 2, actualInAppPublication: true, currentRecipientAndReviewerAudience: true, exactRetryDeduplication: true, ownedLocalMigrationApplied: true, delegatedInboxVerified: false, externalDelivery: false, workflowClosure: false };
  row.implementationStatus = 'Prior scoped Cash/Close corrections retained. Close evidence now has a durable tenant-scoped notification destination, source-validating leased worker, protected current-authority read service and EN/FR inbox. Delegated compatibility and full original lifecycle remain open.';
  row.runtimeStatus = 'Latest notification milestone: 673 focused tests, TypeScript and lint passed; eight owned-database publication/access/retry scenarios and two authenticated EN/FR browser journeys passed. Financial and outside-fixture fingerprints preserved. No full Cash/Close closure or release certification.';
  row.evidence.push(report, ...Object.values(names));
  row.remaining = row.remaining.filter(text => !text.startsWith('The delegated work desk now binds request and response-review notification statuses'));
  row.remaining.push('Actual same-organization Close inbox publication, current reviewer routing after requester departure, deduplicated retry/backoff and source-corruption refusal are verified. Delegated accountant inbox visibility and pending-request recipient-replacement/evidence-recovery compatibility remain; controlled scheduling/dead-letter recovery and wider capacity/authority/accessibility checks are still open. Other Close event types and historical SENT-without-publication reconciliation are not covered. See ' + report + '.');
}
register.updatedAt = now;
register.executionPolicy.note = 'Cash remains primary with Close as the supporting dependency. Actual Close evidence inbox publication is verified; continue delegated-accountant compatibility and the unchanged full closure checklist. Earlier unresolved manual-posting scope approval and wider producer/lifecycle requirements remain open.';
const registerBytes = Buffer.from(JSON.stringify(register, null, 2) + '\n'), registerHash = sha(registerBytes);
const progress = `# Current progress

Updated ${now}; branch codex/migration-control-plane-release-2026-08-29, HEAD 62a56036a5ac9b37236a20c9b148052199069479. Register SHA256: ${registerHash}. Shared changes preserved.

**Position:** 270 workflows /17 families; discovery incomplete; 191 unmapped entries. Queued 264; In progress 2; Complete—verified 4; other statuses zero. No workflow closure or denominator change.

| Priority | Workflow and outcome | Status | Delivered and verified | Remaining closure | Owner; next action |
|---|---|---|---|---|---|
| Primary | FA-CASH-COMMAND: truthful financial actions | In progress | Scoped Cash/Close recovery and authority | All producers, authority and complete recovery | Engineering; complete recovery boundaries |
| Supporting | FA-CLOSE-PACK: trustworthy retained evidence | In progress | Durable evidence inbox, actual publication/retry, current-recipient/reviewer visibility | Delegated compatibility, remaining delivery/operations, races/accessibility | Engineering; connect delegated inbox and recovery |
| Next 1 | PR-17: reconciliation exceptions | Queued | Prior scoped handoffs | Financial/legacy treatment and recovery | Engineering; reconcile original closure scope |
| Next 2 | ID-04: invitation redemption | Queued | Prior authority/recipient evidence | Accessibility, onboarding and transport | Engineering; verify transport |
| Next 3 | MC-11: permitted workspace | Queued | Selected route/action boundaries | Cross-domain transport and scanner gaps | Engineering; preserve guards and improve diagnostics |

**Since the previous report:** Implemented the missing Close notification destination and leased worker for missing-evidence requests/reassignments, responses and acceptance. Added a protected, paginated EN/FR inbox to the existing Close workbench. Current reviewers receive response observations after the original requester leaves; former recipients lose access on reassignment. Original authorship remains intact. Publication means in-app availability, not a read receipt or approval. No workflow discovered, reopened or closed.

**Verification:** 673 focused tests, no-emit TypeScript and lint passed (one existing unrelated warning retained). Eight owned-PostgreSQL scenarios prove actual publication, tenant constraints, current audiences, lost-acknowledgement deduplication, real backoff/retry and corruption refusal. Actual EN/FR screens pass keyboard refresh, transport-failure recovery and 1440/768/320px reflow with reduced motion. Final French mobile capture visually inspected. Financial and outside-fixture fingerprints match. Schema/catalog validate; additive migration rehearsed/applied only to the owned local verification database. See the [single detailed record](${report}) for receipts, screenshots, source/build bindings and operating instructions.

**Changed plan / limits:** First storage-failure injection missed the transaction; replaced with a temporary constraint on one synthetic outbox row and reran successfully. Initial mobile capture missed content during layout changes; corrected capture and verified it. Delegated inbox visibility and pending-request replacement/recovery compatibility remain the next concrete engineering gap. No scheduler or dead-letter repair UI is claimed. Other Close event types and historical SENT rows without a publication need separate reconciliation.

**Remaining:** Full Cash/Close producer, source/authority, multi-period, interruption and recovery requirements; native assistive technology, actual zoom, inherited contrast/localization/hydration and representative latency; purchasing/inventory/payroll and authentic country evidence. The previously auto-review-rejected all-period manual-posting helper remains unapplied pending its existing approval request. All families and original criteria remain in the [register](WORKFLOW_REGISTER.json). No production migration, deployment, real approval/payment, external message or X1 clearance. Full goal remains active; ETA is not reliable.
`;
assert.ok(progress.split(/\s+/).length <= 700);
const dir = path.join(__dirname, 'close-notification-delivery-checkpoint-' + crypto.randomUUID()); fs.mkdirSync(dir);
fs.writeFileSync(path.join(dir, 'WORKFLOW_REGISTER.before.json'), beforeRegister, { flag: 'wx' }); fs.writeFileSync(path.join(dir, 'CURRENT_PROGRESS.before.md'), beforeProgress, { flag: 'wx' });
bindings[report] = sha(fs.readFileSync(path.join(runDir, report)));
function writeExisting(file, expected, value) { assert.equal(sha(fs.readFileSync(file)), expected); const fd = fs.openSync(file, 'r+'); try { fs.writeFileSync(fd, value); fs.ftruncateSync(fd, Buffer.byteLength(value)); } finally { fs.closeSync(fd); } }
writeExisting(registerFile, sha(beforeRegister), registerBytes); writeExisting(progressFile, sha(beforeProgress), progress);
const publication = { at: now, report, registerBefore: sha(beforeRegister), registerAfter: registerHash, progressBefore: sha(beforeProgress), progressAfter: sha(Buffer.from(progress)), counts, bindings, workflowClosures: 0, goalComplete: false, passed: true };
fs.writeFileSync(path.join(dir, 'publication.json'), JSON.stringify(publication, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ publication: path.join(dir, 'publication.json'), registerHash, progressHash: publication.progressAfter, counts }));
