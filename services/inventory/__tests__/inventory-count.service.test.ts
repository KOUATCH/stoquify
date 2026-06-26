import { Prisma } from "@prisma/client"

import { db } from "@/prisma/db"

import {
  createStockCountSession,
  postStockCount,
  submitStockCountSession,
} from "../inventory-count.service"
import { InventorySoDViolationError } from "../inventory-errors"

jest.mock("@/prisma/db", () => ({
  db: {
    $transaction: jest.fn(),
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
    accountingPeriod: { findFirst: jest.fn() },
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
  accountingPeriod: { findFirst: jest.Mock }
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

  it("posts count variance through a generated stock adjustment event and explicit ledger blocker", async () => {
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
