const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '../../..');
const read = p => JSON.parse(fs.readFileSync(path.join(__dirname, p), 'utf8'));
const sha = p => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, p))).digest('hex');
const receiptPath = path.join(__dirname, 'evidence/ap-receipt-quantity-v56.json');
assert.ok(!fs.existsSync(receiptPath), 'Immutable checkpoint already exists');
const baseline = read('evidence/source-baseline-v56.json');
const before = read('lanes/environment/ap-receipt-quantity-141a2d78-73f.json');
const after = read('lanes/environment/ap-receipt-quantity-3a32154a-d92.json');
const tests = read('evidence/ap-receipt-quantity-after-20260908.json');
assert.equal(before.checks.filter(c => c.status === 'failed').length, 2);
assert.equal(after.checks.length, 4); assert.ok(after.checks.every(c => c.status === 'passed'));
assert.ok(after.originalUnchanged); assert.deepEqual(after.sourcesBefore, after.sourcesAfter);
assert.equal(tests.numPassedTests, 57); assert.equal(tests.numFailedTests, 0); assert.equal(tests.numPassedTestSuites, 3);
const files = [...Object.keys(after.sourcesAfter), 'services/purchasing/__tests__/ap-control.service.test.ts', 'actions/purchasing/ap-control.actions.ts', 'actions/purchasing/__tests__/ap-control.actions.test.ts', 'services/purchase-order/__tests__/purchase-order-receive-batch.service.test.ts'];
const hashes = Object.fromEntries(files.map(file => { const current = sha(file); assert.equal(baseline.sources.find(s => s.path === file)?.sha256, current); if (after.sourcesAfter[file]) assert.equal(after.sourcesAfter[file], current); return [file, current]; }));
const laneFile = path.join(__dirname, 'lanes/purchasing-ap/WORKFLOW_REGISTER.json'), lane = JSON.parse(fs.readFileSync(laneFile, 'utf8'));
const workflow = lane.workflows.find(w => w.id === 'PA-016'); assert.ok(workflow);
workflow.implementationStatus = 'cumulative_receipt_quantity_and_concurrent_preparation_retry_corrected_interactive_ap_workflow_open';
workflow.reviewStatus = 'partial_receipt_reservation_and_supplier_serialization_review';
workflow.runtimeStatus = 'partial_real_postgres_cumulative_fractional_concurrent_and_exact_retry_verified';
workflow.completeWorkflowVerified = false;
workflow.evidence.push('AP_RECEIPT_QUANTITY.md', '../../evidence/ap-receipt-quantity-v56.json');
workflow.transitions.push('Accumulate split receipt quantities; serialize supplier preparation before committed reservation and retry reads');
workflow.remaining = workflow.remaining.filter(s => !s.startsWith('This checkpoint verifies cancelled-parent'));
workflow.remaining.push('This checkpoint verifies cumulative receipt quantities and concurrent exact retries; complete authority, document evidence, match approval, posting and interactive journeys remain unfinished.');
lane.evidenceDate = new Date().toISOString(); fs.writeFileSync(laneFile, JSON.stringify(lane, null, 2) + '\n');
execFileSync(process.execPath, [path.join(__dirname, 'update-workflow-register.cjs')], { cwd: root, windowsHide: true });
const register = read('WORKFLOW_REGISTER.json'); assert.equal(register.sourceBaseline, 'evidence/source-baseline-v56.json');
const checkpoint = '\n\n## AP receipt quantity checkpoint — 2026-09-08, source v56\n\nPA-016 cumulative receipt quantities and concurrent exact preparation retries are corrected. Real PostgreSQL: 4 groups passed; AP/action/receiving regression: 57 tests across 3 suites passed; typecheck and two-file lint passed. Before evidence reproduced over-reservation from split lines and a retry unique-constraint failure. Existing payments, journals and unrelated roles remained unchanged. No new browser, EN/FR, accessibility, full-build or accounting-posting pass is claimed.\n\nSee `lanes/purchasing-ap/AP_RECEIPT_QUANTITY.md` and `evidence/ap-receipt-quantity-v56.json` for sources, commands, input ownership and recovery. The interactive invoice preparation UI, complete authority/document/preview contracts and connected AP/accounting lifecycle remain open engineering work. Goods receipt ledger review remains required; no blocker was relabeled or cleared. The platform review remains active: ' + register.coverage.discoveredWorkflows + ' provisional workflows, ' + register.coverage.completeWorkflowsVerified + ' whole workflows complete, ' + register.coverage.unmappedEntrySources + ' unmapped entry sources. Counts are discovery evidence, not certification.\n';
for (const file of ['WORKFLOW_MAP.md', 'FINDINGS_AND_REMEDIATION.md', 'IMPLEMENTATION_REPORT.md', 'DESIGN_SYSTEM_AND_UX.md', 'VERIFICATION.md', 'ROLLOUT_AND_RECOVERY.md', 'USER_AND_OPERATOR_GUIDE.md', 'COMPLETION_AUDIT.md', 'NEXT_BATCH.md']) fs.appendFileSync(path.join(__dirname, file), checkpoint);
const receipt = { at: new Date().toISOString(), baseline: 'evidence/source-baseline-v56.json', branch: baseline.branch, commit: baseline.commit, sourceHashes: hashes, verifier: { path: 'lanes/environment/verify-ap-receipt-quantity.cjs', sha256: sha('what-next/workflow-modernization/2026-09-05-run-01/lanes/environment/verify-ap-receipt-quantity.cjs') }, before: 'lanes/environment/ap-receipt-quantity-141a2d78-73f.json', after: 'lanes/environment/ap-receipt-quantity-3a32154a-d92.json', tests: 'evidence/ap-receipt-quantity-after-20260908.json', commands: [
  { command: 'node node_modules/jest/bin/jest.js --runInBand --runTestsByPath services/purchasing/__tests__/ap-control.service.test.ts actions/purchasing/__tests__/ap-control.actions.test.ts services/purchase-order/__tests__/purchase-order-receive-batch.service.test.ts --json --outputFile what-next/workflow-modernization/2026-09-05-run-01/evidence/ap-receipt-quantity-after-20260908.json', status: 'passed', tests: 57, suites: 3 },
  { command: 'node node_modules/typescript/bin/tsc --noEmit --pretty false', status: 'passed', exitCode: 0 },
  { command: 'node node_modules/eslint/bin/eslint.js services/purchasing/ap-control.service.ts services/purchasing/__tests__/ap-control.service.test.ts', status: 'passed', exitCode: 0 },
  { command: 'node what-next/workflow-modernization/2026-09-05-run-01/lanes/environment/verify-ap-receipt-quantity.cjs', status: 'passed', groups: 4 }
], originalUnchanged: true, migration: 'none', browser: 'not run for this backend correction; full interactive PA-016 remains missing', completeWorkflowVerified: false, coverage: register.coverage };
fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2), { flag: 'wx' });
console.log(JSON.stringify({ receipt: path.relative(root, receiptPath), coverage: register.coverage, sourceBindings: files.length }));
