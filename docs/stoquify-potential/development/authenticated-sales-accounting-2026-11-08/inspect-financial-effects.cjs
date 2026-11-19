// Read-only corroboration of UI-created records on the explicitly owned target.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../../..');
const read = name => JSON.parse(fs.readFileSync(path.join(__dirname, name), 'utf8'));
const target = read('DATABASE_TARGET.json'), schema = read('SCHEMA_PROVENANCE.json'), fixture = read('FIXTURE.json');
const stage = process.argv[2];
const label = process.argv[3] || stage;
if (!['after-sale', 'after-collection', 'after-reversal'].includes(stage)
    || !/^[a-z0-9-]+$/.test(label)
    || !/^stoquify_auth_sales_20261108_[a-f0-9]{10}$/.test(target.database)
    || target.host !== '127.0.0.1' || target.user !== 'sales_accounting_fixture'
    || path.dirname(target.directory) !== path.join(root, '.codex-tmp')
    || schema.client !== path.join(target.clusterDirectory, 'client')) throw Error('Unexpected owned inspection target');
const connectionString = `postgresql://${target.user}@127.0.0.1:${target.port}/${target.database}?schema=public`;
for (const key of Object.keys(process.env)) if (!/^(PATH|SYSTEMROOT|WINDIR|TEMP|TMP|COMSPEC|PATHEXT|USERPROFILE|LOCALAPPDATA|APPDATA|PROGRAMFILES|PROGRAMFILES\(X86\)|SYSTEMDRIVE|NUMBER_OF_PROCESSORS)$/i.test(key)) delete process.env[key];
Object.assign(process.env, { DATABASE_URL: connectionString, DIRECT_URL: connectionString, SHADOW_DATABASE_URL: connectionString });
async function main() {
  const { Client } = require(path.join(root, 'node_modules/pg'));
  const guard = new Client({ connectionString, connectionTimeoutMillis: 5000 });
  await guard.connect();
  try {
    const { rows: [identity] } = await guard.query("SELECT current_database() AS name,current_user AS actor,current_setting('data_directory') AS directory");
    assert.equal(identity.name, target.database); assert.equal(identity.actor, target.user);
    assert.equal(fs.realpathSync(identity.directory).toLowerCase(), fs.realpathSync(path.join(target.clusterDirectory, 'data')).toLowerCase());
  } finally { await guard.end(); }
  const { PrismaClient, Prisma } = require(schema.client);
  const db = new PrismaClient({ datasources: { db: { url: connectionString } } });
  try {
    const organizationId = fixture.organizationId;
    const [sales, customer, stock, shifts, drawers, journals, settlements, documents, closeRuns] = await Promise.all([
      db.salesOrder.findMany({ where: { organizationId, status: 'COMPLETED' }, select: { id: true, orderNumber: true, status: true, paymentStatus: true, total: true, payments: { select: { method: true, amount: true, status: true } } } }),
      db.customer.findUniqueOrThrow({ where: { id: fixture.customerId }, select: { currentBalance: true } }),
      db.inventoryLevel.findFirstOrThrow({ where: { itemId: fixture.itemId, locationId: fixture.locationId }, select: { quantityOnHand: true, quantityAvailable: true, totalValue: true } }),
      db.pOSSession.findMany({ where: { organizationId }, select: { expectedBalance: true, cashTotal: true, creditTotal: true, transactionCount: true } }),
      db.cashDrawer.findMany({ where: { locationId: fixture.locationId }, select: { currentBalance: true, expectedBalance: true } }),
      db.journalEntry.findMany({ where: { organizationId, status: { in: ['POSTED', 'REVERSED'] } }, include: { lines: { include: { account: { select: { code: true } } } } } }),
      db.customerSettlement.findMany({ where: { organizationId }, select: { id: true, settlementNumber: true, amount: true, method: true, status: true, receivedById: true, reversedById: true, journalEntryId: true, reversalJournalEntryId: true } }),
      db.customerReceivableDocument.findMany({ where: { organizationId }, select: { id: true, documentNumber: true, lifecycleStates: { orderBy: { version: 'desc' }, take: 1, select: { status: true, unpaidAmount: true, paidAmount: true, version: true } } } }),
      db.closeRun.findMany({ where: { organizationId }, orderBy: { createdAt: 'desc' }, take: 3 }),
    ]);
    const balance = {}, zero = () => new Prisma.Decimal(0);
    for (const journal of journals) {
      assert(journal.lines.reduce((total, line) => total.plus(line.debit).minus(line.credit), zero()).eq(0), 'Unbalanced journal');
      for (const line of journal.lines) balance[line.account.code] = (balance[line.account.code] || zero()).plus(line.debit).minus(line.credit);
    }
    const balances = Object.fromEntries(Object.entries(balance).map(([key, value]) => [key, value.toFixed(2)]));
    const expectedAR = stage === 'after-collection' ? '0.00' : '4.00';
    assert.equal(sales.length, 1); assert.equal(sales[0].total.toFixed(2), '10.00');
    assert.equal(customer.currentBalance.toFixed(2), expectedAR);
    assert.equal(balance.TEST_AR.toFixed(2), expectedAR);
    assert.equal((balance.TEST_BANK || zero()).toFixed(2), stage === 'after-collection' ? '4.00' : '0.00');
    assert.equal(balance.TEST_CASH.toFixed(2), '6.00'); assert.equal(balance.TEST_REVENUE.toFixed(2), '-10.00');
    assert.equal(balance.TEST_COGS.toFixed(2), '4.00'); assert.equal(balance.TEST_STOCK.toFixed(2), '-4.00');
    assert.equal(stock.quantityOnHand.toFixed(2), '4.00'); assert.equal(stock.totalValue.toFixed(2), '16.00');
    assert.equal(shifts.length, 1); assert.equal(shifts[0].expectedBalance.toFixed(2), '106.00');
    assert.equal(drawers[0].currentBalance.toFixed(2), '106.00');
    assert.equal(journals.length, stage === 'after-sale' ? 2 : stage === 'after-collection' ? 3 : 4);
    assert.equal(settlements.length, stage === 'after-sale' ? 0 : 1);
    if (settlements.length) {
      assert.equal(settlements[0].receivedById, fixture.users.collector.userId);
      assert.equal(settlements[0].status, stage === 'after-reversal' ? 'REVERSED' : 'POSTED');
      if (stage === 'after-reversal') { assert.equal(settlements[0].reversedById, fixture.users.reverser.userId); assert.notEqual(settlements[0].receivedById, settlements[0].reversedById); }
    }
    assert.equal(documents.length, 1); assert.equal(documents[0].lifecycleStates[0].unpaidAmount.toFixed(2), expectedAR);
    const result = { stage, utc: new Date().toISOString(), status: 'PASS', evidenceClass: 'Read-only database corroboration of actual authenticated UI mutations',
      sales, customer, stock, shifts, drawers, accountBalancesDebitMinusCredit: balances, journalCount: journals.length, settlements, documents,
      closeRuns: closeRuns.map(run => ({ id: run.id, status: run.status, createdAt: run.createdAt })),
      limitation: 'Synthetic current-datamodel fixture; no migration history, custom-trigger or statutory certification' };
    fs.writeFileSync(path.join(__dirname, `${label}.json`), JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result, null, 2));
  } finally { await db.$disconnect(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
