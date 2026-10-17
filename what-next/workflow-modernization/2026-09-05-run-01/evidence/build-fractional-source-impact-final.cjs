// Read-only source review plus NEW evidence files. Never updates an old receipt or register.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const ts = require('typescript');
const root = process.cwd();
const run = 'what-next/workflow-modernization/2026-09-05-run-01';
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const read = p => fs.readFileSync(path.join(root, p));
const baselinePaths = [
  'fractional-root-before-5bc65480-98b3-447c-883e-f5e80bc26e4a.json',
  'fractional-purchasing-before-bda85c15-0799-4d51-a49f-042829ca30d0.json',
  'fractional-inventory-before-efd61ca7-f440-4ce5-b487-8575188f0bee.json',
  'fractional-purchasing-balance-before.json',
  'fractional-zero-credit-migration-before-2026-10-01.json',
  'fractional-period-utc-before-12767b80-eaca-434f-9acf-359a2e75cf9a.json',
].map(p => `${run}/evidence/${p}`);
const impacts = {
  'services/accounting/periods.service.ts': 'Makes raw timestamptz parameters explicitly UTC before comparison with UTC timestamp columns; preserves full instants, FOR SHARE locking, period ordering, open-state checks and all close behavior.',
  'services/accounting/__tests__/periods.service.test.ts': 'Adds final-day/next-month UTC query-contract cases; existing period-close and posting-lock tests remain in place. Actual connection-timezone behavior needs the separately bound database regression.',
  'services/purchasing/ap-control.service.ts': 'Validates actual resolved supplier-credit AP, claim, VAT and rounding-variance effects; keeps the existing posting kernel and request identity.',
  'services/purchasing/__tests__/ap-control.service.test.ts': 'Exercises both variance directions, zero-commercial-total/positive-claim, wrong accounts, duplicated amounts and inconsistent direction.',
  'services/purchase-order/receipt-ledger-recovery-contracts.ts': 'Adds a discriminated NOT_REQUIRED return result with strictly null journal/batch/source-link identifiers and accountingRequired preview state.',
  'services/purchase-order/receipt-ledger-recovery.service.ts': 'Retains source-bound zero-value return recovery without requiring or claiming a journal; preview and confirmation distinguish it from posting.',
  'services/purchase-order/__tests__/receipt-ledger-recovery.service.test.ts': 'Covers zero-value retained-return recovery results and rejects invented posting identifiers.',
  'components/purchase-orders/ReceiptLedgerRecoveryDialog.tsx': 'Displays a localized no-journal-required explanation for verified zero-value returns in preview and outcome.',
  'components/purchase-orders/__tests__/ReceiptLedgerRecoveryDialog.test.tsx': 'Covers the no-journal-required recovery presentation.',
  'messages/en.json': 'Adds English no-journal-required recovery wording within the existing receiving namespace; unrelated locale content must remain unchanged.',
  'messages/fr.json': 'Adds French no-journal-required recovery wording within the existing receiving namespace; unrelated locale content must remain unchanged.',
  'services/purchasing/receipt-return-recognition.ts': 'Introduces v2 acquisition/claim remaining-pool proofs, exact reversal/recovery evidence and source-owned explicit stock-value validation; retains strict v1 amounts and source hashes.',
  'services/purchasing/purchase-return-credit.service.ts': 'Uses allocated return values end to end; retains verified zero-valued corrections/credits without fabricated journals; allocates invoice net/tax residuals and records exact credit/reversal proof.',
  'services/purchasing/invoice-receipt-recognition.ts': 'Allocates new marked receipt draws from the same remaining acquisition pool as uninvoiced returns; retains existing v1 invoice allocation values on recovery.',
  'services/purchasing/__tests__/receipt-return-recognition.test.ts': 'Covers v1 compatibility, v2 zero draws, physical proof, original-value reversals and pending/recovered recognition.',
  'services/purchasing/__tests__/purchase-return-credit.service.test.ts': 'Covers source-funded credits and zero-valued credit/reversal behavior including applicable period controls.',
  'services/purchasing/__tests__/invoice-receipt-recognition.test.ts': 'Covers residual invoice allocations, legacy proofs, prior returned quantities/costs and immutable recovery.',
  'services/purchasing/supplier-payment-balance.ts': 'Allows zero credits only after reading their retained v2 allocation proof, keeping them distinct from cash and retaining exact reversal coverage checks.',
  'services/purchasing/__tests__/supplier-payment-balance.test.ts': 'Covers retained zero-credit payment-balance reads and malformed/unproven zero evidence.',
  'services/inventory/inventory-stock-event.service.ts': 'Writes only server-validated explicit v2 allocated values, including zero; uses the same values for stock levels and immutable movements, preserves v1 payload shape and refuses residual-value loss.',
  'services/inventory/inventory-projection-rebuild.service.ts': 'Rebuilds v2 returns from verified frozen movement costs with zero distinct from absent proof; retains the unmarked legacy fallback.',
  'services/inventory/inventory-reconciliation.service.ts': 'Classifies purchase-return reversals as inbound value and maps both return directions to their purchase-return business evidence.',
  'services/inventory/__tests__/inventory-stock-event.service.test.ts': 'Covers cent exhaustion, explicit zero, exact reversal, inconsistent residual rejection, unsupported overrides and validator errors.',
  'services/inventory/__tests__/inventory-projection-rebuild.service.test.ts': 'Covers zero-cost non-tail reversal/reallocation, unchanged legacy fallback and source-proof failure propagation.',
  'services/inventory/__tests__/inventory-reconciliation.service.test.ts': 'Covers both purchase-return source classifications and missing reversal evidence.',
  'prisma/migration-catalog-manifest.json': 'Adds exactly the reviewed zero-value supplier-credit migration entry; all predecessor records are preserved.',
};
const newFiles = {
  'services/inventory/receipt-cost-allocation.ts': 'Pure RECEIPT_REMAINING_POOL_V2 allocator and strict recomputable quantity/value proof; a final draw consumes the exact residual.',
  'services/inventory/__tests__/receipt-cost-allocation.test.ts': 'Allocator boundary, residual conservation and invalid-proof cases.',
  'services/purchasing/supplier-credit-allocation.ts': 'Shared immutable credit allocation reader for credit commands and payable balances; validates exact event, line values, totals and honest no-journal evidence.',
  'prisma/migrations/20260930231500_supplier_credit_zero_value_evidence/migration.sql': 'Only total > 0 and lineTotal > 0 become >= 0; positive quantity, other amount clauses, source triggers and append-only protections stay intact.',
};
const dependencyPaths = [
  'services/purchase-order/receipt-recognition-source.ts', 'services/purchase-order/receipt-recognition.service.ts',
  'services/purchase-order/purchase-order.service.ts', 'services/purchase-order/purchase-receipt-accounting-evidence.ts',
  'services/purchasing/purchase-correction-ledger.service.ts', 'services/purchasing/receipt-invoice-capacity.ts',
  'services/purchasing/purchase-return-credit.schemas.ts', 'services/accounting/periods.service.ts',
  'services/accounting/posting.service.ts', 'services/accounting/journals.service.ts',
  'services/events/business-event.service.ts', 'services/inventory/inventory-event.schemas.ts',
  'prisma/schema.prisma', 'scripts/prisma-migration-catalog-gate.js', 'scripts/prisma-production-migration-gate.js',
];
const authoredDrivers = [
  `${run}/lanes/environment/apply-fractional-zero-credit-schema.cjs`,
  `${run}/lanes/environment/verify-fractional-receipt-browser.cjs`,
  `${run}/lanes/environment/verify-fractional-receipt-valuation.cjs`,
];

const refs = [], baselines = new Map();
for (const file of baselinePaths) {
  const bytes = read(file), doc = JSON.parse(bytes);
  refs.push({ file, sha256: sha(bytes) });
  const rows = Array.isArray(doc) ? doc : doc.files;
  assert(Array.isArray(rows), `Unrecognized baseline: ${file}`);
  rows.forEach((row, index) => {
    const sourceFile = row.file ?? row.path;
    const contentField = row.bytesBase64 !== undefined ? 'bytesBase64' : row.contentBase64 !== undefined ? 'contentBase64' : 'content';
    const content = contentField === 'content' ? Buffer.from(row.content, 'utf8') : Buffer.from(row[contentField], 'base64');
    assert.equal(sha(content), row.sha256, `Baseline bytes do not match declared SHA: ${file} ${sourceFile}`);
    const baseline = { file, sha256: sha(bytes), pointer: `${Array.isArray(doc) ? '' : '/files'}/${index}`, pathField: row.file ? 'file' : 'path', contentField, encoding: contentField === 'content' ? 'utf8' : 'base64', declaredSha256: row.sha256, contentSha256: sha(content) };
    if (baselines.has(sourceFile)) assert.equal(baselines.get(sourceFile).before, row.sha256, `Conflicting retained predecessors: ${sourceFile}`);
    else baselines.set(sourceFile, { before: row.sha256, content, baseline });
  });
}
if (!process.argv.includes('--write-final')) {
  console.log(JSON.stringify({ status: 'prepared_awaiting_final_root_runtime_receipts', baselineFiles: refs.length, sourcePredecessors: baselines.size, snapshotBytesVerified: true, currentSourceHashesFinalized: false, evidenceWritten: false }));
  process.exit(0);
}
const runtimeIndexArgument = process.argv.indexOf('--runtime-index');
assert(runtimeIndexArgument >= 0 && process.argv[runtimeIndexArgument + 1], 'Root-provided runtime receipt index is required before writing the final source review');
const runtimeIndexFile = process.argv[runtimeIndexArgument + 1];
const runtimeIndexBytes = read(runtimeIndexFile);
const runtimeIndex = JSON.parse(runtimeIndexBytes);
assert(Array.isArray(runtimeIndex) && runtimeIndex.length > 0, 'Runtime index must be a nonempty array of {file,sha256,scope}');
const runtimeReceipts = runtimeIndex.map(row => {
  assert(typeof row.file === 'string' && typeof row.scope === 'string' && /^[a-f0-9]{64}$/.test(row.sha256), 'Invalid runtime receipt reference');
  assert.equal(sha(read(row.file)), row.sha256, `Runtime receipt bytes changed: ${row.file}`);
  return row;
});
const suffix = crypto.randomUUID();
const output = `${run}/evidence/fractional-source-impact-${suffix}.json`;
const retainedAfter = `${run}/evidence/fractional-source-after-${suffix}.json`;
const allPaths = [...new Set([...baselines.keys(), ...Object.keys(newFiles), ...dependencyPaths, ...authoredDrivers])].sort();
const frozen = new Map(allPaths.map(file => [file, read(file)]));
const afterRows = [...frozen].map(([file, bytes]) => ({ file, sha256: sha(bytes), contentBase64: bytes.toString('base64') }));
const afterBytes = Buffer.from(JSON.stringify({ recordedAt: new Date().toISOString(), status: 'source_review_snapshot', files: afterRows }, null, 2) + '\n');
const currentRef = file => ({ file: retainedAfter, sha256: sha(afterBytes), pointer: `/files/${afterRows.findIndex(row => row.file === file)}`, pathField: 'file', contentField: 'contentBase64', encoding: 'base64', contentSha256: sha(frozen.get(file)) });
const priorImpact = [], unchangedBaseline = [];
for (const [file, entry] of baselines) {
  const after = sha(frozen.get(file));
  if (after === entry.before) unchangedBaseline.push({ file, sha256: after, baseline: entry.baseline });
  else {
    assert(impacts[file], `Changed source missing an explicit impact review: ${file}`);
    priorImpact.push({ file, before: entry.before, after, baseline: entry.baseline, currentSnapshot: currentRef(file), impact: impacts[file], runtimeRevalidation: 'Refer to root-bound current execution receipts; historical source hashes alone do not establish current behavior.' });
  }
}
const newSources = Object.entries(newFiles).map(([file, impact]) => ({ file, sha256: sha(frozen.get(file)), currentSnapshot: currentRef(file), impact }));
function declaration(source, name) {
  const file = ts.createSourceFile('source.ts', source, ts.ScriptTarget.Latest, true);
  const node = file.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name);
  assert(node, `Missing declaration ${name}`);
  return node.getText(file).replace(/\r\n/g, '\n');
}
const identityDeclarations = [
  ['services/purchasing/receipt-return-recognition.ts', 'returnSourceHash'],
  ['services/purchasing/receipt-return-recognition.ts', 'lineProof'],
  ['services/purchasing/invoice-receipt-recognition.ts', 'sourceHash'],
  ['services/purchasing/ap-control.service.ts', 'apPostingRequestHash'],
].map(([file, name]) => {
  const before = declaration(baselines.get(file).content.toString('utf8'), name), after = declaration(frozen.get(file).toString('utf8'), name);
  return { file, declaration: name, comparison: 'Exact declaration text after CRLF normalization; source-only check', beforeSha256: sha(before), afterSha256: sha(after), unchanged: before === after };
});
const v1TestPointers = [
  ['services/purchasing/__tests__/receipt-return-recognition.test.ts', 'continues reading the exact legacy v1 proof and unmarked stock payload'],
  ['services/purchasing/__tests__/invoice-receipt-recognition.test.ts', 'preserves the exact legacy posting amount shape and omits context'],
  ['services/purchasing/__tests__/invoice-receipt-recognition.test.ts', 'keeps a failed receipt without accounting effects on the legacy path'],
  ['services/purchasing/__tests__/invoice-receipt-recognition.test.ts', 'recovery retains reviewed allocation after subsequent invoices reserve more quantity'],
  ['services/inventory/__tests__/inventory-stock-event.service.test.ts', 'preserves the %s receipt batch and all stock on an exact applied replay'],
].map(([file, title]) => {
  const source = frozen.get(file).toString('utf8'), index = source.indexOf(title);
  assert(index >= 0, `Missing exact compatibility test: ${title}`);
  return { file, title, line: source.slice(0, index).split('\n').length, sha256: sha(frozen.get(file)), executionStatus: 'Refer to bound current runtime receipts; pointer alone is not a pass claim' };
});
const changedSet = new Set(priorImpact.map(row => row.file));
const oldEvidence = ['operational-receipt-review-2026-09-30.json', 'receipt-capacity-review-2026-09-30.json'].map(name => {
  const file = `${run}/evidence/${name}`, bytes = read(file), doc = JSON.parse(bytes);
  const bindings = Object.entries(doc.sourceHashes).map(([source, priorSha256]) => {
    const now = fs.existsSync(path.join(root, source)) ? sha(read(source)) : null;
    return { file: source, priorSha256, currentSha256: now, unchanged: now === priorSha256, directlyChangedInThisReview: changedSet.has(source), matchesThisReviewPredecessor: baselines.get(source)?.before === priorSha256 };
  });
  return { file, sha256: sha(bytes), disposition: 'Preserved as immutable historical evidence. Changed bindings require current revalidation; this source review creates no alias or certification.', changedBindings: bindings.filter(row => !row.unchanged), unchangedBindingCount: bindings.filter(row => row.unchanged).length, unchangedBindings: bindings.filter(row => row.unchanged).map(({ file, priorSha256 }) => ({ file, sha256: priorSha256 })) };
});
const localeDiffs = ['messages/en.json', 'messages/fr.json'].map(file => {
  const before = JSON.parse(baselines.get(file).content), after = JSON.parse(frozen.get(file));
  const differences = [];
  function walk(a, b, pointer) {
    if (JSON.stringify(a) === JSON.stringify(b)) return;
    if (a && b && typeof a === 'object' && typeof b === 'object' && !Array.isArray(a) && !Array.isArray(b)) {
      for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) walk(a[key], b[key], `${pointer}/${key.replace(/~/g, '~0').replace(/\//g, '~1')}`);
    } else differences.push({ pointer, before: a ?? null, after: b ?? null });
  }
  walk(before, after, ''); return { file, differences };
});
const diagnosisReferences = [
  `${run}/lanes/environment/fractional-period-select-diagnosis-568f1b56-1137-4ca9-8f52-3deedb261bf1.json`,
  `${run}/lanes/environment/fractional-period-timezone-diagnosis-5b167703-43ed-4616-aa22-c04e9f7416dc.json`,
].map(file => ({ file, sha256: sha(read(file)), role: 'Historical SELECT-only diagnosis before the UTC fix; not current pass evidence' }));
const initialDraftFile = `${run}/evidence/fractional-source-impact-draft-0316315d-3bb2-4f68-981e-5b7effbbca28.json`;
const initialDraftBytes = read(initialDraftFile), initialDraft = JSON.parse(initialDraftBytes);
const initialAfterBytes = read(initialDraft.currentSnapshot.file);
assert.equal(sha(initialAfterBytes), initialDraft.currentSnapshot.sha256, 'Initial draft source snapshot changed');
const initialAfter = JSON.parse(initialAfterBytes).files;
const errorCodeFix = ['services/inventory/inventory-stock-event.service.ts', 'services/inventory/inventory-projection-rebuild.service.ts', 'services/inventory/__tests__/inventory-stock-event.service.test.ts'].map(file => {
  const row = initialAfter.find(row => row.file === file);
  const before = Buffer.from(row.contentBase64, 'base64');
  assert.equal(sha(before), row.sha256, `Initial error-code predecessor bytes changed: ${file}`);
  const normalized = value => value.toString('utf8').replace(/\r\n/g, '\n');
  const expected = normalized(before).replaceAll('"INVENTORY_VALUATION_REVIEW"', '"REVIEW_REQUIRED"');
  const after = frozen.get(file);
  assert.equal(normalized(after), expected, `Error-code correction acquired an unreviewed extra change: ${file}`);
  return { file, before: sha(before), after: sha(after), exactOnlyChange: 'INVENTORY_VALUATION_REVIEW -> existing REVIEW_REQUIRED', initialSnapshot: initialDraft.currentSnapshot };
});
const periodFile = 'services/accounting/periods.service.ts';
const periodBefore = baselines.get(periodFile).content.toString('utf8').replace(/\r\n/g, '\n');
const periodAfter = frozen.get(periodFile).toString('utf8').replace(/\r\n/g, '\n');
const getterBefore = declaration(periodBefore, 'getOpenPeriodForDate');
const getterAfter = declaration(periodAfter, 'getOpenPeriodForDate');
assert.equal(periodBefore.replace(getterBefore, ''), periodAfter.replace(getterAfter, ''), 'Unreviewed period-service change outside the UTC lookup');
assert(getterBefore.includes('LIMIT 1 FOR SHARE') && getterAfter.includes('LIMIT 1 FOR SHARE'), 'Period shared lock must remain');
assert.equal((getterAfter.match(/::timestamptz AT TIME ZONE 'UTC'/g) ?? []).length, 2, 'Both raw date comparisons must use explicit UTC');
assert(getterAfter.includes('assertOpenPeriod(period, entryDate, organizationId)'), 'Open-state invariant must remain');
const periodUtcReview = {
  file: periodFile, before: baselines.get(periodFile).before, after: sha(frozen.get(periodFile)),
  diagnostics: diagnosisReferences,
  cause: 'Raw Prisma Date parameters are timestamptz. With Africa/Lagos session time, September 30 at 23:33Z compares as October 1 against timestamp-without-time-zone columns; ORM and invariant use UTC semantics.',
  correction: 'Cast each raw Date parameter to timestamptz and convert AT TIME ZONE UTC before comparing timestamp columns. Preserve full instants without altering storage, session timezone or fixture dates.',
  unchangedOutsideGetter: true, sharedRowLockPreserved: true, openStateRecheckPreserved: true,
  testFile: 'services/accounting/__tests__/periods.service.test.ts',
  limitation: 'Mocked query-contract tests alone do not prove PostgreSQL timezone or lock behavior; refer to the separately bound actual database regression and concurrency evidence.'
};
const sourceStableDuringReview = [...frozen].every(([file, bytes]) => sha(read(file)) === sha(bytes));
assert(sourceStableDuringReview, 'Source changed during review; no final review is written');
const report = {
  schemaVersion: 1, at: new Date().toISOString(), status: 'source_review_complete', sourceReviewPassed: true,
  workflow: 'FA-CASH-COMMAND', scope: 'Fractional receipt/invoice/return/credit monetary conservation and its inventory, recovery and zero-credit migration dependencies.',
  releaseDecision: 'No closure promotion, migration authorization, production approval or current-runtime certification.',
  baselineArtifacts: refs, priorImpact, newSources, unchangedBaseline,
  typecheckCorrection: { initialDraft: { file: initialDraftFile, sha256: sha(initialDraftBytes) }, files: errorCodeFix, globalErrorUnionUnchangedByThisCorrection: true },
  periodUtcReview,
  dependencies: dependencyPaths.map(file => ({ file, sha256: sha(frozen.get(file)), currentSnapshot: currentRef(file), disposition: 'Current direct dependency binding; source hash alone does not verify runtime behavior.' })),
  authoredVerificationDrivers: authoredDrivers.map(file => ({ file, sha256: sha(frozen.get(file)), disposition: 'Driver source binding; consult runtime receipt references for actual execution.' })),
  oldEvidence,
  v1CompatibilityReview: {
    status: 'source_review_with_separately_bound_current_execution', identityDeclarations, testPointers: v1TestPointers,
    contracts: [
      'New allocation fields are optional on retained v1 parses; old source/event objects are not rewritten or backfilled.',
      'The v1 return amount branch still requires quantity times original unit cost and forbids v2 allocation fields.',
      'Unmarked stock payloads keep WEIGHTED_AVERAGE and omit receiptValuation entirely. Explicit return overrides require the source validator and v2 marker.',
      'Invoice recovery retains its supplied proof; new marked allocations use v2. Unmarked legacy invoices retain their prior amount context and posting hash.',
      'Recovery accepts old journal-bearing resolution events without requiring a newly introduced ledgerStatus field; no-journal outcomes require an explicit verified v2 zero proof.',
      'Positive legacy credit and payment-balance behavior remains separate; a zero credit without valid v2 proof is rejected.'
    ],
    limitation: 'Declaration equality and branch inspection do not replace fixture replay/hash assertions across the complete legacy path.'
  },
  v2SemanticsAndResidualRisks: [
    { kind: 'intentional_policy', detail: 'Each draw uses remainingValue * requestedQuantity / remainingQuantity, rounded to cents; the final draw receives the exact residual. Reordering may assign a cent to a different operation but must conserve the total.' },
    { kind: 'required_invariant', detail: 'Invoice plus uninvoiced-return allocations share the acquisition pool; invoiced returns consume the retained invoice-funded claim pool. Exact reversals restore frozen values, not a recalculated value.' },
    { kind: 'required_invariant', detail: 'Stock movement, inventory level, return accounting and historical rebuild use the same verified allocated value, with explicit zero distinct from absent evidence.' },
    { kind: 'bounded_blocker', detail: 'A receipt-owned allocation that conflicts with current item/location value is rejected instead of clearing residual stock value. Mixed-source valuation reconciliation is not certified by these changes.' },
    { kind: 'legacy_limitation', detail: 'Unknown historical allocations are not silently repaired or relabeled v2; exact legacy proof remains necessary.' },
    { kind: 'review_followup', detail: 'The initial narrow review found zero-credit creation/reversal bypassed period validation. Purchasing subsequently added independent source-date checks and focused closed/missing-period cases. Current execution must bind this corrected source. Resolving an already-recorded source-pending zero return remains a proof-only recovery with no new stock, credit or journal effect.' },
    { kind: 'verification_requirement', detail: 'Exercise zero-commercial-total with positive claim through debit variance/credit claim, no supplier-balance effect, and exact reversal.' },
    { kind: 'migration_requirement', detail: 'Only two amount checks are relaxed. Valid zero records prevent automatic re-tightening; no row deletion or history rewriting is an acceptable rollback.' }
  ],
  localeDiffs,
  runtimeVerification: { status: 'root_receipt_references_bound', index: { file: runtimeIndexFile, sha256: sha(runtimeIndexBytes) }, receipts: runtimeReceipts, claim: 'Receipt bytes verified and preserved; root owns interpretation, pass/fail certification and current source/build binding. No tests, browser journey or database mutation were executed by this evidence builder.' },
  sourceStableDuringReview,
  currentSnapshot: { file: retainedAfter, sha256: sha(afterBytes), sourceCount: afterRows.length },
  nextRequiredAction: 'Root must inspect this exact before/after impact with the bound source-stable runtime receipts and author any separate final workflow review/register follow-up. Preserve all drafts and prior evidence.'
};
fs.writeFileSync(path.join(root, retainedAfter), afterBytes, { flag: 'wx' });
fs.writeFileSync(path.join(root, output), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ file: output, sha256: sha(read(output)), status: report.status, sourceReviewPassed: true, priorImpact: priorImpact.length, newSources: newSources.length, unchangedBaseline: unchangedBaseline.length, sourceStableDuringReview, identityDeclarations, localeDiffs }));
