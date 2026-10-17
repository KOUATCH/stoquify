import { Prisma } from "@prisma/client"

import { db } from "@/prisma/db"
import { DEFAULT_INVENTORY_POSTING_RULES } from "@/services/accounting/default-posting-rules"

import {
  postStockAdjustment,
  requestManualItemStockAdjustment,
} from "../inventory-adjustment.service"
import {
  InventorySoDViolationError,
  MissingInventoryEvidenceError,
} from "../inventory-errors"

jest.mock("@/prisma/db", () => ({
  db: {
    $transaction: jest.fn(),
    $queryRaw: jest.fn(),
    item: { findFirst: jest.fn(), findMany: jest.fn() },
    location: { findFirst: jest.fn() },
    stockAdjustment: { count: jest.fn(), create: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
    stockAdjustmentLine: { update: jest.fn() },
    businessEvent: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    accountingPeriod: { findFirst: jest.fn() },
    inventoryLevel: { findMany: jest.fn(), findUnique: jest.fn(), updateMany: jest.fn(), create: jest.fn() },
    inventoryTransaction: { create: jest.fn() },
    ledgerPostingBatch: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    postingRule: { findFirst: jest.fn() },
    ledgerAuditEvent: { create: jest.fn() },
    journal: { findFirst: jest.fn() },
    journalEntry: { count: jest.fn(), create: jest.fn() },
    chartOfAccount: { findFirst: jest.fn(), findMany: jest.fn() },
    accountingSourceLink: { findFirst: jest.fn(), create: jest.fn() },
    closeRun: { findMany: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
    closePackExport: { findFirst: jest.fn(), update: jest.fn() },
    auditLog: { create: jest.fn() },
  },
}))

const mockedDb = db as unknown as {
  $queryRaw: jest.Mock
  $transaction: jest.Mock
  item: { findFirst: jest.Mock; findMany: jest.Mock }
  location: { findFirst: jest.Mock }
  stockAdjustment: { count: jest.Mock; create: jest.Mock; findFirst: jest.Mock; update: jest.Mock }
  stockAdjustmentLine: { update: jest.Mock }
  businessEvent: { findUnique: jest.Mock; create: jest.Mock; update: jest.Mock }
  accountingPeriod: { findFirst: jest.Mock }
  inventoryLevel: { findMany: jest.Mock; findUnique: jest.Mock; updateMany: jest.Mock; create: jest.Mock }
  inventoryTransaction: { create: jest.Mock }
  ledgerPostingBatch: { findFirst: jest.Mock; create: jest.Mock; update: jest.Mock }
  postingRule: { findFirst: jest.Mock }
  ledgerAuditEvent: { create: jest.Mock }
  journal: { findFirst: jest.Mock }
  journalEntry: { count: jest.Mock; create: jest.Mock }
  chartOfAccount: { findFirst: jest.Mock; findMany: jest.Mock }
  accountingSourceLink: { findFirst: jest.Mock; create: jest.Mock }
  closeRun: { findMany: jest.Mock; findFirst: jest.Mock; update: jest.Mock }
  closePackExport: { findFirst: jest.Mock; update: jest.Mock }
  auditLog: { create: jest.Mock }
}

const adjustmentDate = new Date("2026-06-15T09:00:00Z")

function decimal(value: string | number) {
  return new Prisma.Decimal(value)
}

function arrangeCertifiedCloseTarget() {
  mockedDb.closeRun.findMany.mockResolvedValue([{ id: "close-run-1", packExports: [{ id: "close-pack-export-1" }] }])
  mockedDb.closeRun.findFirst.mockResolvedValue({
    id: "close-run-1",
    organizationId: "org-1",
    status: "CERTIFIED",
    metadata: null,
  })
  mockedDb.closePackExport.findFirst.mockResolvedValue({ id: "close-pack-export-1", metadata: { mode: "CERTIFIED" } })
}

function adjustment(overrides: Record<string, unknown> = {}) {
  return {
    id: "adjustment-1",
    adjustmentNumber: "ADJ-20260615-0001",
    type: "CORRECTION",
    reason: "Cycle count correction",
    status: "APPROVED",
    adjustmentDate,
    notes: null,
    deletedAt: null,
    locationId: "loc-1",
    organizationId: "org-1",
    createdById: "maker-1",
    approvedById: null,
    approvedAt: null,
    evidenceHash: null,
    documentHash: null,
    postedBusinessEventId: null,
    ledgerPostingBatchId: null,
    sourceCountSessionId: null,
    metadata: null,
    createdAt: adjustmentDate,
    updatedAt: adjustmentDate,
    location: {
      id: "loc-1",
      name: "Main warehouse",
      organizationId: "org-1",
      isActive: true,
      deletedAt: null,
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
        evidenceHash: null,
        stockCountLineId: null,
        metadata: null,
        createdAt: adjustmentDate,
        updatedAt: adjustmentDate,
        item: {
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
        },
      },
    ],
    ...overrides,
  }
}

function inventoryLevel(overrides: Record<string, unknown> = {}) {
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
    version: 4,
    lastCountDate: null,
    lastTransactionAt: null,
    createdAt: adjustmentDate,
    updatedAt: adjustmentDate,
    ...overrides,
  }
}

function itemWithInventory(overrides: Record<string, unknown> = {}) {
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
    inventoryLevels: [inventoryLevel()],
    ...overrides,
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockedDb.$queryRaw.mockImplementation(async (query: { sql: string }) => query.sql.includes('"organizations"') ? [{ id: "org-1" }] : [{ newWorkStoppedModules: [], newWorkStoppedAt: {} }])
  mockedDb.$transaction.mockImplementation(async (callback) => callback(mockedDb))
  mockedDb.item.findFirst.mockResolvedValue(itemWithInventory())
  mockedDb.item.findMany.mockResolvedValue([
    {
      id: "item-1",
      costPrice: decimal("100"),
    },
  ])
  mockedDb.location.findFirst.mockResolvedValue({
    id: "loc-1",
    organizationId: "org-1",
    isActive: true,
    deletedAt: null,
    isDefault: true,
  })
  mockedDb.stockAdjustment.count.mockResolvedValue(0)
  mockedDb.stockAdjustment.create.mockResolvedValue(adjustment({ status: "DRAFT" }))
  mockedDb.stockAdjustment.findFirst.mockResolvedValue(adjustment())
  mockedDb.businessEvent.findUnique.mockResolvedValue(null)
  mockedDb.accountingPeriod.findFirst.mockResolvedValue({
    id: "period-1",
    organizationId: "org-1",
    name: "June 2026",
    startDate: new Date("2026-06-01T00:00:00Z"),
    endDate: new Date("2026-06-30T23:59:59Z"),
    status: "OPEN",
  })
  mockedDb.inventoryLevel.findUnique.mockResolvedValue(inventoryLevel())
  mockedDb.inventoryLevel.findMany.mockResolvedValue([inventoryLevel()])
  mockedDb.inventoryLevel.updateMany.mockResolvedValue({ count: 1 })
  mockedDb.stockAdjustmentLine.update.mockResolvedValue({ id: "adjustment-line-1" })
  mockedDb.inventoryTransaction.create.mockResolvedValue({ id: "movement-1" })
  mockedDb.ledgerPostingBatch.findFirst.mockResolvedValue(null)
  mockedDb.ledgerPostingBatch.create.mockResolvedValue({ id: "posting-batch-1" })
  mockedDb.ledgerPostingBatch.update.mockImplementation(async (args) => ({
    id: args.where.id,
    ...args.data,
  }))
  mockedDb.postingRule.findFirst.mockResolvedValue(null)
  mockedDb.ledgerAuditEvent.create.mockResolvedValue({ id: "ledger-audit-1" })
  mockedDb.businessEvent.create.mockImplementation(async (args) => ({
    id: "event-adjustment-1",
    ...args.data,
    outboxMessages: args.data.outboxMessages.create,
  }))
  mockedDb.businessEvent.update.mockResolvedValue({ id: "event-adjustment-1", status: "APPLIED" })
  mockedDb.stockAdjustment.update.mockImplementation(async (args) =>
    adjustment({
      status: "COMPLETED",
      approvedById: args.data.approvedById,
      approvedAt: args.data.approvedAt,
      evidenceHash: args.data.evidenceHash,
      documentHash: args.data.documentHash,
      postedBusinessEventId: args.data.postedBusinessEventId,
      ledgerPostingBatchId: args.data.ledgerPostingBatchId,
    }),
  )
  mockedDb.closeRun.findMany.mockResolvedValue([])
  mockedDb.closeRun.findFirst.mockResolvedValue(null)
  mockedDb.closeRun.update.mockResolvedValue({ id: "close-run-1" })
  mockedDb.closePackExport.findFirst.mockResolvedValue(null)
  mockedDb.closePackExport.update.mockResolvedValue({ id: "close-pack-export-1" })
  mockedDb.auditLog.create.mockResolvedValue({ id: "audit-1" })
})

describe("requestManualItemStockAdjustment", () => {
  it("blocks new manual adjustments after a reviewed inventory stop", async () => {
    mockedDb.$queryRaw.mockImplementation(async (query: { sql: string }) => query.sql.includes('"organizations"') ? [{ id: "org-1" }] : [{ newWorkStoppedModules: ["inventory"], newWorkStoppedAt: { inventory: "2026-09-05T10:00:00Z" } }])
    await expect(requestManualItemStockAdjustment({ organizationId: "org-1", itemId: "item-1", actorId: "maker-1", quantityChange: -2, mode: "delta", reason: "Correction" })).rejects.toMatchObject({ metadata: { reason: "MODULE_NEW_WORK_STOPPED" } })
    expect(mockedDb.stockAdjustment.create).not.toHaveBeenCalled()
    expect(mockedDb.inventoryTransaction.create).not.toHaveBeenCalled()
  })
  it("turns a legacy manual stock edit into a submitted adjustment without mutating stock", async () => {
    mockedDb.stockAdjustment.update.mockResolvedValue(
      adjustment({
        status: "SUBMITTED",
        approvedById: null,
        approvedAt: null,
      }),
    )

    const result = await requestManualItemStockAdjustment({
      organizationId: "org-1",
      itemId: "item-1",
      actorId: "maker-1",
      quantityChange: -2,
      mode: "delta",
      reason: "Manual correction requires approval",
      notes: "Legacy item stock action migration",
    })

    expect(result).toMatchObject({
      quantityDelta: "-2.000",
      targetQuantity: "8.000",
      requiresApproval: true,
      adjustment: expect.objectContaining({
        status: "SUBMITTED",
      }),
    })
    expect(mockedDb.stockAdjustment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org-1",
          locationId: "loc-1",
          type: "CORRECTION",
          createdById: "maker-1",
          lines: expect.objectContaining({
            create: [
              expect.objectContaining({
                itemId: "item-1",
                systemQuantity: decimal("10.000"),
                actualQuantity: decimal("8.000"),
                adjustedQuantity: decimal("-2.000"),
              }),
            ],
          }),
        }),
      }),
    )
    expect(mockedDb.inventoryLevel.updateMany).not.toHaveBeenCalled()
    expect(mockedDb.inventoryTransaction.create).not.toHaveBeenCalled()
    expect(mockedDb.businessEvent.create).not.toHaveBeenCalled()
  })
})

describe("postStockAdjustment", () => {
  function arrangePosting(deltas: number[], mutate?: (lines: any[]) => void) {
    const record = adjustment()
    record.lines = deltas.map((delta, index) => ({
      ...record.lines[0], id: `line-${index}`, itemId: `item-${index + 1}`,
      actualQuantity: decimal(10 + delta), adjustedQuantity: decimal(delta),
      item: { ...record.lines[0].item, id: `item-${index + 1}` },
    }))
    mockedDb.stockAdjustment.findFirst.mockResolvedValue(record)
    mockedDb.inventoryLevel.findMany.mockResolvedValue(deltas.map((_, index) => inventoryLevel({ id: `level-${index}`, itemId: `item-${index + 1}` })))
    const accounts = ["INVENTORY", "INVENTORY_VARIANCE"].map(mappingKey => ({
      id: mappingKey, code: mappingKey, mappingKey, organizationId: "org-1", isActive: true,
      currency: "XAF", deletedAt: null, _count: { children: 0 },
    }))
    mockedDb.chartOfAccount.findMany.mockResolvedValue(accounts)
    mockedDb.chartOfAccount.findFirst.mockImplementation(async ({ where }) => accounts.find(a => a.mappingKey === where.mappingKey || a.id === where.id))
    const template = DEFAULT_INVENTORY_POSTING_RULES[0]
    const lines = template.lines.map(line => ({ ...line, accountId: null, multiplier: decimal(1), dimensions: null }))
    mutate?.(lines)
    mockedDb.postingRule.findFirst.mockResolvedValue({ ...template, id: "directional-rule", lines })
    mockedDb.journal.findFirst.mockResolvedValue({ id: "inventory-journal" })
    mockedDb.journalEntry.count.mockResolvedValue(0)
    mockedDb.journalEntry.create.mockResolvedValue({ id: "journal-entry-1" })
    mockedDb.accountingSourceLink.findFirst.mockResolvedValue(null)
    mockedDb.accountingSourceLink.create.mockResolvedValue({ id: "source-link-1" })
  }

  it.each([
    { deltas: [2], debit: "200", credit: "0", count: 2 },
    { deltas: [-2], debit: "0", credit: "200", count: 2 },
    { deltas: [3, -2], debit: "300", credit: "200", count: 4 },
    { deltas: [2, -2], debit: "200", credit: "200", count: 4 },
  ])("posts gains/losses independently for $deltas", async ({ deltas, debit, credit, count }) => {
    arrangePosting(deltas)
    const result = await postStockAdjustment({ organizationId: "org-1", adjustmentId: "adjustment-1", approvedById: "approver-1" })
    expect(result.ledger.status).toBe("POSTED")
    const lines = mockedDb.journalEntry.create.mock.calls[0][0].data.lines.create
    expect(lines).toHaveLength(count)
    const inventory = lines.filter((line: any) => line.accountId === "INVENTORY")
    expect(inventory.reduce((sum: Prisma.Decimal, line: any) => sum.plus(line.debit), decimal(0)).toString()).toBe(debit)
    expect(inventory.reduce((sum: Prisma.Decimal, line: any) => sum.plus(line.credit), decimal(0)).toString()).toBe(credit)
    expect(mockedDb.accountingSourceLink.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ organizationId: "org-1", sourceId: "adjustment-1", journalEntryId: "journal-entry-1" }) }))
  })

  it.each([
    { label: "unknown condition", change: (lines: any[]) => { lines[0].condition = { paymentMethod: "CASH" } } },
    { label: "invalid direction", change: (lines: any[]) => { lines[0].condition = { adjustmentDirection: "GAIN" } } },
    { label: "array condition", change: (lines: any[]) => { lines[0].condition = [] } },
    { label: "reversed inventory leg", change: (lines: any[]) => { for (const line of lines) line.side = line.side === "DEBIT" ? "CREDIT" : "DEBIT" } },
    { label: "balanced double value", change: (lines: any[]) => { for (const line of lines) line.multiplier = decimal(2) } },
    { label: "unfiltered mixed rule", change: (lines: any[]) => { for (const line of lines) line.condition = null } },
  ])("retains a blocker without a journal for $label", async ({ change }) => {
    arrangePosting([3, -2], change)
    const result = await postStockAdjustment({ organizationId: "org-1", adjustmentId: "adjustment-1", approvedById: "approver-1" })
    expect(result.ledger).toMatchObject({ status: "BLOCKED", blockerCode: "POSTING_RULE_FAILED" })
    expect(mockedDb.journalEntry.create).not.toHaveBeenCalled()
    expect(mockedDb.accountingSourceLink.create).not.toHaveBeenCalled()
  })

  it("preserves a correctly valued unconditional legacy loss rule", async () => {
    arrangePosting([-2], lines => { lines.splice(0, 2); for (const line of lines) line.condition = null })
    const result = await postStockAdjustment({ organizationId: "org-1", adjustmentId: "adjustment-1", approvedById: "approver-1" })
    expect(result.ledger.status).toBe("POSTED")
  })

  it.each(["posted", "failed", "reversed", "missing_link", "missing_journal", "duplicate_journal", "pending_event"])("replays retained %s evidence without new effects", async scenario => {
    mockedDb.stockAdjustment.findFirst.mockResolvedValue(adjustment({ status: "COMPLETED", approvedById: "approver-1", ledgerPostingBatchId: "posting-batch-1" }))
    mockedDb.businessEvent.findUnique.mockResolvedValue({ id: "original-event", sourceType: "STOCK_ADJUSTMENT", sourceId: "adjustment-1", status: scenario === "pending_event" ? "PENDING" : "APPLIED" })
    mockedDb.ledgerPostingBatch.findFirst.mockResolvedValue({
      id: "posting-batch-1", status: scenario === "failed" ? "FAILED" : scenario === "reversed" ? "REVERSED" : "POSTED",
      journalEntries: scenario === "missing_journal" ? [] : scenario === "duplicate_journal" ? [{ id: "entry-1" }, { id: "entry-2" }] : [{ id: "entry-1" }],
      sourceLinks: scenario === "missing_link" ? [] : [{ journalEntryId: "entry-1" }],
      errorMessage: scenario === "failed" ? "Retained failure" : null,
    })
    const result = await postStockAdjustment({ organizationId: "org-1", adjustmentId: "adjustment-1", approvedById: "approver-1" })
    expect(result.replayed).toBe(true)
    expect(result.ledger.status).toBe(scenario === "posted" ? "POSTED" : "BLOCKED")
    if (scenario === "posted") expect(result.ledger).toMatchObject({ journalEntryId: "entry-1", postingBatchId: "posting-batch-1" })
    if (scenario === "failed") expect(result.ledger.message).toBe("Retained failure")
    expect(mockedDb.ledgerPostingBatch.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { organizationId: "org-1", id: "posting-batch-1", sourceType: "STOCK_ADJUSTMENT", sourceId: "adjustment-1", postingPurpose: "INVENTORY_ADJUSTMENT" } }))
    expect(mockedDb.inventoryTransaction.create).not.toHaveBeenCalled()
    expect(mockedDb.journalEntry.create).not.toHaveBeenCalled()
    expect(mockedDb.businessEvent.create).not.toHaveBeenCalled()
  })

  it("posts stock movement, records the event, and creates an explicit ledger blocker when posting rules are missing", async () => {
    arrangeCertifiedCloseTarget()
    const result = await postStockAdjustment({
      organizationId: "org-1",
      adjustmentId: "adjustment-1",
      approvedById: "approver-1",
    })

    expect(result).toMatchObject({
      eventId: "event-adjustment-1",
      movementTransactionIds: ["movement-1"],
      ledger: {
        status: "BLOCKED",
        postingBatchId: "posting-batch-1",
        blockerCode: "MISSING_POSTING_RULE",
      },
      replayed: false,
    })
    expect(mockedDb.inventoryLevel.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          quantityOnHand: decimal("8.000"),
          quantityAvailable: decimal("8.000"),
          totalValue: decimal("800.00"),
        }),
      }),
    )
    expect(mockedDb.inventoryTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          effectiveAt: adjustmentDate,
          recordedAt: expect.any(Date),
          timeProvenance: "EXPLICIT_SOURCE_TIME",
        }),
      }),
    )
    expect(mockedDb.businessEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventType: "stock.adjustment.posted",
          sourceType: "STOCK_ADJUSTMENT",
          sourceId: "adjustment-1",
          postingBatchId: "posting-batch-1",
        }),
      }),
    )
    expect(mockedDb.ledgerAuditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "INVENTORY_ADJUSTMENT_LEDGER_BLOCKED",
          postingBatchId: "posting-batch-1",
        }),
      }),
    )
    expect(mockedDb.businessEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventType: "close.certification.invalidated",
          metadata: expect.objectContaining({
            sourceCode: "INVENTORY_VALUATION_WRITE",
            sourceDomain: "inventory",
            sourceTable: "inventory_transactions",
          }),
        }),
      }),
    )
    expect(mockedDb.closeRun.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "close-run-1" },
        data: expect.objectContaining({
          status: "BLOCKED",
          metadata: expect.objectContaining({
            staleState: expect.objectContaining({
              sourceCode: "INVENTORY_VALUATION_WRITE",
              sourceId: "adjustment-1",
            }),
          }),
        }),
      }),
    )
  })

  it("blocks write-offs without evidence before stock or event mutation", async () => {
    mockedDb.stockAdjustment.findFirst.mockResolvedValue(
      adjustment({
        type: "WRITE_OFF",
        createdById: "maker-1",
        evidenceHash: null,
      }),
    )

    await expect(
      postStockAdjustment({
        organizationId: "org-1",
        adjustmentId: "adjustment-1",
        approvedById: "approver-1",
      }),
    ).rejects.toBeInstanceOf(MissingInventoryEvidenceError)

    expect(mockedDb.inventoryLevel.updateMany).not.toHaveBeenCalled()
    expect(mockedDb.businessEvent.create).not.toHaveBeenCalled()
  })

  it("blocks maker-checker violations before stock or event mutation", async () => {
    mockedDb.stockAdjustment.findFirst.mockResolvedValue(
      adjustment({
        type: "WRITE_OFF",
        createdById: "approver-1",
        evidenceHash: "sha256:evidence",
      }),
    )

    await expect(
      postStockAdjustment({
        organizationId: "org-1",
        adjustmentId: "adjustment-1",
        approvedById: "approver-1",
        evidenceHash: "sha256:evidence",
      }),
    ).rejects.toBeInstanceOf(InventorySoDViolationError)

    expect(mockedDb.inventoryLevel.updateMany).not.toHaveBeenCalled()
    expect(mockedDb.businessEvent.create).not.toHaveBeenCalled()
  })
})
