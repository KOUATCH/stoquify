// S12 uses the existing full-POS synthetic accounting fixture, copied without changing its kernels.
import { randomUUID } from 'node:crypto'
import { db } from '@/prisma/db'
import { acquirePOSCheckout, preparePOSCheckout } from '@/services/pos/checkout.service'
import { posCartRevision } from '@/services/pos/cart-revision'
function assertDisposableTarget() { require('../../scripts/s12-target.cjs').assertS12Target() }
// Synthetic zero-tax accounting fixture. These balanced mappings exercise real
// kernels; they are not a country pack, statutory chart or accounting certification.
export async function fixture() {
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
  await preparePOSCheckout(request)
  return { ...scope, salesOrderId, customerId, itemId, drawerId, request }
}

