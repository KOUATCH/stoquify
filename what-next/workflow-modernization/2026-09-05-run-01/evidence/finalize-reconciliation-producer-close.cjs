'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
if (process.argv[2] !== '--finalize') { console.log('Inert; --finalize verifies the existing checkpoint and writes its final local receipt.'); process.exit(0); }
const dir = path.resolve(__dirname, '..'), root = path.resolve(dir, '../../..'), sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const reportName = 'RECONCILIATION_PRODUCER_CLOSE_2026-10-04.md';
const names = {
  jest: 'evidence/reconciliation-producer-close-jest-553deadc-8136-4f31-9068-740c8ef2c3ea.json',
  typecheck: 'evidence/reconciliation-producer-close-typecheck-8f2a5cee-93c2-4889-8848-8146f576e072.json',
  lint: 'evidence/reconciliation-producer-close-lint-9ff977cf-1f1d-4854-9c7d-5865550f5cc0.json',
  runtime: 'lanes/environment/reconciliation-producer-close-acceptance-8d5e9fc4-2a23-4610-afcd-4cec704963e1.json',
};
const bindings = {}, receipts = {};
for (const [key, name] of Object.entries(names)) {
  const bytes = fs.readFileSync(path.join(dir, name)), value = JSON.parse(bytes); bindings[name] = sha(bytes); receipts[key] = value;
  assert.equal(value.passed, true); assert.equal(value.sourceStable, true);
  for (const [file, hash] of Object.entries(value.sourcesAfter || value.sourceAfter)) assert.equal(sha(fs.readFileSync(path.join(root, file))), hash, 'Changed bound source: ' + file);
}
assert.equal(receipts.jest.summary.passed, 212); assert.equal(receipts.jest.summary.failed, 0); assert.equal(receipts.jest.summary.pending, 0);
assert.equal(receipts.runtime.checks.length, 9); assert.ok(receipts.runtime.checks.every(row => row.passed)); assert.equal(receipts.runtime.financialUnchanged, true); assert.equal(receipts.runtime.outsideUnchanged, true);
for (const name of [reportName, 'RECONCILIATION_PRODUCER_CLOSE_CHECKLIST_2026-10-04.md', 'lanes/environment/reconciliation-producer-close-baseline-bdb77cb4-a781-4905-85b0-3b9ef5b34b56.json', 'lanes/environment/reconciliation-producer-close-baseline-0b2e3b72-324e-4fea-ad0d-3855d15f28a3.json']) bindings[name] = sha(fs.readFileSync(path.join(dir, name)));

const out = path.join(__dirname, 'reconciliation-producer-close-checkpoint-1f112aef-70bb-4ca1-9e22-bce0f1bcb52e');
const register = fs.readFileSync(path.join(dir, 'WORKFLOW_REGISTER.json')), progress = fs.readFileSync(path.join(dir, 'CURRENT_PROGRESS.md'));
const registerBefore = fs.readFileSync(path.join(out, 'WORKFLOW_REGISTER.before.json')), progressBefore = fs.readFileSync(path.join(out, 'CURRENT_PROGRESS.before.md'));
assert.equal(sha(registerBefore), '6bfcb8c464a8778733feae9d589b6f06ccf555725758912b08872a3f805aa8f2');
assert.equal(sha(progressBefore), '8ce8c57831545ba32a5eb69379f9ec7682e8f46cdb1ce0c176396696bf906926');
assert.equal(sha(register), '255f4bffc4c628969b0b53565b804dc656699fe3744a14a03ef17e1ce4a5ad6c');
assert.ok(progress.toString().includes('Register SHA256: ' + sha(register))); assert.ok(progress.toString().includes('Full goal stays active')); assert.ok(progress.toString().split(/\s+/).length <= 700);
const value = JSON.parse(register), counts = {}; for (const row of value.workflows) counts[row.status] = (counts[row.status] || 0) + 1;
assert.equal(value.workflows.length, 270); assert.equal(value.families.length, 17); assert.equal(value.coverage.unmappedEntrySources, 191); assert.equal(value.discoveryComplete, false);
assert.deepEqual(counts, { Queued: 264, 'Complete—verified': 4, 'In progress': 2 });
for (const id of ['FA-CASH-COMMAND', 'FA-CLOSE-PACK']) { const row = value.workflows.find(row => row.id === id); assert.equal(row.status, 'In progress'); assert.equal(row.closureReview.complete, false); assert.equal(row.closureReview.reconciliationProducerCloseCurrent, true); assert.equal(row.closureReview.verifiedCriteria.filter(text => text.startsWith('Reconciliation creation, unsigned refresh and preparation invalidation gaps reproduced')).length, 1); }
const publication = { at: value.updatedAt, finalizedAt: new Date().toISOString(), report: reportName, registerBefore: sha(registerBefore), registerAfter: sha(register), progressBefore: sha(progressBefore), progressAfter: sha(progress), counts, bindings, currentReceipts: names, reproducedDefectsCorrected: 3, workflowClosures: 0, goalComplete: false, priorAttempt: { exitCode: 1, registerUpdated: true, progressWriteFailed: true, recoveredThroughFileEditTool: true, registerWriterRerun: false }, passed: true };
fs.writeFileSync(path.join(out, 'publication.json'), JSON.stringify(publication, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ publication: path.join(out, 'publication.json'), registerHash: publication.registerAfter, progressHash: publication.progressAfter, counts, passed: true }));
