jest.mock("@/prisma/db", () => ({ db: { $transaction: jest.fn() } }))
jest.mock("@/services/accounting/ar-open-item.service", () => ({ getCustomerAROpenItems: jest.fn() }))
import { Prisma } from "@prisma/client"
import { db } from "@/prisma/db"
import { getCustomerAROpenItems } from "@/services/accounting/ar-open-item.service"
import { classifyDue, getOpenItemsDashboard, summarizeOpenItems } from "../open-items-dashboard.service"
import type { OpenItemsRow } from "../open-items-dashboard.contract"

const now = new Date("2026-10-12T12:00:00Z")
const d = (v: string) => new Prisma.Decimal(v)
const arItem = (patch = {}) => ({ referenceId: "ar1", customerId: "c1", customerName: "Customer", documentNumber: "AR1", currency: "XAF", openingAmount: "100.30", allocatedAmount: "0.00", openAmount: "100.30", status: "open", dueDate: "2026-10-01T00:00:00Z", ...patch })
const apInvoice = (patch = {}) => ({ id: "ap1", organizationId: "org1", supplierId: "s1", supplier: { id: "s1", name: "Supplier", organizationId: "org1" }, purchaseOrder: null, invoiceNumber: "AP1", invoiceDate: new Date("2026-10-01"), dueDate: new Date("2026-10-20"), updatedAt: new Date("2026-10-01"), status: "POSTED", currency: "XAF", total: d("100.30"), amountPaid: d("0"), paymentAllocations: [], supplierCreditNotes: [], ...patch })
const invoiceLedger = (patch = {}) => ({ organizationId: "org1", supplierId: "s1", referenceType: "SUPPLIER_INVOICE", referenceId: "ap1", type: "PURCHASE", debit: d("100.30"), credit: d("0"), entryDate: new Date("2026-10-01"), createdAt: new Date("2026-10-01"), ...patch })
let tx: any
beforeEach(() => {
  jest.clearAllMocks()
  jest.useFakeTimers().setSystemTime(now)
  tx = {
    organization: { findFirst: jest.fn().mockResolvedValue({ id: "org1", name: "Tenant", currency: "XAF", timezone: "Africa/Douala" }) },
    location: { findMany: jest.fn().mockResolvedValue([{ id: "loc1", name: "Branch" }]) },
    supplierInvoice: { findMany: jest.fn().mockResolvedValue([apInvoice()]), count: jest.fn().mockResolvedValue(1) },
    supplierLedgerEntry: { findMany: jest.fn().mockResolvedValue([invoiceLedger()]) },
    supplierPayment: { findMany: jest.fn().mockResolvedValue([]) },
  }
  ;(db.$transaction as jest.Mock).mockImplementation(fn => fn(tx))
  ;(getCustomerAROpenItems as jest.Mock).mockResolvedValue({ items: [arItem()] })
})
afterEach(() => jest.useRealTimers())

it("builds complete queue counts and counterparty rankings before filtering the table", async () => {
  ;(getCustomerAROpenItems as jest.Mock).mockResolvedValue({ items: [
    arItem({ referenceId: "late", customerId: "a", openAmount: "10.01" }),
    arItem({ referenceId: "soon", customerId: "a", openAmount: "20.02", dueDate: "2026-10-15T00:00:00Z" }),
    arItem({ referenceId: "later", customerId: "b", openAmount: "25.00", dueDate: "2026-11-01T00:00:00Z" }),
    arItem({ referenceId: "unknown", customerId: "b", currency: "EUR", dueDate: null }),
  ] })
  const result = await getOpenItemsDashboard({ view: "receivables", currency: "XAF", queue: "due7", counterpartyId: "a" }, "org1")
  expect(result.availableCurrencies).toEqual(["EUR", "XAF"])
  expect(result.queueCounts).toEqual({ all: 3, overdue: 1, due7: 1, due30: 2, unknown: 0, unverified: 0 })
  expect(result.records.rows.map(row => row.id)).toEqual(["soon"])
  expect(result.currencies[0]).toMatchObject({ outstanding: "55.03", topCounterparties: [{ id: "a", outstanding: "30.03", count: 2 }, { id: "b", outstanding: "25.00", count: 1 }] })
  expect(result.currencies[0].performance).toEqual({ overdueShare: "18.19", largestCounterpartyShare: "54.57", topFiveShare: "100.00" })
  const unknown = await getOpenItemsDashboard({ view: "receivables", queue: "unknown" }, "org1")
  expect(unknown.records.rows.map(row => row.id)).toEqual(["unknown"])
})

it("does not rank an incomplete AP currency or turn an unverified queue into zero", async () => {
  tx.supplierLedgerEntry.findMany.mockResolvedValue([])
  const result = await getOpenItemsDashboard({ view: "payables", queue: "unverified" }, "org1")
  expect(result.queueCounts.unverified).toBe(1)
  expect(result.currencies[0].topCounterparties).toBeNull()
  expect(result.currencies[0].performance).toBeNull()
  expect(result.records.rows[0].outstanding).toBeNull()
})

it("uses one repeatable-read snapshot and includes only open AR lifecycle states", async () => {
  ;(getCustomerAROpenItems as jest.Mock).mockResolvedValue({ items: [arItem(), arItem({ referenceId: "cancelled", status: "cancelled", openAmount: "999.00" })] })
  const result = await getOpenItemsDashboard({ view: "receivables", locationId: "loc1" }, "org1")
  expect(result.currencies[0]).toMatchObject({ outstanding: "100.30", overdue: "100.30", count: 1, aging: { "1-30": "100.30" } })
  expect(result.records.rows).toHaveLength(1)
  expect(getCustomerAROpenItems).toHaveBeenCalledWith(expect.objectContaining({ client: tx, organizationId: "org1", locationId: "loc1", includeAllocations: false, maxDocuments: 1000, asOf: now, recordedThrough: now }))
  expect(db.$transaction).toHaveBeenCalledWith(expect.any(Function), expect.objectContaining({ isolationLevel: "RepeatableRead" }))
  expect(tx.supplierInvoice.findMany).not.toHaveBeenCalled()
})
it("retains cents, separates currencies and keeps summaries independent of row search/paging", async () => {
  const items = Array.from({ length: 12 }, (_, i) => arItem({ referenceId: `ar${i}`, documentNumber: `AR${i}`, openAmount: "0.10" }))
  ;(getCustomerAROpenItems as jest.Mock).mockResolvedValue({ items: [...items, arItem({ referenceId: "usd", currency: "USD", openAmount: "20.20" })] })
  const first = await getOpenItemsDashboard({ view: "receivables", pageSize: 10 }, "org1")
  expect(first.currencies.map(r => [r.currency, r.outstanding])).toEqual([["USD", "20.20"], ["XAF", "1.20"]])
  const second = await getOpenItemsDashboard({ view: "receivables", page: 2, pageSize: 10, revision: first.revision }, "org1")
  expect(second.records.rows).toHaveLength(3)
  expect(second.currencies).toEqual(first.currencies)
  expect(new Set([...first.records.rows, ...second.records.rows].map(r => r.id)).size).toBe(13)
  const search = await getOpenItemsDashboard({ view: "receivables", search: "no match" }, "org1")
  expect(search.records.total).toBe(0)
  expect(search.currencies).toEqual(first.currencies)
})
it("refuses pagination after evidence changes and without a revision", async () => {
  const first = await getOpenItemsDashboard({ view: "receivables" }, "org1")
  ;(getCustomerAROpenItems as jest.Mock).mockResolvedValue({ items: [arItem({ openAmount: "50.00" })] })
  await expect(getOpenItemsDashboard({ view: "receivables", page: 2, revision: first.revision }, "org1")).rejects.toThrow(/changed/)
  await expect(getOpenItemsDashboard({ view: "receivables", page: 2 }, "org1")).rejects.toThrow(/revision/)
})
it("rejects foreign locations before reading invoices", async () => {
  await expect(getOpenItemsDashboard({ view: "payables", locationId: "foreign" }, "org1")).rejects.toThrow(/location/)
  expect(tx.supplierInvoice.findMany).not.toHaveBeenCalled()
})
it("distinguishes no source documents from settled documents", async () => {
  ;(getCustomerAROpenItems as jest.Mock).mockResolvedValue({ items: [] })
  expect((await getOpenItemsDashboard({ view: "receivables" }, "org1")).coverage).toBe("no-documents")
  ;(getCustomerAROpenItems as jest.Mock).mockResolvedValue({ items: [arItem({ status: "settled", openAmount: "0.00" })] })
  expect((await getOpenItemsDashboard({ view: "receivables" }, "org1")).coverage).toBe("complete-population")
})
it("propagates AR overflow without manufacturing totals", async () => {
  ;(getCustomerAROpenItems as jest.Mock).mockRejectedValue(new Error("scope exceeds bound"))
  await expect(getOpenItemsDashboard({ view: "receivables" }, "org1")).rejects.toThrow(/bound/)
})
it("uses verified supplier invoice evidence and keeps unknown currency totals unavailable", async () => {
  let result = await getOpenItemsDashboard({ view: "payables" }, "org1")
  expect(result.currencies[0]).toMatchObject({ outstanding: "100.30", overdue: "0.00", due: { next30: "100.30", next7: "0.00" } })
  expect(result.unassignedDocumentCount).toBe(1)
  expect(getCustomerAROpenItems).not.toHaveBeenCalled()
  tx.supplierLedgerEntry.findMany.mockResolvedValue([])
  result = await getOpenItemsDashboard({ view: "payables" }, "org1")
  expect(result.coverage).toBe("unverified")
  expect(result.currencies[0]).toMatchObject({ outstanding: null, overdue: null, aging: null, due: null, unverifiedCount: 1 })
  expect(result.records.rows[0].outstanding).toBeNull()
})
it("bounds AP invoices and evidence and retains location predicate", async () => {
  await getOpenItemsDashboard({ view: "payables", locationId: "loc1" }, "org1")
  expect(tx.supplierInvoice.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ organizationId: "org1", purchaseOrder: { organizationId: "org1", locationId: "loc1" } }), take: 1001 }))
  tx.supplierInvoice.findMany.mockResolvedValue(Array.from({ length: 1001 }, () => apInvoice()))
  await expect(getOpenItemsDashboard({ view: "payables" }, "org1")).rejects.toThrow(/limit/)
  tx.supplierInvoice.findMany.mockResolvedValue([apInvoice()])
  tx.supplierLedgerEntry.findMany.mockResolvedValue(Array.from({ length: 10001 }, () => invoiceLedger()))
  await expect(getOpenItemsDashboard({ view: "payables" }, "org1")).rejects.toThrow(/limit/)
})
it("rejects AP relation mismatches and source updates beyond the snapshot", async () => {
  tx.supplierInvoice.findMany.mockResolvedValue([apInvoice({ supplier: { organizationId: "foreign" } })])
  await expect(getOpenItemsDashboard({ view: "payables" }, "org1")).rejects.toThrow(/inconsistent/)
  tx.supplierInvoice.findMany.mockResolvedValue([apInvoice({ updatedAt: new Date("2026-10-13") })])
  await expect(getOpenItemsDashboard({ view: "payables" }, "org1")).rejects.toThrow(/revision/)
})
it.each([[0,"current"],[1,"1-30"],[30,"1-30"],[31,"31-60"],[60,"31-60"],[61,"61-90"],[90,"61-90"],[91,"90+"]])("classifies %s calendar days overdue as %s", (days, bucket) => {
  const due = new Date(now.getTime() - Number(days) * 86400000).toISOString()
  expect(classifyDue(due, now, "Africa/Douala").bucket).toBe(bucket)
})
it("uses organization calendar dates across DST and keeps missing due dates separate", () => {
  expect(classifyDue("2026-03-28T23:00:00Z", new Date("2026-03-29T22:30:00Z"), "Europe/Paris").daysPastDue).toBe(1)
  expect(classifyDue(null, now, "Africa/Douala").bucket).toBe("unknown")
})
it("separates today from nested upcoming windows and includes unknown due amounts in outstanding", () => {
  const make = (id: string, dueDate: string | null) => ({ id, currency: "XAF", outstanding: "0.10", dueDate, ...classifyDue(dueDate, now, "Africa/Douala") } as OpenItemsRow)
  const result = summarizeOpenItems([make("a", "2026-10-12"), make("b", "2026-10-19"), make("c", "2026-11-11"), make("d", null)], now, "Africa/Douala")[0]
  expect(result).toMatchObject({ outstanding: "0.40", due: { today: "0.10", next7: "0.10", next30: "0.20" }, aging: { unknown: "0.10" } })
})

it("keeps a zero denominator unavailable instead of inventing percentage performance", () => {
  const row = { id: "z", counterpartyId: "c", counterparty: "Customer", currency: "XAF", outstanding: "0.00", dueDate: null, bucket: "unknown", daysPastDue: null } as OpenItemsRow
  expect(summarizeOpenItems([row], now, "Africa/Douala")[0].performance).toEqual({ overdueShare: null, largestCounterpartyShare: null, topFiveShare: null })
})
