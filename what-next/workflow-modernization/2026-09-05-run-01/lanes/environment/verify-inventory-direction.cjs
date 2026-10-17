const f = require('./statement-recipient-fixtures.cjs');
const { db, fs, path, crypto, assert, root, helper } = f;
const { createStockAdjustment, postStockAdjustment } = require(path.join(root, 'services/inventory/inventory-adjustment.service.ts'));
const { createPostingRule } = require(path.join(root, 'services/accounting/posting-rules.service.ts'));
const { DEFAULT_INVENTORY_POSTING_RULES } = require(path.join(root, 'services/accounting/default-posting-rules.ts'));
const files = ['services/inventory/inventory-adjustment.service.ts', 'services/accounting/default-posting-rules.ts', 'services/accounting/posting-rules.service.ts'];
const hashes = () => Object.fromEntries(files.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex')]));
const stamp = crypto.randomUUID(), result = { at: new Date().toISOString(), sourceBefore: hashes(), syntheticFixtures: true, cases: [] };
async function main() {
  await helper.withClient(f.target, helper.assertOwned);
  for (const [name, deltas, invalid] of [['gain', [2], false], ['loss', [-2], false], ['mixed', [3, -2], false], ['net_zero', [2, -2], false], ['reversed', [3, -2], true]]) {
    const org = await db.organization.create({ data: { name: helper.prefix + 'Inventory direction ' + name + ' ' + stamp, slug: 'inv-direction-' + name + '-' + stamp, currency: 'XAF' } });
    const scope = { organizationId: org.id };
    const maker = await db.user.create({ data: { ...scope, name: 'Synthetic inventory maker', email: 'maker-' + name + '-' + stamp + '@example.invalid' } });
    const checker = await db.user.create({ data: { ...scope, name: 'Synthetic inventory checker', email: 'checker-' + name + '-' + stamp + '@example.invalid' } });
    const location = await db.location.create({ data: { ...scope, name: 'Synthetic inventory location', code: 'OWNED' } });
    const when = new Date('2026-09-30T12:00:00Z');
    const year = await db.fiscalYear.create({ data: { ...scope, name: 'Synthetic 2026', startDate: new Date('2026-01-01T00:00:00Z'), endDate: new Date('2026-12-31T23:59:59.999Z') } });
    await db.accountingPeriod.create({ data: { ...scope, name: 'Synthetic September 2026', fiscalYearId: year.id, periodNumber: 9, startDate: new Date('2026-09-01T00:00:00Z'), endDate: new Date('2026-09-30T23:59:59.999Z'), status: 'OPEN' } });
    await db.journal.create({ data: { ...scope, code: 'INV', nameEn: 'Synthetic inventory journal', type: 'INVENTORY', isDefault: true } });
    for (const [mappingKey, code, type] of [['INVENTORY', '310', 'ASSET'], ['INVENTORY_VARIANCE', '603', 'EXPENSE']]) {
      await db.chartOfAccount.create({ data: { ...scope, mappingKey, code, type, normalBalance: 'DEBIT', nameEn: 'Synthetic ' + mappingKey, syscohadaClass: code[0], syscohadaReference: 'Synthetic fixture only', isActive: true } });
    }
    const template = DEFAULT_INVENTORY_POSTING_RULES[0];
    await createPostingRule(org.id, { ...template, lines: template.lines.map(line => ({ ...line, side: invalid ? (line.side === 'DEBIT' ? 'CREDIT' : 'DEBIT') : line.side })) }, checker.id);
    const lines = [];
    for (const [i, delta] of deltas.entries()) {
      const item = await db.item.create({ data: { ...scope, sku: 'OWNED-' + i, slug: 'owned-' + i, nameEn: 'Synthetic inventory item ' + i, imageUrls: [], costPrice: '100' } });
      await db.inventoryLevel.create({ data: { itemId: item.id, locationId: location.id, quantityOnHand: '10', quantityAvailable: '10', averageCost: '100', totalValue: '1000' } });
      lines.push({ itemId: item.id, systemQuantity: '10', actualQuantity: String(10 + delta), adjustedQuantity: String(delta), unitCost: '100' });
    }
    const adjustment = await createStockAdjustment({ ...scope, locationId: location.id, type: 'CORRECTION', reason: 'Synthetic directional posting verification', createdById: maker.id, adjustmentDate: when, lines });
    // Only this owned synthetic record is advanced to the producer's approval prerequisite.
    await db.stockAdjustment.update({ where: { id: adjustment.id }, data: { status: 'SUBMITTED' } });
    await assert.rejects(postStockAdjustment({ ...scope, adjustmentId: adjustment.id, approvedById: maker.id }));
    assert.equal(await db.journalEntry.count({ where: scope }), 0);
    const start = Date.now();
    const posted = await postStockAdjustment({ ...scope, adjustmentId: adjustment.id, approvedById: checker.id });
    const elapsedMs = Date.now() - start;
    assert.equal(posted.ledger.status, invalid ? 'BLOCKED' : 'POSTED');
    const journals = await db.journalEntry.findMany({ where: scope, include: { lines: { include: { account: true } } } });
    assert.equal(journals.length, invalid ? 0 : 1);
    if (!invalid) {
      const inventoryLines = journals[0].lines.filter(line => line.account.mappingKey === 'INVENTORY');
      const debit = inventoryLines.reduce((sum, line) => sum + Number(line.debit), 0);
      const credit = inventoryLines.reduce((sum, line) => sum + Number(line.credit), 0);
      assert.equal(debit, deltas.filter(n => n > 0).reduce((sum, n) => sum + n * 100, 0));
      assert.equal(credit, deltas.filter(n => n < 0).reduce((sum, n) => sum + Math.abs(n) * 100, 0));
      assert.equal(await db.accountingSourceLink.count({ where: { ...scope, sourceId: adjustment.id, journalEntryId: journals[0].id } }), 1);
    }
    const before = { journals: journals.length, movements: await db.inventoryTransaction.count({ where: scope }) };
    const replay = await postStockAdjustment({ ...scope, adjustmentId: adjustment.id, approvedById: checker.id });
    assert.equal(replay.replayed, true);
    assert.equal(replay.ledger.status, posted.ledger.status);
    assert.equal(await db.journalEntry.count({ where: scope }), before.journals);
    assert.equal(await db.inventoryTransaction.count({ where: scope }), before.movements);
    assert.equal(await db.payment.count({ where: scope }), 0);
    result.cases.push({ name, organizationId: org.id, adjustmentId: adjustment.id, status: posted.ledger.status, elapsedMs, journalCount: journals.length, makerDenied: true, duplicateEffectsAbsent: true, replayLedgerStatus: replay.ledger.status });
  }
  result.passed = true;
}
main().catch(error => { result.passed = false; result.error = f.safe(error); }).finally(async () => {
  result.sourceAfter = hashes(); result.sourceStable = JSON.stringify(result.sourceBefore) === JSON.stringify(result.sourceAfter);
  result.passed = !!result.passed && result.sourceStable;
  const receipt = 'inventory-direction-' + stamp + '.json';
  fs.writeFileSync(path.join(__dirname, receipt), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ receipt, ...result })); await db.$disconnect(); process.exitCode = result.passed ? 0 : 1;
});
