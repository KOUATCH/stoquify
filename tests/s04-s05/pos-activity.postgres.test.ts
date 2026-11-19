import { randomUUID } from "node:crypto"
import { db } from "@/prisma/db"
import { readPOSActivityShiftSummary } from "@/services/pos/pos-activity-shift-summary"
import { readPOSActivity, readPOSActivityDetail } from "@/services/pos/pos-activity.service"

const { assertTestEnvironment } = require("../../scripts/s04-s05-target.cjs")
const date = "2026-10-25"
const start = new Date("2026-10-24T22:00:00.000Z")
const correctionTime = new Date("2026-10-25T22:59:59.999Z")
const end = new Date("2026-10-25T23:00:00.000Z")
const sharedTime = new Date("2026-10-25T12:05:00.000Z")

async function createFixture(currency = "XAF") {
  assertTestEnvironment()
  const organizationId = randomUUID()
  await db.organization.create({ data: { id: organizationId, slug: organizationId, name: "Synthetic POS activity", timezone: "Europe/Paris", currency } })
  const cashier = await db.user.create({ data: {
    organizationId, email: `${organizationId}@pos-activity-fixture.invalid`, firstName: "Fixture", lastName: "Cashier", mfaBackupCodes: [],
  } })
  const otherCashier = await db.user.create({ data: {
    organizationId, email: `other-${organizationId}@pos-activity-fixture.invalid`, firstName: "Other", lastName: "Cashier", mfaBackupCodes: [],
  } })
  const location = await db.location.create({ data: { organizationId, name: "Synthetic store", code: "TEST", type: "STORE" } })
  const terminal = await db.pOSStation.create({ data: { organizationId, locationId: location.id, terminalNumber: "TEST", name: "Synthetic register" } })
  const { id: sessionId } = await db.pOSSession.create({ data: {
    organizationId, userId: cashier.id, locationId: location.id, terminalId: terminal.id,
    sessionNumber: "OWN-TEST", status: "CLOSED",
    startTime: start, endTime: correctionTime, openingBalance: 300, closingBalance: 675, expectedBalance: 670, variance: 5,
  } })
  const { id: otherSessionId } = await db.pOSSession.create({ data: {
    organizationId, userId: otherCashier.id, locationId: location.id, terminalId: terminal.id,
    sessionNumber: "OTHER-TEST", status: "CLOSED", startTime: start, endTime: correctionTime,
  } })
  const customer = await db.customer.create({ data: { organizationId, code: "FIXTURE", name: "Internal synthetic buyer" } })
  const drawer = await db.cashDrawer.create({ data: { name: "Fixture drawer", drawerNumber: "DRAWER-TEST", locationId: location.id, terminalId: terminal.id } })
  const actor = { organizationId, userId: cashier.id, manager: false, canPrint: false, canReprint: false, canUseWhatsApp: false }
  const context = { date, locationId: location.id, terminalId: terminal.id }
  const searchSales = (orderNumber: string, orderDate: Date, status: "COMPLETED" | "CANCELLED" | "DRAFT" | "RETURNED" = "COMPLETED", other = false, customerId = customer.id, total = 800) => db.salesOrder.create({ data: {
    organizationId, locationId: location.id, terminalId: terminal.id, sessionId: other ? otherSessionId : sessionId,
    customerId, orderDate, orderNumber, status, total, taxAmount: 30, subtotal: total - 30,
    createdById: other ? otherCashier.id : cashier.id,
  } })
  const correction = (saleId: string, kind: "return" | "void") => db.businessEvent.create({ data: {
    organizationId, locationId: location.id, registerId: terminal.id, sourceId: saleId,
    sourceType: kind === "return" ? "POS_REFUND" : "POS_VOID", eventSource: "POS",
    eventType: kind === "return" ? "pos.refund.issued" : "pos.sale.voided", payloadHash: "synthetic-activity",
    idempotencyKey: `test-correction-${saleId}`, occurredAt: correctionTime, actorId: cashier.id,
    payload: { sessionId, salesOrderId: saleId, totalRefunded: "125.00", reason: "Internal synthetic reason" },
  } })
  return { actor, context, cashier, sessionId, drawer, searchSales, correction, organizationId }
}

afterAll(async () => { await db.$disconnect() })

it("lists scoped activity and receipts across the organization midnight boundary", async () => {
  const fixture = await createFixture()
  const { actor, context, searchSales, correction, cashier, sessionId, drawer, organizationId } = fixture
  const ownSale = await searchSales("OWN-001", start, "RETURNED")
  const otherSale = await searchSales("OTHER-001", start, "COMPLETED", true)
  const voidedSale = await searchSales("VOIDED-001", sharedTime, "CANCELLED")
  await searchSales("NEXT-001", end)
  await searchSales("BEFORE-001", new Date(start.getTime() - 1))
  await searchSales("UNRECORDED-CANCEL-001", sharedTime, "CANCELLED")
  await searchSales("DRAFT-001", sharedTime, "DRAFT")
  const returned = await correction(ownSale.id, "return")
  await correction(voidedSale.id, "void")
  await db.payment.create({ data: {
    organizationId, salesOrderId: ownSale.id, paymentNumber: "TENDER-123", method: "CASH", amount: 800, status: "PAID",
    cashTendered: 1000, changeGiven: 200,
  } })
  await db.cashDrawerTransaction.createMany({ data: [
    { type: "CASH_OUT", amount: 15, createdAt: sharedTime, cashDrawerId: drawer.id, userId: cashier.id, sessionId, balanceBefore: 100, balanceAfter: 85 },
    { type: "SALE", amount: 800, createdAt: start, cashDrawerId: drawer.id, userId: cashier.id, sessionId, balanceBefore: 85, balanceAfter: 885 },
  ] })

  const list = await readPOSActivity(actor, context)
  expect(list).toMatchObject({ date, timezone: "Europe/Paris", accessMode: "own" })
  expect(list.rows.map(({ kind }) => kind)).toEqual(["return", "void", "shift_close", "sale", "drawer", "sale", "shift_open"])
  expect(list.rows.some(({ id }) => id === otherSale.id)).toBe(false)
  expect(list.options.sessions.map(({ id }) => id)).toEqual([sessionId])
  const manager = await readPOSActivity({ ...actor, manager: true }, context)
  expect(manager.rows.some(({ id }) => id === otherSale.id)).toBe(true)
  expect(manager.options.sessions).toHaveLength(2)
  const shiftClose = await readPOSActivityShiftSummary({ ...actor, manager: true }, { ...context, sessionId })
  expect(shiftClose).toMatchObject({ sessionId, closeDate: date, currency: "XAF", expected: "670", counted: "675", variance: "5" })
  const receipts = await readPOSActivity(actor, { ...context, view: "receipts", search: "tender-123" })
  expect(receipts.rows.map(({ id }) => id)).toEqual([ownSale.id])
  const detail = await readPOSActivityDetail(actor, { ...context, kind: "return", id: returned.id })
  expect(detail).toMatchObject({
    saleId: ownSale.id, amount: "125.00",
    corrections: [{ kind: "sale", id: ownSale.id, occurredAt: start.toISOString() }],
    totals: { subtotal: "770", tax: "30", total: "800" },
    tenders: [{ reference: "TENDER-123", method: "CASH", amount: "800", changeGiven: "200" }],
  })
  expect(JSON.stringify(detail)).not.toContain("Internal synthetic reason")
  await expect(readPOSActivityDetail(actor, { ...context, kind: "sale", id: otherSale.id })).rejects.toThrow("unavailable")
  await expect(readPOSActivityDetail(actor, { ...context, date: "2026-10-26", kind: "return", id: returned.id })).rejects.toThrow("unavailable")
  const otherTenant = await createFixture()
  const denied = await readPOSActivity(otherTenant.actor, context)
  expect(denied.rows).toEqual([])
  expect(await readPOSActivityShiftSummary({ ...otherTenant.actor, manager: true }, { ...context, sessionId })).toBeNull()
  await expect(readPOSActivityDetail(otherTenant.actor, { ...context, kind: "sale", id: ownSale.id })).rejects.toThrow("unavailable")
})

it("uses a stable tie-breaker and rejects a cursor from different filters", async () => {
  const { actor, searchSales, context } = await createFixture()
  const seeded = await Promise.all(Array.from({ length: 31 }, (_, index) => searchSales(`PAGE-${index}`, sharedTime)))
  const query = { ...context, view: "receipts", search: "PAGE-", total: "800", fromTime: "13:00", toTime: "13:05" } as const
  const first = await readPOSActivity(actor, query)
  expect(first.rows).toHaveLength(25)
  expect(first.nextCursor).toEqual(expect.any(String))
  const second = await readPOSActivity(actor, { ...query, cursor: first.nextCursor! })
  expect(second.nextCursor).toBeNull()
  expect([...first.rows, ...second.rows].map(({ id }) => id)).toEqual(seeded.map(({ id }) => id).sort())
  await expect(readPOSActivity(actor, { ...query, search: "OTHER", cursor: first.nextCursor! })).rejects.toThrow("Refresh activity")
  await expect(readPOSActivity(actor, { ...query, total: "801", cursor: first.nextCursor! })).rejects.toThrow("Refresh activity")
  await expect(readPOSActivity(actor, { ...query, fromTime: "13:01", cursor: first.nextCursor! })).rejects.toThrow("Refresh activity")
})

it("finds receipt customers by name or last four phone digits within receipt access", async () => {
  const { actor, context, searchSales, organizationId } = await createFixture()
  const { organizationId: externalOrganizationId } = await createFixture()
  const ownPhone = "+1 (202) 555-0123"
  const ownBuyer = await db.customer.create({ data: { organizationId, name: "River Example", phone: ownPhone } })
  const walkIn = await db.customer.create({ data: { organizationId, code: "WALK_IN", name: "Walk-in Customer", phone: ownPhone } })
  const deletedBuyer = await db.customer.create({ data: { organizationId, name: "Deleted Fixture", phone: ownPhone, deletedAt: sharedTime } })
  const externalBuyer = await db.customer.create({ data: { organizationId: externalOrganizationId, name: "External Fixture", phone: ownPhone } })
  const sameCashier = await searchSales("RECEIPT-IDENTITY-ONE", sharedTime, "COMPLETED", false, ownBuyer.id)
  const otherCashier = await searchSales("RECEIPT-IDENTITY-TWO", sharedTime, "COMPLETED", true, ownBuyer.id)
  const anonymousSale = await searchSales("RECEIPT-WALK-IN", sharedTime, "COMPLETED", false, walkIn.id)
  const deletedSale = await searchSales("RECEIPT-DELETED-CUSTOMER", sharedTime, "COMPLETED", false, deletedBuyer.id)
  const mismatchedSale = await searchSales("RECEIPT-CUSTOMER-MISMATCH", sharedTime, "COMPLETED", false, externalBuyer.id)
  const query = { ...context, view: "receipts" } as const

  const byName = await readPOSActivity(actor, { ...query, search: "rIvEr" })
  expect(byName.rows.map(({ id, customer }) => ({ id, customer }))).toEqual([
    { id: sameCashier.id, customer: { name: "River Example", phoneLastFour: "0123" } },
  ])
  const byPhone = await readPOSActivity(actor, { ...query, search: "0123" })
  expect(byPhone.rows.map(({ id }) => id)).toEqual([sameCashier.id])
  expect(JSON.stringify(byPhone.rows)).not.toContain(ownPhone)
  const managerByPhone = await readPOSActivity({ ...actor, manager: true }, { ...query, search: "0123" })
  expect(new Set(managerByPhone.rows.map(({ id }) => id))).toEqual(new Set([sameCashier.id, otherCashier.id]))

  const detail = await readPOSActivityDetail(actor, { ...context, kind: "sale", id: sameCashier.id })
  expect(detail.customer).toEqual({ name: "River Example", phoneLastFour: "0123" })
  expect(JSON.stringify(detail)).not.toContain(ownPhone)
  const { rows } = await readPOSActivity(actor, query)
  for (const sale of [anonymousSale, deletedSale, mismatchedSale]) {
    expect(rows.find(({ id }) => id === sale.id)?.customer).toBeNull()
  }
  const fullPhone = await readPOSActivity(actor, { ...query, search: ownPhone })
  expect(fullPhone.rows).toEqual([])
  const noBuyer = await readPOSActivity(actor, { ...query, search: "External Fixture" })
  expect(noBuyer.rows).toEqual([])
})

it("finds exact receipt totals and inclusive local minutes before pagination", async () => {
  const { actor, context, organizationId, searchSales } = await createFixture("EUR")
  const walkIn = await db.customer.create({ data: { organizationId, code: "WALK_IN", name: "Fixture walk-in" } })
  const seedTotal = (reference: string, timestamp: string, total = 715.25, other = false) =>
    searchSales(reference, new Date(timestamp), "COMPLETED", other, walkIn.id, total)
  const earlierOccurrence = await seedTotal("REPEATED-MINUTE-FIRST", "2026-10-25T00:30:00.000Z")
  const laterOccurrence = await seedTotal("REPEATED-MINUTE-SECOND", "2026-10-25T01:30:59.999Z")
  const otherCashier = await seedTotal("OTHER-CASHIER", "2026-10-25T01:30:10.000Z", 715.25, true)
  await seedTotal("BEFORE-MINUTE", "2026-10-25T00:29:59.999Z")
  await seedTotal("AFTER-MINUTE", "2026-10-25T01:31:00.000Z")
  await seedTotal("DIFFERENT-TOTAL", "2026-10-25T00:30:15.000Z", 715.26)
  const lastMinute = await seedTotal("LAST-MINUTE", "2026-10-25T22:59:59.999Z")
  await seedTotal("NEXT-DAY", "2026-10-25T23:00:00.000Z")
  await Promise.all(Array.from({ length: 25 }, (_, index) => searchSales(`NEWER-${index}`, sharedTime)))

  const query = { ...context, view: "receipts", total: "0715,25", fromTime: "02:30", toTime: "02:30" } as const
  const matching = await readPOSActivity(actor, query)
  expect(matching.filters).toMatchObject({ total: "715.25", fromTime: "02:30", toTime: "02:30" })
  expect(matching.rows.map(({ id, customer }) => ({ id, customer }))).toEqual([
    { id: laterOccurrence.id, customer: null }, { id: earlierOccurrence.id, customer: null },
  ])
  expect(matching.nextCursor).toBeNull()
  const manager = await readPOSActivity({ ...actor, manager: true }, query)
  expect(manager.rows.map(({ id }) => id)).toEqual([laterOccurrence.id, otherCashier.id, earlierOccurrence.id])
  const endOfDay = await readPOSActivity(actor, { ...query, fromTime: "23:59", toTime: "23:59" })
  expect(endOfDay.rows.map(({ id }) => id)).toEqual([lastMinute.id])
  const otherTenant = await createFixture("EUR")
  expect((await readPOSActivity(otherTenant.actor, query)).rows).toEqual([])
  expect((await readPOSActivity(actor, { ...query, view: "all" })).filters).toMatchObject({ total: null, fromTime: null, toTime: null })

  await expect(readPOSActivity(actor, { ...query, total: "1,000" })).rejects.toThrow("without grouping separators")
  await expect(readPOSActivity(actor, { ...query, fromTime: "24:00" })).rejects.toThrow("valid time range")
  await expect(readPOSActivity(actor, { ...query, fromTime: "23:00" })).rejects.toThrow("valid time range")
  await db.organization.update({ where: { id: organizationId }, data: { currency: "XAF" } })
  await expect(readPOSActivity(actor, query)).rejects.toThrow("organization's currency")
})
