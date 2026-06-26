import { Prisma } from "@prisma/client"

import { db } from "@/prisma/db"

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
