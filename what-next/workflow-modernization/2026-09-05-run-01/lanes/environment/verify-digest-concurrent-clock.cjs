const helper = require('./registration-local.cjs'), originalTarget = helper.targetUrl;
helper.targetUrl = () => { const value = originalTarget(); value.searchParams.set('connection_limit', '2'); return value; };
const f = require('./statement-recipient-fixtures.cjs'), { db, fs, path, crypto, assert } = f;
const { getDailyHabitDigestData } = require(path.join(f.root, 'services/daily-habit/daily-habit-digest.service.ts'));
const NativeDate = Date, stamp = crypto.randomUUID();
const files = ['services/daily-habit/daily-habit-digest.service.ts', 'services/snapshots/snapshot-utils.ts', 'services/snapshots/tenant-operating-snapshot.service.ts', 'services/snapshots/payment-truth-snapshot.service.ts', 'services/snapshots/inventory-cash-snapshot.service.ts', 'services/snapshots/close-readiness-snapshot.service.ts'];
const hashes = () => Object.fromEntries(files.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root, file))).digest('hex')]));
const result = { at: new NativeDate().toISOString(), sourceBefore: hashes(), cases: [] };
async function main() {
  await f.helper.withClient(f.target, f.helper.assertOwned);
  const tenants = [];
  for (const [index, amounts] of [[0, [100, 250]], [1, [900, 1900]]]) {
    const org = await db.organization.create({ data: { name: f.helper.prefix + 'Concurrent Digest ' + index + ' ' + stamp, slug: 'digest-clock-' + index + '-' + stamp, currency: 'XAF' } });
    const actor = await db.user.create({ data: { organizationId: org.id, email: 'digest-clock-' + index + '-' + stamp + '@example.invalid' } });
    const customer = await db.customer.create({ data: { organizationId: org.id, name: 'Owned customer' } });
    const location = await db.location.create({ data: { organizationId: org.id, name: 'Owned site', code: 'SITE' } });
    for (const [day, amount] of [[19, amounts[0]], [20, amounts[1]]]) await db.salesOrder.create({ data: { organizationId: org.id, customerId: customer.id, locationId: location.id, createdById: actor.id, orderNumber: 'CLOCK-' + index + '-' + day + '-' + stamp, status: 'COMPLETED', orderDate: new NativeDate('2026-09-' + day + 'T12:00:00Z'), subtotal: amount, total: amount } });
    tenants.push({ org, actor });
  }
  const where = { organizationId: { in: tenants.map(t => t.org.id) } };
  const effects = async () => JSON.stringify({ sales: await db.salesOrder.findMany({ where, orderBy: { id: 'asc' }, select: { id: true, organizationId: true, total: true, status: true, orderDate: true, updatedAt: true } }), journals: await db.journalEntry.count({ where }), payments: await db.payment.count({ where }), events: await db.businessEvent.count({ where }) });
  const before = await effects(), original = db.suspenseItem.groupBy;
  let release;
  try {
    for (const locale of ['en', 'fr']) {
      let clock = NativeDate.parse('2026-09-19T23:59:59.999Z'), signalled, held = false;
      const gate = new Promise(resolve => { signalled = resolve; });
      const wait = new Promise(resolve => { release = resolve; });
      global.Date = class extends NativeDate { constructor(...args) { if (args.length) super(...args); else super(clock); } static now() { return clock; } };
      db.suspenseItem.groupBy = async args => {
        const value = await original.call(db.suspenseItem, args);
        if (args.where?.organizationId === tenants[0].org.id && !held) { held = true; signalled(); await wait; }
        return value;
      };
      const read = tenant => getDailyHabitDigestData({ locale, organizationId: tenant.org.id, actorId: tenant.actor.id, actorPermissions: ['analytics.read'], actorRoleCodes: ['owner'] });
      const early = read(tenants[0]);
      await gate;
      clock = NativeDate.parse('2026-09-20T00:00:01.000Z');
      const [late, foreign] = await Promise.all([read(tenants[0]), read(tenants[1])]);
      release(); const earlier = await early;
      const summarize = data => ({ organizationId: data.organizationId, generatedAt: data.generatedAt, periodStart: data.periodStart, weeklyStart: data.digests.find(d => d.id === 'weekly').periodStart, value: data.digests.find(d => d.id === 'weekly').zones[0].cards[0].value });
      const row = { locale, early: summarize(earlier), late: summarize(late), foreign: summarize(foreign) };
      assert.deepEqual(row.early, { organizationId: tenants[0].org.id, generatedAt: '2026-09-19T23:59:59.999Z', periodStart: '2026-09-19T00:00:00.000Z', weeklyStart: '2026-09-13T00:00:00.000Z', value: 100 });
      assert.deepEqual(row.late, { organizationId: tenants[0].org.id, generatedAt: '2026-09-20T00:00:01.000Z', periodStart: '2026-09-20T00:00:00.000Z', weeklyStart: '2026-09-14T00:00:00.000Z', value: 350 });
      assert.deepEqual(row.foreign, { organizationId: tenants[1].org.id, generatedAt: '2026-09-20T00:00:01.000Z', periodStart: '2026-09-20T00:00:00.000Z', weeklyStart: '2026-09-14T00:00:00.000Z', value: 2800 });
      result.cases.push(row); console.log(locale + ': overlapping reads retain their request day and tenant totals');
    }
  } finally { release?.(); global.Date = NativeDate; db.suspenseItem.groupBy = original; }
  assert.equal(await effects(), before); result.noBusinessMutations = true; result.passed = true;
}
main().catch(error => { result.passed = false; result.error = f.safe(error); process.exitCode = 1; }).finally(async () => {
  global.Date = NativeDate; result.sourceAfter = hashes(); result.sourceStable = JSON.stringify(result.sourceBefore) === JSON.stringify(result.sourceAfter);
  const output = path.join(__dirname, 'digest-clock-' + stamp + '.json'); fs.writeFileSync(output, JSON.stringify(result, null, 2), { flag: 'wx' });
  console.log(JSON.stringify({ output, passed: result.passed, sourceStable: result.sourceStable, error: result.error })); await db.$disconnect();
});
