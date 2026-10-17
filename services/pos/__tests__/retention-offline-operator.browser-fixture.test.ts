/** @jest-environment node */
// P06 authenticated offline operator fixture; copied from current full-commit fixture.
import { randomUUID } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import { isAbsolute, join } from 'node:path'
jest.unmock('@/prisma/db')
import { db } from '@/prisma/db'
import { acquirePOSCheckout, preparePOSCheckout } from '../checkout.service'
import { posCartRevision } from '../cart-revision'
import { hashPassword } from '@/lib/password'
function assertDisposableTarget() {
  if (!process.env.RETENTION_VERIFICATION_EVIDENCE_DIR || !isAbsolute(process.env.RETENTION_VERIFICATION_EVIDENCE_DIR)) {
    throw new Error("An explicit absolute verification evidence directory is required")
  }
  const target = new URL(process.env.DATABASE_URL ?? "")
  const name = process.env.POS_DISPOSABLE_DATABASE_NAME ?? ""
  if (target.hostname !== "localhost" || !/^stoquify_pos_audit_\d{8}_[a-f0-9]+$/.test(name)
    || target.pathname !== `/${name}` || target.searchParams.get("schema") !== "public") {
    throw new Error("Refusing full POS commit tests outside the recorded disposable database")
  }
}

// Synthetic zero-tax accounting fixture. These balanced mappings exercise real
// kernels; they are not a country pack, statutory chart or accounting certification.
async function fixture() {
  assertDisposableTarget()
  const suffix = randomUUID()
  const organizationId = `org-full-pos-${suffix}`
  const userId = `actor-full-pos-${suffix}`
  const locationId = `location-full-pos-${suffix}`
  const terminalId = `terminal-full-pos-${suffix}`
  const sessionId = `shift-full-pos-${suffix}`
  const salesOrderId = `sale-full-pos-${suffix}`
  const customerId = `customer-full-pos-${suffix}`
  const itemId = `item-full-pos-${suffix}`
  const drawerId = `drawer-full-pos-${suffix}`
  await db.organization.create({ data: { id: organizationId, name: "Synthetic full POS transaction test", slug: organizationId, currency: "XAF", requestedModules: [] } })
  await db.user.create({ data: { id: userId, email: `${suffix}@full-pos.invalid`, organizationId, firstName: "Test", lastName: "Cashier", mfaBackupCodes: [] } })
  await db.location.create({ data: { id: locationId, organizationId, name: "Test store", code: suffix, type: "STORE", allowNegativeStock: false } })
  await db.customer.create({ data: { id: customerId, organizationId, name: "Test credit customer", code: suffix, creditLimit: 100, currentBalance: 0 } })
  await db.item.create({ data: { id: itemId, organizationId, slug: suffix, sku: suffix, nameEn: "Tracked test item", imageUrls: [], trackInventory: true, sellingPrice: 10, costPrice: 4 } })
  await db.inventoryLevel.create({ data: { itemId, locationId, quantityOnHand: 5, quantityAvailable: 5, quantityReserved: 0, averageCost: 4, totalValue: 20 } })
  const year = new Date().getUTCFullYear()
  const fiscalYear = await db.fiscalYear.create({ data: { organizationId, name: `Synthetic FY ${year}`, startDate: new Date(Date.UTC(year, 0, 1)), endDate: new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999)) } })
  await db.accountingPeriod.create({ data: { organizationId, fiscalYearId: fiscalYear.id, periodNumber: 1, name: "Synthetic open period", startDate: fiscalYear.startDate, endDate: fiscalYear.endDate } })
  const accounts = await Promise.all([
    { code: "TEST_AR", type: "ASSET", normalBalance: "DEBIT" },
    { code: "TEST_CASH", type: "ASSET", normalBalance: "DEBIT" },
    { code: "TEST_REVENUE", type: "REVENUE", normalBalance: "CREDIT" },
    { code: "TEST_COGS", type: "EXPENSE", normalBalance: "DEBIT" },
    { code: "TEST_STOCK", type: "ASSET", normalBalance: "DEBIT" },
  ].map(account => db.chartOfAccount.create({ data: { organizationId, nameEn: account.code, code: account.code, type: account.type as "ASSET" | "REVENUE" | "EXPENSE", normalBalance: account.normalBalance as "DEBIT" | "CREDIT", currency: "XAF" } })))
  const [receivable, cash, revenue, cogs, stock] = accounts
  await db.journal.createMany({ data: [
    { organizationId, code: "TEST_SALES", nameEn: "Synthetic sales", type: "SALES", isDefault: true },
    { organizationId, code: "TEST_CASH", nameEn: "Synthetic cash", type: "CASH", isDefault: true },
  ] })
  await db.postingRule.create({ data: { organizationId, code: "TEST_POS_SALE", nameEn: "Synthetic sale rule", sourceType: "POS_SALE", postingPurpose: "SALE_COMPLETION", lines: { create: [
    { organizationId, accountId: receivable.id, lineNumber: 1, side: "DEBIT", amountSource: "GROSS_AMOUNT" },
    { organizationId, accountId: revenue.id, lineNumber: 2, side: "CREDIT", amountSource: "NET_AMOUNT" },
    { organizationId, accountId: cogs.id, lineNumber: 3, side: "DEBIT", amountSource: "COST_AMOUNT" },
    { organizationId, accountId: stock.id, lineNumber: 4, side: "CREDIT", amountSource: "COST_AMOUNT" },
  ] } } })
  await db.postingRule.create({ data: { organizationId, code: "TEST_POS_PAYMENT", nameEn: "Synthetic cash payment rule", sourceType: "POS_PAYMENT", postingPurpose: "PAYMENT_RECEIPT", lines: { create: [
    { organizationId, accountId: cash.id, lineNumber: 1, side: "DEBIT", amountSource: "SOURCE_AMOUNT" },
    { organizationId, accountId: receivable.id, lineNumber: 2, side: "CREDIT", amountSource: "SOURCE_AMOUNT" },
  ] } } })
  await db.pOSStation.create({ data: { id: terminalId, organizationId, locationId, terminalNumber: suffix, name: "Test till", hasCashDrawer: true } })
  await db.pOSSession.create({ data: { id: sessionId, organizationId, locationId, terminalId, userId, sessionNumber: suffix, status: "ACTIVE", openingBalance: 100, expectedBalance: 100 } })
  await db.pOSStation.update({ where: { id: terminalId }, data: { currentSessionId: sessionId } })
  await db.cashDrawer.create({ data: { id: drawerId, terminalId, locationId, name: "Test drawer", drawerNumber: suffix, currentBalance: 100, expectedBalance: 100, isOpen: true } })
  await db.cashDrawerTransaction.create({ data: { cashDrawerId: drawerId, sessionId, userId, type: "OPENING_BALANCE", amount: 100, balanceBefore: 0, balanceAfter: 100 } })
  await db.salesOrder.create({ data: { id: salesOrderId, organizationId, locationId, terminalId, sessionId, customerId, createdById: userId, orderNumber: suffix, subtotal: 10, total: 10, lines: { create: { itemId, quantity: 1, unitPrice: 10, lineTotal: 10 } } } })
  const scope = { organizationId, userId, locationId, terminalId, sessionId, checkoutLeaseId: randomUUID() }
  await acquirePOSCheckout(scope)
  const cart = await db.salesOrder.findUniqueOrThrow({ where: { id: salesOrderId }, include: { lines: true } })
  const request = { ...scope, salesOrderId, clientCommitId: `pos:${randomUUID()}`, expectedCartRevision: posCartRevision(cart), tenders: [{ method: "CASH" as const, amount: 6 }, { method: "ON_ACCOUNT" as const, amount: 4 }] }
  // No pending online commit: isolate local-offline close blocking.
  return { ...scope, salesOrderId, customerId, itemId, drawerId, request }
}


const suite = process.env.RUN_RETENTION_BROWSER_FIXTURE === '1' ? describe : describe.skip
suite('P05/P06 owned synthetic browser fixture', () => {
  jest.setTimeout(120000)
  afterAll(async () => { await db.$disconnect() })
  it('creates a verified cashier and retained original sale for actual application recovery', async () => {
    const input = await fixture()
    const password = 'Retention-Synthetic-Only-2026!'
    const email = input.userId + '@retention.invalid'
    const permissions = ['pos.read','pos.use','pos.transactions.read','pos.session.start','pos.session.end','inventory.read','customers.read','locations.read','sales.read']
    const role = await db.role.create({ data: { organizationId: input.organizationId, code: 'RETENTION_CASHIER', nameEn: 'Synthetic cashier', nameFr: 'Caissier de test', permissions } })
    await db.user.update({ where: { id: input.userId }, data: { email, emailVerified: true, isVerified: true, roles: { connect: { id: role.id } } } })
    await db.account.create({ data: { userId: input.userId, accountId: input.userId, providerId: 'credential', password: await hashPassword(password) } })
    // Expiry permits the actual browser to acquire its own lease; original intent is retained.
    await db.pOSCheckoutWorkspace.update({ where: { sessionId: input.sessionId }, data: { leaseExpiresAt: new Date(0) } })
    const device = await db.pOSOfflineDevice.create({ data: {
      organizationId: input.organizationId, locationId: input.locationId, terminalId: input.terminalId,
      deviceFingerprintHash: 'operator-' + input.userId, deviceLabel: 'Synthetic operator recovery', status: 'ACTIVE',
      policyExpiresAt: new Date(Date.now() + 86400000), policySnapshotHash: 'operator-policy', sourceSnapshotHash: 'operator-reference',
    } })
    const output = { ...input, deviceId: device.id, email, permissions, passwordKind: 'known synthetic test credential only' }
    writeFileSync(join(process.env.RETENTION_VERIFICATION_EVIDENCE_DIR!, 'BROWSER_FIXTURE.json'), JSON.stringify(output, null, 2), { flag: 'wx' })
    expect((await db.salesOrder.findUniqueOrThrow({ where: { id: input.salesOrderId } })).status).toBe('DRAFT')
  })
})
