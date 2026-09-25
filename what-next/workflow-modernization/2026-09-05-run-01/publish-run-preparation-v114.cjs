const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict'), { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '../../..'), read = p => JSON.parse(fs.readFileSync(path.join(__dirname, p), 'utf8'));
const output = 'evidence/run-preparation-v114.json', baselineFile = 'evidence/source-baseline-v114.json', postgresFile = 'lanes/environment/run-preparation-v114-64f51086-ece.json';
assert.ok(!fs.existsSync(path.join(__dirname, output)));
const baseline = read(baselineFile), postgres = read(postgresFile);
assert.ok(!postgres.error && postgres.sourceStable && postgres.originalUnchanged && postgres.checks.length === 5);
for (const [file, expected] of Object.entries(postgres.sourcesAfter)) {
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex'), expected, file);
  assert.equal(baseline.sources.find(s => s.path === file)?.sha256, expected, file);
}
const laneFile = 'lanes/payments-reconciliation/WORKFLOW_REGISTER.json', lane = read(laneFile);
assert.ok(!lane.workflows.some(w => w.id === 'PR-19'));
const remaining = ['Integrate preparation preview, typed prerequisites, history and recovery into existing EN/FR workspace with actual browser and accessibility verification.', 'Verify remaining module/transport combinations, source drift and concurrent races.', 'Implement nonfinancial investigation and legacy/domain terminal evidence adapters.', 'Continue the full platform register; this batch is not whole-workflow completion.'];
lane.workflows.push({ id: 'PR-19', name: 'Prepare a reviewed reconciliation run', purpose: 'Bind reviewed current source and resolved obligations to unsigned readiness for independent sign-off.', domain: 'payments_reconciliation',
  personas: ['Reconciliation operator', 'Independent signer'], authority: 'Server-scoped reconciliation/accounting read; payments.reconciliation.run and verified recent password for preparation; independent existing sign authority.',
  entryPoints: ['actions/payments/reconciliation-preparation.actions.ts'], prerequisites: ['Unsigned run with maker', 'Effective provider/accounting setup', 'External evidence', 'Verified terminal obligations and ledger/source lineage'],
  services: ['services/reconciliation/reconciliation-run-preparation.service.ts', 'services/reconciliation/reconciliation-run-preparation-evidence.ts', 'services/reconciliation/payment-reconciliation-certification.service.ts'],
  records: ['ReconciliationRun', 'PaymentReconciliationInboxItem', 'LedgerAuditEvent'], transitions: ['Review current preview', 'Recheck current authority and source revision', 'Conditionally prepare with private receipt/audit/notification', 'Independently sign current preparation', 'Retain history through source-owned reopening'],
  sideEffects: ['Unsigned readiness, private evidence, audit and in-app notification; no financial posting'], implementationStatus: 'service_and_protected_actions_implemented_ui_pending', reviewStatus: 'partial_engineering_review',
  runtimeStatus: 'owned_postgres_actual_mismatch_through_sign_export_reopening_verified', completeWorkflowVerified: false, evidence: [output, 'RUN_PREPARATION_V114.md'], remaining });
const signing = lane.workflows.find(w => w.id === 'PR-10'); assert.ok(signing);
signing.v114PreparationReview = 'Evidence-bound preparation and actual independent signing/export/reopening verified on owned synthetic mismatch; UI handoff and broader contexts remain open.';
signing.remaining = signing.remaining.filter(s => !s.includes('lack a general evidence-bound') && !s.includes('genuine exception-review/sign-off handoff') && !s.includes('full exception navigation/review/closure and ready/sign-off'));
for (const id of ['PR-10', 'PR-16', 'PR-17']) { const w = lane.workflows.find(w => w.id === id); w.evidence.push(output, 'RUN_PREPARATION_V114.md'); }
lane.updatedAt = new Date().toISOString(); fs.writeFileSync(path.join(__dirname, laneFile), JSON.stringify(lane, null, 2) + '\n');
execFileSync(process.execPath, [path.join(__dirname, 'update-workflow-register.cjs')], { cwd: root, stdio: 'pipe', windowsHide: true });
const register = read('WORKFLOW_REGISTER.json'); assert.equal(register.sourceBaseline, baselineFile);
const note = `\n\n## v114 — Reviewed-run preparation and genuine sign/recovery handoff\n\nAdded current-evidence preparation, durable private receipt/audit, conditional readiness, exact retry and independent signing validation. Actual owned mismatch → financial treatment → exception closure → preparation → signing → certificate export → source-owned clearing reversal passed. Missing external evidence remains blocked. [Guide and limitations](RUN_PREPARATION_V114.md), [bound evidence](${output}).\n\nVerified: 55 tests/four suites, configured typecheck (ba18f2), eight-file lint (606bc3), five owned PostgreSQL check groups with stable source and unchanged monitored original records. Preparation UI and actual EN/FR browser journeys remain pending. No migration, deployment, live approval, external delivery, X1 clearance or whole-workflow certification. Coverage: ${register.coverage.discoveredWorkflows} provisional workflows / ${register.coverage.completeWorkflowsVerified} whole workflows complete / ${register.coverage.unmappedEntrySources} unmapped entry sources. The full-platform goal remains active.\n`;
for (const file of ['WORKFLOW_MAP.md', 'FINDINGS_AND_REMEDIATION.md', 'IMPLEMENTATION_REPORT.md', 'DESIGN_SYSTEM_AND_UX.md', 'VERIFICATION.md', 'ROLLOUT_AND_RECOVERY.md', 'USER_AND_OPERATOR_GUIDE.md', 'COMPLETION_AUDIT.md', 'NEXT_BATCH.md']) fs.appendFileSync(path.join(__dirname, file), note);
fs.writeFileSync(path.join(__dirname, output), JSON.stringify({ at: new Date().toISOString(), baseline: baselineFile, sources: postgres.sourcesAfter,
  tests: { passed: 55, suites: 4, receipt: '5e9f83' }, typecheck: { passed: true, receipt: 'ba18f2' }, lint: { passed: true, files: 8, receipt: '606bc3' },
  postgres: { file: postgresFile, checks: postgres.checks, sourceStable: true, monitoredOriginalRowsUnchanged: true },
  initialFailures: ['49d7d4: stronger query expectation and authentication test-boundary import corrected', '98ac62: evidence-file EPERM; outcome not retained, no pass claim'],
  browser: { status: 'pending_preparation_ui' }, selectedSkill: '009-aqstoqflow-payment-reconciliation-moat', remaining, coverage: register.coverage, wholeWorkflowComplete: false }, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ output, coverage: register.coverage, wholeWorkflowComplete: false }));
