import { Prisma } from "@prisma/client"

import { db } from "@/prisma/db"

import {
  createStockCountSession,
  postStockCount,
  submitStockCountSession,
} from "../inventory-count.service"
import { InventorySoDViolationError } from "../inventory-errors"
import { recordInventoryValuationCloseInvalidationInTx } from "../inventory-close-invalidation.service"

jest.mock("@/prisma/db", () => ({
  db: {
    $transaction: jest.fn(),
    $queryRaw: jest.fn(),
    location: { findFirst: jest.fn() },
    item: { findMany: jest.fn() },
    inventoryLevel: { findMany: jest.fn(), findUnique: jest.fn(), updateMany: jest.fn(), create: jest.fn() },
    inventoryTransaction: { create: jest.fn() },
    stockCountSession: { count: jest.fn(), create: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
    stockCountLine: { update: jest.fn() },
    stockAdjustment: { count: jest.fn(), create: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
    stockAdjustmentLine: { update: jest.fn() },
    businessEvent: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    closeRun: { findMany: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
    closePackExport: { findFirst: jest.fn(), update: jest.fn() },
    accountingPeriod: { findFirst: jest.fn(), findMany: jest.fn() },
    ledgerPostingBatch: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    postingRule: { findFirst: jest.fn() },
    ledgerAuditEvent: { create: jest.fn() },
    journal: { findFirst: jest.fn() },
    journalEntry: { count: jest.fn(), create: jest.fn() },
    chartOfAccount: { findFirst: jest.fn(), findMany: jest.fn() },
    accountingSourceLink: { findFirst: jest.fn(), create: jest.fn() },
    auditLog: { create: jest.fn() },
  },
}))

const mockedDb = db as unknown as {
  $queryRaw: jest.Mock
  $transaction: jest.Mock
  location: { findFirst: jest.Mock }
  item: { findMany: jest.Mock }
  inventoryLevel: { findMany: jest.Mock; findUnique: jest.Mock; updateMany: jest.Mock; create: jest.Mock }
  inventoryTransaction: { create: jest.Mock }
  stockCountSession: { count: jest.Mock; create: jest.Mock; findFirst: jest.Mock; update: jest.Mock }
  stockCountLine: { update: jest.Mock }
  stockAdjustment: { count: jest.Mock; create: jest.Mock; findFirst: jest.Mock; update: jest.Mock }
  stockAdjustmentLine: { update: jest.Mock }
  businessEvent: { findUnique: jest.Mock; create: jest.Mock; update: jest.Mock }
  closeRun: { findMany: jest.Mock; findFirst: jest.Mock; update: jest.Mock }
  closePackExport: { findFirst: jest.Mock; update: jest.Mock }
  accountingPeriod: { findFirst: jest.Mock; findMany: jest.Mock }
  ledgerPostingBatch: { findFirst: jest.Mock; create: jest.Mock; update: jest.Mock }
  postingRule: { findFirst: jest.Mock }
  ledgerAuditEvent: { create: jest.Mock }
  journal: { findFirst: jest.Mock }
  journalEntry: { count: jest.Mock; create: jest.Mock }
  chartOfAccount: { findFirst: jest.Mock; findMany: jest.Mock }
  accountingSourceLink: { findFirst: jest.Mock; create: jest.Mock }
  auditLog: { create: jest.Mock }
}

const countDate = new Date("2026-06-15T09:00:00Z")

function decimal(value: string | number) {
  return new Prisma.Decimal(value)
}

function item(overrides: Record<string, unknown> = {}) {
  return {
    id: "item-1",
    organizationId: "org-1",
    sku: "SKU-1",
    nameEn: "Item 1",
    nameFr: null,
    isActive: true,
    isDiscontinued: false,
    deletedAt: null,
    trackInventory: true,
    costPrice: decimal("100"),
    ...overrides,
  }
}

function location(overrides: Record<string, unknown> = {}) {
  return {
    id: "loc-1",
    name: "Main warehouse",
    organizationId: "org-1",
    isActive: true,
    deletedAt: null,
    ...overrides,
  }
}

function level(overrides: Record<string, unknown> = {}) {
  return {
    id: "level-1",
    itemId: "item-1",
    locationId: "loc-1",
    quantityOnHand: decimal("10"),
    quantityReserved: decimal("0"),
    quantityAvailable: decimal("10"),
    quantityInTransit: decimal("0"),
    quantityOnOrder: decimal("0"),
    reorderPoint: decimal("0"),
    averageCost: decimal("100"),
    totalValue: decimal("1000"),
    version: 3,
    lastCountDate: null,
    lastTransactionAt: null,
    createdAt: countDate,
    updatedAt: countDate,
    ...overrides,
  }
}

function countLine(overrides: Record<string, unknown> = {}) {
  return {
    id: "count-line-1",
    stockCountSessionId: "count-1",
    itemId: "item-1",
    locationId: "loc-1",
    systemQuantity: decimal("10"),
    countedQuantity: null,
    varianceQuantity: null,
    unitCost: decimal("100"),
    varianceValue: decimal("0"),
    reasonCode: null,
    evidenceHash: null,
    metadata: null,
    createdAt: countDate,
    updatedAt: countDate,
    item: item(),
    ...overrides,
  }
}

function countSession(overrides: Record<string, unknown> = {}) {
  return {
    id: "count-1",
    countNumber: "CNT-20260615-0001",
    status: "FROZEN",
    countDate,
    snapshotHash: "sha256:snapshot",
    countSheetHash: null,
    notes: null,
    metadata: null,
    locationId: "loc-1",
    organizationId: "org-1",
    createdById: "maker-1",
    submittedById: null,
    submittedAt: null,
    approvedById: null,
    approvedAt: null,
    postedById: null,
    postedAt: null,
    postedBusinessEventId: null,
    postedAdjustmentId: null,
    createdAt: countDate,
    updatedAt: countDate,
    location: location(),
    createdBy: null,
    submittedBy: null,
    approvedBy: null,
    postedBy: null,
    lines: [countLine()],
    ...overrides,
  }
}

function prepareZeroVarianceCount() {
  const session = countSession({
    status: "SUBMITTED", countSheetHash: "sha256:count-sheet", submittedById: "submitter-1", submittedAt: countDate,
    lines: [countLine({ countedQuantity: decimal("10"), varianceQuantity: decimal("0"), varianceValue: decimal("0"), evidenceHash: "sha256:line-evidence" })],
  })
  mockedDb.stockCountSession.findFirst.mockResolvedValue(session)
  mockedDb.stockCountSession.update.mockImplementation(async ({ data }) => ({ ...session, ...data }))
  return session
}

function adjustment(overrides: Record<string, unknown> = {}) {
  return {
    id: "adjustment-1",
    adjustmentNumber: "ADJ-20260615-0001",
    type: "PHYSICAL_COUNT",
    reason: "Physical count variance CNT-20260615-0001",
    status: "DRAFT",
    adjustmentDate: countDate,
    notes: null,
    deletedAt: null,
    locationId: "loc-1",
    organizationId: "org-1",
    createdById: "submitter-1",
    approvedById: null,
    approvedAt: null,
    evidenceHash: "sha256:count-sheet",
    documentHash: "sha256:count-sheet",
    postedBusinessEventId: null,
    ledgerPostingBatchId: null,
    sourceCountSessionId: "count-1",
    metadata: null,
    createdAt: countDate,
    updatedAt: countDate,
    location: {
      ...location(),
      allowNegativeStock: false,
    },
    createdBy: null,
    approvedBy: null,
    lines: [
      {
        id: "adjustment-line-1",
        adjustmentId: "adjustment-1",
        itemId: "item-1",
        systemQuantity: decimal("10"),
        actualQuantity: decimal("8"),
        adjustedQuantity: decimal("-2"),
        unitCost: decimal("100"),
        totalCost: decimal("200"),
        notes: null,
        evidenceHash: "sha256:count-sheet",
        stockCountLineId: "count-line-1",
        metadata: null,
        createdAt: countDate,
        updatedAt: countDate,
        item: item(),
      },
    ],
    ...overrides,
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockedDb.$queryRaw.mockImplementation(async (query: { sql: string }) => query.sql.includes("current_setting") ? [{ isolationLevel: "read committed" }] : query.sql.includes('"organizations"') ? [{ id: "org-1" }] : query.sql.includes('"close_runs"') ? [{ id: "close-run-1" }] : [{ newWorkStoppedModules: [], newWorkStoppedAt: {} }])
  mockedDb.$transaction.mockImplementation(async (callback) => callback(mockedDb))
  mockedDb.location.findFirst.mockResolvedValue(location())
  mockedDb.item.findMany.mockResolvedValue([item()])
  mockedDb.inventoryLevel.findMany.mockResolvedValue([level()])
  mockedDb.stockCountSession.count.mockResolvedValue(0)
  mockedDb.stockCountSession.create.mockImplementation(async (args) =>
    countSession({
      countNumber: args.data.countNumber,
      status: args.data.status,
      snapshotHash: args.data.snapshotHash,
      lines: [countLine({ systemQuantity: args.data.lines.create[0].systemQuantity })],
    }),
  )
  mockedDb.stockCountSession.findFirst.mockResolvedValue(countSession())
  mockedDb.stockCountSession.update.mockImplementation(async (args) =>
    countSession({
      status: args.data.status,
      countSheetHash: args.data.countSheetHash,
      submittedById: args.data.submittedById ?? "submitter-1",
      submittedAt: args.data.submittedAt ?? countDate,
      approvedById: args.data.approvedById ?? null,
      approvedAt: args.data.approvedAt ?? null,
      postedById: args.data.postedById ?? null,
      postedAt: args.data.postedAt ?? null,
      postedBusinessEventId: args.data.postedBusinessEventId ?? null,
      postedAdjustmentId: args.data.postedAdjustmentId ?? null,
      lines: [countLine({ countedQuantity: decimal("8"), varianceQuantity: decimal("-2"), varianceValue: decimal("200") })],
    }),
  )
  mockedDb.stockCountLine.update.mockResolvedValue({ id: "count-line-1" })
  mockedDb.stockAdjustment.count.mockResolvedValue(0)
  mockedDb.stockAdjustment.create.mockResolvedValue(adjustment())
  mockedDb.stockAdjustment.findFirst.mockResolvedValue(adjustment())
  mockedDb.stockAdjustment.update.mockImplementation(async (args) =>
    adjustment({
      status: "COMPLETED",
      approvedById: args.data.approvedById,
      approvedAt: args.data.approvedAt,
      postedBusinessEventId: args.data.postedBusinessEventId,
      ledgerPostingBatchId: args.data.ledgerPostingBatchId,
    }),
  )
  mockedDb.businessEvent.findUnique.mockResolvedValue(null)
  mockedDb.businessEvent.create.mockImplementation(async (args) => ({
    id: args.data.eventType === "inventory.physical_count.validated" ? "event-count-1" : "event-adjustment-1",
    ...args.data,
    outboxMessages: args.data.outboxMessages.create,
  }))
  mockedDb.businessEvent.update.mockResolvedValue({ id: "event-1", status: "APPLIED" })
  mockedDb.closeRun.findMany.mockResolvedValue([])
  mockedDb.closeRun.findFirst.mockResolvedValue(null)
  mockedDb.closeRun.update.mockResolvedValue({ id: "close-run-1" })
  mockedDb.closePackExport.findFirst.mockResolvedValue(null)
  mockedDb.closePackExport.update.mockResolvedValue({ id: "close-pack-export-1" })
  mockedDb.accountingPeriod.findMany.mockResolvedValue([{ id: "period-1" }])
  mockedDb.accountingPeriod.findFirst.mockResolvedValue({
    id: "period-1",
    organizationId: "org-1",
    name: "June 2026",
    startDate: new Date("2026-06-01T00:00:00Z"),
    endDate: new Date("2026-06-30T23:59:59Z"),
    status: "OPEN",
  })
  mockedDb.inventoryLevel.findUnique.mockResolvedValue(level())
  mockedDb.inventoryLevel.updateMany.mockResolvedValue({ count: 1 })
  mockedDb.inventoryTransaction.create.mockResolvedValue({ id: "movement-adjustment-1" })
  mockedDb.stockAdjustmentLine.update.mockResolvedValue({ id: "adjustment-line-1" })
  mockedDb.ledgerPostingBatch.findFirst.mockResolvedValue(null)
  mockedDb.ledgerPostingBatch.create.mockResolvedValue({ id: "posting-batch-1" })
  mockedDb.ledgerPostingBatch.update.mockImplementation(async (args) => ({
    id: args.where.id,
    ...args.data,
  }))
  mockedDb.postingRule.findFirst.mockResolvedValue(null)
  mockedDb.ledgerAuditEvent.create.mockResolvedValue({ id: "ledger-audit-1" })
  mockedDb.auditLog.create.mockResolvedValue({ id: "audit-1" })
})

describe("stock count kernel", () => {
  it("blocks new count sessions after a reviewed inventory stop", async () => {
    mockedDb.$queryRaw.mockImplementation(async (query: { sql: string }) => query.sql.includes("current_setting") ? [{ isolationLevel: "read committed" }] : query.sql.includes('"organizations"') ? [{ id: "org-1" }] : [{ newWorkStoppedModules: ["inventory"], newWorkStoppedAt: { inventory: "2026-09-05T10:00:00Z" } }])
    await expect(createStockCountSession({ organizationId: "org-1", locationId: "loc-1", createdById: "maker-1", itemIds: ["item-1"], countDate })).rejects.toMatchObject({ metadata: { reason: "MODULE_NEW_WORK_STOPPED" } })
    expect(mockedDb.stockCountSession.create).not.toHaveBeenCalled()
  })
  it("freezes a count snapshot with a stable evidence hash", async () => {
    const result = await createStockCountSession({
      organizationId: "org-1",
      locationId: "loc-1",
      createdById: "maker-1",
      itemIds: ["item-1"],
      countDate,
    })

    expect(result.status).toBe("FROZEN")
    expect(result.snapshotHash).toMatch(/^sha256:/)
    expect(mockedDb.stockCountSession.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "FROZEN",
          lines: {
            create: [
              expect.objectContaining({
                itemId: "item-1",
                systemQuantity: decimal("10.000"),
                unitCost: decimal("100.00"),
              }),
            ],
          },
        }),
      }),
    )
  })

  it("submits counted quantities and generates count variances", async () => {
    const result = await submitStockCountSession({
      organizationId: "org-1",
      countSessionId: "count-1",
      submittedById: "submitter-1",
      countSheetHash: "sha256:count-sheet",
      lines: [
        {
          lineId: "count-line-1",
          countedQuantity: "8",
          reasonCode: "COUNT_VARIANCE",
          evidenceHash: "sha256:line-evidence",
        },
      ],
    })

    expect(result.status).toBe("SUBMITTED")
    expect(mockedDb.stockCountLine.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          countedQuantity: decimal("8.000"),
          varianceQuantity: decimal("-2.000"),
          varianceValue: decimal("200.00"),
          evidenceHash: "sha256:line-evidence",
        }),
      }),
    )
  })

  it.each([false, true])("posts recorded count variance with explicit ledger blockers (new work stopped: %s)", async stopped => {
    if (stopped) {
      mockedDb.$queryRaw.mockImplementation(async (query: { sql: string }) => query.sql.includes("current_setting") ? [{ isolationLevel: "read committed" }] : query.sql.includes('"organizations"') ? [{ id: "org-1" }] : query.sql.includes('"stock_count_sessions"') ? [{ id: "count-1" }] : [{ newWorkStoppedModules: ["inventory"], newWorkStoppedAt: { inventory: "2026-09-05T10:00:00Z" } }])
      mockedDb.stockAdjustment.findFirst.mockResolvedValueOnce(null)
    }
    mockedDb.stockCountSession.findFirst.mockResolvedValue(
      countSession({
        status: "SUBMITTED",
        countSheetHash: "sha256:count-sheet",
        submittedById: "submitter-1",
        submittedAt: countDate,
        lines: [
          countLine({
            countedQuantity: decimal("8"),
            varianceQuantity: decimal("-2"),
            varianceValue: decimal("200"),
            evidenceHash: "sha256:line-evidence",
          }),
        ],
      }),
    )

    const result = await postStockCount({
      organizationId: "org-1",
      countSessionId: "count-1",
      approvedById: "approver-1",
      occurredAt: countDate,
    })

    expect(result).toMatchObject({
      eventId: "event-count-1",
      generatedAdjustmentId: "adjustment-1",
      generatedAdjustmentEventId: "event-adjustment-1",
      generatedAdjustmentLedgerStatus: "BLOCKED",
      varianceLineCount: 1,
      totalVarianceValue: "200.00",
      replayed: false,
    })
    expect(mockedDb.stockAdjustment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: "PHYSICAL_COUNT",
          sourceCountSessionId: "count-1",
          evidenceHash: "sha256:count-sheet",
          lines: {
            create: [
              expect.objectContaining({
                stockCountLineId: "count-line-1",
                adjustedQuantity: decimal("-2.000"),
              }),
            ],
          },
        }),
      }),
    )
    expect(mockedDb.businessEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventType: "stock.adjustment.posted",
          sourceType: "STOCK_ADJUSTMENT",
        }),
      }),
    )
    expect(mockedDb.businessEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventType: "inventory.physical_count.validated",
          sourceType: "STOCK_COUNT",
          postingBatchId: "posting-batch-1",
        }),
      }),
    )
    expect(mockedDb.accountingPeriod.findMany).not.toHaveBeenCalled()
    expect(mockedDb.$queryRaw.mock.calls.some(([query]) => query.sql?.includes("current_setting"))).toBe(false)
    // The variance-adjustment path already invalidates close evidence once.
    expect(mockedDb.closeRun.findMany).toHaveBeenCalledTimes(1)
  })

  it("acquires the shared catalog before posting-period row locks, scope discovery and source writes", async () => {
    prepareZeroVarianceCount()
    const defaultQueryRaw = mockedDb.$queryRaw.getMockImplementation()!
    let release!: () => void, entered!: () => void
    const waiting = new Promise<void>(resolve => { entered = resolve })
    const held = new Promise(resolve => { release = () => resolve([]) })
    const sqlOf = (query: { sql: string } | TemplateStringsArray) => "sql" in query ? query.sql : query.join("?")
    mockedDb.$queryRaw.mockImplementation((query: { sql: string } | TemplateStringsArray) => {
      const sql = sqlOf(query)
      if (sql.includes("pg_advisory_xact_lock_shared")) { entered(); return held }
      if (sql.includes("accounting_periods")) return [{ id: "period-1", organizationId: "org-1", status: "OPEN", startDate: new Date("2026-06-01T00:00:00Z"), endDate: new Date("2026-06-30T23:59:59Z") }]
      return defaultQueryRaw(query)
    })
    const { $transaction: unusedTransaction, ...tx } = mockedDb
    const work = postStockCount({ organizationId: "org-1", countSessionId: "count-1", approvedById: "approver-1" }, tx as unknown as Prisma.TransactionClient)
    await waiting
    expect(mockedDb.$queryRaw.mock.calls.some(([query]) => sqlOf(query).includes("accounting_periods"))).toBe(false)
    expect(mockedDb.accountingPeriod.findMany).not.toHaveBeenCalled()
    expect(mockedDb.businessEvent.create).not.toHaveBeenCalled()
    expect(mockedDb.stockCountSession.update).not.toHaveBeenCalled()
    expect(mockedDb.auditLog.create).not.toHaveBeenCalled()
    expect(mockedDb.closeRun.findMany).not.toHaveBeenCalled()
    release()
    await expect(work).resolves.toMatchObject({ varianceLineCount: 0, replayed: false })
    expect(unusedTransaction).not.toHaveBeenCalled()
    const calls = mockedDb.$queryRaw.mock.calls.map(([query], index) => ({ sql: sqlOf(query), query, order: mockedDb.$queryRaw.mock.invocationCallOrder[index] }))
    const catalog = calls.find(call => call.sql.includes("pg_advisory_xact_lock_shared"))!
    const postingPeriod = calls.find(call => call.sql.includes("accounting_periods"))!
    expect(catalog.query.values).toEqual([JSON.stringify(["accounting-period-catalog", "org-1"])])
    expect(postingPeriod.sql).toContain("FOR SHARE")
    expect(catalog.order).toBeLessThan(postingPeriod.order)
    expect(postingPeriod.order).toBeLessThan(mockedDb.accountingPeriod.findMany.mock.invocationCallOrder[0])
    expect(mockedDb.businessEvent.update.mock.invocationCallOrder[0]).toBeLessThan(mockedDb.closeRun.findMany.mock.invocationCallOrder[0])
  })

  it("rolls back catalog-lock failure before selecting periods or writing count evidence", async () => {
    prepareZeroVarianceCount()
    const failure = new Error("Catalog lock unavailable")
    const defaultQueryRaw = mockedDb.$queryRaw.getMockImplementation()!
    mockedDb.$queryRaw.mockImplementation((query: { sql: string }) => {
      if (query.sql.includes("pg_advisory_xact_lock_shared")) throw failure
      return defaultQueryRaw(query)
    })
    const commit = jest.fn()
    mockedDb.$transaction.mockImplementation(async callback => { const result = await callback(mockedDb); commit(); return result })
    await expect(postStockCount({ organizationId: "org-1", countSessionId: "count-1", approvedById: "approver-1" })).rejects.toBe(failure)
    expect(commit).not.toHaveBeenCalled()
    expect(mockedDb.accountingPeriod.findFirst).not.toHaveBeenCalled()
    expect(mockedDb.accountingPeriod.findMany).not.toHaveBeenCalled()
    expect(mockedDb.businessEvent.create).not.toHaveBeenCalled()
    expect(mockedDb.businessEvent.update).not.toHaveBeenCalled()
    expect(mockedDb.stockCountSession.update).not.toHaveBeenCalled()
    expect(mockedDb.auditLog.create).not.toHaveBeenCalled()
    expect(mockedDb.closeRun.findMany).not.toHaveBeenCalled()
  })
  it("waits for every cumulative period lock before zero-count source writes and target discovery", async () => {
    prepareZeroVarianceCount()
    mockedDb.accountingPeriod.findMany.mockResolvedValue([{ id: "z-later-no-run" }, { id: "period-1" }, { id: "a-closed" }])
    const defaultQueryRaw = mockedDb.$queryRaw.getMockImplementation()!
    let release!: () => void, entered!: () => void
    const waiting = new Promise<void>(resolve => { entered = resolve })
    const held = new Promise(resolve => { release = () => resolve([]) })
    mockedDb.$queryRaw.mockImplementation((query: { sql: string; values?: unknown[] }) => {
      if (query.sql.includes("pg_advisory_xact_lock") && query.values?.[0] === JSON.stringify(["close-assessment-order", "org-1", "a-closed"])) { entered(); return held }
      return defaultQueryRaw(query)
    })
    const work = postStockCount({ organizationId: "org-1", countSessionId: "count-1", approvedById: "approver-1" })
    await waiting
    expect(mockedDb.businessEvent.create).not.toHaveBeenCalled()
    expect(mockedDb.stockCountSession.update).not.toHaveBeenCalled()
    expect(mockedDb.auditLog.create).not.toHaveBeenCalled()
    expect(mockedDb.closeRun.findMany).not.toHaveBeenCalled()
    release()
    await expect(work).resolves.toMatchObject({ varianceLineCount: 0, replayed: false })
    const periodCalls = mockedDb.$queryRaw.mock.calls.map(([query], index) => ({ query, order: mockedDb.$queryRaw.mock.invocationCallOrder[index] })).filter(({ query }) => query.sql.includes("pg_advisory_xact_lock") && query.values?.[0]?.startsWith('["close-assessment-order"'))
    expect(periodCalls.map(({ query }) => query.values)).toEqual(["a-closed", "period-1", "z-later-no-run"].map(id => [JSON.stringify(["close-assessment-order", "org-1", id])]))
    expect(periodCalls.at(-1)!.order).toBeLessThan(mockedDb.businessEvent.create.mock.invocationCallOrder[0])
    expect(mockedDb.businessEvent.update.mock.invocationCallOrder[0]).toBeLessThan(mockedDb.closeRun.findMany.mock.invocationCallOrder[0])
    expect(mockedDb.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: "ReadCommitted" })
    expect(mockedDb.journalEntry.create).not.toHaveBeenCalled()
    expect(mockedDb.inventoryTransaction.create).not.toHaveBeenCalled()
  })

  it.each(["repeatable read", "serializable"])("rejects inherited %s before zero-count source mutations", async isolationLevel => {
    prepareZeroVarianceCount()
    const defaultQueryRaw = mockedDb.$queryRaw.getMockImplementation()!
    mockedDb.$queryRaw.mockImplementation((query: { sql: string } | TemplateStringsArray) => {
      const sql = "sql" in query ? query.sql : query.join("?")
      if (sql.includes("accounting_periods")) return [{ id: "period-1", organizationId: "org-1", status: "OPEN", startDate: new Date("2026-06-01T00:00:00Z"), endDate: new Date("2026-06-30T23:59:59Z") }]
      if (sql.includes("current_setting")) return [{ isolationLevel }]
      return defaultQueryRaw(query)
    })
    const { $transaction: unusedTransaction, ...tx } = mockedDb
    await expect(postStockCount({ organizationId: "org-1", countSessionId: "count-1", approvedById: "approver-1" }, tx as unknown as Prisma.TransactionClient)).rejects.toMatchObject({ code: "CONFLICT" })
    expect(unusedTransaction).not.toHaveBeenCalled()
    expect(mockedDb.$queryRaw).toHaveBeenCalledTimes(1)
    expect(mockedDb.accountingPeriod.findMany).not.toHaveBeenCalled()
    expect(mockedDb.businessEvent.create).not.toHaveBeenCalled()
    expect(mockedDb.businessEvent.update).not.toHaveBeenCalled()
    expect(mockedDb.stockCountSession.update).not.toHaveBeenCalled()
    expect(mockedDb.auditLog.create).not.toHaveBeenCalled()
    expect(mockedDb.closeRun.findMany).not.toHaveBeenCalled()
    expect(mockedDb.journalEntry.create).not.toHaveBeenCalled()
  })
  it.each(["READY", "CERTIFIED"])("invalidates %s close evidence only after a zero-variance count is posted and applied", async status => {
    prepareZeroVarianceCount()
    const countSource = { sourceCode: "INVENTORY_PHYSICAL_COUNT_VALIDATED", sourceModel: "StockCountSession", sourceTable: "stock_count_sessions", sourceEventName: "inventory.physical_count.validated", sourceId: "count-1" }
    mockedDb.closeRun.findMany.mockResolvedValue([{ id: "close-run-1" }])
    mockedDb.closeRun.findFirst.mockResolvedValue({ id: "close-run-1", organizationId: "org-1", periodId: "period-1", status, metadata: { retainedAssessment: "unchanged" } })
    if (status === "CERTIFIED") mockedDb.closePackExport.findFirst.mockResolvedValue({ id: "retained-certified-export", isCertified: true, contentHash: "sha256:original-artifact", metadata: { originalCertification: "retained" } })

    const result = await postStockCount({ organizationId: "org-1", countSessionId: "count-1", approvedById: "approver-1", correlationId: "zero-count-correlation" })

    expect(result).toMatchObject({ countSession: { status: "POSTED" }, varianceLineCount: 0, totalVarianceValue: "0.00", replayed: false })
    expect(result.generatedAdjustmentId).toBeUndefined()
    expect(mockedDb.stockCountSession.update.mock.invocationCallOrder[0]).toBeLessThan(mockedDb.businessEvent.update.mock.invocationCallOrder[0])
    expect(mockedDb.businessEvent.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "event-count-1", organizationId: "org-1" }, data: expect.objectContaining({ status: "APPLIED" }) }))
    expect(mockedDb.businessEvent.update.mock.invocationCallOrder[0]).toBeLessThan(mockedDb.closeRun.findMany.mock.invocationCallOrder[0])
    expect(mockedDb.closeRun.update).toHaveBeenCalledWith({ where: { id: "close-run-1" }, data: { status: "BLOCKED", metadata: expect.objectContaining({ retainedAssessment: "unchanged", staleState: expect.objectContaining({ ...countSource, status: "EVIDENCE_STALE", newEvidenceHash: "sha256:count-sheet", actorId: "approver-1", correlationId: "zero-count-correlation" }) }) } })
    expect(mockedDb.businessEvent.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ eventType: "close.certification.invalidated", payload: expect.objectContaining({ ...countSource, closePackExportId: status === "CERTIFIED" ? "retained-certified-export" : null }), outboxMessages: { create: [expect.objectContaining({ eventName: "close.certification.invalidated", payload: expect.objectContaining(countSource) })] } }) }))
    expect(mockedDb.ledgerAuditEvent.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: "CLOSE_CERTIFICATION_EVIDENCE_STALE", metadata: expect.objectContaining(countSource) }) }))
    if (status === "CERTIFIED") expect(mockedDb.closePackExport.update).toHaveBeenCalledWith({ where: { id: "retained-certified-export" }, data: { metadata: expect.objectContaining({ originalCertification: "retained", staleState: expect.objectContaining({ ...countSource, status: "EVIDENCE_STALE" }) }) } })
    else expect(mockedDb.closePackExport.update).not.toHaveBeenCalled()
    for (const model of [mockedDb.stockAdjustment, mockedDb.inventoryTransaction, mockedDb.ledgerPostingBatch, mockedDb.journalEntry, mockedDb.accountingSourceLink]) expect(model.create).not.toHaveBeenCalled()
    expect(mockedDb.inventoryLevel.updateMany).not.toHaveBeenCalled()
  })

  it.each([
    { eventDate: new Date("2026-05-15T09:00:00Z"), scopeStart: new Date("2026-05-15T09:00:00Z") },
    { eventDate: new Date("2026-07-15T09:00:00Z"), scopeStart: countDate },
  ])("covers later periods from the earlier count/event date ($eventDate) in one scoped pass", async ({ eventDate, scopeStart }) => {
    prepareZeroVarianceCount()
    const postingPeriod = { id: "posting-period", organizationId: "org-1", status: "OPEN", startDate: new Date(Date.UTC(2026, eventDate.getUTCMonth(), 1)), endDate: new Date(Date.UTC(2026, eventDate.getUTCMonth() + 1, 1) - 1) }
    mockedDb.accountingPeriod.findMany.mockResolvedValue([{ id: postingPeriod.id }, { id: "later-period-without-runs" }])
    const defaultQueryRaw = mockedDb.$queryRaw.getMockImplementation()
    mockedDb.$queryRaw.mockImplementation(async (query: { sql: string } | TemplateStringsArray) => {
      const sql = "sql" in query ? query.sql : query.join("?")
      return sql.includes("accounting_periods") ? [postingPeriod] : defaultQueryRaw!(query)
    })
    const { $transaction: unusedTransaction, ...tx } = mockedDb
    await postStockCount({ organizationId: "org-1", countSessionId: "count-1", approvedById: "approver-1", occurredAt: eventDate }, tx as unknown as Prisma.TransactionClient)
    expect(unusedTransaction).not.toHaveBeenCalled()
    expect(mockedDb.accountingPeriod.findMany).toHaveBeenCalledWith({ where: { organizationId: "org-1", OR: [{ id: "posting-period" }, { endDate: { gte: scopeStart } }] }, select: { id: true }, orderBy: { id: "asc" } })
    expect(mockedDb.closeRun.findMany).toHaveBeenCalledTimes(1)
    // No upper/start-date bound excludes future periods; endDate >= scopeStart
    // excludes earlier unrelated periods while preserving the posting period.
    expect(mockedDb.closeRun.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ organizationId: "org-1", AND: expect.arrayContaining([{ OR: [{ periodId: "posting-period" }, { period: { endDate: { gte: scopeStart } } }] }]) }), orderBy: { id: "asc" } }))
  })

  it("preserves the helper's exact-date scope unless a producer opts into cumulative evidence", async () => {
    await recordInventoryValuationCloseInvalidationInTx(mockedDb as unknown as Prisma.TransactionClient, {
      organizationId: "org-1", sourceId: "existing-producer", periodId: "period-1", occurredAt: countDate,
    })
    expect(mockedDb.closeRun.findMany).toHaveBeenCalledTimes(1)
    expect(mockedDb.closeRun.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ organizationId: "org-1", AND: expect.arrayContaining([{ OR: [{ periodId: "period-1" }, { period: { startDate: { lte: countDate }, endDate: { gte: countDate } } }] }]) }), orderBy: { id: "asc" } }))
  })

  it("preserves the existing valuation source registry mapping for other helper callers", async () => {
    mockedDb.closeRun.findMany.mockResolvedValue([{ id: "close-run-1" }])
    mockedDb.closeRun.findFirst.mockResolvedValue({ id: "close-run-1", organizationId: "org-1", periodId: "period-1", status: "READY", metadata: null })
    await recordInventoryValuationCloseInvalidationInTx(mockedDb as unknown as Prisma.TransactionClient, {
      organizationId: "org-1", sourceId: "existing-producer", periodId: "period-1", occurredAt: countDate,
    })
    expect(mockedDb.businessEvent.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({
      eventType: "close.certification.invalidated", payload: expect.objectContaining({ sourceCode: "INVENTORY_VALUATION_WRITE", sourceModel: "InventoryTransaction", sourceTable: "inventory_transactions", sourceEventName: "inventory.valuation.write", sourceId: "existing-producer" }),
    }) }))
  })

  it("replays a posted zero-variance count without repeating invalidation or source writes", async () => {
    const submitted = prepareZeroVarianceCount()
    const posted = { ...submitted, status: "POSTED", approvedById: "approver-1", postedBusinessEventId: "event-count-1" }
    mockedDb.stockCountSession.findFirst.mockResolvedValue(posted)
    mockedDb.businessEvent.findUnique.mockResolvedValue({ id: "event-count-1", sourceType: "STOCK_COUNT", sourceId: "count-1", documentHash: "sha256:count-sheet" })
    const result = await postStockCount({ organizationId: "org-1", countSessionId: "count-1", approvedById: "approver-1", correlationId: "new-retry-correlation" })
    expect(result).toMatchObject({ replayed: true, eventId: "event-count-1", varianceLineCount: 0, totalVarianceValue: "0.00" })
    expect(mockedDb.accountingPeriod.findMany).not.toHaveBeenCalled()
    expect(mockedDb.$queryRaw).not.toHaveBeenCalled()
    expect(mockedDb.closeRun.findMany).not.toHaveBeenCalled()
    expect(mockedDb.businessEvent.create).not.toHaveBeenCalled()
    expect(mockedDb.businessEvent.update).not.toHaveBeenCalled()
    expect(mockedDb.stockCountSession.update).not.toHaveBeenCalled()
    expect(mockedDb.auditLog.create).not.toHaveBeenCalled()
  })

  it("does not commit a zero-variance count when its close invalidation fails", async () => {
    prepareZeroVarianceCount()
    const failure = new Error("close invalidation unavailable")
    mockedDb.closeRun.findMany.mockRejectedValue(failure)
    const commit = jest.fn()
    mockedDb.$transaction.mockImplementation(async callback => { const result = await callback(mockedDb); commit(); return result })
    await expect(postStockCount({ organizationId: "org-1", countSessionId: "count-1", approvedById: "approver-1" })).rejects.toBe(failure)
    expect(commit).not.toHaveBeenCalled()
    expect(mockedDb.businessEvent.update).toHaveBeenCalled()
    expect(mockedDb.stockAdjustment.create).not.toHaveBeenCalled()
  })

  it.each(["maker-1", "submitter-1"])("keeps zero-variance maker-checker denial for %s free of invalidation writes", async approvedById => {
    prepareZeroVarianceCount()
    await expect(postStockCount({ organizationId: "org-1", countSessionId: "count-1", approvedById })).rejects.toBeInstanceOf(InventorySoDViolationError)
    expect(mockedDb.$queryRaw).not.toHaveBeenCalled()
    expect(mockedDb.accountingPeriod.findMany).not.toHaveBeenCalled()
    expect(mockedDb.businessEvent.create).not.toHaveBeenCalled()
    expect(mockedDb.stockCountSession.update).not.toHaveBeenCalled()
    expect(mockedDb.closeRun.findMany).not.toHaveBeenCalled()
  })

  it("keeps tenant-scoped missing counts free of invalidation writes", async () => {
    mockedDb.stockCountSession.findFirst.mockResolvedValue(null)
    await expect(postStockCount({ organizationId: "other-org", countSessionId: "count-1", approvedById: "approver-1" })).rejects.toThrow(/not found/)
    expect(mockedDb.stockCountSession.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "count-1", organizationId: "other-org" } }))
    expect(mockedDb.closeRun.findMany).not.toHaveBeenCalled()
    expect(mockedDb.businessEvent.create).not.toHaveBeenCalled()
  })

  it("keeps replay by a different approver denied without additional invalidation", async () => {
    const submitted = prepareZeroVarianceCount()
    mockedDb.stockCountSession.findFirst.mockResolvedValue({ ...submitted, status: "POSTED", approvedById: "approver-1" })
    mockedDb.businessEvent.findUnique.mockResolvedValue({ id: "event-count-1", sourceType: "STOCK_COUNT", sourceId: "count-1", documentHash: "sha256:count-sheet" })
    await expect(postStockCount({ organizationId: "org-1", countSessionId: "count-1", approvedById: "different-approver" })).rejects.toThrow(/different approver/)
    expect(mockedDb.closeRun.findMany).not.toHaveBeenCalled()
    expect(mockedDb.businessEvent.create).not.toHaveBeenCalled()
  })

  it("blocks self approval of submitted physical counts", async () => {
    mockedDb.stockCountSession.findFirst.mockResolvedValue(
      countSession({
        status: "SUBMITTED",
        countSheetHash: "sha256:count-sheet",
        submittedById: "approver-1",
        lines: [
          countLine({
            countedQuantity: decimal("8"),
            varianceQuantity: decimal("-2"),
            varianceValue: decimal("200"),
          }),
        ],
      }),
    )

    await expect(
      postStockCount({
        organizationId: "org-1",
        countSessionId: "count-1",
        approvedById: "approver-1",
      }),
    ).rejects.toBeInstanceOf(InventorySoDViolationError)

    expect(mockedDb.stockAdjustment.create).not.toHaveBeenCalled()
    expect(mockedDb.businessEvent.create).not.toHaveBeenCalled()
  })
})
