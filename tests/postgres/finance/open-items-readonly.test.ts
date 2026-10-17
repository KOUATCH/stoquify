import { Prisma } from "@prisma/client"
import { db } from "@/prisma/db"
import { getOpenItemsDashboard } from "@/services/finance/open-items-dashboard.service"
import { getPayablesWorkflowDashboard } from "@/services/finance/payables-workflow-dashboard.service"
import { getSalesCollections } from "@/services/analytics/sales-collections.service"
import { readAPHistory } from "@/services/purchasing/ap-history.service"
import type { OpenItemsDashboard, OpenItemsRow } from "@/services/finance/open-items-dashboard.contract"

// Real persistence, existing data only. No fixture creation or mutation tests.
const organizationId = process.env.OPEN_ITEMS_READONLY_ORGANIZATION_ID!
const reports = new Map<string, { report: OpenItemsDashboard; rows: OpenItemsRow[] }>()
const sum = (values: string[]) => values.reduce((total, value) => total.plus(value), new Prisma.Decimal(0)).toFixed(2)
const observedIsolation: string[] = []

beforeAll(async () => {
  if (process.env.OPEN_ITEMS_READONLY_VERIFICATION !== "1" || !organizationId) throw new Error("Explicit read-only runner required")
  const settings = await db.$queryRaw<Array<{ readonly: string }>>`SELECT current_setting('default_transaction_read_only') AS readonly`
  expect(settings[0].readonly).toBe("on")
  const original = db.$transaction.bind(db)
  // Instrument the real service transaction; do not replace persistence or its results.
  jest.spyOn(db, "$transaction").mockImplementation((async (read: (tx: Prisma.TransactionClient) => Promise<unknown>, options: { isolationLevel?: Prisma.TransactionIsolationLevel; timeout?: number }) => {
    return original(async tx => {
      const state = await tx.$queryRaw<Array<{ readonly: string; isolation: string }>>`SELECT current_setting('transaction_read_only') AS readonly, current_setting('transaction_isolation') AS isolation`
      expect(state[0].readonly).toBe("on")
      expect(state[0].isolation).toBe("repeatable read")
      observedIsolation.push(state[0].isolation)
      return read(tx)
    }, options)
  }) as typeof db.$transaction)
})
afterAll(async () => { jest.restoreAllMocks(); await db.$disconnect() })

describe.each(["receivables", "payables"] as const)("%s against the existing database", view => {
  it("reads a nonempty source population and verifies row ownership, balances and currency totals", async () => {
    const report = await getOpenItemsDashboard({ view, pageSize: 50 }, organizationId)
    expect(report.organization.id).toBe(organizationId)
    expect(report.sourceDocumentCount).toBeGreaterThan(0)
    const rows = [...report.records.rows]
    for (let page = 2; page <= Math.ceil(report.records.total / 50); page++) {
      const next = await getOpenItemsDashboard({ view, page, pageSize: 50, revision: report.revision }, organizationId)
      rows.push(...next.records.rows)
    }
    expect(rows.length).toBe(report.records.total)
    expect(new Set(rows.map(row => row.id)).size).toBe(rows.length)
    const ids = rows.map(row => row.id)
    const ownedCount = view === "receivables"
      ? await db.customerReceivableDocument.count({ where: { organizationId, id: { in: ids } } })
      : await db.supplierInvoice.count({ where: { organizationId, id: { in: ids } } })
    expect(ownedCount).toBe(rows.length)
    for (const row of rows) {
      if (row.outstanding === null) { expect(row.evidence).toBe("unverified"); continue }
      expect(new Prisma.Decimal(row.outstanding).gt(0)).toBe(true)
      expect(new Prisma.Decimal(row.original).minus(row.allocated ?? "0").minus(row.credits ?? "0").toFixed(2)).toBe(row.outstanding)
    }
    for (const currency of report.currencies) {
      const population = rows.filter(row => row.currency === currency.currency)
      expect(currency.count).toBe(population.length)
      if (population.some(row => row.outstanding === null)) {
        expect(currency.outstanding).toBeNull()
        expect(currency.aging).toBeNull()
        expect(currency.topCounterparties).toBeNull()
        expect(currency.performance).toBeNull()
      } else {
        expect(currency.outstanding).toBe(sum(population.map(row => row.outstanding!)))
        expect(sum(Object.values(currency.aging!))).toBe(currency.outstanding)
        const share = (amount: string) => new Prisma.Decimal(currency.outstanding!).gt(0) ? new Prisma.Decimal(amount).div(currency.outstanding!).mul(100).toFixed(2) : null
        expect(currency.performance?.overdueShare).toBe(share(sum(population.filter(row => (row.daysPastDue ?? 0) > 0).map(row => row.outstanding!))))
        expect(currency.performance?.largestCounterpartyShare).toBe(share(currency.topCounterparties![0]?.outstanding ?? "0"))
        expect(currency.performance?.topFiveShare).toBe(share(sum(currency.topCounterparties!.map(party => party.outstanding))))
        for (const party of currency.topCounterparties!) {
          expect(party.outstanding).toBe(sum(population.filter(row => row.counterpartyId === party.id).map(row => row.outstanding!)))
        }
      }
    }
    expect(report.queueCounts.all).toBe(rows.length)
    expect(report.queueCounts.overdue).toBe(rows.filter(row => (row.daysPastDue ?? 0) > 0).length)
    reports.set(view, { report, rows })
  })

  it("filters review rows without changing current currency balances and rejects stale paging", async () => {
    const baseline = reports.get(view)!
    expect(baseline).toBeDefined()
    const result = await getOpenItemsDashboard({ view, queue: "due7", pageSize: 50, revision: baseline.report.revision }, organizationId)
    expect(result.currencies).toEqual(baseline.report.currencies)
    expect(result.records.total).toBe(baseline.rows.filter(row => row.daysUntilDue !== null && row.daysUntilDue >= 1 && row.daysUntilDue <= 7).length)
    await expect(getOpenItemsDashboard({ view, page: 2, revision: "0".repeat(64) }, organizationId)).rejects.toMatchObject({ code: "CONFLICT" })
  })

  it("rejects a foreign location and an unknown organization", async () => {
    const foreign = await db.location.findFirst({ where: { organizationId: { not: organizationId }, deletedAt: null }, select: { id: true } })
    expect(foreign).not.toBeNull()
    await expect(getOpenItemsDashboard({ view, locationId: foreign!.id }, organizationId)).rejects.toMatchObject({ code: "NOT_FOUND" })
    await expect(getOpenItemsDashboard({ view }, "readonly-verification-nonexistent-organization")).rejects.toMatchObject({ code: "NOT_FOUND" })
  })
})

it("returns AP workflow counts matching persisted states and masks unauthorized payment counts", async () => {
  const report = await getPayablesWorkflowDashboard(organizationId, { approval: true, execution: true })
  const paymentScope = { organizationId, deletedAt: null, supplier: { organizationId } }
  expect(report.draftInvoices).toBe(await db.supplierInvoice.count({ where: { organizationId, deletedAt: null, status: "DRAFT" } }))
  expect(report.awaitingApproval).toBe(await db.supplierPayment.count({ where: { ...paymentScope, status: "DRAFT" } }))
  expect(report.awaitingExecution).toBe(await db.supplierPayment.count({ where: { ...paymentScope, status: "APPROVED" } }))
  expect(report.counts.matchExceptions).toBe(await db.threeWayMatch.count({ where: { organizationId, status: "EXCEPTION" } }))
  expect(report.counts.reconciliationBlockers).toBe(await db.paymentException.count({ where: { organizationId, sourceType: "SUPPLIER_PAYMENT", status: { notIn: ["RESOLVED", "DISMISSED"] } } }))
  const restricted = await getPayablesWorkflowDashboard(organizationId, { approval: false, execution: false })
  expect(restricted.awaitingApproval).toBeNull()
  expect(restricted.awaitingExecution).toBeNull()
  expect(Object.keys(report).sort()).toEqual(["awaitingApproval", "awaitingExecution", "checkedAt", "counts", "draftInvoices"])
})

it("reads independent receipt activity, conserves receipt arithmetic and rejects a foreign location", async () => {
  const report = await getSalesCollections({ organizationId, preset: "custom", start: "2026-09-01", end: "2026-10-12" }, { includeCreditIssued: false })
  expect(report.receipts).toBe(sum(report.methods.map(method => method.amount)))
  expect(report.net).toBe(report.missingTimes ? null : new Prisma.Decimal(report.receipts).minus(report.refunds).minus(report.reversals).toFixed(2))
  const foreign = await db.location.findFirst({ where: { organizationId: { not: organizationId }, deletedAt: null }, select: { id: true } })
  expect(foreign).not.toBeNull()
  await expect(getSalesCollections({ organizationId, locationId: foreign!.id, preset: "custom", start: report.start, end: report.end }, { includeCreditIssued: false })).rejects.toMatchObject({ code: "NOT_FOUND" })
})

it("opens the selected AP invoice with the same tenant-bound summary and rejects foreign invoice scope", async () => {
  const invoice = await db.supplierInvoice.findFirstOrThrow({ where: { organizationId }, select: { id: true, supplierId: true } })
  const foreign = await db.supplierInvoice.findFirstOrThrow({ where: { organizationId: { not: organizationId } }, select: { id: true } })
  const cursorCodec = { encode: () => "unused-readonly-cursor", decode: (): never => { throw new Error("No continuation in this check") } }
  await db.$transaction(async tx => {
    const read = (invoiceId: string) => readAPHistory({ organizationId, actorUserId: "readonly-verification", actorPermissions: ["finance.payables.read"], filters: { lane: "invoice", invoiceId, supplierId: invoice.supplierId, pageSize: 25 } }, { client: tx, cursorCodec })
    const result = await read(invoice.id)
    expect(result.rows).toHaveLength(1)
    expect(result.rows[0].id).toBe(`supplier-invoice:${invoice.id}`)
    expect(result.summary.transactionCount).toBe(1)
    expect(result.appliedFilters.invoiceId).toBe(invoice.id)
    expect((await read(foreign.id)).rows).toEqual([])
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead })
})

it("keeps real service transactions read-only and repeatable-read", async () => {
  expect(observedIsolation.length).toBeGreaterThanOrEqual(8)
  await db.$transaction(async tx => {
    const before = await tx.$queryRaw<Array<{ snapshot: string }>>`SELECT txid_current_snapshot()::text AS snapshot`
    await tx.organization.count({ where: { id: organizationId } })
    const after = await tx.$queryRaw<Array<{ snapshot: string }>>`SELECT txid_current_snapshot()::text AS snapshot`
    expect(after).toEqual(before)
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead })
})
