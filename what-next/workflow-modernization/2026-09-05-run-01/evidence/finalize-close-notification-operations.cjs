"use strict";
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
if (process.argv[2] !== '--finalize') { console.log('Prepared only; --finalize validates the saved register/progress checkpoint.'); process.exit(0); }
const dir = path.resolve(__dirname, '..'), root = path.resolve(dir, '../../..'), out = path.join(__dirname, 'close-notification-operations-checkpoint-04c6a634-dd8a-4186-b598-bc737beb6f39'), sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const publication = JSON.parse(fs.readFileSync(path.join(out, 'register-publication.json'))), register = fs.readFileSync(path.join(dir, 'WORKFLOW_REGISTER.json')), progress = fs.readFileSync(path.join(dir, 'CURRENT_PROGRESS.md')), text = progress.toString('utf8');
assert.equal(sha(register), publication.registerAfter); assert.ok(text.includes('Register SHA256: ' + publication.registerAfter)); assert.ok(text.split(/\s+/).length <= 700); assert.ok(text.includes('Full goal stays active')); assert.equal(publication.workflowClosures, 0); assert.equal(publication.goalComplete, false);
assert.equal(sha(fs.readFileSync(path.join(out, 'WORKFLOW_REGISTER.before.json'))), publication.registerBefore); assert.equal(sha(fs.readFileSync(path.join(out, 'CURRENT_PROGRESS.before.md'))), publication.progressBefore);
for (const [name, hash] of Object.entries(publication.bindings)) {
  const bytes = fs.readFileSync(path.join(dir, name)); assert.equal(sha(bytes), hash, 'Evidence changed: ' + name);
  if (name.endsWith('.json')) { const receipt = JSON.parse(bytes); for (const [file, sourceHash] of Object.entries(receipt.sourceAfter || {})) assert.equal(sha(fs.readFileSync(path.join(root, file))), sourceHash); if (receipt.build) assert.equal(sha(fs.readFileSync(path.join(root, receipt.build.file))), receipt.build.sha256); }
}
const result = { ...publication, finalizedAt: new Date().toISOString(), progressAfter: sha(progress), progressUpdatePending: false, passed: true };
fs.writeFileSync(path.join(out, 'publication.json'), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' }); console.log(JSON.stringify({ publication: path.join(out, 'publication.json'), registerHash: result.registerAfter, progressHash: result.progressAfter, counts: result.counts }));
