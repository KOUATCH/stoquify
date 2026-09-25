const f = require('./suspense-currency-fixtures.cjs'), { db, fs, path, crypto, assert } = f;
const archive = require(path.join(f.root, 'services/reconciliation/payment-suspense-resolution-archive.service.ts'));
const records = require(path.join(f.root, 'services/reconciliation/payment-suspense-resolution-record.ts'));
const exporter = require(path.join(f.root, 'services/reconciliation/payment-suspense-resolution-export.service.ts'));
const run = crypto.randomUUID().slice(0, 12), files = ['services/reconciliation/payment-suspense-resolution-record.ts', 'services/reconciliation/payment-suspense-resolution-archive.service.ts', 'services/reconciliation/payment-suspense-resolution-export.service.ts', 'services/reconciliation/payment-suspense-resolution-read.service.ts', 'actions/payments/suspense-resolution.actions.ts'];
const sources = () => Object.fromEntries(files.map(p => [p, crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root, p))).digest('hex')]));
const tables = ['suspenseItem', 'journalEntry', 'journalEntryLine', 'ledgerPostingBatch', 'accountingSourceLink', 'closeRun', 'reconciliationRun', 'paymentException'];
const financial = async () => f.hash(await Promise.all(tables.map(n => db[n].findMany({ orderBy: { id: 'asc' } }))));
const report = { at: new Date().toISOString(), run, sourcesBefore: sources(), checks: [], kinds: {}, scope: 'Owned retained v104/v106 synthetic fixtures. Direct service control inputs, not real route authentication. Only new export/audit receipts are written; no financial mutation or external delivery.' };
(async () => {
  await f.local.withClient(f.target, f.local.assertOwned); report.financialBefore = await financial();
  const organizations = await db.organization.findMany({ where: { OR: [{ id: { contains: 'ff8ffda6-f9c' } }, { id: { contains: 'a82d20ba-5f6' } }] }, select: { id: true } });
  assert.ok(organizations.length >= 4, 'Expected owned retained browser and corrected-cycle fixtures');
  const prefixes = ['suspense-resolution-proposal:', 'suspense-resolution-decision:', 'suspense-resolution-recovery-proposal:', 'suspense-resolution-recovery-decision:'];
  const rows = await db.paymentReconciliationInboxItem.findMany({ where: { organizationId: { in: organizations.map(o => o.id) }, source: 'SUSPENSE_POST', status: 'PROCESSED', OR: prefixes.map(startsWith => ({ idempotencyKey: { startsWith } })) }, orderBy: { createdAt: 'asc' } });
  assert.ok(rows.length >= 8);
  for (const row of rows) {
    const data = records.parseSuspenseResolutionRecord(row), now = new Date();
    const control = { organizationId: row.organizationId, actorId: data.proposedById, actorPermissions: ['payments.reconciliation.read', 'accounting.journal.read', 'payments.export'], now, lastAuthAt: now };
    const command = { suspenseItemId: row.externalId, recordId: row.id, expectedRevision: records.suspenseResolutionRecordRevision(row), idempotencyKey: crypto.randomUUID() };
    report.current = { recordId: row.id, kind: data.kind };
    const evidence = await db.$transaction(tx => archive.loadSuspenseResolutionArchiveInTx(tx, row.organizationId, row.externalId, row), { isolationLevel: 'RepeatableRead' });
    await assert.rejects(() => db.$transaction(tx => archive.loadSuspenseResolutionArchiveInTx(new Proxy(tx, { get(target, property) {
      if (property === 'journalEntry') return new Proxy(target.journalEntry, { get(model, method) {
        if (method === 'findFirst') return async args => { const value = await model.findFirst(args); return value ? { ...value, currency: 'TAMPERED' } : value; }; return model[method];
      } }); return target[property];
    } }), row.organizationId, row.externalId, row)));
    await assert.rejects(() => db.$transaction(tx => archive.loadSuspenseResolutionArchiveInTx(new Proxy(tx, { get(target, property) {
      if (property === 'ledgerAuditEvent') return { findFirst: async () => null }; return target[property];
    } }), row.organizationId, row.externalId, row)));
    const file = await exporter.exportSuspenseResolution(command, control), replay = await exporter.exportSuspenseResolution(command, { ...control, now: new Date() });
    assert.equal(replay.replayed, true); assert.equal(file.content, replay.content); assert.equal(file.receiptId, replay.receiptId);
    assert.equal(crypto.createHash('sha256').update(file.content).digest('hex'), file.sha256);
    const content = JSON.parse(file.content); assert.equal(content.selectedRecord.id, row.id); assert.equal(content.organizationId, row.organizationId);
    assert.ok(!file.content.includes('retainedSourceMetadata') && !file.content.includes('priorRunCertificate') && !file.content.includes('certificatePayload'));
    const issued = await db.paymentReconciliationInboxItem.count({ where: { organizationId: row.organizationId, source: 'CERTIFICATE_EXPORT', idempotencyKey: 'suspense-resolution-export:' + command.idempotencyKey } }); assert.equal(issued, 1);
    await assert.rejects(() => exporter.exportSuspenseResolution(command, { ...control, actorPermissions: ['payments.reconciliation.read', 'accounting.journal.read'] }));
    await assert.rejects(() => exporter.exportSuspenseResolution(command, { ...control, lastAuthAt: undefined }));
    await assert.rejects(() => exporter.exportSuspenseResolution(command, { ...control, actorId: 'foreign-actor' }));
    await assert.rejects(() => exporter.exportSuspenseResolution({ ...command, expectedRevision: 'sha256:' + '0'.repeat(64) }, control));
    if (!report.lateFailureRollback) {
      const failedCommand = { ...command, idempotencyKey: crypto.randomUUID() }, transaction = db.$transaction.bind(db);
      db.$transaction = (work, options) => transaction(tx => work(new Proxy(tx, { get(target, property) {
        if (property === 'ledgerAuditEvent') return new Proxy(target.ledgerAuditEvent, { get(model, method) {
          if (method === 'create') return args => { if (args.data.action === 'PAYMENT_SUSPENSE_RESOLUTION_EXPORT') throw new Error('OWNED_LATE_EXPORT_AUDIT_FAILURE'); return model.create(args); }; return model[method];
        } }); return target[property];
      } })), options);
      try { await assert.rejects(() => exporter.exportSuspenseResolution(failedCommand, control), /OWNED_LATE_EXPORT_AUDIT_FAILURE/); }
      finally { db.$transaction = transaction; }
      assert.equal(await db.paymentReconciliationInboxItem.count({ where: { organizationId: row.organizationId, idempotencyKey: 'suspense-resolution-export:' + failedCommand.idempotencyKey } }), 0);
      report.lateFailureRollback = true;
    }
    report.kinds[data.kind] = (report.kinds[data.kind] || 0) + 1;
    report.checks.push({ recordId: row.id, kind: data.kind, originalCorrected: !!evidence.originalReversal, clearingReversed: !!evidence.clearingReversal, exactReplay: true, currentAuthorityAndRevision: true, tamperedFinancialProofAndMissingAuditRefused: true });
  }
  assert.ok(report.checks.some(c => c.originalCorrected)); assert.ok(report.checks.some(c => c.clearingReversed));
  delete report.current;
})().catch(error => { report.error = f.safe(error); report.stack = String(error.stack).split('\n').slice(0, 5); }).finally(async () => {
  report.financialUnchanged = report.financialBefore === await financial(); report.sourcesAfter = sources(); report.sourceStable = JSON.stringify(report.sourcesBefore) === JSON.stringify(report.sourcesAfter);
  await db.$disconnect(); const file = 'suspense-resolution-export-v107-' + run + '.json'; fs.writeFileSync(path.join(__dirname, file), JSON.stringify(report, null, 2), { flag: 'wx' });
  console.log(JSON.stringify({ file, checks: report.checks.length, kinds: report.kinds, current: report.current, error: report.error, stack: report.stack, financialUnchanged: report.financialUnchanged, sourceStable: report.sourceStable }));
  process.exit(!report.error && report.sourceStable && report.financialUnchanged ? 0 : 1);
});
