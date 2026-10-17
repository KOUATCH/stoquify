// Source-only review: reads exact retained predecessors and current source.
// Writes one new evidence artifact; does not run tests or change application code.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { diffLines } = require('diff');
const root = process.cwd();
const run = 'what-next/workflow-modernization/2026-09-05-run-01';
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const read = file => fs.readFileSync(path.join(root, file));
const json = file => JSON.parse(read(file).toString('utf8').replace(/^\uFEFF/, ''));
const artifact = name => `${run}/evidence/${name}`;
const relativeRun = file => file.replaceAll('\\', '/').replace(`${run}/`, '');
const inputBindings = new Map();
function bind(file) { const sha256 = hash(read(file)); inputBindings.set(file, sha256); return { file: relativeRun(file), sha256 }; }
const baselineRows = [];
function embedded(name) {
  const file = artifact(name), binding = bind(file), data = json(file);
  const records = Array.isArray(data) ? data : data.files;
  return records.map((record, index) => {
    const content = Buffer.from(record.content, 'utf8');
    assert.equal(hash(content), record.sha256, `Embedded predecessor hash mismatch: ${name}:${index}`);
    return { file: record.file ?? record.path, content, before: record.sha256, baseline: { ...binding, recordPointer: `${Array.isArray(data) ? '' : '/files'}/${index}`, recordPathField: record.file ? 'file' : 'path', contentField: 'content', declaredHashField: 'sha256' }, predecessorContentVerified: true };
  });
}
baselineRows.push(...embedded('receipt-kernel-before-2026-09-30.json'));
const manifestFile = artifact('receipt-recognition-before-2026-09-30/manifest.json');
const manifestBinding = bind(manifestFile);
for (const [index, record] of json(manifestFile).entries()) {
  const snapshotFile = record.snapshot.replaceAll('\\', '/'), content = read(snapshotFile);
  assert.equal(hash(content), record.sha256, `Raw predecessor hash mismatch: ${record.path}`);
  baselineRows.push({ file: record.path, content, before: record.sha256, baseline: { ...manifestBinding, recordPointer: `/${index}`, recordPathField: 'path', declaredHashField: 'sha256' }, snapshot: bind(snapshotFile), predecessorContentVerified: true });
}
const receivingTest = 'services/purchase-order/__tests__/purchase-order-receive-batch.service.test.ts';
const receivingTestSnapshot = artifact('receipt-recognition-before-2026-09-30/services__purchase-order____tests____purchase-order-receive-batch.service.test.ts');
assert.equal(hash(read(receivingTestSnapshot)), 'e3938b5607b1b0174e8e0c7fc76c57247bca07ae97ce2cd0c9607364f8420af1');
baselineRows.push({ file: receivingTest, before: hash(read(receivingTestSnapshot)), content: read(receivingTestSnapshot), snapshot: bind(receivingTestSnapshot), predecessorContentVerified: true });
baselineRows.push(...embedded('receipt-ledger-recovery-before-fd431956-9d6d-41ec-803f-bc8ee4b1fc3a.json'));
baselineRows.push(...embedded('receipt-return-recognition-before-f9332797-759d-4761-9aed-9e7b76f91047.json'));
baselineRows.push(...embedded('invoice-dialog-reflow-before-72eb831f-68b3-4df9-aaa2-1ca33b944b64.json'));

const impact = {
  'services/purchasing/ap-control.service.ts': 'Extends journal references with APGR. GOODS_RECEIPT rules must resolve to exact positive INVENTORY debit and GRNI credit; PURCHASE_RETURN rules must match verified inventory, claim and accrual release amounts. Unproven return recognition retains a source-review blocker before rule evaluation. Other source types keep their existing dispatch.',
  'services/purchasing/__tests__/ap-control.service.test.ts': 'Adds source-review and actual resolved-account/amount guard cases for receipt and return posting, including explicit wrong accounts. Existing test bodies remain in the retained predecessor comparison.',
  'services/purchase-order/purchase-order.service.ts': 'Receiving and held acceptance take supplier before order locks, persist all receipt lines before one immutable recognition manifest, apply stock only to its frozen tracked partition with shared hash and acceptance date, and invoke one whole-receipt accounting post. Held rejection and exact receiving replay do not manufacture recognition.',
  'services/inventory/inventory-stock-event.service.ts': 'Adds optional canonical receipt document hash and a zero-value recognition exemption. The exemption is accepted only after matching the server-owned manifest, exact line quantities/cost/tracking, actor, location and effective date. Existing replay repair was already present in the chosen operational predecessor and is not attributed to this turn.',
  'services/purchase-order/purchase-receipt-accounting-evidence.ts': 'Adds an opt-in exact GRNI credit/account-effect check for marked receipt recognition. Legacy callers retain the existing default evidence contract and selector shape.',
  'services/purchase-order/purchase-receiving-workbench.service.ts': 'Reads marked source, stock and journal proof through canonical readers, distinguishes NOT_REQUIRED and blocked/unverified states, propagates database failures, and derives accounting review authority. Preview revision now binds trackInventory; confirmation locks supplier before order. History currency comes from verified manifest or retained verified decision, otherwise remains unknown.',
  'services/purchasing/invoice-receipt-recognition.ts': 'Marked pending/unverified receipts cannot fall back to legacy invoice recognition. Positive tracked lines consume verified receipt accrual once; mixed nonstock lines retain invoice recognition. Verified return allocations reduce remaining quantity and GRNI cost, bind preview evidence, and preserve approved allocation history. Unmarked legacy proof generation is retained.',
  'services/purchase-order/__tests__/purchase-receipt-accounting-evidence.test.ts': 'Adds a discriminating marked-receipt case requiring the full GRNI credit and rejecting substitution with AP.',
  'services/inventory/__tests__/inventory-stock-event.service.test.ts': 'Adds source-bound zero-value receipt success and positive-cost substitution denial cases. Earlier replay cases are preserved from the operational baseline.',
  'services/purchasing/__tests__/invoice-receipt-recognition.test.ts': 'Adds marked failed-receipt legacy-fallback denial, mixed stock/nonstock handling and return-three/invoice-seven capacity cases; legacy tests use a null marked source by default.',
  'services/purchase-order/__tests__/purchase-order-receive-batch.service.test.ts': 'Supplies canonical source/posting mocks to isolate receipt orchestration and verifies all lines precede manifest capture, shared source hash/date reach stock, and one receipt accounting call follows stock. Existing receiving and held-inspection cases remain.',
  'actions/purchaseOrderWorkflow/purchase-receiving.actions.ts': 'Adds receipt accounting preview/submit actions with server-derived tenant/session identity and both order-read and invoice-post permissions. Revalidation follows the committed durable decision; cache refresh failure does not erase success.',
  'components/purchase-orders/PurchaseReceivingWorkbench.tsx': 'Exposes the authorized source-bound accounting recovery dialog on recorded receipt rows. Each history amount now uses its retained row currency; missing currency is not replaced with current organization currency.',
  'services/purchase-order/purchase-receiving-contracts.ts': 'Adds not_required accounting state, role-appropriate canReviewAccounting, and nullable retained history-row currency. Durable decision schema otherwise keeps the existing shape.',
  'services/purchase-order/purchase-receiving-authority.ts': 'Adds canReviewAccounting from the existing purchasing.ap.invoice.post permission after unchanged tenant/module/user/session validation. Receipt-recovery submission independently enforces its full authority contract.',
  'messages/en.json': 'Adds English receipt accounting recovery controls, source/rule/period blockers, return recovery details and honest not-required/verified-posted status text within purchaseReceiving.',
  'messages/fr.json': 'Adds the matching French receipt accounting recovery controls, blockers, return details and honest accounting states within purchaseReceiving.',
  'services/purchasing/purchase-return-credit.service.ts': 'Binds physical return/reversal to verified source allocation and supplier-first locking, tenant currency and source-date chronology. Persists immutable return proof and supports accounting-only recovery without replaying stock or rewriting original headers. Supplier credits require verified funded claim evidence; reversals use the actual retained receipt location and verified current journal.',
  'services/purchasing/__tests__/purchase-return-credit.service.test.ts': 'Extends return fixtures and assertions for tenant currency/source proof and adds accounting-only recovery, original date, no-stock replay and exact reversal behavior.',
  'components/purchasing/InvoicePreparationWorkbench.tsx': 'Adds min-width and overflow wrapping constraints to the existing themed review dialog so long references and narrow French content can reflow. No action, state, posting or permission behavior changes.',
  'components/purchasing/InvoiceCorrectionWorkbench.tsx': 'Adds the same bounded dialog reflow constraints while preserving reduced-motion, focus-return and pending-command behavior. No accounting mutation changes.',
};
function changedJsonPaths(before, after, prefix = '') {
  if (JSON.stringify(before) === JSON.stringify(after)) return [];
  if (!before || !after || typeof before !== 'object' || typeof after !== 'object' || Array.isArray(before) || Array.isArray(after)) return [prefix];
  return [...new Set([...Object.keys(before), ...Object.keys(after)])].sort().flatMap(key => changedJsonPaths(before[key], after[key], prefix ? `${prefix}.${key}` : key));
}
const currentBindings = new Map();
const priorImpact = [], unchangedBaselines = [];
for (const row of baselineRows) {
  const current = read(row.file), after = hash(current); currentBindings.set(row.file, after);
  const { content, ...reference } = row;
  if (row.before === after) { unchangedBaselines.push({ ...reference, after, reason: 'Exact predecessor bytes unchanged; not a new operational priorImpact alias.' }); continue; }
  assert.ok(impact[row.file], `Missing specific impact review: ${row.file}`);
  const changes = diffLines(content.toString('utf8'), current.toString('utf8'));
  const review = { ...reference, after, changeImpact: impact[row.file], lineChangeSummary: { added: changes.filter(x => x.added).reduce((sum, x) => sum + x.count, 0), removed: changes.filter(x => x.removed).reduce((sum, x) => sum + x.count, 0) } };
  if (row.file.startsWith('messages/')) {
    review.changedJsonPaths = changedJsonPaths(JSON.parse(content.toString('utf8')), JSON.parse(current.toString('utf8')));
    assert.ok(review.changedJsonPaths.every(key => key.startsWith('purchaseReceiving.')), 'Unexpected locale namespace change');
  }
  priorImpact.push(review);
}

const newSourcePurposes = {
  'services/purchase-order/receipt-recognition-source.ts': 'Immutable whole-receipt manifest capture and retained source/stock/journal verification.',
  'services/purchase-order/receipt-recognition.service.ts': 'Single canonical receipt posting or honest blocked/not-required result; accounting-only recovery guard.',
  'services/purchase-order/__tests__/receipt-recognition-source.test.ts': 'Manifest tamper, date/currency/partition, zero-value, retained posting and database-failure cases.',
  'services/purchase-order/__tests__/receipt-recognition.service.test.ts': 'Posting, retry, blockers, physical-return validation, original-date and not-required cases.',
  'services/purchasing/receipt-return-recognition.ts': 'Versioned receipt return allocations, physical/accounting evidence, resolution/reversal and supplier-claim funding.',
  'services/purchasing/__tests__/receipt-return-recognition.test.ts': 'Frozen allocation, partial return, replay/reversal, malformed evidence and residual-valuation denial cases.',
  'services/purchase-order/receipt-ledger-recovery-contracts.ts': 'Strict preview, command and durable receipt/return recovery decision contracts.',
  'services/purchase-order/receipt-ledger-recovery-authority.ts': 'Current tenant, module, user, permissions, session and fresh password authority.',
  'services/purchase-order/receipt-ledger-recovery.service.ts': 'Source/date/rule/account/period-bound preview and idempotent accounting-only receipt/return recovery.',
  'components/purchase-orders/ReceiptLedgerRecoveryDialog.tsx': 'EN/FR review, actionable blockers, password step-up, retained request retry and recovery result UI.',
  'services/purchase-order/__tests__/receipt-ledger-recovery.service.test.ts': 'Recovery preview, stale/concurrent/evidence constraints and durable exact replay.',
  'services/purchase-order/__tests__/receipt-ledger-recovery-authority.test.ts': 'Authority, tenant/session and fresh-auth denials.',
  'actions/purchaseOrderWorkflow/__tests__/receipt-ledger-recovery.actions.test.ts': 'Server identity, permission and action response/cache boundaries.',
  'components/purchase-orders/__tests__/ReceiptLedgerRecoveryDialog.test.tsx': 'EN/FR recovery, blockers, password, response loss and scope-change behavior.',
  'services/purchase-order/__tests__/purchase-receiving-revision.test.ts': 'Tracking/currency stale preview, lock order and retained history currency cases.',
  'components/purchase-orders/__tests__/PurchaseReceivingHistoryCurrency.test.tsx': 'EN/FR retained USD history under current EUR and unknown legacy currency presentation.',
};
const newSources = Object.entries(newSourcePurposes).map(([file, purpose]) => {
  assert.ok(!baselineRows.some(row => row.file === file), `New source incorrectly classified as an existing predecessor: ${file}`);
  const sha256 = hash(read(file)); currentBindings.set(file, sha256); return { file, sha256, purpose, classification: 'New in this operational implementation; no historical before-hash alias.' };
});

const revisionReceiptFile = artifact('receiving-revision-before-170d78fb-c29f-429d-a531-bd45f36bef1c/receipt.json');
const revisionBinding = bind(revisionReceiptFile), revisionReceipt = json(revisionReceiptFile);
const intermediateSnapshots = Object.entries(revisionReceipt.before).map(([file, before]) => {
  const raw = path.posix.join(path.posix.dirname(revisionReceiptFile), file.replaceAll('/', '__'));
  assert.equal(hash(read(raw)), before, `Intermediate source mismatch: ${file}`);
  return { file, before, snapshot: bind(raw), captureReceipt: revisionBinding, after: hash(read(file)), role: 'Intermediate pre-regression snapshot, not a replacement for the earlier operational predecessor.' };
});
const replayReference = 'receipt-replay-before-f16c9e77-9ceb-493b-8405-0778e1649dc9.json';
const priorReplay = embedded(replayReference).map(({ content: _content, ...row }) => ({ ...row, role: 'Earlier delivered replay correction predecessor; intentionally excluded from operational priorImpact.' }));
const capacityFile = artifact('receipt-capacity-review-2026-09-30.json');
const capacityReference = bind(capacityFile);
const closeFile = artifact('close-assurance-test-bridge-review-620ad18c-3249-43ba-b601-5c93e2b45be7.json');
const closeReference = bind(closeFile), close = json(closeFile);
assert.equal(close.priorImpact.length, 2);
for (const row of close.priorImpact) assert.equal(hash(read(row.file)), row.after, `Close bridge current binding mismatch: ${row.file}`);
assert.ok(close.priorImpact.every(row => !priorImpact.some(owned => owned.file === row.file)));
const closeBridge = { ...closeReference, priorImpact: close.priorImpact, currentAfterHashesVerified: true, ownership: 'Separate exact two-file reviewed bridge; copied references are not folded into the operational priorImpact list.' };
for (const [file, sha] of [...currentBindings, ...inputBindings]) assert.equal(hash(read(file)), sha, `Source or input changed during review: ${file}`);
const output = {
  schemaVersion: 1, at: new Date().toISOString(), evidenceDate: '2026-09-30', workflow: 'FA-CASH-COMMAND',
  scope: 'Source-only impact review for this operational receipt recognition implementation. Exact predecessor bytes are verified; this artifact performs no tests and grants no workflow closure, release or professional certification.',
  predecessorPolicy: 'Earliest retained baseline within this operational implementation. The previously delivered replay/capacity correction remains a separate review; its earlier hashes are not operational aliases.',
  priorImpact, newSources, unchangedBaselines, intermediateSnapshots,
  previousReceiptCapacityReview: { ...capacityReference, predecessorReferences: priorReplay, preserveSeparateReview: true },
  closeBridge, inputs: [...inputBindings].map(([file, sha256]) => ({ file: relativeRun(file), sha256 })),
  sourceHashes: Object.fromEntries(currentBindings), sourceStableDuringReview: true,
  verificationPerformed: ['Read and hashed exact embedded/raw predecessor bytes.', 'Compared current source to each selected predecessor and recorded per-file change impacts.', 'Verified locale changes stay within purchaseReceiving.', 'Verified all source and evidence input hashes again before writing.'],
  verificationNotPerformed: ['No tests, lint, build, database, browser or reconciler executed by this artifact.', 'No production, statutory, security or accounting certification; root owns final combined behavioral evidence.'],
  limitations: ['A source diff and matching hash do not establish behavior; final review must bind the current combined, actual database and browser results.', 'Fractional per-return stock valuation may retain an explicit source-review blocker when independently rounded costs cannot discharge the original receipt accrual; no invented residual posting is authorized.', 'New-source classification follows this task ownership and retained before captures, not repository Git status in the shared dirty worktree.'],
  builder: { file: relativeRun(__filename.replaceAll('\\', '/').replace(root.replaceAll('\\', '/') + '/', '')), sha256: hash(fs.readFileSync(__filename)) },
};
const target = artifact('operational-receipt-prior-impact-2026-09-30.json');
fs.writeFileSync(target, JSON.stringify(output, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ file: target, sha256: hash(read(target)), changedExistingFiles: priorImpact.length, newSources: newSources.length, unchangedBaselines: unchangedBaselines.length, sourceStableDuringReview: true, closeBridgeSha256: closeReference.sha256 }));
