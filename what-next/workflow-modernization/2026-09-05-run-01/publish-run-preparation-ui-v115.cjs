const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict'), { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '../../..'), read = p => JSON.parse(fs.readFileSync(path.join(__dirname, p), 'utf8'));
const browserName = process.argv[2]; assert.match(browserName || '', /^run-preparation-v115-browser-[a-f0-9-]+\.json$/);
const output = 'evidence/run-preparation-ui-v115.json', baselineFile = 'evidence/source-baseline-v115.json', browserFile = 'lanes/environment/' + browserName;
assert.ok(!fs.existsSync(path.join(__dirname, output)));
const baseline = read(baselineFile), browser = read(browserFile);
assert.ok(!browser.error && browser.sourceStable && browser.journeys.length === 2 && browser.journeys.every(j => j.passed));
for (const [file, expected] of Object.entries(browser.sourcesAfter)) {
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex'), expected, file);
  assert.equal(baseline.sources.find(s => s.path === file)?.sha256, expected, file);
}
const laneFile = 'lanes/payments-reconciliation/WORKFLOW_REGISTER.json', lane = read(laneFile), workflow = lane.workflows.find(w => w.id === 'PR-19'); assert.ok(workflow);
workflow.entryPoints = [...new Set([...workflow.entryPoints, 'app/[locale]/(dashboard)/dashboard/finance/reconciliation/page.tsx', 'components/finance/ReconciliationPreparationWorkbench.tsx', 'components/finance/PaymentReconciliationWorkbench.tsx'])];
workflow.implementationStatus = 'scoped_read_models_and_en_fr_preparation_history_recovery_integrated';
workflow.reviewStatus = 'current_source_and_owned_operator_journey_review';
workflow.runtimeStatus = 'actual_en_fr_readonly_denial_prerequisites_password_reload_prepare_history_reopening_mobile_keyboard_verified';
workflow.remaining = ['Verify native assistive technology/zoom and additional module/role combinations.', 'Verify large run/history pages in PostgreSQL, deliberate committed-response loss and conflicting reviewers in the actual preparation UI.', 'Complete the independent-signing/export browser handoff and source allocation/legacy investigation evidence boundaries.', 'Continue every remaining platform workflow; no whole-workflow completion claim.'];
for (const id of ['PR-10', 'PR-16', 'PR-17', 'PR-19']) { const w = lane.workflows.find(w => w.id === id); w.evidence.push(output, 'RUN_PREPARATION_UI_V115.md'); }
lane.updatedAt = new Date().toISOString(); fs.writeFileSync(path.join(__dirname, laneFile), JSON.stringify(lane, null, 2) + '\n');
execFileSync(process.execPath, [path.join(__dirname, 'update-workflow-register.cjs')], { cwd: root, stdio: 'pipe', windowsHide: true });
const register = read('WORKFLOW_REGISTER.json'); assert.equal(register.sourceBaseline, baselineFile);
const note = `\n\n## v115 — Preparation, requirements and retained history in the existing workspace\n\nIntegrated scoped, paginated run discovery, complete counts, verified redacted history and an EN/FR preparation review with current prerequisites. Exact drafts survive password step-up and reload; current reopened state is separate from retained receipts. [Operator guide](RUN_PREPARATION_UI_V115.md), [bound evidence](${output}).\n\nVerified: 101 focused tests/six suites, final changed-component recovery rerun, full typecheck (5da123), changed-file lint and actual EN/FR preparation/reopening journeys with stable source. Browser checks include read-only denial, real password confirmation, retained request/reload, actual preparation records, unchanged financial records during preparation, 320/768/1440 reflow and keyboard focus return. Native assistive technology, broader races and the complete signing/export browser handoff remain open.\n\nCoverage: ${register.coverage.discoveredWorkflows} provisional workflows / ${register.coverage.completeWorkflowsVerified} whole workflows complete / ${register.coverage.unmappedEntrySources} unmapped entry sources. No migration, production deployment, live approval, external delivery, X1 clearance or professional certification. The full platform goal remains active.\n`;
for (const file of ['WORKFLOW_MAP.md', 'FINDINGS_AND_REMEDIATION.md', 'IMPLEMENTATION_REPORT.md', 'DESIGN_SYSTEM_AND_UX.md', 'VERIFICATION.md', 'ROLLOUT_AND_RECOVERY.md', 'USER_AND_OPERATOR_GUIDE.md', 'COMPLETION_AUDIT.md', 'NEXT_BATCH.md']) fs.appendFileSync(path.join(__dirname, file), note);
fs.appendFileSync(path.join(__dirname, 'RUN_PREPARATION_UI_V115.md'), `\n\n## Final evidence binding\n\nActual browser result: ${browserFile}. Both languages passed with stable source; local route timings and CSS preload observations remain in the receipt, without a production performance claim. Source: ${baselineFile}, ${baseline.recordedAt}, branch ${baseline.branch}, commit ${baseline.commit}. Aggregate: ${output}. Initial failures above remain retained.\n`);
fs.writeFileSync(path.join(__dirname, output), JSON.stringify({ at: new Date().toISOString(), baseline: baselineFile, sources: browser.sourcesAfter,
  tests: { passed: 101, suites: 6, receipts: ['f0ef71: 37 focused tests passed; separate workbench suite failed to load', '06320c: 64 workbench/sign/detail tests passed after boundary correction'], finalComponentRerun: { passed: 4, receipt: '7ee66b' } },
  typecheck: { passed: true, receipt: '5da123', initialFailure: 'd62e05: unfinished inventory syntax outside this batch' },
  lint: { receipts: ['0679f4: eight files, one cleanup-ref warning', 'af54c3: component and workbench test, zero warnings after correction'] },
  browser: { file: browserFile, passed: true, sourceStable: true, journeys: browser.journeys },
  failedBrowserAttempt: 'lanes/environment/run-preparation-v115-browser-fa3f9620-25f.json', selectedSkill: '009-aqstoqflow-payment-reconciliation-moat', remaining: workflow.remaining, coverage: register.coverage, wholeWorkflowComplete: false }, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ output, coverage: register.coverage, wholeWorkflowComplete: false }));
