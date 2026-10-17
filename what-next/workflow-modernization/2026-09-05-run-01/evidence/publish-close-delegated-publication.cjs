"use strict";
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
if (process.argv[2] !== '--publish') { console.log('Prepared only; --publish <browser receipt basename> validates and records this checkpoint.'); process.exit(0); }
const browserName = process.argv[3]; assert.ok(/^close-delegated-notification-browser-[a-f0-9-]{36}\.json$/.test(browserName || ''));
const dir = path.resolve(__dirname, '..'), root = path.resolve(dir, '../../..'), sha = value => crypto.createHash('sha256').update(value).digest('hex');
const registerFile = path.join(dir, 'WORKFLOW_REGISTER.json'), progressFile = path.join(dir, 'CURRENT_PROGRESS.md'), beforeRegister = fs.readFileSync(registerFile), beforeProgress = fs.readFileSync(progressFile);
assert.equal(sha(beforeRegister), '5d35ebbb11038443b253f9b4d62a53dc2d48bc3b991152ff0896d4bd04cee0ee');
assert.equal(sha(beforeProgress), 'b94e69ed3f97d7d75989d312ab531dda99fbb9675d5ba4992da7fd835ba3ccc5');
const names = {
  jest: 'evidence/close-evidence-recovery-jest-a725b95a-9384-451a-a45c-d015a5ad9a84.json',
  typecheck: 'evidence/close-evidence-recovery-typecheck-8fdceb67-c349-485d-8007-9fbc1fcf469e.json',
  lint: 'evidence/close-evidence-recovery-lint-65968bfa-e293-4873-ab57-eca577274478.json',
  runtime: 'lanes/environment/close-delegated-notification-71478dda-5328-450c-bc92-8a8005b17c36.json',
  browser: 'lanes/environment/' + browserName,
};
const receipts = {}, bindings = {};
for (const [key, name] of Object.entries(names)) {
  const bytes = fs.readFileSync(path.join(dir, name)), receipt = JSON.parse(bytes); receipts[key] = receipt; bindings[name] = sha(bytes);
  assert.equal(receipt.passed, true); assert.equal(receipt.sourceStable, true);
  for (const [file, hash] of Object.entries(receipt.sourceAfter)) assert.equal(sha(fs.readFileSync(path.join(root, file))), hash, 'Stale source: ' + file);
}
assert.equal(receipts.jest.summary.passed, 692); assert.equal(receipts.jest.summary.failed, 0); assert.equal(receipts.jest.summary.suites, 27);
assert.equal(receipts.runtime.checks.length, 7); assert.ok(receipts.runtime.checks.every(row => row.passed));
for (const key of ['runtime', 'browser']) for (const flag of ['outsideUnchanged', 'financialUnchanged']) assert.equal(receipts[key][flag], true);
assert.equal(receipts.browser.journeys.length, 2);
for (const row of receipts.browser.journeys) {
  for (const flag of ['passed', 'keyboardRefresh', 'recoveredPendingVisible', 'failedAcknowledgementRetainsPublication', 'revokedMandateClearsPublications', 'restoredMandateRecovers', 'sourceRecordsUnchanged']) assert.equal(row[flag], true);
  assert.equal(row.screenshots.length, 3); for (const image of row.screenshots) bindings['lanes/environment/' + image] = sha(fs.readFileSync(path.join(dir, 'lanes/environment', image)));
}
assert.equal(sha(fs.readFileSync(path.join(root, receipts.browser.build.file))), receipts.browser.build.sha256);
const r = JSON.parse(beforeRegister), now = new Date().toISOString(), report = 'CLOSE_DELEGATED_PUBLICATION_2026-10-04.md', counts = {};
assert.equal(r.workflows.length, 270); assert.equal(r.discoveryComplete, false);
for (const row of r.workflows) counts[row.status] = (counts[row.status] || 0) + 1;
assert.equal(counts['Complete—verified'], 4); assert.equal(counts['In progress'], 2); assert.equal(counts.Queued, 264);
for (const id of ['FA-CASH-COMMAND', 'FA-CLOSE-PACK']) {
  const w = r.workflows.find(row => row.id === id); assert.equal(w.status, 'In progress');
  w.delegatedWorkPublication = { updatedAt: now, report, focusedTests: 692, runtimeChecks: 7, browserJourneys: 2, replacementContinuity: true, approvedHistoryRecovery: true, sourceBoundPublication: true, liveMandateRevocation: true, fullHistoricalInbox: false, workflowClosure: false };
  w.implementationStatus = 'Existing Cash/Close corrections retained. Durable Close publication now reaches the delegated open-work projection; reassigned and independently recovered pending requests remain visible, with exact notification provenance and publication distinct from acknowledgement. Full original workflow scope remains open.';
  w.runtimeStatus = 'Latest milestone: 692 focused regressions, TypeScript and lint; seven owned-PostgreSQL delegated handoff/recovery/publication checks and two authenticated EN/FR browser journeys passed. Original records, financial and outside-fixture fingerprints retained. No workflow or release certification.';
  w.evidence.push(report, ...Object.values(names));
  w.remaining = w.remaining.filter(text => !text.startsWith('Actual same-organization Close inbox publication'));
  w.remaining.push('Same-organization publication and delegated OPEN-work projection are implemented. Reassignment follows its current audit/event; independently approved history selection restores pending work without deleting originals. Current mandate and matching durable publication are verified. Complete delegated accepted/closed history, controlled scheduling/dead-letter recovery, older SENT-without-publication reconciliation, wider races/capacity/accessibility and all original Cash/Close requirements remain. See ' + report + '.');
}
r.updatedAt = now; r.executionPolicy.note = 'Cash remains primary, Close supporting. Delegated reassignment/history recovery and actual publication evidence now pass. Next complete historical delegated inbox and delivery operations, then reconcile the unchanged full producer/recovery closure checklist. Existing manual-posting scope approval remains unresolved.';
const nextRegister = Buffer.from(JSON.stringify(r, null, 2) + '\n'), registerHash = sha(nextRegister);
const nextProgress = `# Current progress

Updated ${now}; branch codex/migration-control-plane-release-2026-08-29, HEAD 62a56036a5ac9b37236a20c9b148052199069479. Register SHA256: ${registerHash}. Shared changes preserved.

**Position:** 270 workflows /17 families; discovery incomplete; 191 unmapped entries. Queued 264; In progress 2; Complete—verified 4; other statuses zero. No closure or denominator change.

| Priority | Workflow and outcome | Status | Delivered and verified | Remaining closure | Owner; next action |
|---|---|---|---|---|---|
| Primary | FA-CASH-COMMAND: truthful financial actions | In progress | Scoped Cash/Close recovery and authority | All producers, authority and complete recovery | Engineering; complete recovery boundaries |
| Supporting | FA-CLOSE-PACK: trustworthy retained evidence | In progress | Durable notification publication; delegated reassignment/recovery continuity | Historical delegated inbox, delivery operations, broader races/accessibility | Engineering; finish history and operator recovery |
| Next 1 | PR-17: reconciliation exceptions | Queued | Prior scoped handoffs | Financial/legacy treatment and recovery | Engineering; reconcile original closure scope |
| Next 2 | ID-04: invitation redemption | Queued | Prior authority/recipient evidence | Accessibility, onboarding and transport | Engineering; verify transport |
| Next 3 | MC-11: permitted workspace | Queued | Selected route/action boundaries | Cross-domain transport and scanner gaps | Engineering; preserve guards and improve diagnostics |

**Since the previous report:** Corrected delegated pending work that disappeared after a valid recipient replacement or independently approved evidence-history recovery. The desk now uses validated retained assignment/selection and the current reassignment notification key. It separately displays source-matching durable publication and outbox processing status. Original requests, authors and conflicting records remain stored. No workflow discovered, reopened or closed.

**Verification:** 692 focused tests, no-emit TypeScript and lint passed; one existing unrelated warning retained. Seven owned-PostgreSQL scenarios prove reassignment continuity, actual publication, review after requester departure, ambiguity/refusal followed by independent recovery, mandate revocation and lost-acknowledgement distinction. Actual EN/FR portfolio screens at 1440/768/320px verify keyboard refresh, published/recovered work, live mandate revocation and restoration. Final French mobile image inspected. Financial and observed outside-fixture fingerprints match. See [the detailed record](${report}) for receipts, actual screenshots, source/build bindings and user guidance.

**Current limitation:** This is delegated OPEN-work projection, not the full historical notification inbox. Accepted/closed history, controlled scheduling/dead-letter repair, older SENT-without-publication reconciliation and capacity remain. A 110ms two-item fixture read is only a local observation. No migration, production deployment, real approval/payment, external message or X1 clearance occurred this turn.

**Remaining:** All original Cash/Close producer, source/authority, multi-period, interruption and recovery requirements; native assistive technology, actual zoom, inherited localization/contrast/hydration and representative latency; purchasing/inventory/payroll and authentic country evidence. The previously auto-review-rejected all-period manual-posting helper remains unapplied pending its existing approval request. All families remain in the [register](WORKFLOW_REGISTER.json). Full goal stays active; ETA is not reliable.
`;
assert.ok(nextProgress.split(/\s+/).length <= 700);
const out = path.join(__dirname, 'close-delegated-publication-checkpoint-' + crypto.randomUUID()); fs.mkdirSync(out);
fs.writeFileSync(path.join(out, 'WORKFLOW_REGISTER.before.json'), beforeRegister, { flag: 'wx' }); fs.writeFileSync(path.join(out, 'CURRENT_PROGRESS.before.md'), beforeProgress, { flag: 'wx' });
bindings[report] = sha(fs.readFileSync(path.join(dir, report)));
function replace(file, expected, value) { assert.equal(sha(fs.readFileSync(file)), expected); const fd = fs.openSync(file, 'r+'); try { fs.writeFileSync(fd, value); fs.ftruncateSync(fd, Buffer.byteLength(value)); } finally { fs.closeSync(fd); } }
replace(registerFile, sha(beforeRegister), nextRegister); replace(progressFile, sha(beforeProgress), nextProgress);
const publication = { at: now, report, registerBefore: sha(beforeRegister), registerAfter: registerHash, progressBefore: sha(beforeProgress), progressAfter: sha(Buffer.from(nextProgress)), counts, bindings, workflowClosures: 0, goalComplete: false, passed: true };
fs.writeFileSync(path.join(out, 'publication.json'), JSON.stringify(publication, null, 2) + '\n', { flag: 'wx' }); console.log(JSON.stringify({ publication: path.join(out, 'publication.json'), registerHash, progressHash: publication.progressAfter, counts }));
