const helper = require('./registration-local.cjs'), target = helper.targetUrl;
helper.targetUrl = () => { const url = target(); url.searchParams.set('connection_limit', '4'); return url; };
const f = require('./statement-recipient-fixtures.cjs'), { db, fs, path, crypto, assert } = f;
const certification = require(path.join(f.root, 'services/reconciliation/payment-reconciliation-certification.service.ts'));
const reconciliation = require(path.join(f.root, 'services/reconciliation/payment-reconciliation-run.service.ts'));
const { captureProviderEvent } = require(path.join(f.root, 'services/payments/provider-event.service.ts'));
const { MobileMoneyHmacAdapter } = require(path.join(f.root, 'services/payments/adapters/mobile-money-hmac.adapter.ts'));
const permissions = ['payments.reconciliation.read', 'payments.reconciliation.run', 'payments.reconciliation.sign'];
const files = ['services/reconciliation/payment-reconciliation-certification.service.ts', 'services/reconciliation/payment-reconciliation-evidence.service.ts', 'services/reconciliation/reconciliation-run-preparation-evidence.ts', 'services/reconciliation/payment-reconciliation-run.service.ts'];
const hashes = () => Object.fromEntries(files.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root, file))).digest('hex')]));
const stamp = crypto.randomUUID(), result = { at: new Date().toISOString(), sourceBefore: hashes(), cases: [] };
async function fixture(label) {
  const org = await db.organization.create({ data: { name: helper.prefix + 'Sign ordering ' + label + ' ' + stamp, slug: 'sign-order-' + label + '-' + stamp, currency: 'XAF' } });
  const user = async role => db.user.create({ data: { organizationId: org.id, name: 'Owned ' + role, email: crypto.randomUUID() + '@example.invalid', isActive: true } });
  const maker = await user('maker'), signer = await user('signer'), other = await user('other signer');
  await require(path.join(f.root, 'services/accounting/periods.service.ts')).createFiscalYearWithPeriods(org.id, { name: 'Owned sign ordering 2026', startDate: new Date('2026-01-01T00:00:00Z'), endDate: new Date('2026-12-31T23:59:59.999Z') }, maker.id);
  const bank = await db.chartOfAccount.create({ data: { organizationId: org.id, code: 'OWNED-BANK', nameEn: 'Synthetic settlement', type: 'ASSET', normalBalance: 'DEBIT' } });
  const suspense = await db.chartOfAccount.create({ data: { organizationId: org.id, code: 'OWNED-SUSPENSE', nameEn: 'Synthetic suspense', type: 'ASSET', normalBalance: 'DEBIT' } });
  const rail = await db.paymentRail.create({ data: { organizationId: org.id, type: 'MOBILE_MONEY', code: 'OWNED-ORDER', name: 'Synthetic rail' } });
  const adapter = new MobileMoneyHmacAdapter('OWNED-ORDER'), reference = crypto.randomUUID(), now = new Date();
  const provider = await db.providerAccount.create({ data: { organizationId: org.id, paymentRailId: rail.id, providerCode: adapter.providerCode, displayName: 'Owned request ordering', externalAccountHash: f.hash(reference), status: 'ACTIVE', currencyCode: 'XAF', settlementLedgerAccountId: bank.id, suspenseLedgerAccountId: suspense.id } });
  await db.settlementAccount.create({ data: { organizationId: org.id, providerAccountId: provider.id, ledgerAccountId: bank.id, approvalStatus: 'APPROVED', requestedById: maker.id, approvedById: signer.id, approvedAt: now, effectiveFrom: new Date('2026-01-01'), metadata: { synthetic: true, noLiveAuthority: true } } });
  await db.paymentTransaction.create({ data: { organizationId: org.id, providerAccountId: provider.id, amount: '100.25', currencyCode: 'XAF', direction: 'INBOUND', state: 'CONFIRMED', occurredAt: now, confirmedAt: now, providerTransactionId: reference, providerReference: reference, sourceType: 'SYNTHETIC_WORKFLOW_VERIFICATION' } });
  const rawBody = JSON.stringify({ eventId: 'event-' + reference, transactionId: reference, reference, eventType: 'PAYMENT_CONFIRMED', direction: 'INBOUND', amount: '100.25', currency: 'XAF', occurredAt: now.toISOString() });
  const secret = crypto.randomBytes(32).toString('hex'), timestamp = String(now.getTime());
  const signature = crypto.createHmac('sha256', secret).update(`${timestamp}.${adapter.canonicalPayload(rawBody)}`).digest('hex');
  await captureProviderEvent({ organizationId: org.id, providerAccountId: provider.id, adapter, rawBody, headers: { 'x-provider-timestamp': timestamp, 'x-provider-signature': signature }, secret, now, receivedAt: now });
  const run = await reconciliation.runPaymentReconciliation({ organizationId: org.id, providerAccountId: provider.id, businessDate: now, runById: maker.id });
  assert.equal(run.status, 'READY_FOR_SIGNOFF'); assert.equal(run.matchCount, 1);
  const review = await certification.previewReconciliationSignOff({ organizationId: org.id, runId: run.runId, actorId: signer.id, actorPermissions: permissions });
  assert.equal(review.canSign, true);
  return { org, maker, signer, other, run, review, provider, adapter };
}
async function main() {
  await helper.withClient(f.target, helper.assertOwned);
  for (const sameSigner of process.argv.includes('--source-arrival') ? [] : [true, false]) {
    const x = await fixture(sameSigner ? 'same' : 'different'), row = { sameSigner }; result.cases.push(row);
    const command = actor => { const now = new Date(); return { organizationId: x.org.id, runId: x.run.runId, signedById: actor, expectedSourceVersionHash: x.review.expectedSourceVersionHash, expectedEvidenceRevision: x.review.expectedEvidenceRevision, control: { actorPermissions: permissions, now, lastAuthAt: now } }; };
    const financial = async () => f.hash(await Promise.all(['journalEntry', 'journalEntryLine', 'paymentTransaction'].map(model => db[model].findMany({ where: { organizationId: x.org.id }, orderBy: { id: 'asc' } }))));
    const before = await financial(), original = db.$transaction.bind(db); let release, entered, first = true;
    const gate = new Promise(resolve => { release = resolve; }), started = new Promise(resolve => { entered = resolve; });
    // Delay only the first request before its transaction, as connection-pool or
    // scheduling contention can do. Actual normalization occurs before this gate.
    db.$transaction = async (...args) => { if (first) { first = false; entered(); await gate; } return original(...args); };
    let early;
    try {
      const input = command(x.signer.id); row.earlyRequestAt = input.control.now.toISOString();
      early = certification.signReconciliationRun(input).then(value => ({ value }), error => ({ error: f.safe(error) }));
      await started;
      await new Promise(resolve => setTimeout(resolve, 5));
      const winner = await certification.signReconciliationRun(command(sameSigner ? x.signer.id : x.other.id));
      row.winner = winner; release(); row.earlier = await early;
      assert.ok(Date.parse(winner.signedAt) > Date.parse(row.earlyRequestAt), 'Fixture must expose later-start winner');
      assert.ok(row.earlier.value, 'Earlier request must recover valid later-start signature: ' + row.earlier.error);
      assert.equal(row.earlier.value.certificateHash, winner.certificateHash);
      assert.equal(row.earlier.value.replayed, sameSigner);
      assert.equal(row.earlier.value.completedByAnotherActor, !sameSigner);
      assert.equal(await db.ledgerAuditEvent.count({ where: { organizationId: x.org.id, action: 'PAYMENT_RECONCILIATION_RUN_SIGN' } }), 1);
      assert.equal(await db.businessEvent.count({ where: { organizationId: x.org.id, eventType: 'payment.reconciliation.signed' } }), 1);
      assert.equal(await financial(), before); row.noDuplicateOrFinancialEffects = true;
    } finally { release?.(); if (early) await early; db.$transaction = original; }
    console.log(JSON.stringify({ sameSigner, passed: true }));
  }
  for (const sameSigner of process.argv.includes('--source-arrival') ? [] : [true, false]) {
    const x = await fixture(sameSigner ? 'concurrent-same' : 'concurrent-other');
    const row = { sameSigner, simultaneousTransactions: true, readyReads: 0 }; result.cases.push(row);
    const original = db.$transaction.bind(db); let release;
    const gate = new Promise(resolve => { release = resolve; });
    // Both real Serializable transactions observe READY before either proceeds
    // to period locking and the conditional signature write.
    db.$transaction = async (callback, options) => original(async tx => {
      const runs = new Proxy(tx.reconciliationRun, { get(model, key) {
        if (key !== 'findFirst') return Reflect.get(model, key);
        return async args => {
          const value = await model.findFirst(args);
          if (args.include?.providerAccount) {
            assert.equal(value.status, 'READY_FOR_SIGNOFF'); row.readyReads += 1;
            if (row.readyReads === 2) release();
            await gate;
          }
          return value;
        };
      } });
      return callback(new Proxy(tx, { get(client, key) { return key === 'reconciliationRun' ? runs : Reflect.get(client, key); } }));
    }, options);
    const command = actor => { const now = new Date(); return { organizationId: x.org.id, runId: x.run.runId, signedById: actor, expectedSourceVersionHash: x.review.expectedSourceVersionHash, expectedEvidenceRevision: x.review.expectedEvidenceRevision, control: { actorPermissions: permissions, now, lastAuthAt: now } }; };
    const timer = setTimeout(() => release(), 10000);
    try {
      const settled = await Promise.allSettled([certification.signReconciliationRun(command(x.signer.id)), certification.signReconciliationRun(command(sameSigner ? x.signer.id : x.other.id))]);
      row.results = settled.map(value => value.status === 'fulfilled' ? { value: value.value } : { error: f.safe(value.reason) });
      assert.equal(row.readyReads, 2);
      assert.ok(settled.every(value => value.status === 'fulfilled'), JSON.stringify(row.results));
      const values = settled.map(value => value.value);
      assert.equal(values[0].certificateHash, values[1].certificateHash);
      assert.equal(values.filter(value => !value.replayed && !value.completedByAnotherActor).length, 1);
      assert.equal(await db.ledgerAuditEvent.count({ where: { organizationId: x.org.id, action: 'PAYMENT_RECONCILIATION_RUN_SIGN' } }), 1);
      assert.equal(await db.businessEvent.count({ where: { organizationId: x.org.id, eventType: 'payment.reconciliation.signed' } }), 1);
      assert.equal(await db.journalEntry.count({ where: { organizationId: x.org.id } }), 0);
      row.noDuplicateOrFinancialEffects = true;
    } finally { clearTimeout(timer); release(); db.$transaction = original; }
    console.log(JSON.stringify({ sameSigner, simultaneousTransactions: true, passed: true }));
  }
  if (process.argv.includes('--source-arrival')) {
    const x = await fixture('source-arrival'), reference = crypto.randomUUID(), now = new Date();
    const rawBody = JSON.stringify({ eventId: 'late-' + reference, transactionId: reference, reference, eventType: 'PAYMENT_CONFIRMED', direction: 'INBOUND', amount: '25.00', currency: 'XAF', occurredAt: now.toISOString() });
    const secret = crypto.randomBytes(32).toString('hex'), timestamp = String(now.getTime());
    const signature = crypto.createHmac('sha256', secret).update(`${timestamp}.${x.adapter.canonicalPayload(rawBody)}`).digest('hex');
    await captureProviderEvent({ organizationId: x.org.id, providerAccountId: x.provider.id, adapter: x.adapter, rawBody, headers: { 'x-provider-timestamp': timestamp, 'x-provider-signature': signature }, secret, now, receivedAt: now });
    const preview = await certification.previewReconciliationSignOff({ organizationId: x.org.id, runId: x.run.runId, actorId: x.signer.id, actorPermissions: permissions });
    result.cases.push({ sourceArrival: true, preview });
    assert.equal(preview.canSign, false, 'New unmatched provider evidence must require reconciliation before offering sign-off');
    assert.equal(preview.blocker, 'UNRECONCILED_SOURCES');
    const signTime = new Date();
    await assert.rejects(() => certification.signReconciliationRun({ organizationId: x.org.id, runId: x.run.runId, signedById: x.signer.id,
      control: { actorPermissions: permissions, now: signTime, lastAuthAt: signTime } }), /not covered by this reconciliation run/);
    assert.equal((await db.reconciliationRun.findUniqueOrThrow({ where: { id: x.run.runId } })).status, 'READY_FOR_SIGNOFF');
    assert.equal(await db.ledgerAuditEvent.count({ where: { organizationId: x.org.id, action: 'PAYMENT_RECONCILIATION_RUN_SIGN' } }), 0);
    assert.equal(await db.businessEvent.count({ where: { organizationId: x.org.id, eventType: 'payment.reconciliation.signed' } }), 0);
    result.cases.at(-1).directSigningDeniedWithoutEffects = true;
    await assert.rejects(() => reconciliation.runPaymentReconciliation({ organizationId: x.org.id, providerAccountId: x.provider.id, businessDate: now, runById: x.maker.id }), /already exists/);
    assert.equal(await db.reconciliationRun.count({ where: { organizationId: x.org.id } }), 1);
    assert.equal(await db.matchRecord.count({ where: { organizationId: x.org.id } }), 1);
    result.cases.at(-1).rerunRecoveryUnavailableWithoutDiscardingExistingRun = true;
  }
  result.passed = true;
}
module.exports = { fixture };
if (require.main === module) main().catch(error => { result.passed = false; result.error = f.safe(error); process.exitCode = 1; }).finally(async () => {
  result.sourceAfter = hashes(); result.sourceStable = JSON.stringify(result.sourceBefore) === JSON.stringify(result.sourceAfter);
  const output = path.join(__dirname, 'signoff-request-order-' + stamp + '.json'); fs.writeFileSync(output, JSON.stringify(result, null, 2), { flag: 'wx' });
  console.log(JSON.stringify({ output, passed: result.passed, error: result.error, sourceStable: result.sourceStable })); await db.$disconnect(); process.exit(process.exitCode || 0);
});
