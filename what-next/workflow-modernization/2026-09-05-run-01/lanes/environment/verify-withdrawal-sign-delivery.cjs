const f = require('./statement-recipient-fixtures.cjs'), { db, fs, path, crypto, assert } = f;
const { runReconciliationSignNotificationWorker } = require(path.join(f.root, 'services/reconciliation/reconciliation-sign-notification.worker.ts'));
const input = path.join(__dirname, 'source-withdrawal-426b3f37-d90e-48a1-b103-2137df67b2d3.json');
const previous = JSON.parse(fs.readFileSync(input, 'utf8'));
const report = { at: new Date().toISOString(), input: path.basename(input), cases: [], inputHash: crypto.createHash('sha256').update(fs.readFileSync(input)).digest('hex') };
const files = ['services/reconciliation/reconciliation-sign-notification.worker.ts', 'services/reconciliation/payment-reconciliation-certification.service.ts', 'services/reconciliation/payment-reconciliation-notifications.ts'];
const hashes = () => Object.fromEntries(files.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root, file))).digest('hex')]));
report.sourcesBefore = hashes();
(async () => {
  await f.helper.withClient(f.target, f.helper.assertOwned); assert.equal(previous.passed, true);
  for (const fixture of previous.cases) {
    const organizationId = fixture.organizationId;
    assert.ok((await db.organization.findUniqueOrThrow({ where: { id: organizationId } })).name.startsWith(f.helper.prefix));
    const events = await db.businessEvent.findMany({ where: { organizationId, eventType: 'payment.reconciliation.signed', sourceId: fixture.runId } });
    assert.equal(events.length, 2); assert.notEqual(events[0].documentHash, events[1].documentHash);
    for (const event of events) assert.equal(event.idempotencyKey, `reconciliation-run:${fixture.runId}:signed:${event.documentHash}`);
    const workerId = 'owned-withdrawal-' + crypto.randomUUID();
    await runReconciliationSignNotificationWorker({ organizationId, workerId });
    await runReconciliationSignNotificationWorker({ organizationId, workerId });
    assert.equal(await db.paymentReconciliationInboxItem.count({ where: { organizationId, idempotencyKey: { startsWith: 'payment-reconciliation.run.signed:' } } }), 2);
    const outbox = await db.businessEventOutbox.findMany({ where: { organizationId, eventName: 'payment.reconciliation.signed' } });
    assert.equal(outbox.length, 2); assert.ok(outbox.every(row => row.status === 'SENT'), JSON.stringify(outbox.map(row => row.status)));
    report.cases.push({ kind: fixture.kind, organizationId, distinctCertificateEvents: 2, durableInboxObservations: 2, duplicateWorkerRetry: true });
  }
  report.passed = true;
})().catch(error => { report.passed = false; report.error = f.safe(error); process.exitCode = 1; }).finally(async () => {
  report.sourcesAfter = hashes(); report.sourceStable = JSON.stringify(report.sourcesBefore) === JSON.stringify(report.sourcesAfter);
  const output = path.join(__dirname, 'withdrawal-sign-delivery-' + crypto.randomUUID() + '.json');
  fs.writeFileSync(output, JSON.stringify(report, null, 2), { flag: 'wx' }); console.log(JSON.stringify({ output, passed: report.passed, error: report.error, sourceStable: report.sourceStable })); await db.$disconnect(); process.exit(process.exitCode || 0);
});
