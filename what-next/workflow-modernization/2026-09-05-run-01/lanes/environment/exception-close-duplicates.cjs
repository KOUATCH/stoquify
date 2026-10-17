'use strict';
if (process.argv[2] !== '--run') { console.log('Inert; requires --run for newly owned duplicate-decision fixtures.'); process.exit(0); }
const h = require('./sign-close-fixtures.cjs'), { p, f, db, root } = h, { fs, path, crypto, assert } = f;
const closure = require(path.join(root, 'services/reconciliation/payment-exception-closure.service.ts'));
const additional = require(path.join(root, 'services/reconciliation/reconciliation-additional-sources.service.ts'));
const { captureProviderEvent } = require(path.join(root, 'services/payments/provider-event.service.ts'));
const { MobileMoneyHmacAdapter } = require(path.join(root, 'services/payments/adapters/mobile-money-hmac.adapter.ts'));
const sources = () => ({ ...h.sources(), ...Object.fromEntries(Object.keys(require.cache).filter(file => file.startsWith(root + path.sep) && !file.includes(path.sep + 'node_modules' + path.sep) && !file.includes(path.sep + '.auth' + path.sep) && /\.(ts|js|cjs)$/.test(file)).map(file => [path.relative(root, file).replaceAll('\\', '/'), p.sha(fs.readFileSync(file))])) });
function control(x, actorId = x.actorId) { const now = new Date(); return { organizationId: x.organizationId, actorId, actorPermissions: ['payments.reconciliation.read', 'payments.reconciliation.run', 'payments.reconciliation.exception.resolve', 'accounting.journal.read'], now, lastAuthAt: now }; }
async function fixture(label) {
  let certified, artifact, retained;
  const x = await h.fixture('exception-' + label, async base => { certified = await p.assessment(base, 'before-exception'); artifact = await p.certify(certified, 'before-exception'); retained = await p.retained(certified); });
  await require(path.join(root, 'services/accounting/periods.service.ts')).createFiscalYearWithPeriods(x.organizationId, { name: 'Owned earlier exception collector', startDate: new Date('2025-01-01'), endDate: new Date('2025-01-31T23:59:59.999Z') }, x.actorId);
  x.periodId = (await db.accountingPeriod.findFirstOrThrow({ where: { organizationId: x.organizationId, endDate: { lt: new Date('2026-01-01') } } })).id;
  const run = await db.reconciliationRun.findUniqueOrThrow({ where: { id: x.reconciliationRunId } });
  const match = await db.matchRecord.findFirstOrThrow({ where: { organizationId: x.organizationId, reconciliationRunId: run.id, status: 'AUTO_MATCHED' } });
  const payment = await db.paymentTransaction.findFirstOrThrow({ where: { organizationId: x.organizationId, providerAccountId: run.providerAccountId, id: match.paymentTransactionId } });
  const provider = await db.providerAccount.findUniqueOrThrow({ where: { id: run.providerAccountId } }), adapter = new MobileMoneyHmacAdapter(provider.providerCode), now = new Date();
  const rawBody = JSON.stringify({ eventId: 'late-corroboration-' + crypto.randomUUID(), transactionId: payment.providerTransactionId, reference: payment.providerReference, eventType: 'PAYMENT_CONFIRMED', direction: payment.direction, amount: payment.amount.toFixed(2), currency: payment.currencyCode, occurredAt: payment.occurredAt.toISOString() });
  const secret = crypto.randomBytes(32).toString('hex'), timestamp = String(now.getTime()), signature = crypto.createHmac('sha256', secret).update(`${timestamp}.${adapter.canonicalPayload(rawBody)}`).digest('hex');
  await captureProviderEvent({ organizationId: x.organizationId, providerAccountId: provider.id, adapter, rawBody, headers: { 'x-provider-timestamp': timestamp, 'x-provider-signature': signature }, secret, now, receivedAt: now });
  const preview = await additional.previewAdditionalReconciliationSources({ runId: x.reconciliationRunId }, control(x));
  await additional.incorporateAdditionalReconciliationSources({ runId: x.reconciliationRunId, expectedRevision: preview.revision, reason: 'Investigate actual late corroborating source without another allocation', idempotencyKey: crypto.randomUUID() }, control(x));
  const exception = await db.paymentException.findFirstOrThrow({ where: { organizationId: x.organizationId, reconciliationRunId: x.reconciliationRunId } }); assert.equal(exception.type, 'MANUAL_REVIEW_REQUIRED');
  const reviewer = await db.user.create({ data: { organizationId: x.organizationId, name: 'Owned independent withdrawal reviewer', email: crypto.randomUUID() + '@example.invalid', isActive: true } });
  return { ...x, exceptionId: exception.id, reviewerId: reviewer.id, certified, artifact, retained };
}
async function decision(x, purpose) {
  const input = { exceptionId: x.exceptionId, ...(purpose ? { purpose } : {}) };
  const review = await closure.previewExceptionClosure(input, control(x));
  const proposed = await closure.proposeExceptionClosure({ ...input, expectedRevision: review.revision, reason: purpose ? 'Withdraw the earlier source interpretation for renewed investigation' : 'Review corroboration of the original retained allocation', idempotencyKey: crypto.randomUUID() }, control(x));
  return { exceptionId: x.exceptionId, proposalId: proposed.proposalId, expectedRevision: review.revision, decision: 'APPROVE', reason: 'Independent review of the source decision and retained evidence' };
}

const report = { at: new Date().toISOString(), scope: 'Actual simultaneous identical exception approval after moving the row lock; no other workflow claim.' };
async function main() {
  await p.guard(); report.sourcesBefore = sources(); report.outsideBefore = await h.outside();
  const x = await fixture('same-command'), command = await decision(x), economic = f.hash(await p.rows(x, p.economicModels));
  const results = await Promise.allSettled([closure.decideExceptionClosure(command, control(x, x.certifierId)), closure.decideExceptionClosure(command, control(x, x.certifierId))]);
  assert.ok(results.some(row => row.status === 'fulfilled'), JSON.stringify(results.map(row => row.status === 'fulfilled' ? row.value : p.safeError(row.reason))));
  const replay = await closure.decideExceptionClosure(command, control(x, x.certifierId)); assert.equal(replay.replayed, true);
  assert.equal(await db.paymentReconciliationInboxItem.count({ where: { organizationId: x.organizationId, idempotencyKey: 'exception-closure-decision:' + command.proposalId } }), 1);
  assert.equal(await db.ledgerAuditEvent.count({ where: { organizationId: x.organizationId, resourceId: x.exceptionId, action: 'EXCEPTION_CLOSURE_APPROVE' } }), 1);
  assert.equal((await db.paymentException.findUniqueOrThrow({ where: { id: x.exceptionId } })).metadata.closureReceiptId, replay.receiptId);
  const before = f.hash({ core: await p.rows(x), source: await h.extraRows(x.organizationId) });
  await assert.rejects(closure.decideExceptionClosure({ ...command, decision: 'REJECT' }, control(x, x.certifierId)));
  assert.equal(f.hash({ core: await p.rows(x), source: await h.extraRows(x.organizationId) }), before);
  assert.equal(f.hash(await p.rows(x, p.economicModels)), economic);
  report.result = { organizationId: x.organizationId, receiptId: replay.receiptId, concurrent: results.map(row => row.status === 'fulfilled' ? { status: row.status, value: row.value } : { status: row.status, error: p.safeError(row.reason) }), singleReceiptAndApproval: true, changedDecisionRefusedWithoutEffects: true, financialUnchanged: true };
}
main().catch(error => { report.error = p.safeError(error); }).finally(async () => {
  try { report.sourcesAfter = sources(); report.sourceStable = JSON.stringify(report.sourcesBefore) === JSON.stringify(report.sourcesAfter); report.outsideAfter = await h.outside(); report.outsideUnchanged = f.hash(report.outsideBefore) === f.hash(report.outsideAfter); } catch (error) { report.finalizationError = p.safeError(error); }
  await db.$disconnect(); report.passed = !report.error && !report.finalizationError && !!report.result && report.sourceStable && report.outsideUnchanged;
  const file = path.join(__dirname, 'exception-close-duplicate-' + crypto.randomUUID() + '.json'); fs.writeFileSync(file, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' }); console.log(JSON.stringify({ file, passed: report.passed, error: report.error, result: report.result, sourceStable: report.sourceStable, outsideUnchanged: report.outsideUnchanged })); process.exit(report.passed ? 0 : 1);
});
