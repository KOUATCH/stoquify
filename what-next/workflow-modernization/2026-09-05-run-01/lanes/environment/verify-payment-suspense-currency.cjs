const f = require('./statement-recipient-fixtures.cjs'), { db, fs, path, crypto, assert } = f;
const { getPaymentTruthSnapshot } = require(path.join(f.root, 'services/snapshots/payment-truth-snapshot.service.ts'));
const stamp = crypto.randomUUID(), baseline = process.argv.includes('--baseline');
const source = () => crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root, 'services/snapshots/payment-truth-snapshot.service.ts'))).digest('hex');
const result = { at: new Date().toISOString(), baseline, sourceBefore: source() };
async function main() {
  await f.helper.withClient(f.target, f.helper.assertOwned);
  const org = await db.organization.create({ data: { name: f.helper.prefix + 'Suspense currency ' + stamp, slug: 'suspense-currency-' + stamp, currency: 'XAF' } });
  const scope = { organizationId: org.id, now: new Date() };
  await db.suspenseItem.create({ data: { organizationId: org.id, type: 'OTHER', amount: '100.00', currencyCode: 'XAF' } });
  const foreign = await db.suspenseItem.create({ data: { organizationId: org.id, type: 'OTHER', amount: '20.00', currencyCode: 'USD' } });
  const mixed = await getPaymentTruthSnapshot(scope);
  result.mixed = mixed.metrics;
  if (baseline) { assert.equal(mixed.metrics.openSuspenseAmount, 120); result.invalidCombinedTotalReproduced = true; }
  else {
    assert.equal(mixed.metrics.openSuspenseAmount, null);
    assert.equal(mixed.metrics.openSuspenseCount, 2);
    assert.ok(mixed.blockers.some(b => b.id === 'payment-suspense-currency-mismatch'));
    assert.deepEqual(mixed.metrics.openSuspenseByCurrency, [{ currencyCode: 'USD', amount: 20, count: 1 }, { currencyCode: 'XAF', amount: 100, count: 1 }]);
    await db.suspenseItem.update({ where: { id: foreign.id }, data: { status: 'RESOLVED' } });
    const single = await getPaymentTruthSnapshot(scope); assert.equal(single.metrics.openSuspenseAmount, 100); assert.equal(single.metrics.openSuspenseCount, 1);
    const other = await db.organization.create({ data: { name: f.helper.prefix + 'Foreign currency ' + stamp, slug: 'foreign-currency-' + stamp, currency: 'XAF' } });
    await db.suspenseItem.create({ data: { organizationId: other.id, type: 'OTHER', amount: '999999.00', currencyCode: 'EUR' } });
    const isolated = await getPaymentTruthSnapshot(scope); assert.equal(isolated.metrics.openSuspenseAmount, 100); assert.deepEqual(isolated.metrics.openSuspenseByCurrency, single.metrics.openSuspenseByCurrency);
    await db.suspenseItem.update({ where: { id: foreign.id }, data: { status: 'OPEN' } });
    assert.equal((await getPaymentTruthSnapshot(scope)).metrics.openSuspenseAmount, null);
    assert.equal(await db.journalEntry.count({ where: { organizationId: org.id } }), 0);
    assert.equal(await db.payment.count({ where: { organizationId: org.id } }), 0);
    result.recoveryAndTenantIsolation = true;
  }
  result.passed = true;
}
main().catch(error => { result.passed = false; result.error = f.safe(error); process.exitCode = 1; }).finally(async () => {
  result.sourceAfter = source(); const output = path.join(__dirname, 'payment-suspense-currency-' + stamp + '.json');
  fs.writeFileSync(output, JSON.stringify(result, null, 2), { flag: 'wx' }); console.log(JSON.stringify({ output, ...result })); await db.$disconnect();
});
