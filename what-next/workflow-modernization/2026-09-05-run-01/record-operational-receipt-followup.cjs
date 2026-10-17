// Record the bounded reconciliation retry without claiming full workflow closure.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const root = __dirname, project = path.resolve(root, '../../..');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
function bound(file, expected) {
  const bytes = fs.readFileSync(path.join(root, file));
  if (sha(bytes) !== expected) throw new Error('Evidence changed: ' + file);
  return JSON.parse(bytes);
}
const reviewFile = 'evidence/operational-receipt-review-2026-09-30.json';
const review = bound(reviewFile, 'cd6fee1cbade825384d39c33ed65765176b0538811de0259d9a35a9faf9996e0');
const closeFile = 'evidence/close-assessment-drift-111c228a-7c48-42b8-9600-65a360dc501d-review.json';
const close = bound(closeFile, '0159b1b39f27558821b6784415a76563bb98393453face9941cee9a205ebf1c9');
for (const receipt of [review, close]) {
  if (!receipt.passed) throw new Error('Review did not pass');
  for (const row of [...receipt.receipts, ...receipt.artifacts]) if (sha(fs.readFileSync(path.join(root, row.file))) !== row.sha256) throw new Error('Artifact changed: ' + row.file);
  for (const [file, expected] of Object.entries(receipt.sourceHashes)) if (sha(fs.readFileSync(path.join(project, file))) !== expected) throw new Error('Source changed: ' + file);
}
const reconcilerHash = sha(fs.readFileSync(path.join(root, 'reconcile-current-progress.cjs')));
if (reconcilerHash !== '19c49b999e564244c23b9a04d192e252aa208f67a100a0887d70b3b55cb09e42') throw new Error('Reconciler changed');
const failedSource = 'services/accounting/posting.service.ts';
const observed = sha(fs.readFileSync(path.join(project, failedSource)));
if (observed !== '458ba5848af4fde0f0fc2731261a54bf20f10302b44dc201a2b529f81e2014e2') throw new Error('Observed posting source changed');
const registerPath = path.join(root, 'WORKFLOW_REGISTER.json'), before = fs.readFileSync(registerPath);
if (sha(before) !== '690b592c2d655d5e6be25df2ca56d47fcd3287738ff5f76f84b003fb2edba8f2') throw new Error('Register changed');
const register = JSON.parse(before), cash = register.workflows.find(row => row.id === 'FA-CASH-COMMAND');
const at = new Date().toISOString(), file = 'evidence/operational-receipt-register-followup-2026-09-30.json';
register.updatedAt = at;
register.sourceReconciliation = { current: false, evidence: file, lastSuccessfulAt: register.sourceReconciliation.lastSuccessfulAt, interpretation: 'Operational receipt evidence and exact close-assessment source review are current. Full reconciliation stopped at the release-readiness posting source mismatch; historical closures are not freshly recertified.' };
register.executionPolicy.supportingDependency = 'receipt/invoice accounting: fractional stock valuation and authentic legacy evidence';
cash.closureReview.releaseReadinessBindingCurrent = false;
cash.closureReview.settlementLinkageBindingCurrent = false;
cash.closureReview.cashInventoryFreshnessBindingCurrent = true;
cash.closureReview.closeAssessmentBindingCurrent = true;
cash.closureReview.completeWorkflowVerified = false;
cash.evidence = [...new Set([...cash.evidence, closeFile, file])];
cash.remaining = [...new Set([...cash.remaining, 'Revalidate older release-readiness evidence against the current accounting posting service. Exact close-assessment source review passed, but real database race and interrupted-process recovery remain unverified.'])];
const invoice = register.workflows.find(row => row.id === 'PA-019');
const oldGap = 'Verified receipt-accrual invoice allocation and frozen recovery are delivered; production receipt recognition, returned/reversed allocation release and legacy cutover remain open. See INVOICE_RECEIPT_HANDOFF_2026-09-30.md for the bounded proof and limitations.';
invoice.remaining = invoice.remaining.filter(value => value !== oldGap);
invoice.remaining = [...new Set([...invoice.remaining, 'Source-bound receipt recognition, verified returns/reversals and atomic accounting recovery are delivered. Cumulative fractional valuation, authentic legacy evidence and the complete connected purchasing lifecycle remain open. See OPERATIONAL_RECEIPT_ACCOUNTING_2026-09-30.md.'])];
invoice.evidence = [...new Set([...invoice.evidence, reviewFile, review.report])];
const progressPath = path.join(root, 'CURRENT_PROGRESS.md'), progressBefore = fs.readFileSync(progressPath, 'utf8');
let progress = progressBefore.replace(/^Updated [^;]+;/m, 'Updated ' + at + ';');
function replaceOnce(beforeText, afterText) {
  if (progress.split(beforeText).length !== 2) throw new Error('Unexpected progress content');
  progress = progress.replace(beforeText, afterText);
}
replaceOnce('**Full-register reconciliation remains stopped** at changed close-assurance service/test sources. [Exact checkpoint](evidence/operational-receipt-register-refresh-2026-09-30.json).', '**Full-register reconciliation remains stopped** at a posting-service mismatch in older release-readiness evidence. [Exact checkpoint](' + file + ').');
replaceOnce('Exact close-pack drift review passed, but full reconciliation next stopped on close-assurance.service.test.ts and its changed owning service. That lifecycle delta still needs current review evidence.', 'Exact close-pack and close-assessment source reviews passed; the latter passed 76 focused tests. The bounded retry then stopped at accounting/posting.service.ts in older release-readiness evidence. That comparison still needs review; no new defect is inferred from a hash mismatch. Real close-assessment database races and crash recovery remain unverified.');
if (progress.trim().split(/\s+/).length > 700) throw new Error('Progress exceeds 700 words');
const after = Buffer.from(JSON.stringify(register, null, 2) + '\n');
const record = { at, fullReconciliationPassed: false, error: 'Release readiness source changed; review required', failedSource, expected: 'b75fb9e85657b6ee009be86055b96d53b1eb24f17fa6c6b7923167d26baa2f94', observed, reconcilerSha256: reconcilerHash, commandExitCode: 1, priorCheckpoint: 'evidence/operational-receipt-register-refresh-2026-09-30.json', reviewedCloseDelta: { file: closeFile, sha256: sha(fs.readFileSync(path.join(root, closeFile))), tests: 76, limitation: 'Mocked suite; no PostgreSQL race or crash-recovery proof' }, operationalReview: { file: reviewFile, sha256: sha(fs.readFileSync(path.join(root, reviewFile))) }, registerBeforeSha256: sha(before), registerAfterSha256: sha(after), progressBeforeSha256: sha(progressBefore), progressAfterSha256: sha(progress), workflowClosuresAdded: 0 };
fs.writeFileSync(path.join(root, file), JSON.stringify(record, null, 2) + '\n', { flag: 'wx' });
fs.writeFileSync(registerPath, after);
fs.writeFileSync(progressPath, progress);
console.log(JSON.stringify({ checkpoint: file, registerSha256: sha(after), progressWords: progress.trim().split(/\s+/).length, statusCounts: register.coverage.statusCounts }));
