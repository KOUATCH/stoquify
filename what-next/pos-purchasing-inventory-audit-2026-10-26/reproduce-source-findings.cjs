// Audit-only, source-extracted demonstrations. No application imports, DB, network, or env files.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
const { Prisma, TransactionType, TransactionReferenceType, InventoryTransactionTimeProvenance } = require('@prisma/client');
const root = path.resolve(__dirname, '../..');
function extract(file, name, globals) {
  const text = fs.readFileSync(path.join(root, file), 'utf8');
  const ast = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const node = ast.statements.find(n => n.name?.text === name || n.declarationList?.declarations.some(d => d.name.text === name));
  assert(node, `Missing source declaration ${name}`);
  const source = node.getText(ast).replace(/^export\s+/, '');
  const js = ts.transpileModule(source + '\n globalThis.subject = ' + name, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  const context = vm.createContext({ ...globals });
  vm.runInContext(js, context, { timeout: 1000 });
  return context.subject;
}
async function main() {
  const decimal = v => new Prisma.Decimal(v);
  const level = { id: 'fixture-level', quantityOnHand: decimal(3), quantityAvailable: decimal(3), quantityReserved: decimal(0), totalValue: decimal('300.02'), averageCost: decimal('100.01'), version: 1 };
  let update, movement;
  const postLine = extract('services/inventory/inventory-stock-event.service.ts', 'postStockLine', {
    Prisma, TransactionType, TransactionReferenceType, InventoryTransactionTimeProvenance,
    decimal3: v => decimal(v).toDecimalPlaces(3), money: v => decimal(v).toDecimalPlaces(2), maxZero: v => Prisma.Decimal.max(v, 0),
    loadItemAndLocation: async () => ({ item: { sku: 'fixture', costPrice: decimal(100) }, location: { allowNegativeStock: false } }),
    BusinessRuleError: Error, InsufficientStockError: Error, ConcurrentStockUpdateError: Error,
  });
  const result = await postLine({
    inventoryLevel: { findUnique: async () => level, updateMany: async args => { update = args.data; return { count: 1 }; } },
    inventoryTransaction: { create: async args => { movement = args.data; return { id: 'fixture-movement' }; } },
  }, { organizationId: 'fixture-org', actorId: 'fixture-actor', effectiveAt: new Date(0), recordedAt: new Date(0), now: new Date(0), line: { itemId: 'fixture-item', locationId: 'fixture-location', quantity: -3, unitCost: level.averageCost, movementType: TransactionType.SALE } });
  const carryingReduction = level.totalValue.minus(update.totalValue);
  assert.equal(carryingReduction.toFixed(2), '300.02');
  assert.equal(result.totalCost.toFixed(2), '300.03');
  const effects = [];
  const reserveBatch = extract('actions/inventory/inventoryActions.ts', 'reserveInventory', {
    inventoryAction: fn => fn,
    trustedInventoryContext: async () => ({ organizationId: 'fixture-org', userId: 'fixture-actor', permissions: [] }),
    observeModuleAccess: async () => ({ allowed: true }), ForbiddenError: Error,
    postInventoryReservation: async input => { if (input.itemId === 'unavailable') throw new Error('insufficient stock'); effects.push(input.itemId); return {}; },
  });
  await assert.rejects(reserveBatch({ data: { organizationId: 'fixture-org', reservations: [ { itemId: 'available', locationId: 'fixture-location', quantity: 1 }, { itemId: 'unavailable', locationId: 'fixture-location', quantity: 1 } ] } }), /insufficient stock/);
  assert.deepEqual(effects, ['available']);
  let time = 1000;
  const keys = [];
  const reserveOne = extract('services/inventory/inventory-stock-event.service.ts', 'postInventoryReservation', {
    Date: { now: () => time }, db: {}, TransactionType, TransactionReferenceType,
    postInventoryStockEvent: input => { keys.push(input.idempotencyKey); return input; },
  });
  const request = { organizationId: 'fixture-org', itemId: 'fixture-item', locationId: 'fixture-location', actorId: 'fixture-actor', quantity: 1, reason: 'fixture' };
  reserveOne(request); time = 1001; reserveOne(request);
  assert.notEqual(keys[0], keys[1]);
  const output = { executedAt: new Date().toISOString(), evidenceClass: 'Source-extracted functions with mocked dependencies; NOT real PostgreSQL or full application execution', valuation: { quantityBefore: '3', valueBefore: '300.02', averageCostBefore: '100.01', quantityAfter: update.quantityOnHand.toString(), valueAfter: update.totalValue.toString(), movementCost: movement.totalCost.toFixed(2), returnedCost: result.totalCost.toFixed(2), discrepancy: result.totalCost.minus(carryingReduction).toFixed(2) }, reservationBatch: { actionRejected: true, independentlyCompletedMockEffects: effects }, reservationRetry: { samePayload: true, keys, stable: false }, assertions: 'passed; demonstrated current defects' };
  fs.writeFileSync(path.join(__dirname, 'source-reproductions.json'), JSON.stringify(output, null, 2) + '\n');
  console.log(JSON.stringify(output, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
