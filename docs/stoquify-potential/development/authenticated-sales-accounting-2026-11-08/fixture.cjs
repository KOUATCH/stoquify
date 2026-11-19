// Setup only: no sale, settlement, session cookie, or assurance is seeded.
const { randomBytes, createHash } = require('node:crypto');
const path = require('node:path');

async function seedFixture({ root, db, id }) {
  const argon2 = require(path.join(root, 'node_modules/argon2'));
  const organizationId = `auth-sales-${id}`;
  const common = ['dashboard.read', 'customers.read', 'sales.read', 'finance.receivables.read'];
  const permissions = {
    cashier: ['dashboard.read', 'pos.read', 'pos.use', 'pos.transactions.read', 'pos.session.start', 'pos.session.end', 'inventory.read', 'inventory.items.read', 'customers.read', 'locations.read', 'sales.read', 'finance.receivables.read', 'accounting.reports.read'],
    collector: [...common, 'finance.receivables.collect', 'finance.receivables.reverse', 'accounting.reports.read'],
    reverser: [...common, 'finance.receivables.reverse'],
    accountant: [...common, 'accounting.accounts.read', 'accounting.journal.read', 'accounting.period.read', 'accounting.reports.read', 'accounting.audit.read', 'accounting.close.read', 'accounting.close.run'],
    readonly: [...common, 'accounting.journal.read', 'accounting.period.read', 'accounting.reports.read'],
  };
  const modules = ['dashboard', 'inventory', 'sales', 'pos', 'cash_drawer', 'finance', 'accounting', 'close_assurance', 'reports'];
  await db.organization.create({ data: { id: organizationId, name: 'Synthetic Cameroon sales accounting pilot', slug: organizationId,
    currency: 'XAF', countryCode: 'CM', country: 'Cameroon', timezone: 'Africa/Douala', requestedModules: modules, onboardingCompletedAt: new Date() } });
  await db.tenantModuleConfiguration.create({ data: { organizationId, revision: 1, activeRevision: 1,
    selectedModules: modules, activeModules: modules, manifestHash: createHash('sha256').update(JSON.stringify({ syntheticFixture: true, modules })).digest('hex') } });
  await db.tenantModuleGrant.createMany({ data: modules.map(moduleSlug => ({ organizationId, moduleSlug,
    status: 'active', source: 'manual_override', metadata: { syntheticFixture: true, purpose: 'Authenticated sales accounting verification only' } })) });
  const users = {};
  for (const [role, grants] of Object.entries(permissions)) {
    const userId = `${organizationId}-${role}`;
    const email = `${role}-${id}@sales-accounting.invalid`;
    const password = `Synthetic-${randomBytes(24).toString('base64url')}!`;
    const hash = await argon2.hash(password, { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 });
    const assignedRole = await db.role.create({ data: { organizationId, code: `SYNTHETIC_${role.toUpperCase()}`, nameEn: `Synthetic ${role}`, nameFr: `Test ${role}`, permissions: grants } });
    await db.user.create({ data: { id: userId, organizationId, name: `Synthetic ${role}`, firstName: 'Synthetic', lastName: role,
      email, emailVerified: true, isVerified: true, mfaBackupCodes: [], roles: { connect: { id: assignedRole.id } } } });
    await db.account.create({ data: { userId, accountId: userId, providerId: 'credential', password: hash } });
    users[role] = { userId, email, password, permissions: grants };
  }
  const locationId = `${organizationId}-store`, terminalId = `${organizationId}-till`, drawerId = `${organizationId}-drawer`;
  const customerId = `${organizationId}-customer`, itemId = `${organizationId}-item`;
  await db.location.create({ data: { id: locationId, organizationId, name: 'Synthetic Douala store', code: 'SYNTHETIC_STORE', type: 'STORE', allowNegativeStock: false } });
  await db.customer.create({ data: { id: customerId, organizationId, name: 'Synthetic credit customer', code: 'SYNTHETIC_CUSTOMER', creditLimit: 100, currentBalance: 0 } });
  await db.item.create({ data: { id: itemId, organizationId, slug: itemId, sku: 'SYNTHETIC-ITEM', nameEn: 'Synthetic tracked item', nameFr: 'Article de test suivi',
    imageUrls: [], trackInventory: true, sellingPrice: 10, costPrice: 4 } });
  await db.inventoryLevel.create({ data: { itemId, locationId, quantityOnHand: 5, quantityAvailable: 5, quantityReserved: 0, averageCost: 4, totalValue: 20 } });
  const year = new Date().getUTCFullYear();
  const fiscalYear = await db.fiscalYear.create({ data: { organizationId, name: `Synthetic FY ${year}`, startDate: new Date(Date.UTC(year, 0, 1)), endDate: new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999)) } });
  const period = await db.accountingPeriod.create({ data: { organizationId, fiscalYearId: fiscalYear.id, periodNumber: 1, name: 'Synthetic open period', startDate: fiscalYear.startDate, endDate: fiscalYear.endDate } });
  const specifications = [
    ['TEST_AR', 'ASSET', 'DEBIT', 'ACCOUNTS_RECEIVABLE'], ['TEST_CASH', 'ASSET', 'DEBIT', 'CASH'],
    ['TEST_REVENUE', 'REVENUE', 'CREDIT'], ['TEST_COGS', 'EXPENSE', 'DEBIT'], ['TEST_STOCK', 'ASSET', 'DEBIT'], ['TEST_BANK', 'ASSET', 'DEBIT', 'BANK'],
  ];
  const accounts = {};
  for (const [code, type, normalBalance, mappingKey] of specifications) accounts[code] = await db.chartOfAccount.create({ data: { organizationId, code, nameEn: code, type, normalBalance, mappingKey, currency: 'XAF' } });
  await db.journal.createMany({ data: [['TEST_SALES', 'SALES'], ['TEST_CASH', 'CASH'], ['TEST_BANK', 'BANK']].map(([code, type]) => ({ organizationId, code, nameEn: `Synthetic ${type}`, type, isDefault: true })) });
  const rules = [
    { code: 'TEST_POS_SALE', sourceType: 'POS_SALE', postingPurpose: 'SALE_COMPLETION', lines: [
      ['TEST_AR', 'DEBIT', 'GROSS_AMOUNT'], ['TEST_REVENUE', 'CREDIT', 'NET_AMOUNT'], ['TEST_COGS', 'DEBIT', 'COST_AMOUNT'], ['TEST_STOCK', 'CREDIT', 'COST_AMOUNT']] },
    { code: 'TEST_POS_PAYMENT', sourceType: 'POS_PAYMENT', postingPurpose: 'PAYMENT_RECEIPT', lines: [['TEST_CASH', 'DEBIT', 'SOURCE_AMOUNT'], ['TEST_AR', 'CREDIT', 'SOURCE_AMOUNT']] },
    { code: 'TEST_AR_SETTLEMENT', sourceType: 'CUSTOMER_SETTLEMENT', postingPurpose: 'CUSTOMER_SETTLEMENT', lines: [['TEST_BANK', 'DEBIT', 'SOURCE_AMOUNT'], ['TEST_AR', 'CREDIT', 'SOURCE_AMOUNT']] },
  ];
  for (const rule of rules) await db.postingRule.create({ data: { organizationId, code: rule.code, nameEn: `Synthetic ${rule.code}`, sourceType: rule.sourceType, postingPurpose: rule.postingPurpose,
    lines: { create: rule.lines.map(([account, side, amountSource], index) => ({ organizationId,
      ...(rule.code === 'TEST_AR_SETTLEMENT' ? { mappingKey: account === 'TEST_BANK' ? 'BANK' : 'ACCOUNTS_RECEIVABLE' } : { accountId: accounts[account].id }),
      lineNumber: index + 1, side, amountSource })) } } });
  await db.pOSStation.create({ data: { id: terminalId, organizationId, locationId, terminalNumber: 'SYNTHETIC_TILL', name: 'Synthetic till', hasCashDrawer: true } });
  await db.cashDrawer.create({ data: { id: drawerId, terminalId, locationId, name: 'Synthetic drawer', drawerNumber: 'SYNTHETIC_DRAWER', currentBalance: 0, expectedBalance: 0, isOpen: false } });
  const counts = { sales: await db.salesOrder.count(), settlements: await db.customerSettlement.count(), sessions: await db.session.count(), posSessions: await db.pOSSession.count(), journals: await db.journalEntry.count() };
  if (Object.values(counts).some(Boolean)) throw Error('Fixture unexpectedly contains application transaction or authentication state');
  return { synthetic: true, organizationId, locationId, terminalId, drawerId, customerId, itemId, fiscalYearId: fiscalYear.id, periodId: period.id,
    modules, users, initialCounts: counts, initialStock: { quantity: '5', unitCost: '4', value: '20', sellingPrice: '10' },
    limitation: 'Synthetic zero-tax mappings; no Cameroon statutory chart or country-pack certification. All sale, collection, reversal, shift and authentication operations must be performed through the real interface.' };
}
module.exports = { seedFixture };
