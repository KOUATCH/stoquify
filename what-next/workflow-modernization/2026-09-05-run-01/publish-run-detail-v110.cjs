const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict'), { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '../../..'), read = file => JSON.parse(fs.readFileSync(path.join(__dirname, file), 'utf8'));
const baselineFile = 'evidence/source-baseline-v110.json', testFile = 'evidence/run-detail-v110-tests-final.json', runtimeFile = 'lanes/environment/run-detail-v110-7792ba4a-04f.json', output = 'evidence/run-detail-v110.json';
assert.ok(!fs.existsSync(path.join(__dirname, output)));
const baseline = read(baselineFile), tests = read(testFile), runtime = read(runtimeFile);
assert.ok(tests.success); assert.equal(tests.numPassedTests, 44); assert.equal(tests.numPassedTestSuites, 3);
assert.ok(!runtime.error && runtime.sourceStable && runtime.originalUnchanged && runtime.financialUnchanged); assert.equal(runtime.checks.length, 4);
const files = [runtime.sourceFile, ...tests.testResults.map(t => path.relative(root, t.name).replaceAll('\\', '/'))], sources = {};
for (const file of files) { const hash = crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex'); assert.equal(hash, baseline.sources.find(s => s.path === file)?.sha256, file); sources[file] = hash; }
assert.equal(sources[runtime.sourceFile], runtime.sourceAfter);
const laneFile = 'lanes/payments-reconciliation/WORKFLOW_REGISTER.json', lane = read(laneFile);
for (const id of ['PR-10', 'PR-17']) {
  const w = lane.workflows.find(w => w.id === id); assert.ok(w); w.evidence.push(output, 'RUN_DETAIL_COUNTS_V110.md');
  w.remaining.push('v110 corrects authoritative run-detail counts beyond bounded samples; full exception navigation/review/closure and ready/sign-off handoff remain required. No current rendered consumer of the detail hook was found.');
}
lane.updatedAt = new Date().toISOString(); fs.writeFileSync(path.join(__dirname, laneFile), JSON.stringify(lane, null, 2) + '\n');
execFileSync(process.execPath, [path.join(__dirname, 'update-workflow-register.cjs')], { cwd: root, stdio: 'pipe', windowsHide: true });
const register = read('WORKFLOW_REGISTER.json'); assert.equal(register.sourceBaseline, baselineFile);
const note = `\n\n## v110 — Complete run-detail evidence counts\n\nRun-detail reads now count all scoped match, exception and suspense records separately from their 100-row samples, report explicit truncation, and share a RepeatableRead snapshot. This prevents hidden unresolved records from appearing as zero. Query failure remains an error. [Correction and guidance](RUN_DETAIL_COUNTS_V110.md); [source-bound evidence](${output}).\n\nPassed: 44 focused tests/three suites, two-file lint, configured typecheck (before indentation-only final formatting), and four owned PostgreSQL check groups including a real concurrent insert. Final read observation: 60 ms, unbudgeted local measurement. Synthetic terminal rows reproduce sampling only; no closure or sign-off proof. No UI changed; current source exposes a protected action/hook but no rendered consumer of this detail hook. No browser pass is claimed for this service-only fix.\n\nCoverage: ${register.coverage.discoveredWorkflows} provisional workflows, ${register.coverage.completeWorkflowsVerified} whole workflows complete, ${register.coverage.unmappedEntrySources} unmapped entry sources; ${baselineFile}. General exception review/closure, complete record navigation, reviewed-run preparation, independent sign-off/export/reopening and the remaining platform register remain required. No deployment, migration, live activation, external messages or X1 clearance.\n`;
for (const file of ['WORKFLOW_MAP.md', 'FINDINGS_AND_REMEDIATION.md', 'IMPLEMENTATION_REPORT.md', 'DESIGN_SYSTEM_AND_UX.md', 'VERIFICATION.md', 'ROLLOUT_AND_RECOVERY.md', 'USER_AND_OPERATOR_GUIDE.md', 'COMPLETION_AUDIT.md', 'NEXT_BATCH.md']) fs.appendFileSync(path.join(__dirname, file), note);
const result = { at: new Date().toISOString(), baseline: baselineFile, branch: baseline.branch, commit: baseline.commit, sources,
  productionFilesChangedInBatch: [runtime.sourceFile], tests: { file: testFile, passed: 44, suites: 3, receipt: '0773c5' }, lint: { exitCode: 0, receipt: 'c4b5f7', files: 2 },
  typecheck: { exitCode: 0, receipt: '87160a', qualification: 'Only indentation in the modified transaction changed after this check; final tests/runtime bind the formatting.' },
  runtime: { file: runtimeFile, receipt: '304e9c', checks: 4, readMs: runtime.readMs, sourceStable: true, originalUnchanged: true, financialUnchanged: true },
  browser: { status: 'not_applicable_to_service_only_change', qualification: 'No current rendered detail-hook consumer found; no UI or browser verification claim.' },
  coverage: register.coverage, wholeWorkflowComplete: false, nextAction: 'Implement evidence-bound exception review/closure and complete record navigation; then reviewed-run preparation/sign-off/export/reopening and the full platform register.' };
fs.writeFileSync(path.join(__dirname, output), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ output, coverage: register.coverage, tests: 44, wholeWorkflowComplete: false }));
