"use strict";
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
if (process.argv[2] !== '--finalize') { console.log('Inert: --finalize validates the local register/progress checkpoint.'); process.exit(0); }
const dir = path.resolve(__dirname, '..'), root = path.resolve(dir, '../../..'), out = path.join(__dirname, 'purchase-close-settled-checkpoint-ce250862-5b85-4cb3-b1b8-845692e1d89d'), sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const publication = JSON.parse(fs.readFileSync(path.join(out, 'register-publication.json'))), register = fs.readFileSync(path.join(dir, 'WORKFLOW_REGISTER.json')), progress = fs.readFileSync(path.join(dir, 'CURRENT_PROGRESS.md')), text = progress.toString('utf8');
assert.equal(sha(register), publication.registerAfter); assert.ok(text.includes('Register SHA256: ' + publication.registerAfter)); assert.ok(text.split(/\s+/).length <= 700); assert.ok(text.includes('Full goal stays active')); assert.equal(publication.workflowClosures, 0); assert.equal(publication.goalComplete, false);
assert.equal(sha(fs.readFileSync(path.join(out, 'WORKFLOW_REGISTER.before.json'))), publication.registerBefore); assert.equal(sha(fs.readFileSync(path.join(out, 'CURRENT_PROGRESS.before.md'))), publication.progressBefore);
for (const [name, hash] of Object.entries(publication.bindings)) {
  const bytes = fs.readFileSync(path.join(dir, name)); assert.equal(sha(bytes), hash, 'Evidence changed: ' + name);
  if (name.endsWith('.json')) { const receipt = JSON.parse(bytes); for (const [file, sourceHash] of Object.entries(receipt.sourcesAfter || {})) assert.equal(sha(fs.readFileSync(path.join(root, file))), sourceHash); }
}
const r = JSON.parse(register); assert.equal(r.workflows.length, 270);
for (const id of ['FA-CASH-COMMAND', 'FA-CLOSE-PACK']) { const row = r.workflows.find(value => value.id === id); assert.equal(row.status, 'In progress'); assert.equal(row.closureReview.complete, false); assert.equal(row.closureReview.purchaseCloseRecoveryVerified, true); assert.equal(row.closureReview.purchasePublicationChecks.filter(value => value.status === 'passed').length, 4); }
const result = { ...publication, finalizedAt: new Date().toISOString(), progressAfter: sha(progress), progressUpdatePending: false, passed: true };
fs.writeFileSync(path.join(out, 'publication.json'), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' }); console.log(JSON.stringify({ publication: path.join(out, 'publication.json'), registerHash: result.registerAfter, progressHash: result.progressAfter, counts: result.counts }));
