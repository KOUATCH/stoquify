const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict'), { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '../../..'), read = p => JSON.parse(fs.readFileSync(path.join(__dirname, p), 'utf8'));
const output = 'evidence/rbac-identity-v121.json'; assert.ok(!fs.existsSync(path.join(__dirname, output)));
const baseline = read('evidence/source-baseline-v121.json'), browserFile = 'lanes/environment/rbac-browser-v121-702ea1fb-8bda-4ac3-b634-3b3b948f5b24.json';
const browser = read(browserFile), after = read('evidence/rbac-identity-v121-after-recovered.json');
assert.ok(browser.passed && browser.sourceStable && after.passed && after.sourceStable);
for (const [file, digest] of Object.entries(browser.sourcesAfter)) {
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex'), digest);
  assert.equal(baseline.sources.find(s => s.path === file)?.sha256, digest);
}
const laneFile = 'lanes/organization-access/WORKFLOW_REGISTER.json', lane = read(laneFile);
const workflow = lane.workflows.find(w => w.id === 'OA-PERMISSION-REFRESH'); assert.ok(workflow);
workflow.evidence.push('../../RBAC_IDENTITY_V121.md', '../../' + output);
workflow.v121IdentityCorrection = 'Current RBAC authority requires the immutable live session subject ID. Email fallback removed; returned subject checked. PostgreSQL reassignment proof and actual EN/FR session regression retained.';
lane.updatedAt = new Date().toISOString(); fs.writeFileSync(path.join(__dirname, laneFile), JSON.stringify(lane, null, 2) + '\n');
execFileSync(process.execPath, [path.join(__dirname, 'update-workflow-register.cjs')], { cwd: root, stdio: 'pipe', windowsHide: true });
const register = read('WORKFLOW_REGISTER.json'); assert.equal(register.sourceBaseline, 'evidence/source-baseline-v121.json');
const note = '\n\n## v121 — Immutable identity in current permission resolution\n\nShared RBAC no longer substitutes a different account through a reassigned email. Current permissions require the live session subject ID. [Implementation, review and operating guide](RBAC_IDENTITY_V121.md); [evidence](evidence/rbac-identity-v121.json).41 tests/six suites, full typecheck, changed-file lint and actual EN/FR browser regression passed. PostgreSQL assertions passed; its initial evidence-save EPERM is retained as a nonzero command, with emitted results recovered. Actual session email change and inactive-user denial verified. No schema, financial operation or deployment.\n\nCoverage: ' + register.coverage.discoveredWorkflows + ' provisional workflows / ' + register.coverage.completeWorkflowsVerified + ' whole workflows complete / ' + register.coverage.unmappedEntrySources + ' unmapped entry sources. Loading optimization, the narrow French native-select label and full platform coverage remain open. No X1, professional approval or whole-platform completion.\n';
for (const file of ['WORKFLOW_MAP.md','FINDINGS_AND_REMEDIATION.md','IMPLEMENTATION_REPORT.md','DESIGN_SYSTEM_AND_UX.md','VERIFICATION.md','ROLLOUT_AND_RECOVERY.md','USER_AND_OPERATOR_GUIDE.md','COMPLETION_AUDIT.md','NEXT_BATCH.md']) fs.appendFileSync(path.join(__dirname, file), note);
fs.writeFileSync(path.join(__dirname, output), JSON.stringify({ at: new Date().toISOString(), baseline: 'evidence/source-baseline-v121.json', sources: browser.sourcesAfter, tests: { passed: 41, suites: 6, receipt: '647b3c' }, typecheck: { passed: true, receipt: 'ab2834' }, lint: { passed: true, receipt: '2be578' }, database: after, browser: { file: browserFile, receipt: 'af94aa', ...browser }, coverage: register.coverage, wholeWorkflowComplete: false }, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ output, coverage: register.coverage, wholeWorkflowComplete: false }));
