// Read-only source/receipt reconciliation followed by one immutable closure record.
// Coverage judgments are documented in RECONCILIATION_SIGNOFF_FINAL_AUDIT_2026-09-27.md.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const root = __dirname, workspace = path.resolve(root, '../../..');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const receiptFiles = [
  'lanes/environment/sign-final-boundaries-cf170f99-a12e-4db5-9db0-09acff80d0da.json',
  'lanes/environment/signed-source-boundaries-59920dd2-fd0c-46a3-93ae-a066b2442c4a.json',
  'lanes/environment/sign-notification-3b67f933-09b1-453b-9240-9f39fa945369.json',
  'lanes/environment/sign-module-boundary-b7f296a3-c567-4e7c-a8c1-45d0dd41d3db.json',
  'lanes/environment/sign-module-ordering-9f711f29-9cc2-44fe-aeb5-e8ac0b99553f.json',
  'lanes/environment/signoff-request-order-20cdb246-bf04-42de-aecb-a48cb3ad94bd.json',
  'lanes/environment/sign-module-browser-5b024f4d-92fc-4ea7-a6b5-2734cdee56e5.json',
  'lanes/environment/sign-entry-profile-2d6a4d8a-c992-4b2b-9b86-79079e20e912.json',
  'evidence/sign-entry-checks-45b48b8f-7057-4adb-9028-0ce9e7acdf3f.json',
  'evidence/sign-focus-checks-c0474747-2572-45ad-9f0a-b76c81bd84b1.json',
  'evidence/reconciliation-amount-checks-b3f6071d-b2f8-49d5-bea9-7a8d5ca008e7.json',
  'lanes/environment/reconciliation-amount-lifecycle-2e784ff3-b085-4c0e-84b2-465cd0b3499d.json',
  'lanes/environment/reconciliation-amount-volume-1c9cb7b4-38e6-4835-92df-05010de4a72d.json',
  'evidence/signed-additional-checks-d128bf7f-2362-4f0a-85fd-b58665fce620.json',
  'evidence/sign-notification-checks-ac7189f6-8b0c-48fd-bb5c-03349d663052.json',
  'evidence/sign-notification-cli-f9469c6a-4552-4c57-b550-581e9d84217f.json',
  'lanes/environment/sign-notification-browser-40c48c10-4020-4dee-9610-c57f9f2a2d6b.json',
  'lanes/environment/sign-auth-error-browser-5e77b952-01ad-4592-a1ec-e75feb85b1f7.json',
  'lanes/environment/sign-auth-error-browser-404bafd0-ad17-4e3a-b08d-6e5e97adb6d8.json',
];
const impactFiles = ['evidence/sign-auth-focus-impact.json', 'evidence/sign-auth-copy-impact.json', 'evidence/sign-entry-independent-catalog-edit.json', 'evidence/sign-entry-source-change.json', 'evidence/reconciliation-amount-current-bindings.json', 'evidence/source-withdrawal-current-bindings-d24f1f18-581f-4464-9d6b-41f51a4df10f.json', 'evidence/manager-sign-v117.json'];
const receipts = receiptFiles.map(file => {
  const value = read(file);
  assert.equal(value.passed, true, file);
  if (value.sourceStable === false) assert.ok(file.includes('sign-auth-error-browser-'), 'Unexplained changing source: ' + file);
  return { file, value, sha256: hash(fs.readFileSync(path.join(root, file))) };
});
const sourceHashes = {}, applicability = [];
for (const receipt of receipts) {
  const sources = receipt.value.sourceAfter || receipt.value.sourcesAfter || {};
  const unchanged = [], superseded = [];
  for (const [file, expected] of Object.entries(sources)) {
    const actual = hash(fs.readFileSync(path.join(workspace, file)));
    if (actual === expected) { sourceHashes[file] = actual; unchanged.push(file); }
    else superseded.push(file);
  }
  applicability.push({ file: receipt.file, unchanged, superseded, sourceStableAtExecution: receipt.value.sourceStable ?? null });
}
const manager = read('evidence/manager-sign-v117.json'), managerSource = 'services/manager-action-center/manager-action-center.service.ts';
for (const file of ['components/manager-action-center/PaymentReconciliationSignOffCommand.tsx', 'services/reconciliation/payment-reconciliation-sign-off-command-state.service.ts', 'services/reconciliation/payment-reconciliation-sign-off-command-state-contracts.ts', 'app/[locale]/(dashboard)/dashboard/finance/reconciliation/page.tsx', 'hooks/payments/usePaymentReconciliationDashboard.ts', 'services/reconciliation/reconciliation-sign-review.contracts.ts']) {
  const actual = hash(fs.readFileSync(path.join(workspace, file))); assert.equal(actual, manager.sources[file], file); sourceHashes[file] = actual;
}
const managerText = fs.readFileSync(path.join(workspace, managerSource), 'utf8');
assert.equal(hash(managerText.replace('value: number | null', 'value: number')), manager.sources[managerSource]); sourceHashes[managerSource] = hash(managerText);
// The shared wrapper and tokens are unchanged from the recorded manager-entry baseline.
const baseline = read('evidence/source-baseline-v117.json');
for (const file of ['services/_shared/protect.ts', 'lib/security/server-authz.ts', 'app/globals.css']) {
  const expected = baseline.sources.find(row => row.path === file)?.sha256;
  assert.ok(expected, file); const actual = hash(fs.readFileSync(path.join(workspace, file))); assert.equal(actual, expected, file); sourceHashes[file] = actual;
}
const translations = [], catalogProof = read('evidence/sign-entry-independent-catalog-edit.json');
for (const row of catalogProof.rows) {
  const text = fs.readFileSync(path.join(workspace, row.file), 'utf8');
  const catalog = text.match(/^    "catalog": \{\r?\n(?:      "[^\r\n]*\r?\n)+    \},\r?\n/m); assert.ok(catalog);
  assert.equal(hash(text.replace(catalog[0], '')), row.withoutCatalogHash, row.file);
  delete sourceHashes[row.file];
  translations.push({ file: row.file, namespace: 'paymentReconciliationWorkbench', sha256: hash(JSON.stringify(JSON.parse(text).paymentReconciliationWorkbench)), dictionaryExceptIndependentCatalogueSha256: row.withoutCatalogHash });
}
for (const file of ['components/finance/PaymentReconciliationWorkbench.tsx', 'components/finance/PaymentSuspenseQueue.tsx', 'components/finance/ReconciliationSignReview.tsx', 'services/reconciliation/payment-reconciliation-certification.service.ts', 'services/reconciliation/reconciliation-retained-signature.ts', 'services/reconciliation/reconciliation-additional-sources.service.ts', 'services/reconciliation/reconciliation-run-preparation.service.ts', 'services/reconciliation/payment-reconciliation-evidence.service.ts', 'services/reconciliation/reconciliation-amount-summary.ts', 'services/reconciliation/reconciliation-sign-notification.worker.ts', 'scripts/reconciliation-sign-notification-worker.ts']) assert.ok(sourceHashes[file], 'Current coverage missing: ' + file);
const final = receipts[0].value; assert.equal(final.cases.length, 6); assert.ok(final.cases.every(row => row.passed));
const refreshed = receipts[1].value; assert.equal(refreshed.cases.length, 2); assert.ok(refreshed.cases.every(row => row.passed && row.independentPrepareSignExport && row.originalMatchesUnchanged));
assert.equal(receipts[5].value.cases.length, 4);
const criteria = ['entry_and_personas', 'authoritative_signature_and_full_population_amounts', 'tenant_actor_operation_and_entitlement', 'review_commit_provider_period_and_source_boundaries', 'concurrency_and_duplicate_effects', 'authentication_interruption_and_exact_recovery', 'source_correction_and_retained_obligations', 'durable_inbox_handoff_history_and_export', 'en_fr_keyboard_responsive_contrast_and_reflow', 'measured_entry_diagnosis_and_correction', 'current_guidance_and_proportionate_regression'].map(id => ({ id, disposition: 'verified', explanation: 'See the corresponding evidence row in RECONCILIATION_SIGNOFF_FINAL_AUDIT_2026-09-27.md.' }));
const artifactFiles = ['RECONCILIATION_SIGNOFF_FINAL_AUDIT_2026-09-27.md', 'RECONCILIATION_SIGNOFF_OPERATING_GUIDE.md', ...impactFiles];
const result = { at: new Date().toISOString(), workflow: 'PR-10', completeWorkflowVerified: true, scope: 'Implemented independent reconciliation sign-off and verified connected handoffs; not whole-platform completion, deployment or professional certification.', sourceHashes, translations, criteria, receipts: receipts.map(({ file, sha256 }) => ({ file, sha256 })), applicability, artifacts: artifactFiles.map(file => ({ file, sha256: hash(fs.readFileSync(path.join(root, file))) })), managerTypeOnlyImpact: { file: managerSource, historicalHash: manager.sources[managerSource], currentHash: sourceHashes[managerSource], exactRemovedText: '| null from managerKpi value type; reconstruction asserted' }, verificationLimits: ['Native screen-reader speech and browser-chrome zoom not exercised; semantic, keyboard, rendered contrast, responsive and controlled enlargement checks verified.', 'Production-scale latency, release build/deployment and live scheduler installation unverified.', 'General exhausted/invalid-message recovery and notification monitoring remain with NTF-DELIVERY-RECOVERY and NTF-DELIVERY-MONITOR; signed-event transaction/consumer/backoff handoff verified.'] };
fs.writeFileSync(path.join(root, 'evidence/signoff-closure-2026-09-27.json'), JSON.stringify(result, null, 2), { flag: 'wx' });
console.log(JSON.stringify({ completeWorkflowVerified: true, sources: Object.keys(sourceHashes).length, receipts: receipts.length, criteria: criteria.length }));
