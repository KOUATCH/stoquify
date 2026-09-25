const f = require('./suspense-currency-fixtures.cjs'), { db, fs, path, crypto, assert } = f;
const ledger = require(path.join(f.root, 'services/reconciliation/payment-suspense-ledger.service.ts'));
const run = crypto.randomUUID().slice(0, 12), organizations = [];
const files = ['services/_shared/action-errors.ts', 'services/reconciliation/payment-suspense-ledger.service.ts', 'services/reconciliation/payment-suspense-workflow.service.ts', 'services/reconciliation/payment-suspense-evidence.ts', 'services/reconciliation/payment-suspense-cycle-ledger.service.ts'];
const sources = () => Object.fromEntries(files.map(p => [p, crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root, p))).digest('hex')]));
const tables = ['suspenseItem', 'ledgerPostingBatch', 'journalEntry', 'journalEntryLine', 'accountingSourceLink', 'ledgerAuditEvent', 'paymentReconciliationInboxItem', 'organizationAccountingSettings'];
const snapshot = async where => f.hash(await Promise.all(tables.map(n => db[n].findMany({ where, orderBy: { id: 'asc' } }))));
const report = { at: new Date().toISOString(), run, checks: [], sourcesBefore: sources(), scope: 'Owned synthetic accounting currency and real posting/approval. No production, external delivery or professional approval.' };
(async () => {
  await f.local.withClient(f.target, f.local.assertOwned);
  report.originalBefore = await snapshot({ organizationId: { notIn: organizations } });
  for (const options of [{ sourceCurrency: 'EUR' }, { missingSettings: true }]) {
    const x = await f.fixture('currency-denial-' + run + '-' + organizations.length, organizations, options), before = await snapshot({ organizationId: x.organizationId });
    await assert.rejects(() => f.workflow.approveSuspensePosting(x.command), e => e.code === 'SUSPENSE_CURRENCY_EVIDENCE_REQUIRED');
    await assert.rejects(() => f.workflow.approveSuspensePosting(x.command), e => e.code === 'SUSPENSE_CURRENCY_EVIDENCE_REQUIRED');
    assert.equal(await snapshot({ organizationId: x.organizationId }), before);
    report.checks.push((options.missingSettings ? 'Missing settings' : 'EUR source / XAF base') + ': authoritative approval and retry refused; item, journals, batches, source links, receipts and audit unchanged');
  }
  for (const currency of ['XAF', 'EUR']) {
    const x = await f.fixture('currency-post-' + currency + '-' + run, organizations, { sourceCurrency: currency, baseCurrency: currency });
    const result = await f.workflow.approveSuspensePosting(x.command), batch = await db.ledgerPostingBatch.findUniqueOrThrow({ where: { id: result.ledgerPostingBatchId } });
    assert.equal(batch.metadata.currencyBasis.baseCurrency, currency); assert.equal(batch.metadata.currencyBasis.sourceCurrency, currency);
    const lines = await db.journalEntryLine.findMany({ where: { organizationId: x.organizationId, journalEntry: { postingBatchId: batch.id } }, orderBy: { lineNumber: 'asc' } });
    assert.equal(lines.length, 2); assert.equal(lines[0].debit.toString(), '100.25');
    for (const line of lines) { assert.equal(line.exchangeRate.toString(), '1'); assert.equal(line.baseDebit.toString(), line.debit.toString()); assert.equal(line.baseCredit.toString(), line.credit.toString()); }
    await db.organizationAccountingSettings.update({ where: { organizationId: x.organizationId }, data: { baseCurrency: currency === 'XAF' ? 'EUR' : 'XAF' } });
    const beforeReplay = await snapshot({ organizationId: x.organizationId });
    assert.equal((await f.workflow.approveSuspensePosting(x.command)).replayed, true); assert.equal(await snapshot({ organizationId: x.organizationId }), beforeReplay);
    report.checks.push(currency + ' / ' + currency + ': actual posting retains exact fractional values and configured basis; replay preserves original evidence after a subsequent settings change');
    for (const patch of [{ exchangeRate: '2' }, { baseDebit: '0.01' }]) {
      await db.journalEntryLine.update({ where: { id: lines[0].id }, data: patch });
      try { await assert.rejects(() => db.$transaction(tx => ledger.assertPaymentSuspenseLedgerTruthInTx(tx, { organizationId: x.organizationId, suspenseItemId: x.item.id })), e => e.code === 'SUSPENSE_CURRENCY_EVIDENCE_REQUIRED'); }
      finally { await db.journalEntryLine.update({ where: { id: lines[0].id }, data: { exchangeRate: lines[0].exchangeRate, baseDebit: lines[0].baseDebit } }); }
    }
    report.checks.push(currency + ': modified retained rate and base debit fail ledger verification; original fixture evidence restored');
    if (currency === 'XAF') {
      await db.organizationAccountingSettings.update({ where: { organizationId: x.organizationId }, data: { baseCurrency: 'XAF' } });
      const correction = require(path.join(f.root, 'services/reconciliation/payment-suspense-correction.service.ts'));
      const control = { organizationId: x.organizationId, actorId: x.checkerId, actorPermissions: f.permissions, now: f.now, lastAuthAt: f.now };
      const draft = { suspenseItemId: x.item.id, reason: 'Owned correction and currency basis regression', reversalDate: f.now.toISOString().slice(0, 10) };
      const preview = await correction.previewSuspenseCorrection(draft, control);
      const proposal = await correction.proposeSuspenseCorrection({ ...draft, expectedRevision: preview.revision, idempotencyKey: crypto.randomUUID() }, control);
      const checker = { ...control, actorId: x.actorId }, review = await correction.reviewSuspenseCorrection(x.item.id, proposal.proposalId, checker);
      await correction.decideSuspenseCorrection({ suspenseItemId: x.item.id, proposalId: proposal.proposalId, expectedRevision: review.revision, decision: 'APPROVE', reason: 'Independent verification of correction evidence' }, checker);
      const item = await db.suspenseItem.findUniqueOrThrow({ where: { id: x.item.id }, include: { providerAccount: true, reconciliationRun: true } });
      const next = await f.workflow.proposeSuspenseReclassification({ organizationId: x.organizationId, suspenseItemId: item.id, proposedById: x.actorId, targetType: 'UNKNOWN_CREDIT', reason: 'Reviewed second posting after correction', suspenseLedgerAccountId: x.account.id,
        expectedEvidenceRevision: f.evidence.suspenseEvidenceRevision(item, f.now), idempotencyKey: crypto.randomUUID(), control: x.command.control });
      const posted = await f.workflow.approveSuspensePosting({ ...x.command, expectedEvidenceRevision: next.evidenceRevision });
      const nextBatch = await db.ledgerPostingBatch.findUniqueOrThrow({ where: { id: posted.ledgerPostingBatchId } });
      assert.equal(nextBatch.postingCycle, 2); assert.equal(nextBatch.metadata.currencyBasis.baseCurrency, 'XAF');
      assert.equal(await db.journalEntry.count({ where: { organizationId: x.organizationId, sourceType: 'PAYMENT_SUSPENSE', sourceId: x.item.id } }), 3);
      report.checks.push('Independent source correction retains its exact counter-journal; second-cycle posting revalidates currency and preserves all three journals');
    }
  }
  const x = await f.fixture('currency-race-' + run, organizations);
  await f.local.withClient(f.target, async client => {
    await client.query('BEGIN');
    await client.query('SELECT id FROM organization_accounting_settings WHERE "organizationId" = $1 FOR UPDATE', [x.organizationId]);
    let settled = false;
    const pending = f.workflow.approveSuspensePosting(x.command).then(value => ({ value }), error => ({ error })).finally(() => { settled = true; });
    await new Promise(resolve => setTimeout(resolve, 150)); assert.equal(settled, false);
    await client.query('UPDATE organization_accounting_settings SET "baseCurrency" = $1 WHERE "organizationId" = $2', ['EUR', x.organizationId]);
    await client.query('COMMIT');
    const result = await pending; assert.ok(result.error, 'Concurrent changed base must not post');
    assert.ok(['CONFLICT', 'SUSPENSE_CURRENCY_EVIDENCE_REQUIRED'].includes(result.error.code), result.error.code);
    report.concurrentErrorCode = result.error.code;
  });
  await db.organizationAccountingSettings.update({ where: { organizationId: x.organizationId }, data: { baseCurrency: 'XAF' } });
  assert.equal(await db.journalEntry.count({ where: { organizationId: x.organizationId, sourceType: 'PAYMENT_SUSPENSE' } }), 0);
  assert.equal((await db.suspenseItem.findUniqueOrThrow({ where: { id: x.item.id } })).status, 'RESOLUTION_PROPOSED');
  report.checks.push('Concurrent accounting-currency update prevents posting; no suspense journal or completed approval is created');
  report.passed = true;
})().catch(error => { report.error = f.safe(error, []); }).finally(async () => {
  report.originalUnchanged = report.originalBefore === await snapshot({ organizationId: { notIn: organizations } });
  report.sourcesAfter = sources(); report.sourceStable = JSON.stringify(report.sourcesBefore) === JSON.stringify(report.sourcesAfter);
  await db.$disconnect(); const file = 'suspense-currency-v102-' + run + '.json';
  fs.writeFileSync(path.join(__dirname, file), JSON.stringify(report, null, 2), { flag: 'wx' });
  console.log(JSON.stringify({ file, passed: report.passed, checks: report.checks, concurrentErrorCode: report.concurrentErrorCode, error: report.error, sourceStable: report.sourceStable, originalUnchanged: report.originalUnchanged }));
  process.exit(report.passed && report.sourceStable && report.originalUnchanged ? 0 : 1);
});
