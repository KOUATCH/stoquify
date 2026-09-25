const f = require('./suspense-currency-fixtures.cjs'), { db, fs, path, crypto, assert } = f;
const resolution = require(path.join(f.root, 'services/reconciliation/payment-suspense-resolution.service.ts'));
const evidence = require(path.join(f.root, 'services/reconciliation/payment-suspense-resolution-evidence.service.ts'));
const journals = require(path.join(f.root, 'services/accounting/journals.service.ts')), posting = require(path.join(f.root, 'services/accounting/posting.service.ts'));
const manifestService = require(path.join(f.root, 'services/reconciliation/payment-reconciliation-evidence.service.ts'));
const run = crypto.randomUUID().slice(0, 12), organizations = [], files = ['services/reconciliation/payment-suspense-resolution-recovery.service.ts', 'services/reconciliation/payment-suspense-resolution-recovery-evidence.service.ts', 'services/reconciliation/payment-suspense-resolution-recovery.contracts.ts', 'services/reconciliation/payment-suspense-resolution.service.ts', 'services/reconciliation/payment-suspense-resolution-evidence.service.ts', 'services/reconciliation/payment-suspense-resolution.contracts.ts', 'services/reconciliation/payment-suspense-correction.service.ts', 'services/reconciliation/payment-suspense-ledger.service.ts', 'services/accounting/posting.service.ts', 'services/reconciliation/payment-reconciliation-evidence.service.ts', 'services/reconciliation/payment-reconciliation-notifications.ts'];
const sources = () => Object.fromEntries(files.map(p => [p, crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root, p))).digest('hex')]));
const tables = ['suspenseItem', 'journalEntry', 'journalEntryLine', 'ledgerPostingBatch', 'accountingSourceLink', 'paymentReconciliationInboxItem', 'ledgerAuditEvent', 'closeRun', 'reconciliationRun', 'paymentException'];
const snapshot = async where => f.hash(await Promise.all(tables.map(n => db[n].findMany({ where, orderBy: { id: 'asc' } }))));
const report = { at: new Date().toISOString(), run, sourcesBefore: sources(), checks: [], scope: 'Owned synthetic actual suspense posting, independently posted manual clearing and final resolution. No live financial operation or statutory write-off approval.' };
const permissions = [...f.permissions, 'accounting.journal.read', 'accounting.journal.create', 'accounting.journal.post'];
const context = (x, actorId = x.actorId) => ({ organizationId: x.organizationId, actorId, actorPermissions: permissions, now: f.now, lastAuthAt: f.now });
async function fixture(kind) {
  const x = await f.fixture('resolution-' + kind + '-' + run + '-' + organizations.length, organizations);
  await db.organization.update({ where: { id: x.organizationId }, data: { requestedModules: ['purchasing', 'finance', 'accounting', 'payment_reconciliation'] } });
  const rail = await db.paymentRail.create({ data: { organizationId: x.organizationId, type: 'BANK_TRANSFER', code: 'OWNED-R', name: 'Synthetic resolution rail' } });
  const provider = await db.providerAccount.create({ data: { organizationId: x.organizationId, paymentRailId: rail.id, providerCode: 'OWNED-R', displayName: 'Synthetic provider', externalAccountHash: crypto.randomUUID(), status: 'ACTIVE', suspenseLedgerAccountId: x.account.id } });
  const start = new Date(f.now.toISOString().slice(0, 10) + 'T00:00:00Z'), end = new Date(start.getTime() + 86400000);
  x.run = await db.reconciliationRun.create({ data: { organizationId: x.organizationId, paymentRailId: rail.id, providerAccountId: provider.id, businessDate: start, periodStart: start, periodEnd: end, status: 'NEEDS_REVIEW', runById: x.actorId } });
  await db.suspenseItem.update({ where: { id: x.item.id }, data: { providerAccountId: provider.id, reconciliationRunId: x.run.id } });
  const linked = await db.suspenseItem.findUniqueOrThrow({ where: { id: x.item.id }, include: { providerAccount: true, reconciliationRun: true } });
  const revised = await f.workflow.proposeSuspenseReclassification({ organizationId: x.organizationId, suspenseItemId: x.item.id, proposedById: x.actorId, targetType: 'UNKNOWN_CREDIT', reason: 'Owned linked clearing review', suspenseLedgerAccountId: x.account.id,
    expectedEvidenceRevision: f.evidence.suspenseEvidenceRevision(linked, f.now), idempotencyKey: crypto.randomUUID(), control: x.command.control });
  x.command.expectedEvidenceRevision = revised.evidenceRevision;
  x.posted = await f.workflow.approveSuspensePosting(x.command);
  const account = await db.chartOfAccount.create({ data: { organizationId: x.organizationId, code: 'OWNED-DEST', nameEn: 'Synthetic resolution destination', type: kind === 'WRITTEN_OFF' ? 'EXPENSE' : 'LIABILITY', normalBalance: kind === 'WRITTEN_OFF' ? 'DEBIT' : 'CREDIT' } });
  const journal = await db.journal.findFirstOrThrow({ where: { organizationId: x.organizationId, code: 'OWNED-SP' } });
  const draft = await journals.createManualJournalEntry(x.organizationId, { journalId: journal.id, entryDate: f.now, reference: 'Owned retained clearing source ' + run, memo: 'Synthetic full clearing', lines: [
    { accountId: x.account.id, debit: '0', credit: '100.25', currency: 'XAF' },
    { accountId: account.id, debit: '100.25', credit: '0', currency: 'XAF' },
  ] }, x.actorId);
  x.clearing = await posting.postJournalEntry(x.organizationId, draft.id, x.checkerId, { actorPermissions: permissions, lastAuthAt: f.now, now: f.now });
  x.close = await db.closeRun.create({ data: { organizationId: x.organizationId, periodId: x.clearing.periodId, status: 'CERTIFIED', metadata: { fixtureOnly: true, notAnApproval: true } } });
  x.draft = { suspenseItemId: x.item.id, clearingJournalId: draft.id, outcome: kind, reason: 'Owned verified clearing evidence' };
  return x;
}
(async () => {
  await f.local.withClient(f.target, f.local.assertOwned); report.originalBefore = await snapshot({ organizationId: { notIn: organizations } });
  for (const kind of ['RESOLVED', 'WRITTEN_OFF']) {
    const x = await fixture(kind), beforePreview = await snapshot({ organizationId: x.organizationId });
    const preview = await evidence.previewSuspenseResolution(x.draft, context(x)); assert.equal(preview.resolutionRecorded, false); assert.equal(preview.newFinancialPosting, false);
    assert.equal(await snapshot({ organizationId: x.organizationId }), beforePreview);
    await assert.rejects(() => evidence.previewSuspenseResolution({ ...x.draft, clearingJournalId: x.item.id }, context(x)));
    const clearingLines = await db.journalEntryLine.findMany({ where: { journalEntryId: x.clearing.id }, orderBy: { lineNumber: 'asc' } });
    for (const line of clearingLines) await db.journalEntryLine.update({ where: { id: line.id }, data: { debit: line.debit.gt(0) ? '50' : '0', credit: line.credit.gt(0) ? '50' : '0', baseDebit: line.debit.gt(0) ? '50' : '0', baseCredit: line.credit.gt(0) ? '50' : '0' } });
    try { await assert.rejects(() => evidence.previewSuspenseResolution(x.draft, context(x)), /full suspense amount/i); }
    finally { for (const line of clearingLines) await db.journalEntryLine.update({ where: { id: line.id }, data: { debit: line.debit, credit: line.credit, baseDebit: line.baseDebit, baseCredit: line.baseCredit } }); }
    if (kind === 'WRITTEN_OFF') await assert.rejects(() => evidence.previewSuspenseResolution({ ...x.draft, outcome: 'RESOLVED' }, context(x)), /explicitly reviewed as a write-off/i);
    report.checks.push(kind + ': missing clearing reference and balanced-but-partial clearing refused; expense clearance cannot be mislabeled as ordinary resolution');
    for (const denied of [{ ...context(x), organizationId: 'foreign' }, { ...context(x), actorPermissions: ['payments.reconciliation.read'] }, { ...context(x), actorId: 'missing' }]) await assert.rejects(() => evidence.previewSuspenseResolution(x.draft, denied));
    await assert.rejects(() => resolution.proposeSuspenseResolution({ ...x.draft, expectedRevision: 'sha256:' + '0'.repeat(64), idempotencyKey: crypto.randomUUID() }, context(x)), e => e.code === 'CONFLICT');
    assert.equal(await snapshot({ organizationId: x.organizationId }), beforePreview);
    const firstCommand = { ...x.draft, expectedRevision: preview.revision, idempotencyKey: crypto.randomUUID() };
    const firstProposal = await resolution.proposeSuspenseResolution(firstCommand, context(x));
    const firstReview = await resolution.reviewSuspenseResolution(x.item.id, firstProposal.proposalId, context(x, x.checkerId));
    const rejection = { suspenseItemId: x.item.id, proposalId: firstProposal.proposalId, expectedRevision: firstReview.revision, decision: 'REJECT', reason: 'Independent reviewer requests revised source explanation' };
    const rejected = await resolution.decideSuspenseResolution(rejection, context(x, x.checkerId));
    assert.equal(rejected.outcome, 'REJECTED');
    const rejectedItem = await db.suspenseItem.findUniqueOrThrow({ where: { id: x.item.id } });
    assert.equal(rejectedItem.status, 'POSTED_TO_SUSPENSE'); assert.equal(rejectedItem.resolvedAt, null); assert.equal(rejectedItem.metadata.resolutionProposalId, null);
    assert.equal(await db.paymentReconciliationInboxItem.count({ where: { organizationId: x.organizationId, idempotencyKey: 'suspense-resolution-clearing:' + x.clearing.id } }), 0);
    assert.equal((await db.closeRun.findUniqueOrThrow({ where: { id: x.close.id } })).status, 'CERTIFIED');
    const afterReject = await snapshot({ organizationId: x.organizationId });
    assert.equal((await resolution.decideSuspenseResolution(rejection, context(x, x.checkerId))).replayed, true);
    assert.equal(await snapshot({ organizationId: x.organizationId }), afterReject);
    await assert.rejects(() => resolution.decideSuspenseResolution({ ...rejection, decision: 'APPROVE' }, context(x, x.checkerId)), e => e.code === 'IDEMPOTENCY_CONFLICT');
    await db.suspenseItem.update({ where: { id: x.item.id }, data: { metadata: { ...rejectedItem.metadata, correctionProposalId: 'owned-pending-correction' } } });
    try { await assert.rejects(() => evidence.previewSuspenseResolution(x.draft, context(x)), /pending posting correction/i); }
    finally { await db.suspenseItem.update({ where: { id: x.item.id }, data: { metadata: rejectedItem.metadata } }); }
    const renewed = await evidence.previewSuspenseResolution(x.draft, context(x));
    const command = { ...x.draft, expectedRevision: renewed.revision, idempotencyKey: crypto.randomUUID() }, proposed = await resolution.proposeSuspenseResolution(command, context(x));
    report.checks.push(kind + ': stale preview refused; rejection retains original postings and close state, exact rejection retry is unchanged, changed decision conflicts, pending correction prevents resolution, fresh proposal can proceed');
    const afterPropose = await snapshot({ organizationId: x.organizationId }); assert.equal((await resolution.proposeSuspenseResolution(command, context(x))).proposalId, proposed.proposalId); assert.equal(await snapshot({ organizationId: x.organizationId }), afterPropose);
    await assert.rejects(() => resolution.proposeSuspenseResolution({ ...command, reason: 'Changed under same request key' }, context(x)), e => e.code === 'IDEMPOTENCY_CONFLICT');
    const review = await resolution.reviewSuspenseResolution(x.item.id, proposed.proposalId, context(x, x.checkerId));
    const decision = { suspenseItemId: x.item.id, proposalId: proposed.proposalId, expectedRevision: review.revision, decision: 'APPROVE', reason: 'Independent resolution decision' };
    await assert.rejects(() => resolution.decideSuspenseResolution(decision, context(x)));
    await assert.rejects(() => resolution.decideSuspenseResolution(decision, { ...context(x, x.checkerId), lastAuthAt: new Date(f.now.getTime() - 600000) }));
    assert.equal(await snapshot({ organizationId: x.organizationId }), afterPropose);
    const realTransaction = db.$transaction.bind(db);
    db.$transaction = (work, options) => realTransaction(tx => work(new Proxy(tx, { get(target, key) { if (key !== 'ledgerAuditEvent') return target[key]; return new Proxy(target.ledgerAuditEvent, { get(model, method) { if (method !== 'create') return model[method]; return args => { if (args.data.action === 'SUSPENSE_RESOLUTION_APPROVE') throw new Error('OWNED_RESOLUTION_AUDIT_FAILURE'); return model.create(args); }; } }); } })), options);
    try { await assert.rejects(() => resolution.decideSuspenseResolution(decision, context(x, x.checkerId)), /OWNED_RESOLUTION_AUDIT_FAILURE/); }
    finally { db.$transaction = realTransaction; }
    assert.equal(await snapshot({ organizationId: x.organizationId }), afterPropose);
    report.checks.push(kind + ': injected final audit failure rolls back allocation, decision, suspense status and close-side effects');
    const concurrent = await Promise.allSettled([resolution.decideSuspenseResolution(decision, context(x, x.checkerId)), resolution.decideSuspenseResolution(decision, context(x, x.checkerId))]);
    assert.ok(concurrent.some(value => value.status === 'fulfilled'));
    for (const value of concurrent) if (value.status === 'rejected') assert.equal(value.reason.code, 'CONFLICT'); else assert.equal(value.value.outcome, kind);
    const after = await db.suspenseItem.findUniqueOrThrow({ where: { id: x.item.id } }); assert.equal(after.status, kind); assert.equal(after.ledgerPostingBatchId, x.posted.ledgerPostingBatchId);
    assert.equal((await db.closeRun.findUniqueOrThrow({ where: { id: x.close.id } })).status, 'BLOCKED');
    assert.equal(await db.journalEntry.count({ where: { organizationId: x.organizationId } }), 2);
    const beforeReplay = await snapshot({ organizationId: x.organizationId }); assert.equal((await resolution.decideSuspenseResolution(decision, context(x, x.checkerId))).replayed, true); assert.equal(await snapshot({ organizationId: x.organizationId }), beforeReplay);
    await assert.rejects(() => posting.reverseJournalEntry(x.organizationId, x.clearing.id, x.actorId, 'Owned linked reversal attempt', f.now, { actorPermissions: permissions, lastAuthAt: f.now, now: f.now }), /source-owned recovery/i);
    assert.equal(await snapshot({ organizationId: x.organizationId }), beforeReplay);
    const manifest = await db.$transaction(tx => evidence.suspenseResolutionManifestEvidenceInTx(tx, x.organizationId, after)); assert.equal(manifest.decisionId, after.metadata.resolutionDecisionId);
    const fullManifest = () => db.$transaction(tx => manifestService.buildReconciliationEvidenceManifestInTx(tx, { organizationId: x.organizationId, providerAccountId: x.run.providerAccountId, reconciliationRunId: x.run.id, periodStart: x.run.periodStart, periodEnd: x.run.periodEnd }));
    assert.equal((await fullManifest()).counts.suspenseCount, 1);
    await db.journalEntryLine.update({ where: { id: clearingLines[0].id }, data: { exchangeRate: '2' } });
    try { await assert.rejects(() => fullManifest()); }
    finally { await db.journalEntryLine.update({ where: { id: clearingLines[0].id }, data: { exchangeRate: clearingLines[0].exchangeRate } }); }
    report.checks.push(kind + ': certificate evidence includes verified decision/allocation and current financial hashes; changed clearing rate refuses verification');
    report.checks.push(kind + ': actual original/clearing postings, pure preview, scope/permission/actor denials, idempotent proposal, independent fresh decision, no new journal, retained exact retry and generic clearing reversal refusal');
    await require('./exercise-suspense-resolution-recovery.cjs')({ f, x, kind, report, context, snapshot, tables });
  }
  await assert.rejects(() => db.$transaction(tx => evidence.suspenseResolutionManifestEvidenceInTx(tx, organizations[0], { id: 'legacy-unproven', status: 'RESOLVED', metadata: null })), /lacks verified resolution evidence/i);
  report.checks.push('A legacy final status without resolution proof cannot establish certificate readiness');
  report.passed = true;
})().catch(error => { report.error = f.safe(error, []); report.failureLocation = String(error.stack).split('\n').filter(line => /exercise-suspense-resolution-recovery|verify-suspense-resolution-recovery/.test(line)); }).finally(async () => {
  report.originalUnchanged = report.originalBefore === await snapshot({ organizationId: { notIn: organizations } }); report.sourcesAfter = sources(); report.sourceStable = JSON.stringify(report.sourcesBefore) === JSON.stringify(report.sourcesAfter);
  await db.$disconnect(); const file = 'suspense-resolution-recovery-v104-' + run + '.json'; fs.writeFileSync(path.join(__dirname, file), JSON.stringify(report, null, 2), { flag: 'wx' });
  console.log(JSON.stringify({ file, passed: report.passed, checks: report.checks, error: report.error, failureLocation: report.failureLocation, sourceStable: report.sourceStable, originalUnchanged: report.originalUnchanged })); process.exit(report.passed && report.sourceStable && report.originalUnchanged ? 0 : 1);
});
