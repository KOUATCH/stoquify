const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../..'), read = name => JSON.parse(fs.readFileSync(path.join(__dirname, name), 'utf8'));
const hash = absolute => crypto.createHash('sha256').update(fs.readFileSync(absolute)).digest('hex');
const receipt = read('evidence/purchase-order-edit-receipt.json'), register = read('WORKFLOW_REGISTER.json');
for (const [file, expected] of Object.entries(receipt.source.hashes)) assert.equal(hash(path.join(root, file)), expected, file);
for (const [file, expected] of Object.entries(receipt.verificationScripts)) assert.equal(hash(path.join(root, file)), expected, file);
for (const screenshot of receipt.screenshots) assert.equal(hash(path.join(__dirname, screenshot.file)), screenshot.sha256, screenshot.file);
assert.equal(receipt.screenshots.length, 24); assert.ok(fs.existsSync(path.join(__dirname, receipt.guide)));
for (const file of Object.values(receipt.paths)) assert.ok(fs.existsSync(path.join(__dirname, file)), file);
const marker = '## Purchase-order draft comparison and exact recovery — source v51';
for (const file of ['WORKFLOW_MAP.md', 'FINDINGS_AND_REMEDIATION.md', 'IMPLEMENTATION_REPORT.md', 'DESIGN_SYSTEM_AND_UX.md', 'VERIFICATION.md', 'ROLLOUT_AND_RECOVERY.md', 'USER_AND_OPERATOR_GUIDE.md', 'COMPLETION_AUDIT.md']) assert.equal(fs.readFileSync(path.join(__dirname, file), 'utf8').split(marker).length, 2, file);
for (const id of ['PA-002', 'PA-006']) { const workflow = register.workflows.find(w => w.id === id); assert.ok(workflow.evidence.some(p => p.endsWith('purchase-order-edit-receipt.json'))); assert.equal(workflow.completeWorkflowVerified, false); }
assert.equal(register.coverage.discoveredWorkflows, 220); assert.equal(register.coverage.completeWorkflowsVerified, 0); assert.equal(register.coverage.sourceCandidateCounts.sourceFiles, 2627);
const result = { at: new Date().toISOString(), sourceBindings: Object.keys(receipt.source.hashes).length, verificationScriptBindings: Object.keys(receipt.verificationScripts).length, screenshots: receipt.screenshots.length, rootArtifacts: 9, sourceMismatches: 0, coverage: register.coverage, fullGoalComplete: false };
fs.writeFileSync(path.join(__dirname, 'evidence/purchase-order-edit-final-validation.json'), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' }); console.log(JSON.stringify(result));
