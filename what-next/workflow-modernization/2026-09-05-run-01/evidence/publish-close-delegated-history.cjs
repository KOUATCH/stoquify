"use strict";
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
if (process.argv[2] !== '--publish') { console.log('Prepared only; --publish <browser receipt basename> validates and records this checkpoint.'); process.exit(0); }
const browserName = process.argv[3]; assert.ok(/^close-delegated-history-browser-[a-f0-9-]{36}\.json$/.test(browserName || ''));
const dir = path.resolve(__dirname, '..'), root = path.resolve(dir, '../../..'), sha = value => crypto.createHash('sha256').update(value).digest('hex');
const registerFile = path.join(dir, 'WORKFLOW_REGISTER.json'), progressFile = path.join(dir, 'CURRENT_PROGRESS.md'), beforeRegister = fs.readFileSync(registerFile), beforeProgress = fs.readFileSync(progressFile);
assert.equal(sha(beforeRegister), '4316314878375b5ead4106ccac90441215cb501c062085ecbf11d7955d946902');
assert.equal(sha(beforeProgress), '4f0adbac07353b7c7d20b92a7b3143aecdfefccf96b4a09a20fb1d32ba798e51');
const names = {
  jest: 'evidence/close-evidence-recovery-jest-a0c352a2-fa21-4063-b940-4a0e959f4e47.json',
  typecheck: 'evidence/close-evidence-recovery-typecheck-64e1e598-7198-4489-8852-0a00bc2feac1.json',
  lint: 'evidence/close-evidence-recovery-lint-f1b1cd8e-3146-4ce2-9fbb-16f0013b2c50.json',
  runtime: 'lanes/environment/close-delegated-history-ae7171f7-3af3-435b-bbcd-d54c877a4a89.json',
  browser: 'lanes/environment/' + browserName,
};
const receipts = {}, bindings = {};
for (const [key, name] of Object.entries(names)) {
  const bytes = fs.readFileSync(path.join(dir, name)), receipt = JSON.parse(bytes); receipts[key] = receipt; bindings[name] = sha(bytes);
  assert.equal(receipt.passed, true); assert.equal(receipt.sourceStable, true);
  for (const [file, hash] of Object.entries(receipt.sourceAfter)) assert.equal(sha(fs.readFileSync(path.join(root, file))), hash, 'Stale source: ' + file);
}
assert.equal(receipts.jest.summary.passed, 716); assert.equal(receipts.jest.summary.failed, 0); assert.equal(receipts.jest.summary.suites, 29);
assert.equal(receipts.runtime.checks.length, 4); assert.ok(receipts.runtime.checks.every(row => row.passed));
for (const key of ['runtime', 'browser']) for (const flag of ['outsideUnchanged', 'financialUnchanged']) assert.equal(receipts[key][flag], true);
assert.equal(receipts.browser.journeys.length, 2);
for (const row of receipts.browser.journeys) {
  for (const flag of ['passed', 'acceptedHistoryAfterEmptyQueue', 'transportFailureAndRetry', 'keyboardFocusReturn', 'revocationClearsHistory', 'authorizedRecovery', 'sourceRecordsUnchanged']) assert.equal(row[flag], true);
  assert.equal(row.screenshots.length, 3); for (const image of row.screenshots) bindings['lanes/environment/' + image] = sha(fs.readFileSync(path.join(dir, 'lanes/environment', image)));
}
assert.equal(sha(fs.readFileSync(path.join(root, receipts.browser.build.file))), receipts.browser.build.sha256);
const r = JSON.parse(beforeRegister), now = new Date().toISOString(), report = 'CLOSE_DELEGATED_HISTORY_2026-10-04.md', counts = {};
assert.equal(r.workflows.length, 270); assert.equal(r.discoveryComplete, false);
for (const row of r.workflows) counts[row.status] = (counts[row.status] || 0) + 1;
assert.equal(counts['Complete—verified'], 4); assert.equal(counts['In progress'], 2); assert.equal(counts.Queued, 264);
for (const id of ['FA-CASH-COMMAND', 'FA-CLOSE-PACK']) {
  const w = r.workflows.find(row => row.id === id); assert.equal(w.status, 'In progress');
  w.delegatedNotificationHistory = { updatedAt: now, report, focusedTests: 716, runtimeChecks: 4, browserJourneys: 2, acceptedHistoryRetained: true, authorizedClientEntryWhenOpenQueueEmpty: true, currentMandatePerPage: true, workflowClosure: false };
  w.implementationStatus = 'Existing Cash/Close corrections retained. Delegated notification history now includes accepted/closed requests independently of the open queue. Lazy client-scoped pages revalidate current mandate and retain minimal source-bound publication metadata. Full original workflow remains open.';
  w.runtimeStatus = 'Latest history milestone: 716 focused regressions, TypeScript and lint; four owned-PostgreSQL history/acceptance/access checks and authenticated EN/FR browser journeys passed. No financial or observed outside-fixture changes. No workflow or release certification.';
  w.evidence.push(report, ...Object.values(names));
  w.remaining = w.remaining.filter(text => !text.startsWith('Same-organization publication and delegated OPEN-work projection'));
  w.remaining.push('Accepted/closed delegated publication history is implemented and verified after actual independent fixture acceptance leaves no open requests. Controlled scheduling/dead-letter recovery, older SENT-without-publication reconciliation, broader races/capacity/accessibility and original Cash/Close requirements remain. See ' + report + '.');
}
r.updatedAt = now; r.executionPolicy.note = 'Cash remains primary, Close supporting. Delegated accepted/closed notification history verified. Next address delivery operator visibility and safe recovery, then unchanged full producer/recovery checklist. Existing manual-posting scope approval remains unresolved.';
const nextRegister = Buffer.from(JSON.stringify(r, null, 2) + '\n'), registerHash = sha(nextRegister);
const nextProgress = `# Current progress

Updated ${now}; branch codex/migration-control-plane-release-2026-08-29, HEAD 62a56036a5ac9b37236a20c9b148052199069479. Register SHA256: ${registerHash}. Shared changes preserved.

**Position:** 270 workflows /17 families; discovery incomplete; 191 unmapped entries. Queued 264; In progress 2; Complete—verified 4; other statuses zero. No closure or denominator change.

| Priority | Workflow and outcome | Status | Delivered and verified | Remaining closure | Owner; next action |
|---|---|---|---|---|---|
| Primary | FA-CASH-COMMAND: truthful financial actions | In progress | Scoped Cash/Close recovery and authority | All producers, authority and complete recovery | Engineering; complete recovery boundaries |
| Supporting | FA-CLOSE-PACK: trustworthy retained evidence | In progress | Actual publication and delegated accepted/closed history | Delivery operations, broader races/accessibility | Engineering; operator visibility and safe retry |
| Next 1 | PR-17: reconciliation exceptions | Queued | Prior scoped handoffs | Financial/legacy treatment and recovery | Engineering; reconcile original closure scope |
| Next 2 | ID-04: invitation redemption | Queued | Prior authority/recipient evidence | Accessibility, onboarding and transport | Engineering; verify transport |
| Next 3 | MC-11: permitted workspace | Queued | Selected route/action boundaries | Cross-domain transport and scanner gaps | Engineering; preserve guards and improve diagnostics |

**Since the previous report:** Added lazy, client-scoped historical publications to the accountant portfolio, including accepted/closed work after the open queue becomes empty. Each page verifies current home/client authority before and after reading. Scope-bound cursors and source checks prevent cross-client pages or inconsistent metadata. EN/FR loading, incomplete, error/retry and revoked-access states preserve truthful results. No workflow discovered, reopened or closed.

**Verification:** 716 tests/29 suites, no-emit TypeScript and lint passed; one existing warning retained. Four owned-database scenarios verify actual independent acceptance, retained seven-publication history after zero open requests, mandate revocation/restoration and isolation. EN/FR at 1440/768/320px verifies accepted history, keyboard focus, transport failure/retry and live revocation. Financial and observed outside-fixture fingerprints match. [Detailed evidence and guide](${report}) includes source/build bindings and screenshots.

**Changed plan:** One first-run test wrongly expected the reviewer's own firm to be inaccessible. Corrected it to an inaccessible client and repeated actual acceptance with fresh synthetic records. The failed receipt is retained. No product access relaxation was made.

**Remaining:** Controlled notification scheduling/dead-letter recovery and historical SENT reconciliation; all original Cash/Close producer, authority, multi-period, interruption and recovery requirements; native assistive technology, actual zoom and representative performance. The 45ms seven-row history read is only a local observation. No migration, production deployment, real approval/payment, external message or X1 clearance occurred. Previously auto-review-rejected all-period manual-posting helper remains unapplied pending its existing approval request. Other families remain in the [register](WORKFLOW_REGISTER.json). Full goal stays active; ETA is not reliable.
`;
assert.ok(nextProgress.split(/\s+/).length <= 700);
const out = path.join(__dirname, 'close-delegated-history-checkpoint-' + crypto.randomUUID()); fs.mkdirSync(out);
fs.writeFileSync(path.join(out, 'WORKFLOW_REGISTER.before.json'), beforeRegister, { flag: 'wx' }); fs.writeFileSync(path.join(out, 'CURRENT_PROGRESS.before.md'), beforeProgress, { flag: 'wx' }); bindings[report] = sha(fs.readFileSync(path.join(dir, report)));
function replace(file, expected, value) { assert.equal(sha(fs.readFileSync(file)), expected); const fd = fs.openSync(file, 'r+'); try { fs.writeFileSync(fd, value); fs.ftruncateSync(fd, Buffer.byteLength(value)); } finally { fs.closeSync(fd); } }
replace(registerFile, sha(beforeRegister), nextRegister); replace(progressFile, sha(beforeProgress), nextProgress);
const publication = { at: now, report, registerBefore: sha(beforeRegister), registerAfter: registerHash, progressBefore: sha(beforeProgress), progressAfter: sha(Buffer.from(nextProgress)), counts, bindings, workflowClosures: 0, goalComplete: false, passed: true };
fs.writeFileSync(path.join(out, 'publication.json'), JSON.stringify(publication, null, 2) + '\n', { flag: 'wx' }); console.log(JSON.stringify({ publication: path.join(out, 'publication.json'), registerHash, progressHash: publication.progressAfter, counts }));
