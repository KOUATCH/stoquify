const f = require('./invoice-approval-fixtures.cjs'), { db, fs, path, crypto, assert } = f;
const { runPaymentReconciliation } = require(path.join(f.root, 'services/reconciliation/payment-reconciliation-run.service.ts'));
const workflow = require(path.join(f.root, 'services/reconciliation/payment-suspense-workflow.service.ts'));
const evidence = require(path.join(f.root, 'services/reconciliation/payment-suspense-evidence.ts'));
const { captureProviderEvent } = require(path.join(f.root, 'services/payments/provider-event.service.ts'));
const { importProviderStatement } = require(path.join(f.root, 'services/payments/statement-import.service.ts'));
const { MobileMoneyHmacAdapter } = require(path.join(f.root, 'services/payments/adapters/mobile-money-hmac.adapter.ts'));
const run = crypto.randomUUID().slice(0, 12), organizations = [], now = new Date();
const files = ['services/reconciliation/payment-reconciliation-run.service.ts', 'services/reconciliation/payment-suspense-workflow.service.ts', 'services/reconciliation/payment-reconciliation-notifications.ts'];
const sources = () => Object.fromEntries(files.map(p => [p, crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root, p))).digest('hex')]));
const tables = ['reconciliationRun', 'paymentException', 'suspenseItem', 'matchRecord', 'paymentReconciliationInboxItem', 'journalEntry', 'ledgerPostingBatch'];
const snapshot = async where => f.hash(await Promise.all(tables.map(n => db[n].findMany({ where, orderBy: { id: 'asc' } }))));
const report = { at: now.toISOString(), run, sourcesBefore: sources(), checks: [], scope: 'Owned isolated database; real HMAC event capture, statement import, automatic run, assignment and proposal. Internal payment and settlement setup are synthetic preconditions, not real approvals. No sign-off, live payment or external delivery.' };
async function fixture(suffix, external = true) {
  const x = await f.fixture('exception-link-' + run + '-' + suffix, organizations);
  await db.organization.update({ where: { id: x.organizationId }, data: { requestedModules: ['purchasing', 'finance', 'accounting', 'payment_reconciliation'] } });
  const bank = await db.chartOfAccount.create({ data: { organizationId: x.organizationId, code: 'OWNED-512', nameEn: 'Owned settlement mapping', type: 'ASSET', normalBalance: 'DEBIT' } });
  const suspense = await db.chartOfAccount.create({ data: { organizationId: x.organizationId, code: 'OWNED-471', nameEn: 'Owned suspense mapping', type: 'ASSET', normalBalance: 'DEBIT' } });
  const rail = await db.paymentRail.create({ data: { organizationId: x.organizationId, code: 'OWNED-LINK', name: 'Owned synthetic rail', type: 'MOBILE_MONEY' } });
  const adapter = new MobileMoneyHmacAdapter('OWNED-LINK');
  const provider = await db.providerAccount.create({ data: { organizationId: x.organizationId, paymentRailId: rail.id, providerCode: adapter.providerCode, displayName: 'Owned synthetic provider', status: 'ACTIVE', externalAccountHash: crypto.randomUUID(), currencyCode: 'XAF', settlementLedgerAccountId: bank.id, suspenseLedgerAccountId: suspense.id } });
  await db.settlementAccount.create({ data: { organizationId: x.organizationId, providerAccountId: provider.id, ledgerAccountId: bank.id, approvalStatus: 'APPROVED', effectiveFrom: new Date(0), metadata: { synthetic: true, notAnApproval: true } } });
  await db.paymentTransaction.create({ data: { organizationId: x.organizationId, providerAccountId: provider.id, amount: '100.25', currencyCode: 'XAF', direction: 'INBOUND', state: 'CONFIRMED', occurredAt: now, confirmedAt: now, providerReference: 'owned-missing-' + run, sourceType: 'OWNED_SYNTHETIC_PRECONDITION', metadata: { synthetic: true, authorityNotVerified: true } } });
  if (external) {
    const secret = crypto.randomBytes(32).toString('hex'), timestamp = String(now.getTime());
    const rawBody = JSON.stringify({ eventId: 'owned-orphan-' + run, transactionId: 'orphan-event-' + run, reference: 'orphan-event-' + run, eventType: 'PAYMENT_CONFIRMED', direction: 'INBOUND', amount: '50.10', currency: 'XAF', occurredAt: now.toISOString() });
    const signature = crypto.createHmac('sha256', secret).update(`${timestamp}.${adapter.canonicalPayload(rawBody)}`).digest('hex');
    const captured = await captureProviderEvent({ organizationId: x.organizationId, providerAccountId: provider.id, adapter, rawBody, headers: { 'x-provider-timestamp': timestamp, 'x-provider-signature': signature }, secret, now, receivedAt: now }); assert.equal(captured.status, 'CAPTURED');
    const imported = await importProviderStatement({ organizationId: x.organizationId, providerAccountId: provider.id, adapter, rawContent: JSON.stringify([{ transactionId: 'orphan-statement-' + run, reference: 'orphan-statement-' + run, amount: '80.15', currency: 'XAF', direction: 'CREDIT', occurredAt: now.toISOString() }]), fileName: 'owned-exception-link-' + run + '.json' }); assert.equal(imported.importedLineCount, 1);
  }
  return { ...x, provider, suspense };
}
(async () => {
  await f.local.withClient(f.target, f.local.assertOwned); report.originalBefore = await snapshot({ organizationId: { notIn: organizations } });
  const x = await fixture('success'), command = { organizationId: x.organizationId, providerAccountId: x.provider.id, businessDate: now, runById: x.actorId, correlationId: 'owned-link-' + run };
  const completed = await runPaymentReconciliation(command); assert.equal(completed.status, 'NEEDS_REVIEW'); assert.equal(completed.exceptionCount, 3); assert.equal(completed.suspenseAmount, '230.50');
  const exceptions = await db.paymentException.findMany({ where: { organizationId: x.organizationId, reconciliationRunId: completed.runId }, include: { suspenseItem: true } });
  assert.equal(exceptions.length, 3); assert.equal(new Set(exceptions.map(row => row.suspenseItemId)).size, 3);
  for (const row of exceptions) {
    assert.ok(row.suspenseItemId && row.suspenseItem); assert.equal(row.suspenseItem.evidence.exceptionId, row.id); assert.equal(row.suspenseItem.organizationId, row.organizationId); assert.equal(row.suspenseItem.reconciliationRunId, row.reconciliationRunId);
    const retained = { ownedSourceEvidence: { reference: 'retained-' + row.id }, ownedRecoveryReference: 'not-an-approval' };
    await db.paymentException.update({ where: { id: row.id }, data: { metadata: retained } });
    const result = await workflow.assignPaymentSuspenseItem({ organizationId: x.organizationId, suspenseItemId: row.suspenseItemId, assignedById: x.actorId, assignedToId: x.checkerId, control: { actorPermissions: ['payments.reconciliation.exception.assign'], now }, correlationId: 'owned-link-assign-' + row.id }); assert.equal(result.exceptionCount, 1);
    const assigned = await db.paymentException.findUniqueOrThrow({ where: { id: row.id } }); assert.equal(assigned.status, 'ASSIGNED'); assert.equal(assigned.ownerId, x.checkerId);
    assert.deepEqual(assigned.metadata.ownedSourceEvidence, retained.ownedSourceEvidence); assert.equal(assigned.metadata.ownedRecoveryReference, retained.ownedRecoveryReference);
    const current = await db.suspenseItem.findUniqueOrThrow({ where: { id: row.suspenseItemId }, include: { providerAccount: true, reconciliationRun: true } });
    await workflow.proposeSuspenseReclassification({ organizationId: x.organizationId, suspenseItemId: current.id, proposedById: x.actorId, targetType: current.type, reason: 'Owned source review with connected exception', suspenseLedgerAccountId: x.suspense.id,
      expectedEvidenceRevision: evidence.suspenseEvidenceRevision(current, now), idempotencyKey: crypto.randomUUID(), control: { actorPermissions: ['payments.reconciliation.suspense.propose'], now } });
    assert.equal((await db.paymentException.findUniqueOrThrow({ where: { id: row.id } })).status, 'RESOLUTION_PROPOSED');
    report.checks.push({ type: row.type, bidirectionalLink: true, assignmentReachedException: true, proposalReachedException: true, priorMetadataRetained: true });
  }
  assert.equal(await db.journalEntry.count({ where: { organizationId: x.organizationId } }), 0);
  const replaySnapshot = await snapshot({ organizationId: x.organizationId }); await assert.rejects(() => runPaymentReconciliation(command), /already exists/); assert.equal(await snapshot({ organizationId: x.organizationId }), replaySnapshot);
  report.checks.push({ duplicateRunRefusedWithoutDuplicatePairs: true, runStillNeedsReview: (await db.reconciliationRun.findUniqueOrThrow({ where: { id: completed.runId } })).status === 'NEEDS_REVIEW' });
  const conflictBefore = await snapshot({ organizationId: x.organizationId }), originalTransaction = db.$transaction.bind(db);
  db.$transaction = (work, options) => originalTransaction(tx => work(new Proxy(tx, { get(target, property) { if (property === 'paymentException') return new Proxy(target.paymentException, { get(model, method) { return method === 'updateMany' ? async () => ({ count: 0 }) : model[method]; } }); return target[property]; } })), options);
  try { await assert.rejects(() => workflow.assignPaymentSuspenseItem({ organizationId: x.organizationId, suspenseItemId: exceptions[0].suspenseItemId, assignedById: x.actorId, control: { actorPermissions: ['payments.reconciliation.exception.assign'], now } }), error => error.code === 'CONFLICT'); }
  finally { db.$transaction = originalTransaction; }
  assert.equal(await snapshot({ organizationId: x.organizationId }), conflictBefore); report.checks.push({ concurrentExceptionChangeRollsBackAssignmentAndNotifications: true, method: 'Injected zero-row compare-and-set result in the real transaction; not a two-client race test' });
  const broken = await fixture('rollback', false), before = await snapshot({ organizationId: broken.organizationId }), transaction = db.$transaction.bind(db);
  db.$transaction = (work, options) => transaction(tx => work(new Proxy(tx, { get(target, property) { if (property === 'paymentException') return new Proxy(target.paymentException, { get(model, method) {
    if (method === 'update') return args => { if (args.data.suspenseItemId) throw new Error('OWNED_LINK_WRITE_FAILURE'); return model.update(args); }; return model[method];
  } }); return target[property]; } })), options);
  try { await assert.rejects(() => runPaymentReconciliation({ organizationId: broken.organizationId, providerAccountId: broken.provider.id, businessDate: now, runById: broken.actorId }), /OWNED_LINK_WRITE_FAILURE/); }
  finally { db.$transaction = transaction; }
  assert.equal(await snapshot({ organizationId: broken.organizationId }), before); report.checks.push({ failedLinkRollsBackRunExceptionSuspenseAndNotifications: true });
})().catch(error => { report.error = f.safe(error); report.stack = String(error.stack).split('\n').slice(0, 5); }).finally(async () => {
  report.originalUnchanged = report.originalBefore === await snapshot({ organizationId: { notIn: organizations } }); report.sourcesAfter = sources(); report.sourceStable = JSON.stringify(report.sourcesBefore) === JSON.stringify(report.sourcesAfter);
  await db.$disconnect(); const file = 'reconciliation-exception-link-v108-' + run + '.json'; fs.writeFileSync(path.join(__dirname, file), JSON.stringify(report, null, 2), { flag: 'wx' });
  console.log(JSON.stringify({ file, checks: report.checks, error: report.error, stack: report.stack, originalUnchanged: report.originalUnchanged, sourceStable: report.sourceStable })); process.exit(!report.error && report.sourceStable && report.originalUnchanged ? 0 : 1);
});
