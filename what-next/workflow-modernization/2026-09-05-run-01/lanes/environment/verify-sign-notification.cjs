const { fixture } = require('./verify-signoff-request-order.cjs');
const f = require('./statement-recipient-fixtures.cjs'), { db, fs, path, crypto, assert, helper } = f;
const { signReconciliationRun } = require(path.join(f.root, 'services/reconciliation/payment-reconciliation-certification.service.ts'));
const { runReconciliationSignNotificationWorker: deliver } = require(path.join(f.root, 'services/reconciliation/reconciliation-sign-notification.worker.ts'));
const files = ['services/reconciliation/reconciliation-sign-notification.worker.ts', 'services/events/business-event-outbox.service.ts', 'services/reconciliation/payment-reconciliation-notifications.ts', 'services/reconciliation/payment-reconciliation-certification.service.ts'];
const hashes = () => Object.fromEntries(files.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root, file))).digest('hex')]));
const stamp = crypto.randomUUID(), report = { at: new Date().toISOString(), sourceBefore: hashes(), checks: [] };
async function signedFixture(label) {
  const x = await fixture(label), now = new Date();
  await signReconciliationRun({ organizationId: x.org.id, runId: x.run.runId, signedById: x.signer.id, expectedSourceVersionHash: x.review.expectedSourceVersionHash, expectedEvidenceRevision: x.review.expectedEvidenceRevision, control: { now, lastAuthAt: now, actorPermissions: ['payments.reconciliation.read', 'payments.reconciliation.sign'] } });
  return x;
}
const noticeWhere = x => ({ organizationId: x.org.id, idempotencyKey: { startsWith: 'payment-reconciliation.run.signed:' } });
const financial = async x => f.hash(await Promise.all(['reconciliationRun', 'matchRecord', 'paymentTransaction', 'journalEntry', 'businessEvent'].map(model => db[model].findMany({ where: { organizationId: x.org.id }, orderBy: { id: 'asc' } }))));
async function main() {
  await helper.withClient(f.target, helper.assertOwned);
  const x = await signedFixture('notification-concurrent'), before = await financial(x);
  const otherOutbox = await db.businessEventOutbox.findMany({ where: { organizationId: x.org.id, eventName: { not: 'payment.reconciliation.signed' } }, orderBy: { id: 'asc' } });
  const results = await Promise.all([deliver({ organizationId: x.org.id, workerId: 'owned-a-' + stamp }), deliver({ organizationId: x.org.id, workerId: 'owned-b-' + stamp })]);
  assert.equal(results.flat().length, 1); assert.equal(results.flat()[0].status, 'SENT');
  assert.equal(await db.paymentReconciliationInboxItem.count({ where: noticeWhere(x) }), 1);
  assert.deepEqual(await db.businessEventOutbox.findMany({ where: { organizationId: x.org.id, eventName: { not: 'payment.reconciliation.signed' } }, orderBy: { id: 'asc' } }), otherOutbox);
  assert.equal(await financial(x), before);
  assert.deepEqual(await deliver({ organizationId: x.org.id, workerId: 'owned-repeat-' + stamp }), []);
  report.checks.push('Two workers publish one signed observation; unrelated provider outbox and all financial/signature records remain unchanged.');
  const retry = await signedFixture('notification-response-loss'), original = db.$transaction.bind(db); let fail = true;
  db.$transaction = (callback, options) => original(tx => callback(new Proxy(tx, { get(client, key) {
    if (key !== 'businessEventAudit') return Reflect.get(client, key);
    return new Proxy(client.businessEventAudit, { get(model, method) {
      if (method !== 'create') return Reflect.get(model, method);
      return args => { if (fail && args.data.action === 'OUTBOX_DELIVERED') { fail = false; throw new Error('Owned acknowledgement failure after inbox commit'); } return model.create(args); };
    } });
  } })), options);
  try { const first = await deliver({ organizationId: retry.org.id, workerId: 'owned-loss-' + stamp }); assert.equal(first[0].status, 'FAILED'); }
  finally { db.$transaction = original; }
  const retained = await db.paymentReconciliationInboxItem.findFirstOrThrow({ where: noticeWhere(retry) });
  const failed = await db.businessEventOutbox.findFirstOrThrow({ where: { organizationId: retry.org.id, eventName: 'payment.reconciliation.signed' } });
  assert.equal(failed.status, 'FAILED'); assert.equal(failed.attempts, 1);
  assert.deepEqual(await deliver({ organizationId: retry.org.id, workerId: 'owned-too-early-' + stamp }), []);
  console.log(JSON.stringify({ waitingForExistingRetryBackoffMs: Math.max(0, failed.availableAt.getTime() - Date.now()) }));
  await new Promise(resolve => setTimeout(resolve, Math.max(0, failed.availableAt.getTime() - Date.now()) + 20));
  const second = await deliver({ organizationId: retry.org.id, workerId: 'owned-retry-' + stamp }); assert.equal(second[0].status, 'SENT');
  assert.equal(await db.paymentReconciliationInboxItem.count({ where: noticeWhere(retry) }), 1);
  assert.deepEqual(await db.paymentReconciliationInboxItem.findUniqueOrThrow({ where: { id: retained.id } }), retained);
  assert.equal(await db.businessEventAudit.count({ where: { organizationId: retry.org.id, action: 'OUTBOX_DELIVERED' } }), 1);
  report.checks.push('Committed inbox publication survives lost acknowledgement; FAILED/backoff prevents early retry, then exact delivery retains original bytes and one delivered audit.');
  report.passed = true;
}
module.exports = { signedFixture };
if (require.main === module) main().catch(error => { report.passed = false; report.error = f.safe(error); process.exitCode = 1; }).finally(async () => {
  report.sourceAfter = hashes(); report.sourceStable = JSON.stringify(report.sourceBefore) === JSON.stringify(report.sourceAfter);
  const output = path.join(__dirname, 'sign-notification-' + stamp + '.json'); fs.writeFileSync(output, JSON.stringify(report, null, 2), { flag: 'wx' });
  console.log(JSON.stringify({ output, passed: report.passed, error: report.error, sourceStable: report.sourceStable })); await db.$disconnect(); process.exit(process.exitCode || 0);
});
