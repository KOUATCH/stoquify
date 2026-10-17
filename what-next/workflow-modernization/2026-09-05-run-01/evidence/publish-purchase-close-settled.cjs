"use strict";
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
if (process.argv[2] !== '--publish') { console.log('Inert: --publish verifies and records the completed isolated purchase/Close criteria.'); process.exit(0); }
const dir = path.resolve(__dirname, '..'), root = path.resolve(dir, '../../..'), sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const name = 'lanes/environment/purchase-close-settled-runtime-66855dd3-582c-41d2-a0fb-4db41c82a227.json', reportName = 'PURCHASE_CLOSE_SETTLED_RECOVERY_2026-10-04.md';
const bytes = fs.readFileSync(path.join(dir, name)), receipt = JSON.parse(bytes);
assert.equal(sha(bytes), '436bdeeedc9a580b75dc777579adf2b3ca0688c459fa012407f5ede6f5ed0f7a');
for (const flag of ['passed', 'sourceStable', 'outsideUnchanged', 'paymentOutsideUnchanged']) assert.equal(receipt[flag], true, flag);
assert.deepEqual(receipt.sourcesBefore, receipt.sourcesAfter); assert.equal(Object.keys(receipt.sourcesAfter).length, 210);
for (const [file, hash] of Object.entries(receipt.sourcesAfter)) assert.equal(sha(fs.readFileSync(path.join(root, file))), hash, 'Source changed: ' + file);
assert.equal(receipt.checks.length, 4); assert.ok(receipt.checks.every(row => row.status === 'passed'));
assert.equal(receipt.checks[0].result.retainedHistoryVerified, true);
assert.equal(receipt.checks[0].result.stages[0].proof.payableAfter, '7500');
assert.equal(receipt.checks[0].result.stages[0].settlement.amount, '7500');
for (const stage of receipt.checks[0].result.stages) { assert.equal(stage.completed.grade, 'certified'); assert.equal(stage.replay.completeObservedStateUnchanged, true); }
for (const row of receipt.checks.slice(1, 3)) assert.equal(row.result.blocking.observed, true);
assert.equal(receipt.checks[3].result.allObservedRowsRolledBack, true); assert.equal(receipt.checks[3].result.recovered.grade, 'certified');
const registerFile = path.join(dir, 'WORKFLOW_REGISTER.json'), progressFile = path.join(dir, 'CURRENT_PROGRESS.md'), before = fs.readFileSync(registerFile), progressBefore = fs.readFileSync(progressFile);
assert.equal(sha(before), 'be86008af8b3673309e87d03a9582c798fc12e51ed1077258648bd792d33db8c');
assert.equal(sha(progressBefore), 'a422b79c6e6d20e2b501dcf6c3c530b6d10f46985c6fa534657fc2a531130b00');
const r = JSON.parse(before), at = new Date().toISOString(), counts = {};
for (const row of r.workflows) counts[row.status] = (counts[row.status] || 0) + 1;
assert.equal(r.workflows.length, 270); assert.equal(r.discoveryComplete, false); assert.deepEqual(counts, { Queued: 264, 'In progress': 2, 'Complete—verified': 4 });
const previousCriteria = {};
for (const id of ['FA-CASH-COMMAND', 'FA-CLOSE-PACK']) {
  const row = r.workflows.find(value => value.id === id); assert.equal(row.status, 'In progress'); assert.equal(row.closureReview.complete, false);
  previousCriteria[id] = row.closureReview.purchasePublicationChecks;
  assert.deepEqual(previousCriteria[id].map(value => value.status), ['failed', 'passed', 'failed', 'failed']);
  assert.deepEqual(previousCriteria[id].map(value => value.name), receipt.checks.map(value => value.name));
  row.closureReview.purchaseCloseRecoveryVerified = true;
  row.closureReview.purchasePublicationChecks = receipt.checks.map(({ name, status }) => ({ name, status }));
  row.closureReview.purchaseCloseRecoveryEvidence = { at, report: reportName, receipt: name, receiptSha256: sha(bytes), scope: 'Current-period owned cash settlement, independent acknowledgement, purchase correction, retained Close and current Cash recovery; both no-prior-run publication orders and late rollback/retry.', sourceFiles: 210, applicationCertificationOnly: true, workflowClosure: false };
  row.closureReview.verifiedCriteria.push('All four original purchase/Close recovery criteria now pass: actual initial cash obligation/evidence settlement, exact reopened-credit settlement, immutable historical exports, certified current Cash recovery, both observed PostgreSQL publication lock orders and complete late-failure rollback with new-transaction retry and exact replay.');
  row.evidence = [...new Set([...row.evidence, reportName, name])];
  row.remaining = row.remaining.map(value => value.replace('complete accessibility, and the original four purchase/Close recovery criteria remain open.', 'complete accessibility remain open. The original four purchase/Close criteria are now verified by PURCHASE_CLOSE_SETTLED_RECOVERY_2026-10-04.md.'));
  row.remaining.push('Current-period purchase/Close positive recovery is verified with actual source services on synthetic local inputs. Complete signing versus new-assessment publication, other producer/cumulative scope, bank and external evidence lifecycle, broader authority/interruption, native accessibility and representative performance. No full-workflow, bank, statutory or release closure is inferred. See ' + reportName + '.');
  row.runtimeStatus += ' Latest purchase/Close recovery: all four original criteria passed against 210 unchanged source bindings; three previously failed criteria completed, creator-first revalidated; payment/source outside-fixture fingerprints unchanged. See ' + reportName + '.';
}
r.updatedAt = at; r.executionPolicy.note = 'Cash primary, Close supporting. All four current-period purchase/Close recovery criteria verified through real service-owned payment and independently reviewed cash evidence. Next inspect and verify signing versus new-assessment publication. Retain broader producer, bank, external authority, scheduler/deployment and accessibility gaps. Existing rejected all-period manual-posting proposal remains unapplied.';
const next = Buffer.from(JSON.stringify(r, null, 2) + '\n'); assert.ok(next.length >= before.length);
const out = path.join(__dirname, 'purchase-close-settled-checkpoint-' + crypto.randomUUID()); fs.mkdirSync(out);
fs.writeFileSync(path.join(out, 'WORKFLOW_REGISTER.before.json'), before, { flag: 'wx' }); fs.writeFileSync(path.join(out, 'CURRENT_PROGRESS.before.md'), progressBefore, { flag: 'wx' });
const bindings = { [name]: sha(bytes), [reportName]: sha(fs.readFileSync(path.join(dir, reportName))) };
assert.equal(sha(fs.readFileSync(registerFile)), sha(before)); const fd = fs.openSync(registerFile, 'r+'); try { fs.writeFileSync(fd, next); } finally { fs.closeSync(fd); } assert.equal(sha(fs.readFileSync(registerFile)), sha(next));
const publication = { at, report: reportName, registerBefore: sha(before), registerAfter: sha(next), progressBefore: sha(progressBefore), counts, bindings, previousCriteria, newlyVerifiedCriteria: 3, revalidatedCriteria: 1, workflowClosures: 0, goalComplete: false, registerVerified: true, progressUpdatePending: true };
fs.writeFileSync(path.join(out, 'register-publication.json'), JSON.stringify(publication, null, 2) + '\n', { flag: 'wx' }); console.log(JSON.stringify({ directory: out, registerHash: sha(next), counts, at }));
