const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict'), { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '../../..'), browserFile = process.argv[2];
assert.match(browserFile, /^lanes\/environment\/suspense-resolution-export-v107-browser-[a-f0-9-]+\.json$/);
const read = p => JSON.parse(fs.readFileSync(path.join(__dirname, p), 'utf8'));
const hash = p => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, p))).digest('hex');
const output = 'evidence/suspense-resolution-export-v107.json', baselineFile = 'evidence/source-baseline-v107.json', testFile = 'evidence/suspense-resolution-export-v107-tests-ui.json', runtimeFile = 'lanes/environment/suspense-resolution-export-v107-4c58ba46-9f7.json';
assert.ok(!fs.existsSync(path.join(__dirname, output)));
const baseline = read(baselineFile), tests = read(testFile), browser = read(browserFile), runtime = read(runtimeFile), sources = {};
assert.ok(tests.success); assert.equal(tests.numPassedTests, 65); assert.equal(tests.numPassedTestSuites, 6);
assert.ok(!runtime.error && runtime.sourceStable && runtime.financialUnchanged && runtime.lateFailureRollback); assert.equal(runtime.checks.length, 28); assert.equal(Object.keys(runtime.kinds).length, 6);
assert.ok(!browser.error && browser.sourceStable && browser.financialUnchanged && browser.journeys.length === 2 && browser.journeys.every(j => j.passed && !j.pageErrors.length && j.screenshots.length === 4 && j.files.length === 2));
for (const result of [browser, runtime]) for (const [p, value] of Object.entries(result.sourcesAfter)) { assert.equal(hash(p), value, p); sources[p] = value; }
for (const p of tests.testResults.map(s => path.relative(root, s.name).replaceAll('\\', '/'))) sources[p] = hash(p);
for (const [p, value] of Object.entries(sources)) assert.equal(baseline.sources.find(s => s.path === p)?.sha256, value, p);
const artifacts = 'evidence/suspense-resolution-export-v107-files'; fs.mkdirSync(path.join(__dirname, artifacts));
for (const journey of browser.journeys) {
  for (const file of journey.screenshots) fs.copyFileSync(path.join(__dirname, 'lanes/environment', file), path.join(__dirname, artifacts, file));
  for (const file of journey.files) {
    const bytes = fs.readFileSync(path.join(__dirname, 'lanes/environment', file.file)); assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), file.sha256);
    fs.copyFileSync(path.join(__dirname, 'lanes/environment', file.file), path.join(__dirname, artifacts, file.file));
  }
}
const laneFile = 'lanes/payments-reconciliation/WORKFLOW_REGISTER.json', lane = read(laneFile);
for (const id of ['PR-15', 'PR-16']) {
  const workflow = lane.workflows.find(w => w.id === id); assert.ok(workflow);
  workflow.services = [...new Set([...workflow.services, 'services/reconciliation/payment-suspense-resolution-archive.service.ts', 'services/reconciliation/payment-suspense-resolution-export.service.ts'])];
  workflow.implementationStatus = 'protected_en_fr_resolution_recovery_and_durable_private_historical_exports_implemented';
  workflow.runtimeStatus = 'actual_en_fr_export_authentication_download_replay_and_28_retained_financial_records_verified';
  workflow.completeWorkflowVerified = false; workflow.evidence.push(output, 'SUSPENSE_RESOLUTION_EXPORT_GUIDE_V107.md');
  workflow.remaining = workflow.remaining.map(value => value === 'Durable resolution/recovery exports and complete genuine sign-off/export handoff' ? 'Complete genuine exception/sign-off/export handoff across connected reconciliation workflows' : value);
  workflow.remaining.push('Additional unallocated generic-clearing reversal export variants and broader operational contexts');
}
lane.workflows.find(w => w.id === 'PR-09').evidence.push(output);
lane.updatedAt = new Date().toISOString(); fs.writeFileSync(path.join(__dirname, laneFile), JSON.stringify(lane, null, 2) + '\n');
execFileSync(process.execPath, [path.join(__dirname, 'update-workflow-register.cjs')], { cwd: root, stdio: 'pipe', windowsHide: true });
const register = read('WORKFLOW_REGISTER.json'); assert.equal(register.sourceBaseline, baselineFile);
const note = `\n\n## v107 — Durable resolution and reopening exports\n\nEach resolution/reopening history record now has an authorized private export. The service verifies the six retained proposal/decision shapes, original approval and posting cycle, full clearing, allocation, independent decision/audit links, exact recovery and later original corrections. Current actor/read/export authority, fresh authentication and the selected revision are checked before export or replay. Immutable receipts retain the original file bytes; redacted history never claims new approval or current settlement.\n\nThe EN/FR panel keeps the exact export request across password step-up, refresh and failed browser handoff. The download adapter verifies SHA-256 and displays a receipt with honest browser-download wording and keyboard focus recovery. [Guide](SUSPENSE_RESOLUTION_EXPORT_GUIDE_V107.md), [bound evidence](${output}).\n\nVerified: 65 tests/6 suites, typecheck, thirteen-file lint; 28 owned retained records across all six kinds, tampered financial proof/missing audit refusal and late audit rollback; actual EN/FR denied/authorized sessions, password step-up, refresh, file download and exact replay. Eight screenshots, four downloaded synthetic evidence files and unchanged financial rows. Timings are local observations.\n\nRoutes: /en/dashboard/finance/reconciliation and /fr/dashboard/finance/reconciliation. Complete genuine exception/sign-off/export handoffs, additional races/contexts/legacy provenance and full accessibility/performance evidence remain open. No migration, deployment, X1 clearance, held notification cutover or professional certification. Coverage: ${register.coverage.discoveredWorkflows} provisional workflows, ${register.coverage.completeWorkflowsVerified} whole workflows complete, ${register.coverage.unmappedEntrySources} unmapped entry sources. The full goal remains active.\n`;
for (const file of ['WORKFLOW_MAP.md', 'FINDINGS_AND_REMEDIATION.md', 'IMPLEMENTATION_REPORT.md', 'DESIGN_SYSTEM_AND_UX.md', 'VERIFICATION.md', 'ROLLOUT_AND_RECOVERY.md', 'USER_AND_OPERATOR_GUIDE.md', 'COMPLETION_AUDIT.md', 'NEXT_BATCH.md']) fs.appendFileSync(path.join(__dirname, file), note);
fs.appendFileSync(path.join(__dirname, 'SUSPENSE_RESOLUTION_OPERATOR_GUIDE.md'), '\n\n## v107 — historical exports available\n\nAuthorized users can now download scoped resolution/reopening history with verified financial lineage, fresh authentication and exact-byte replay. [Export procedure and evidence](SUSPENSE_RESOLUTION_EXPORT_GUIDE_V107.md). This supersedes earlier exports-unimplemented statements; genuine connected sign-off and wider lifecycle evidence remain open.\n');
fs.appendFileSync(path.join(__dirname, 'SUSPENSE_TERMINAL_RESOLUTION_NEXT_BOUNDARY.md'), '\n\n## v107 current boundary\n\nDurable private historical exports are implemented and verified at the service, protected action and actual EN/FR browser boundaries. Continue through the genuine exception/sign-off/export handoff; do not substitute synthetic SIGNED fixtures for actual sign-off. Broader races, currency/country/legacy policies and remaining whole-platform workflows remain in scope. See SUSPENSE_RESOLUTION_EXPORT_GUIDE_V107.md.\n');
fs.appendFileSync(path.join(__dirname, 'SUSPENSE_RESOLUTION_EXPORT_GUIDE_V107.md'), `\n\n## Final browser and source binding\n\n- Browser: ${browserFile}, both locales passed with no page errors; source stable and financial rows unchanged.\n- Eight screenshots and four actual downloaded/replayed files: ${artifacts}.\n- Local route-to-queue milliseconds: ${browser.journeys.map(j => j.locale + ': ' + j.routeLoadMs.join('/')).join('; ')}.\n- Baseline: ${baselineFile}; ${baseline.summary.sourceFiles} files, ${baseline.summary.tests} tests, ${baseline.summary.uiControlCandidates} control candidates; receipt 52e1df.\n- Aggregate: ${output}.\n`);
fs.writeFileSync(path.join(__dirname, output), JSON.stringify({ at: new Date().toISOString(), branch: baseline.branch, commit: baseline.commit, baseline: baselineFile, sources,
  tests: { file: testFile, passed: 65, suites: 6, receipt: '9e2c6c' }, runtime: { file: runtimeFile, records: 28, kinds: runtime.kinds, lateAuditFailureRollback: true, receipt: 'd3b265' },
  browser: { file: browserFile, screenshots: 8, downloads: 4, artifacts, routeLoadMs: browser.journeys.map(j => ({ locale: j.locale, values: j.routeLoadMs })) },
  typecheck: { session: 41254, receipt: '499d92', exitCode: 0 }, lint: { files: 13, receipt: '2e03c4', exitCode: 0 }, wholeWorkflowComplete: false, coverage: register.coverage,
  selectedSkill: '009-aqstoqflow-payment-reconciliation-moat', nextNumberedSkillAfterCurrentBoundary: '010-aqstoqflow-inventory-valuation-kernel', previousTurnAssessment: 'progress: v106 verified local draft and keyboard recovery',
  nextAction: 'Complete the genuine connected exception/sign-off/export handoff and continue the complete workflow register' }, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ output, coverage: register.coverage, tests: 65, runtimeRecords: 28, screenshots: 8, wholeWorkflowComplete: false }));
