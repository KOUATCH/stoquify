// Checkpoint the verified correction while an explicitly identified wider source
// reconciliation remains stopped. Never upgrades a complete workflow status.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const root = __dirname, project = path.resolve(root, '../../..');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const reviewFile = 'evidence/operational-receipt-review-2026-09-30.json';
const review = JSON.parse(fs.readFileSync(path.join(root, reviewFile), 'utf8'));
if (!review.passed) throw new Error('Operational review must pass');
for (const row of [...review.receipts, ...review.artifacts]) if (sha(fs.readFileSync(path.join(root, row.file))) !== row.sha256) throw new Error('Review artifact changed: ' + row.file);
for (const [file, expected] of Object.entries(review.sourceHashes)) if (sha(fs.readFileSync(path.join(project, file))) !== expected) throw new Error('Verified source changed: ' + file);
const registerFile = path.join(root, 'WORKFLOW_REGISTER.json'), before = fs.readFileSync(registerFile);
const register = JSON.parse(before), cash = register.workflows.find(row => row.id === 'FA-CASH-COMMAND');
if (!cash || cash.status !== 'In progress') throw new Error('Unexpected active workflow');
const at = new Date().toISOString(), failureFile = 'evidence/operational-receipt-register-refresh-2026-09-30.json';
cash.remaining = review.remaining;
cash.closureReview.completeWorkflowVerified = false;
cash.closureReview.operationalReceiptBindingCurrent = true;
cash.closureReview.cashInventoryFreshnessBindingCurrent = false;
cash.closureReview.verifiedCriteria = [...new Set([...cash.closureReview.verifiedCriteria, ...review.verifiedSubcriteria])];
cash.evidence = [...new Set([...cash.evidence, review.report, reviewFile])];
register.updatedAt = at;
register.sourceReconciliation = { current: false, evidence: failureFile, lastSuccessfulAt: register.sourceReconciliation.lastSuccessfulAt, interpretation: 'This receipt/accounting milestone has current evidence. Wider reconciliation stopped on changed close-assurance test and owning service sources; historical workflow closures are not freshly recertified.' };
const counts = {};
for (const row of register.workflows) counts[row.status] = (counts[row.status] || 0) + 1;
register.coverage.statusCounts = Object.fromEntries(['Queued','In progress','Verification pending','Blocked—engineering','Blocked—external','Complete—verified'].map(status => [status, counts[status] || 0]));
register.coverage.discoveredWorkflows = register.workflows.length;
const after = Buffer.from(JSON.stringify(register, null, 2) + '\n');
const note = `# Current progress

Updated ${at}; HEAD 62a56036a5ac9b37236a20c9b148052199069479 on codex/migration-control-plane-release-2026-08-29. Shared changes are preserved. The receipt/accounting milestone has current source-bound evidence. **Full-register reconciliation remains stopped** at changed close-assurance service/test sources. [Exact checkpoint](evidence/operational-receipt-register-refresh-2026-09-30.json). Last successful full reconciliation: ${register.sourceReconciliation.lastSuccessfulAt}.

**Position:** ${register.workflows.length} discovered workflows; discovery incomplete; ${register.coverage.unmappedEntrySources} unmapped source entries. Recorded statuses: Queued ${counts.Queued || 0}, In progress ${counts['In progress'] || 0}, Complete—verified ${counts['Complete—verified'] || 0}; all other statuses zero. Prior closures remain historical pending complete reconciliation. No new workflow closed. Prior audit: 121 explicitly unvisited and 141 with some runtime evidence; these are not completion counts.

| Priority | Workflow and outcome | Status | Delivered and verified | Remaining closure criteria | Owner | Next action |
|---|---|---|---|---|---|---|
| Primary | FA-CASH-COMMAND: reliable finance actions | In progress | Source-bound receipt/invoice/return accounting and recovery | Fractional/legacy treatment, close/payroll, accessibility, latency | Engineering/accounting | Correct cumulative fractional allocation |
| Supporting contract | Receipt/invoice accounting | In progress | Original dates/currency; atomic recovery; funded credit; EN/FR retries | Fractional costs, authentic legacy evidence and full connected lifecycle | Engineering | Extend the stock-value allocation contract |
| Next 1 | PR-17: reconciliation exceptions | Queued | Prior source/correction handoffs | Financial/legacy treatment and recovery | Engineering | Reconcile with original scope |
| Next 2 | ID-04: invitation redemption | Queued | Prior authority/recipient evidence | Accessibility, onboarding, transport | Identity owner | Verify transport boundary |
| Next 3 | MC-11: permitted workspace | Queued | Selected route/action boundaries | Cross-domain transport and scanner gaps | Engineering | Preserve guards and improve diagnostics |

**Since the previous report:** Actual receipt accounting now freezes whole source/date/currency and prevents duplicate invoice recognition. Verified returns release accrual or claims. Finance-authorized recovery posts original receipt and pending returns atomically without repeating stock; supplier credit requires a funded claim. Tracking changes invalidate previews, lock order is consistent, retained currency is displayed and invoice references wrap. Passed: 407 tests/24 suites, lint, TypeScript, 14 owned-database scenarios and six English desktop/French mobile application journeys. Both recovery journeys survived a lost response and reload with exact retry. Checked sources stayed stable and outside-fixture records were unchanged. [Implementation, guidance and evidence](${review.report}).

**Failures and remaining work:** Initial pending-return metadata handling was corrected and rerun. The first browser attempt failed on overlong synthetic IDs and a local server restart; its record is retained. Exact close-pack drift review passed, but full reconciliation next stopped on close-assurance.service.test.ts and its changed owning service. That lifecycle delta still needs current review evidence. Fractional returns that round independently to zero remain honestly review-blocked; coordinated cumulative valuation is still required. Authentic legacy evidence, setup applicability, close proof, CNPS/IRPP expert provenance, native accessibility and representative latency remain open. No migration, deployment or real payment occurred. All 17 families remain in the [register](WORKFLOW_REGISTER.json). ETA is not reliable while discovery and full validation remain incomplete.
`;
if (note.trim().split(/\s+/).length > 700) throw new Error('Progress exceeds 700 words');
const receipt = { at, scope: 'Verified operational receipt correction; wider historical reconciliation stopped', fullReconciliationPassed: false, failedSource: 'services/accounting/__tests__/close-assurance.service.test.ts', relatedUnreviewedSources: Object.fromEntries(['services/accounting/__tests__/close-assurance.service.test.ts','services/accounting/close-assurance.service.ts'].map(file => [file,sha(fs.readFileSync(path.join(project,file)))])), error: 'Accounting setup trust source changed', registerBeforeSha256: sha(before), registerAfterSha256: sha(after), review: { file: reviewFile, sha256: sha(fs.readFileSync(path.join(root, reviewFile))) }, sourceBindingsVerified: true, workflowClosuresAdded: 0 };
fs.writeFileSync(path.join(root, failureFile), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
fs.writeFileSync(registerFile, after);
fs.writeFileSync(path.join(root, 'CURRENT_PROGRESS.md'), note);
console.log(JSON.stringify({ checkpoint: failureFile, registerSha256: sha(after), progressWords: note.trim().split(/\s+/).length, counts }));
