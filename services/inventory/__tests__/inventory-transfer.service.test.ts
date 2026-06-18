import { Prisma } from "@prisma/client"

import { db } from "@/prisma/db"
import { BusinessRuleError, ConflictError } from "@/services/_shared/action-errors"

import { createStockTransfer, postStockTransfer } from "../inventory-transfer.service"
import {
  ConcurrentStockUpdateError,
  InsufficientStockError,
} from "../inventory-errors"

jest.mock("@/prisma/db", () => ({
  db: {
    $transaction: jest.fn(),
    stockTransfer: { findFirst: jest.fn(), update: jest.fn(), create: jest.fn() },
    location: { findFirst: jest.fn() },
    item: { findMany: jest.fn() },
    businessEvent: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    accountingPeriod: { findFirst: jest.fn() },
    inventoryLevel: { findUnique: jest.fn(), updateMany: jest.fn(), create: jest.fn() },
    inventoryTransaction: { create: jest.fn() },
    stockTransferLine: { update: jest.fn() },
    auditLog: { create: jest.fn() },
  },
}))

const mockedDb = db as unknown as {
  $transaction: jest.Mock
  stockTransfer: { findFirst: jest.Mock; update: jest.Mock; create: jest.Mock }
  location: { findFirst: jest.Mock }
  item: { findMany: jest.Mock }
  businessEvent: { findUnique: jest.Mock; create: jest.Mock; update: jest.Mock }
  accountingPeriod: { findFirst: jest.Mock }
  inventoryLevel: { findUnique: jest.Mock; updateMany: jest.Mock; create: jest.Mock }
  inventoryTransaction: { create: jest.Mock }
  stockTransferLine: { update: jest.Mock }
  auditLog: { create: jest.Mock }
}

const transferDate = new Date("2026-06-15T09:00:00Z")

function decimal(value: string | number) {
  return new Prisma.Decimal(value)
}

function transfer(overrides: Record<string, unknown> = {}) {
  return {
    id: "transfer-1",
    transferNumber: "TR-000001",
    status: "DRAFT",
    transferDate,
    expectedDate: null,
    actualDate: null,
    notes: "",
    deletedAt: null,
    fromLocationId: "loc-source",
    toLocationId: "loc-dest",
    organizationId: "org-1",
    createdById: "maker-1",
    approvedById: null,
    approvedAt: null,
    createdAt: transferDate,
    updatedAt: transferDate,
    fromLocation: {
      id: "loc-source",
      name: "Warehouse",
      organizationId: "org-1",
      isActive: true,
      deletedAt: null,
      requiresApproval: false,
    },
    toLocation: {
      id: "loc-dest",
      name: "Shop",
      organizationId: "org-1",
      isActive: true,
      deletedAt: null,
      requiresApproval: false,
    },
    createdBy: null,
    approvedBy: null,
    lines: [
      {
        id: "line-1",
        transferId: "transfer-1",
        itemId: "item-1",
        requestedQuantity: decimal("5"),
        shippedQuantity: decimal("0"),
        receivedQuantity: decimal("0"),
        unitCost: decimal("100"),
        notes: null,
        createdAt: transferDate,
        updatedAt: transferDate,
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

function sourceLevel(overrides: Record<string, unknown> = {}) {
  return {
    id: "level-source",
    itemId: "item-1",
    locationId: "loc-source",
    quantityOnHand: decimal("10"),
    quantityReserved: decimal("0"),
    quantityAvailable: decimal("10"),
    quantityInTransit: decimal("0"),
    quantityOnOrder: decimal("0"),
    reorderPoint: decimal("0"),
    averageCost: decimal("100"),
    totalValue: decimal("1000"),
    version: 7,
    lastCountDate: null,
    lastTransactionAt: null,
    createdAt: transferDate,
    updatedAt: transferDate,
    ...overrides,
  }
}

function destinationLevel(overrides: Record<string, unknown> = {}) {
  return {
    id: "level-dest",
    itemId: "item-1",
    locationId: "loc-dest",
    quantityOnHand: decimal("2"),
    quantityReserved: decimal("0"),
    quantityAvailable: decimal("2"),
    quantityInTransit: decimal("0"),
    quantityOnOrder: decimal("0"),
    reorderPoint: decimal("0"),
    averageCost: decimal("120"),
    totalValue: decimal("240"),
    version: 3,
    lastCountDate: null,
    lastTransactionAt: null,
    createdAt: transferDate,
    updatedAt: transferDate,
    ...overrides,
  }
}

function activeLocation(id: string, name: string) {
  return {
    id,
    name,
    isActive: true,
    deletedAt: null,
  }
}

function inventoryItem(overrides: Record<string, unknown> = {}) {
  return {
    id: "item-1",
    sku: "SKU-1",
    nameEn: "Item 1",
    nameFr: null,
    costPrice: decimal("100"),
    isActive: true,
    isDiscontinued: false,
    trackInventory: true,
    ...overrides,
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockedDb.$transaction.mockImplementation(async (callback) => callback(mockedDb))
  mockedDb.accountingPeriod.findFirst.mockResolvedValue({
    id: "period-1",
    organizationId: "org-1",
    name: "June 2026",
    startDate: new Date("2026-06-01T00:00:00Z"),
    endDate: new Date("2026-06-30T23:59:59Z"),
    status: "OPEN",
  })
  mockedDb.stockTransfer.findFirst.mockResolvedValue(transfer())
  mockedDb.stockTransfer.create.mockResolvedValue(transfer())
  mockedDb.location.findFirst
    .mockResolvedValueOnce(activeLocation("loc-source", "Warehouse"))
    .mockResolvedValueOnce(activeLocation("loc-dest", "Shop"))
  mockedDb.item.findMany.mockResolvedValue([inventoryItem()])
  mockedDb.businessEvent.findUnique.mockResolvedValue(null)
  mockedDb.businessEvent.create.mockImplementation(async (args) => ({
    id: "event-1",
    ...args.data,
    outboxMessages: args.data.outboxMessages.create,
  }))
  mockedDb.businessEvent.update.mockResolvedValue({ id: "event-1", status: "APPLIED" })
  mockedDb.inventoryLevel.findUnique
    .mockResolvedValueOnce(sourceLevel())
    .mockResolvedValueOnce(destinationLevel())
  mockedDb.inventoryLevel.updateMany.mockResolvedValue({ count: 1 })
  mockedDb.inventoryTransaction.create
    .mockResolvedValueOnce({ id: "movement-out-1" })
    .mockResolvedValueOnce({ id: "movement-in-1" })
  mockedDb.stockTransferLine.update.mockResolvedValue({ id: "line-1" })
  mockedDb.stockTransfer.update.mockResolvedValue(
    transfer({
      status: "COMPLETED",
      approvedById: "approver-1",
      approvedAt: new Date("2026-06-15T10:00:00Z"),
    }),
  )
  mockedDb.auditLog.create.mockResolvedValue({ id: "audit-1" })
})

describe("createStockTransfer", () => {
  it("creates an audited draft transfer from tenant-scoped active locations and inventory-tracked items", async () => {
    mockedDb.stockTransfer.findFirst.mockResolvedValueOnce({ transferNumber: "TR-000041" })
    mockedDb.stockTransfer.create.mockResolvedValueOnce(transfer({ transferNumber: "TR-000042" }))
    mockedDb.inventoryLevel.findUnique.mockReset().mockResolvedValueOnce(sourceLevel())

    const result = await createStockTransfer({
      organizationId: "org-1",
      fromLocationId: "loc-source",
      toLocationId: "loc-dest",
      createdById: "maker-1",
      requestedDate: new Date("2026-06-20T00:00:00Z"),
      notes: "Move shelf stock",
      lines: [{ itemId: "item-1", requestedQuantity: 5, notes: "Front shop" }],
    })

    expect(result.transfer.transferNumber).toBe("TR-000042")
    expect(mockedDb.location.findFirst).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: { id: "loc-source", organizationId: "org-1" },
      }),
    )
    expect(mockedDb.location.findFirst).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: { id: "loc-dest", organizationId: "org-1" },
      }),
    )
    expect(mockedDb.stockTransfer.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          transferNumber: "TR-000042",
          organizationId: "org-1",
          createdById: "maker-1",
          fromLocationId: "loc-source",
          toLocationId: "loc-dest",
          status: "DRAFT",
          lines: {
            create: [
              expect.objectContaining({
                itemId: "item-1",
                requestedQuantity: decimal("5.000"),
                unitCost: decimal("100.00"),
              }),
            ],
          },
        }),
      }),
    )
    expect(mockedDb.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org-1",
          userId: "maker-1",
          entityType: "StockTransfer",
          action: "CREATE_STOCK_TRANSFER",
        }),
      }),
    )
  })

  it("sums duplicate item lines before checking source stock availability", async () => {
    mockedDb.inventoryLevel.findUnique.mockReset().mockResolvedValueOnce(
      sourceLevel({ quantityOnHand: decimal("7"), quantityAvailable: decimal("7") }),
    )

    await expect(
      createStockTransfer({
        organizationId: "org-1",
        fromLocationId: "loc-source",
        toLocationId: "loc-dest",
        createdById: "maker-1",
        lines: [
          { itemId: "item-1", requestedQuantity: 5 },
          { itemId: "item-1", requestedQuantity: 4 },
        ],
      }),
    ).rejects.toBeInstanceOf(InsufficientStockError)

    expect(mockedDb.stockTransfer.create).not.toHaveBeenCalled()
  })
})

describe("postStockTransfer", () => {
  it("posts both stock legs, records a business event, audit, and notification outbox", async () => {
    const result = await postStockTransfer({
      organizationId: "org-1",
      transferId: "transfer-1",
      approvedById: "approver-1",
    })

    expect(result).toMatchObject({
      eventId: "event-1",
      idempotencyKey: "stock-transfer:transfer-1:posted",
      movementTransactionIds: ["movement-out-1", "movement-in-1"],
      valuationMethod: "WEIGHTED_AVERAGE",
      replayed: false,
    })
    expect(mockedDb.businessEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org-1",
          eventType: "stock.transfer.posted",
          eventSource: "INTERNAL",
          idempotencyKey: "stock-transfer:transfer-1:posted",
          sourceType: "STOCK_TRANSFER",
          sourceId: "transfer-1",
          outboxMessages: {
            create: [
              expect.objectContaining({
                channel: "NOTIFICATION",
                eventName: "stock.transfer.posted",
              }),
            ],
          },
        }),
        include: { outboxMessages: true },
      }),
    )
    expect(mockedDb.inventoryLevel.updateMany).toHaveBeenCalledTimes(2)
    expect(mockedDb.inventoryTransaction.create).toHaveBeenCalledTimes(2)
    expect(mockedDb.stockTransfer.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "COMPLETED",
          approvedById: "approver-1",
        }),
      }),
    )
    expect(mockedDb.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          entityType: "StockTransfer",
          entityId: "transfer-1",
          action: "POST_STOCK_TRANSFER",
        }),
      }),
    )
  })

  it("returns the completed transfer for idempotent replay without duplicating stock movements", async () => {
    mockedDb.stockTransfer.findFirst.mockResolvedValue(
      transfer({
        status: "COMPLETED",
        approvedById: "approver-1",
        approvedAt: new Date("2026-06-15T10:00:00Z"),
      }),
    )
    mockedDb.businessEvent.findUnique.mockResolvedValue({
      id: "event-1",
      eventType: "stock.transfer.posted",
      sourceType: "STOCK_TRANSFER",
      sourceId: "transfer-1",
      documentHash: "sha256:doc",
    })

    const result = await postStockTransfer({
      organizationId: "org-1",
      transferId: "transfer-1",
      approvedById: "approver-1",
    })

    expect(result.replayed).toBe(true)
    expect(mockedDb.inventoryTransaction.create).not.toHaveBeenCalled()
    expect(mockedDb.stockTransfer.update).not.toHaveBeenCalled()
    expect(mockedDb.businessEvent.create).not.toHaveBeenCalled()
  })

  it("blocks insufficient source stock before creating the business event", async () => {
    mockedDb.inventoryLevel.findUnique
      .mockReset()
      .mockResolvedValueOnce(sourceLevel({ quantityOnHand: decimal("2"), quantityAvailable: decimal("2") }))
      .mockResolvedValueOnce(destinationLevel())

    await expect(
      postStockTransfer({
        organizationId: "org-1",
        transferId: "transfer-1",
        approvedById: "approver-1",
      }),
    ).rejects.toBeInstanceOf(InsufficientStockError)

    expect(mockedDb.businessEvent.create).not.toHaveBeenCalled()
    expect(mockedDb.inventoryTransaction.create).not.toHaveBeenCalled()
  })

  it("rolls back as a retryable conflict when optimistic stock update loses the race", async () => {
    mockedDb.inventoryLevel.findUnique
      .mockReset()
      .mockResolvedValueOnce(sourceLevel())
      .mockResolvedValueOnce(destinationLevel())
    mockedDb.inventoryLevel.updateMany.mockResolvedValueOnce({ count: 0 })

    await expect(
      postStockTransfer({
        organizationId: "org-1",
        transferId: "transfer-1",
        approvedById: "approver-1",
      }),
    ).rejects.toBeInstanceOf(ConcurrentStockUpdateError)

    expect(mockedDb.stockTransfer.update).not.toHaveBeenCalled()
  })

  it("rejects self approval for approval-controlled locations", async () => {
    mockedDb.stockTransfer.findFirst.mockResolvedValue(
      transfer({
        createdById: "maker-1",
        fromLocation: {
          id: "loc-source",
          name: "Warehouse",
          organizationId: "org-1",
          isActive: true,
          deletedAt: null,
          requiresApproval: true,
        },
      }),
    )

    await expect(
      postStockTransfer({
        organizationId: "org-1",
        transferId: "transfer-1",
        approvedById: "maker-1",
      }),
    ).rejects.toBeInstanceOf(BusinessRuleError)
  })

  it("rejects same-key replay by a different approver", async () => {
    mockedDb.stockTransfer.findFirst.mockResolvedValue(
      transfer({
        status: "COMPLETED",
        approvedById: "approver-1",
      }),
    )
    mockedDb.businessEvent.findUnique.mockResolvedValue({
      id: "event-1",
      eventType: "stock.transfer.posted",
      sourceType: "STOCK_TRANSFER",
      sourceId: "transfer-1",
      documentHash: "sha256:doc",
    })

    await expect(
      postStockTransfer({
        organizationId: "org-1",
        transferId: "transfer-1",
        approvedById: "approver-2",
      }),
    ).rejects.toBeInstanceOf(ConflictError)
  })
})
