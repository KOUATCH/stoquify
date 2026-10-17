// One-shot, guarded publication of source-bound evidence and current summaries.
// No application, database, migration, seed or deployment mutations.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const run = path.resolve(__dirname, '..'), root = path.resolve(run, '../../..');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const read = file => fs.readFileSync(path.join(run, file));
const predecessor = '572b630719f6244606f6b97df47afca93057730a1a8f2c89db9d2313a6a6a868';
const predecessorProgress = '6c5952d04a6139e87c731212d89ca98aa369c901fc3fbf7162e70216775067ec';
if (process.argv[2] !== '--run') { console.log('Prepared only. --run requires the final reviewed purchase receipt basename.'); process.exit(0); }
assert.match(process.argv[3] || '', /^purchase-close-recovery-runtime-[a-f0-9-]+\.json$/);
const source = {}, receipts = {}, artifacts = {};
function verify(file, requirePass = true) {
  const bytes = read(file), result = JSON.parse(bytes); receipts[file] = hash(bytes);
  if (requirePass) assert.equal(result.passed, true, file);
  assert.equal(result.sourceStable, true, file);
  const before = result.sourcesBefore || result.sourceBefore, after = result.sourcesAfter || result.sourceAfter;
  assert.deepEqual(before, after, file);
  for (const [relative, expected] of Object.entries(after)) {
    assert.equal(hash(fs.readFileSync(path.join(root, relative))), expected, relative);
    if (source[relative]) assert.equal(source[relative], expected, relative);
    source[relative] = expected;
  }
  return result;
}
const tests = verify('evidence/sign-lease-jest-38631a21-0632-4199-ab18-243719ff5639.json');
assert.deepEqual(tests.summary, { passed: 78, failed: 0, pending: 0, suites: 5, failedSuites: 0 });
verify('evidence/sign-lease-typecheck-35d5d4ec-a39f-4f0e-affa-1aa7a1225cf5.json');
verify('evidence/sign-lease-lint-3557b2ad-7c20-45eb-ab68-f72a78d1b166.json');
const acceptance = verify('lanes/environment/sign-lease-acceptance-463bc87b-5b9b-4feb-b4e7-46086a5109dc.json');
assert.equal(acceptance.outsideUnchanged, true); assert.deepEqual(acceptance.cases.map(row => [row.mode, row.status]), [['success', 'passed'], ['failure', 'passed'], ['publication', 'passed']]);
verify('lanes/environment/sign-notification-10d17a81-27a3-4d96-a2c9-a998012ee8df.json');
const purchase = verify('lanes/environment/' + process.argv[3], false);
assert.equal(purchase.outsideUnchanged, true); assert.equal(purchase.checks.length, 4);
const purchasePassCount = purchase.checks.filter(row => row.status === 'passed').length;
if (purchase.passed) assert.ok(purchase.checks.every(row => row.status === 'passed'));
let paymentBoundary;
if (process.argv[4]) {
  assert.match(process.argv[4], /^purchase-payment-close-boundary-[a-f0-9-]+\.json$/);
  paymentBoundary = verify('lanes/environment/' + process.argv[4]);
  assert.equal(paymentBoundary.outsideUnchanged, true);
  assert.equal(paymentBoundary.positiveRecoveryEstablished, false);
  assert.equal(paymentBoundary.checks.length, 2);
  assert.ok(paymentBoundary.checks.every(check => check.status === 'passed'));
  const documents = paymentBoundary.checks[0].result.documents;
  assert.equal(documents.length, 2);
  for (const document of documents) {
    const relative = path.relative(run, document.file).replaceAll('\\', '/');
    assert.match(relative, /^lanes\/environment\/owned-purchase-payment-(request|execution)-[a-f0-9-]+\.json$/);
    assert.equal(hash(read(relative)), document.hash); artifacts[relative] = document.hash;
  }
}
const negativeFile = 'lanes/environment/sign-lease-reclaim-baseline-2586c14a-b971-42c4-b25f-a7d07c49c77b.json';
const baselineBytes = read(negativeFile), baseline = JSON.parse(baselineBytes);
assert.equal(hash(baselineBytes), '002a03e213efd84510ac4975c2b66e59914a7ceee1b85d7d6731ef7645c4d257');
assert.equal(baseline.baselineProofComplete, true); assert.equal(baseline.safetyContractSatisfied, false); receipts[negativeFile] = hash(baselineBytes);
const reports = ['SIGN_LEASE_CORRECTION_2026-10-01.md', 'SIGN_LEASE_REVIEW_2026-10-01.md', 'PURCHASE_CLOSE_RECOVERY_2026-10-01.md', 'PURCHASE_CLOSE_RECOVERY_REVIEW_2026-10-01.md'];
const reportHashes = Object.fromEntries(reports.map(file => [file, hash(read(file))]));
assert.equal(reportHashes[reports[1]], 'acaf589b19faf0e03e1e27f1b9abedb47c5e7b3df3e0b4c2c12ae4cf592d157e');
const registerBytes = read('WORKFLOW_REGISTER.json'), progressBytes = read('CURRENT_PROGRESS.md');
assert.equal(hash(registerBytes), predecessor); assert.equal(hash(progressBytes), predecessorProgress);
const before = JSON.parse(registerBytes), next = structuredClone(before), at = new Date().toISOString();
assert.equal(before.workflows.length, 270); assert.equal(before.families.length, 17);
const checkpoint = 'evidence/sign-purchase-checkpoint-' + crypto.randomUUID() + '.json';
const targets = ['PR-10', 'FA-CASH-COMMAND', 'FA-CLOSE-PACK', 'FA-ASYNC-EXPORT', 'PA-023', 'PA-031'];
const signing = next.workflows.find(row => row.id === 'PR-10');
assert.equal(signing.status, 'Complete—verified'); assert.deepEqual(signing.remaining, []);
signing.implementationStatus = 'Exact outbox attempt/timestamp ownership fences stale success and failure; immutable signed-event validation and inbox deduplication are preserved.';
signing.runtimeStatus = 'Reopened same-worker-ID lease criterion corrected and reverified: 78 focused tests, typecheck/lint, three actual lease interleavings and refreshed competing-worker/lost-acknowledgement recovery. Unchanged signing/UI evidence reused by explicit dependency-impact review.';
signing.evidence.push(reports[0], reports[1], checkpoint);
signing.closureReview.latestScopedReview = checkpoint;
signing.closureReview.leaseRevalidation = { at, reopenedBy: negativeFile, reason: 'Obsolete attempt overwrote a newer same-worker-ID lease and audit.', resolved: true, result: 'Complete—verified within original implemented signing/recovery/certificate/inbox scope', evidence: Object.keys(receipts).filter(file => !file.includes('purchase')), impactReview: reports[1] };
signing.closureReview.verifiedCriteria.push('same_worker_id_exact_attempt_and_timestamp_terminal_fencing', 'historical_publication_after_reclaim_preserves_new_lease', 'real_current_owner_backoff_recovery_after_stale_handler_failure');
signing.closureReview.note = 'Prior lease criterion reopened by actual negative evidence, repaired and reverified against current sources. Current impact review explains the six changed original dependencies; old aggregate source hash is not claimed current. Existing original limitations remain. This is restored closure, not a new workflow or net increase.';
const purchaseSummary = purchase.passed
  ? 'Actual credit then return reversals invalidate retained Close and recover current Cash/Close proof; both no-prior-run publication orderings and late invalidation rollback/retry/replay pass on the owned database. Original artifacts and observed outside-fixture state are preserved.'
  : 'Purchase recovery proof remains incomplete: ' + purchase.checks.filter(row => row.status === 'passed').length + ' of four bounded checks passed, with failed criteria retained and unchanged outside-fixture state. Unpaid obligations prevent T4; current supplier release lacks a supported pending-payment reconciliation admission handoff. No successful certification recovery is inferred.';
for (const row of next.workflows.filter(row => ['FA-CASH-COMMAND', 'FA-CLOSE-PACK'].includes(row.id))) {
  assert.equal(row.status, 'In progress');
  row.evidence.push(...reports, checkpoint);
  row.runtimeStatus = 'Signed-notification lease recovery is verified; ' + purchaseSummary + ' Full Cash/Close closure remains open.';
  row.closureReview.latestScopedReview = checkpoint;
  row.closureReview.signedNotificationLeaseVerified = true;
  row.closureReview.purchaseCloseRecoveryVerified = purchase.passed === true;
  row.closureReview.purchasePublicationChecks = purchase.checks.map(check => ({ name: check.name, status: check.status }));
  row.closureReview.verifiedCriteria.push('Signed-notification stale claim success/failure and after-read publication preserve exact current lease; real current-owner delivery and lost-acknowledgement recovery verified.');
  if (purchase.passed) {
    row.closureReview.verifiedCriteria.push(purchaseSummary);
    row.remaining = row.remaining.map(value => value.replace('purchase-specific publication/recovery, interrupted processing and outbox delivery remain open.', 'remaining purchase transport/authority, interrupted processing and other outbox delivery remain open. Bounded purchase source reversal, current-period publication and retained Close/Cash recovery are verified; see PURCHASE_CLOSE_RECOVERY_2026-10-01.md.'));
  }
  if (!purchase.passed) row.remaining.push('Complete the source-owned supplier-payment to reconciliation admission, match/exception resolution and Close recovery handoff. Actual supplier release creates provider-less PENDING evidence that current provider-scoped confirmed-payment matching cannot adopt. This is an engineering implementation gap, not an approval record the fixture can invent. See PURCHASE_CLOSE_RECOVERY_2026-10-01.md.');
  row.remaining.push('Explicit source-review follow-ons: draft-created preflight/snapshot freshness; legacy foreign-tenant role contamination and session revocation after final manual-journal auth check; signing versus new Close-assessment publication remains unverified. Ordinary organization-scoped role writers already serialize through module admission. See SIGN_LEASE_CORRECTION_2026-10-01.md and its independent review.');
}
const exporting = next.workflows.find(row => row.id === 'FA-ASYNC-EXPORT');
assert.equal(exporting.status, 'Queued');
exporting.remaining.push('Source review: artifact completion and generic outbox acknowledgement commit separately. Retry always rebuilds the artifact; a changed key/hash can reject an already-completed export. Exact terminal lease fencing does not resolve artifact replay. No new runtime proof or production storage/scheduler handoff is claimed.');
exporting.evidence.push(reports[0], checkpoint);
for (const row of next.workflows.filter(row => ['PA-023', 'PA-031'].includes(row.id))) {
  assert.equal(row.status, 'Queued');
  row.evidence.push(reports[2], reports[3], checkpoint);
  row.remaining.push('The supplier-payment reconciliation handoff remains unimplemented: recorded execution creates a provider-less PENDING payment and an OPEN missing-statement exception without original suspense/run lineage. Existing consumers cannot adopt these records. Implement source-owned evidence admission, exact match/exception resolution and downstream Close recovery without fabricating settlement or repeating the ledger effect. See PURCHASE_CLOSE_RECOVERY_2026-10-01.md.');
  if (paymentBoundary) row.runtimeStatus = 'Scoped actual independently approved execution and financial conservation verified; current unresolved reconciliation and denied Close certification reproduced. This is adverse-boundary evidence, not successful settlement/recovery or full workflow closure.';
}
next.updatedAt = at;
next.executionPolicy.note = 'Cash stays primary and Close supporting. A confirmed defect briefly prioritized PR-10 delivery repair; its original closure is restored with current evidence, not counted as a new workflow. ' + purchaseSummary;
const counts = Object.fromEntries(Object.keys(before.coverage.statusCounts).map(status => [status, next.workflows.filter(row => row.status === status).length]));
next.coverage.statusCounts = counts; next.coverage.completeWorkflowsVerified = counts['Complete—verified'];
assert.deepEqual(before.families, next.families); assert.deepEqual(before.workflows.map(row => row.status), next.workflows.map(row => row.status));
assert.deepEqual(before.workflows.filter(row => !targets.includes(row.id)), next.workflows.filter(row => !targets.includes(row.id)));
const newRegister = Buffer.from(JSON.stringify(next, null, 2) + '\n'), registerHash = hash(newRegister);
const progress = `# Current progress

Updated ${at}; HEAD 62a56036a5ac9b37236a20c9b148052199069479, branch codex/migration-control-plane-release-2026-08-29. Shared changes preserved. Register SHA256: ${registerHash}.

**Position:** 270 workflows, 17 families, 191 unmapped entries; discovery incomplete. Queued ${counts.Queued}, In progress ${counts['In progress']}, Complete—verified ${counts['Complete—verified']}; other statuses zero. PR-10's lease criterion was reopened and reverified after a newly reproduced delivery defect; its register status is preserved with updated evidence. No new workflow closure or added workflow; other historical closures were not broadly revalidated.

| Priority | Workflow and outcome | Status | Delivered/verified | Remaining closure | Owner/blocker | Next action |
|---|---|---|---|---|---|---|
| Primary | FA-CASH-COMMAND: truthful financial actions | In progress | Journal recovery and signed-notification ownership | All producers, persisted authority and full lifecycle | Engineering; period scope needs approval | Complete remaining source/authority criteria |
| Supporting | FA-CLOSE-PACK: reliable retained evidence | In progress | ${purchase.passed ? 'Purchase reversal, retained history and actual recovery' : purchasePassCount + '/4 bounded checks passed; recovery remains open'} | Global period scope, remaining producers and delivery | Engineering; supplier-payment handoff and period scope | ${purchase.passed ? 'Verify next participating producer' : 'Implement supplier-payment reconciliation admission'} |
| Next 1 | PR-17: reconciliation exceptions | Queued | Prior scoped handoffs | Financial/legacy treatment and recovery | Engineering | Reconcile original closure scope |
| Next 2 | ID-04: invitation redemption | Queued | Prior authority/recipient evidence | Accessibility, onboarding and transport | Identity owner | Verify transport boundary |
| Next 3 | MC-11: permitted workspace | Queued | Selected route/action boundaries | Cross-domain transport/scanner gaps | Engineering | Preserve guards; improve diagnostics |

**Since the previous report:** An old worker could mark a newer same-name claim sent or failed. Terminal updates now bind the exact attempt and timestamp; obsolete workers leave current state and audit untouched. PR-10's repaired criterion is restored using current delivery evidence plus explicit impact review of retained signing evidence. No new financial signature or user approval is inferred. [Correction and operating guidance](SIGN_LEASE_CORRECTION_2026-10-01.md); [independent review](SIGN_LEASE_REVIEW_2026-10-01.md).

**Verification:** 78 tests/five suites, full no-emit TypeScript and five-file lint passed. Three real database lease interleavings and refreshed competing-worker/lost-acknowledgement recovery passed. Signed and financial records stayed unchanged. At-least-once historical inbox publication is distinguished from ownership of terminal updates; this is not external delivery or production-capacity proof.

**Purchase/Close handoff:** ${purchaseSummary} Failed attempts are retained; synthetic setup normalization changes no application validator. ${paymentBoundary ? 'A separate actual-payment boundary proof records the resulting refusal without clearing its control.' : ''} [Detailed result](PURCHASE_CLOSE_RECOVERY_2026-10-01.md); [review](PURCHASE_CLOSE_RECOVERY_REVIEW_2026-10-01.md).

**Remaining:** Earlier-period Close invalidation still has two retained scope failures. Automatic approval review rejected the all-period manual-posting helper for contention; it remains unapplied pending the existing explicit approval request. Draft freshness, manual session/legacy-role authority, signing versus new Close publication, other producers, interrupted delivery, country/payroll evidence and complete accessibility/capacity remain open. Finance-export artifact replay is recorded in its existing queued row. [Exact scope proposal](MANUAL_POSTING_SCOPE_REVIEW_2026-10-01.md).

The other 264 workflow rows and all 17 families remain intact in the [register](WORKFLOW_REGISTER.json): identity/access/modules, financial/ledger/close, sales/POS, inventory/purchasing, HRIS, compliance/evidence/reporting, notifications/integrations and AI. The new handoff finding belongs to existing PA-023/PA-031 as well as Cash/Close. No migration, reset, deployment, live activation, real payment, external message or X1 clearance occurred. Full goal remains active; ETA is not reliable.
`;
assert.ok(progress.split(/\s+/).length <= 700);
const stem = path.join(run, checkpoint.replace(/\.json$/, ''));
fs.writeFileSync(stem + '-register-before.json', registerBytes, { flag: 'wx' }); fs.writeFileSync(stem + '-progress-before.md', progressBytes, { flag: 'wx' });
const result = { at, complete: false, predecessor, predecessorProgress, registerHash, progressHash: hash(progress), source, receipts, artifacts, reports: reportHashes, counts, unchangedOtherRows: 264, purchasePassed: purchase.passed, publicationReceipt: checkpoint.replace(/\.json$/, '-publication.json'), limitation: 'Evidence prepared before publication; consult paired publication receipt. PR-10 closure restored with limits; full Cash/Close and overall goal remain active.' };
fs.writeFileSync(path.join(run, checkpoint), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
const replacements = [ { file: 'WORKFLOW_REGISTER.json', before: registerBytes, oldHash: predecessor, bytes: newRegister, newHash: registerHash }, { file: 'CURRENT_PROGRESS.md', before: progressBytes, oldHash: predecessorProgress, bytes: Buffer.from(progress), newHash: result.progressHash } ];
for (const [index, item] of replacements.entries()) { item.temporary = stem + '-replacement-' + index + '.tmp'; fs.writeFileSync(item.temporary, item.bytes, { flag: 'wx' }); assert.equal(hash(fs.readFileSync(item.temporary)), item.newHash); }
const replaced = [];
try {
  for (const [relative, expected] of Object.entries(source)) assert.equal(hash(fs.readFileSync(path.join(root, relative))), expected, relative);
  for (const [file, expected] of Object.entries(reportHashes)) assert.equal(hash(read(file)), expected, file);
  for (const [file, expected] of Object.entries(receipts)) assert.equal(hash(read(file)), expected, file);
  for (const [file, expected] of Object.entries(artifacts)) assert.equal(hash(read(file)), expected, file);
  for (const item of replacements) {
    for (const other of replacements) assert.equal(hash(read(other.file)), replaced.includes(other) ? other.newHash : other.oldHash, 'Concurrent edit: ' + other.file);
    fs.renameSync(item.temporary, path.join(run, item.file)); replaced.push(item); assert.equal(hash(read(item.file)), item.newHash);
  }
  fs.writeFileSync(path.join(run, result.publicationReceipt), JSON.stringify({ at: new Date().toISOString(), published: true, checkpoint, registerHash, progressHash: result.progressHash }, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ checkpoint, publicationReceipt: result.publicationReceipt, registerHash, words: progress.split(/\s+/).length, counts, purchasePassed: purchase.passed, complete: false }));
} catch (error) {
  const recovery = [];
  for (const [index, item] of [...replaced].reverse().entries()) {
    try { if (hash(read(item.file)) !== item.newHash) { recovery.push({ file: item.file, restored: false, reason: 'Concurrent content preserved' }); continue; }
      const temporary = stem + '-restore-' + index + '.tmp'; fs.writeFileSync(temporary, item.before, { flag: 'wx' }); assert.equal(hash(read(item.file)), item.newHash); fs.renameSync(temporary, path.join(run, item.file)); assert.equal(hash(read(item.file)), item.oldHash); recovery.push({ file: item.file, restored: true });
    } catch (restoreError) { recovery.push({ file: item.file, restored: false, reason: restoreError.message }); }
  }
  fs.writeFileSync(stem + '-publication-failure.json', JSON.stringify({ at: new Date().toISOString(), published: false, error: error.message, recovery }, null, 2) + '\n', { flag: 'wx' }); throw error;
}
