"use strict";
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
if (process.argv[2] !== '--finalize') { console.log('Prepared only; --finalize validates the repaired local checkpoint.'); process.exit(0); }
const dir = path.resolve(__dirname, '..'), root = path.resolve(dir, '../../..'), sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const out = path.join(__dirname, 'close-delegated-history-checkpoint-b02ab367-fed6-4c4f-93de-fe8839a4f0ef'), report = 'CLOSE_DELEGATED_HISTORY_2026-10-04.md';
const register = fs.readFileSync(path.join(dir, 'WORKFLOW_REGISTER.json')), progress = fs.readFileSync(path.join(dir, 'CURRENT_PROGRESS.md')), r = JSON.parse(register);
assert.equal(sha(register), '85354e3f16c56da18353a887daca305159fd0cda931a0a39ae52abcba6577419');
const beforeRegister = fs.readFileSync(path.join(out, 'WORKFLOW_REGISTER.before.json')), beforeProgress = fs.readFileSync(path.join(out, 'CURRENT_PROGRESS.before.md'));
assert.equal(sha(beforeRegister), '4316314878375b5ead4106ccac90441215cb501c062085ecbf11d7955d946902'); assert.equal(sha(beforeProgress), '4f0adbac07353b7c7d20b92a7b3143aecdfefccf96b4a09a20fb1d32ba798e51');
const text = progress.toString('utf8'); assert.ok(text.includes('Register SHA256: ' + sha(register))); assert.ok(text.trim().endsWith('Full goal stays active; ETA is not reliable.')); assert.equal((text.match(/Full goal stays active/g) || []).length, 1); assert.ok(text.split(/\s+/).length <= 700);
const names = {
  jest: 'evidence/close-evidence-recovery-jest-a0c352a2-fa21-4063-b940-4a0e959f4e47.json', typecheck: 'evidence/close-evidence-recovery-typecheck-64e1e598-7198-4489-8852-0a00bc2feac1.json', lint: 'evidence/close-evidence-recovery-lint-f1b1cd8e-3146-4ce2-9fbb-16f0013b2c50.json',
  runtime: 'lanes/environment/close-delegated-history-ae7171f7-3af3-435b-bbcd-d54c877a4a89.json', browser: 'lanes/environment/close-delegated-history-browser-b6648be5-abea-4566-852a-0a80987a25a1.json',
};
const bindings = {}, receipts = {};
for (const [key, name] of Object.entries(names)) { const bytes = fs.readFileSync(path.join(dir, name)), receipt = JSON.parse(bytes); receipts[key] = receipt; bindings[name] = sha(bytes); assert.equal(receipt.passed, true); assert.equal(receipt.sourceStable, true); for (const [file, hash] of Object.entries(receipt.sourceAfter)) assert.equal(sha(fs.readFileSync(path.join(root, file))), hash, 'Stale source: ' + file); }
assert.equal(receipts.jest.summary.passed, 716); assert.equal(receipts.jest.summary.failed, 0); assert.equal(receipts.jest.summary.suites, 29); assert.equal(receipts.runtime.checks.length, 4); assert.ok(receipts.runtime.checks.every(row => row.passed));
for (const key of ['runtime', 'browser']) for (const flag of ['outsideUnchanged', 'financialUnchanged']) assert.equal(receipts[key][flag], true);
assert.equal(receipts.browser.journeys.length, 2);
for (const row of receipts.browser.journeys) { for (const flag of ['passed', 'acceptedHistoryAfterEmptyQueue', 'transportFailureAndRetry', 'keyboardFocusReturn', 'revocationClearsHistory', 'authorizedRecovery', 'sourceRecordsUnchanged']) assert.equal(row[flag], true); assert.equal(row.screenshots.length, 3); for (const image of row.screenshots) bindings['lanes/environment/' + image] = sha(fs.readFileSync(path.join(dir, 'lanes/environment', image))); }
assert.equal(sha(fs.readFileSync(path.join(root, receipts.browser.build.file))), receipts.browser.build.sha256);
const counts = {}; for (const row of r.workflows) counts[row.status] = (counts[row.status] || 0) + 1; assert.equal(r.workflows.length, 270); assert.equal(r.discoveryComplete, false); assert.deepEqual(counts, { Queued: 264, 'In progress': 2, 'Complete—verified': 4 });
for (const id of ['FA-CASH-COMMAND', 'FA-CLOSE-PACK']) { const row = r.workflows.find(w => w.id === id); assert.equal(row.status, 'In progress'); assert.equal(row.delegatedNotificationHistory.acceptedHistoryRetained, true); assert.equal(row.delegatedNotificationHistory.workflowClosure, false); assert.ok(row.evidence.includes(report)); }
bindings[report] = sha(fs.readFileSync(path.join(dir, report)));
const publication = { at: new Date().toISOString(), report, registerBefore: sha(beforeRegister), registerAfter: sha(register), progressBefore: sha(beforeProgress), progressAfter: sha(progress), counts, bindings, workflowClosures: 0, goalComplete: false, passed: true, writeRecovery: 'Initial publisher completed the register and wrote the new progress text but Windows ftruncate failed, retaining an old suffix. Surgical apply_patch removed only the suffix; this finalizer validates the saved files, original backups, all current evidence and build. No domain or database writes.' };
fs.writeFileSync(path.join(out, 'publication.json'), JSON.stringify(publication, null, 2) + '\n', { flag: 'wx' }); console.log(JSON.stringify({ publication: path.join(out, 'publication.json'), registerHash: publication.registerAfter, progressHash: publication.progressAfter, counts }));
