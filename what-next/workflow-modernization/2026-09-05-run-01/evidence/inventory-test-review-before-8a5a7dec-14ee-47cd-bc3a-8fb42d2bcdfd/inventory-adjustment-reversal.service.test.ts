import { Prisma } from "@prisma/client"
import { ZodError } from "zod"

import { db } from "@/prisma/db"
import {
  BusinessRuleError,
  ConflictError,
} from "@/services/_shared/action-errors"
import { recordOrderedReversedJournalCloseInvalidationsInTx } from "@/services/accounting/journal-close-invalidation.service"
import {
  lockJournalReversalCatalogInTx,
  lockJournalReversalClosePeriodsInTx,
} from "@/services/accounting/journal-reversal-order.service"

import { reverseStockAdjustment } from "../inventory-adjustment-reversal.service"
import { recordInventoryValuationCloseInvalidationInTx } from "../inventory-close-invalidation.service"
import { ConcurrentStockUpdateError, InsufficientStockError } from "../inventory-errors"

jest.mock("@/prisma/db", () => ({
  db: {
    $transaction: jest.fn(),
    accountingPeriod: { findFirst: jest.fn() },
    accountingSourceLink: { create: jest.fn() },
    auditLog: { create: jest.fn() },
    businessEvent: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    inventoryLevel: { findUnique: jest.fn(), updateMany: jest.fn() },
    inventoryTransaction: { findMany: jest.fn(), create: jest.fn() },
    journalEntry: { count: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    ledgerAuditEvent: { create: jest.fn() },
    ledgerPostingBatch: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    stockAdjustment: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    stockAdjustmentLine: { create: jest.fn() },
  },
}))

jest.mock("../inventory-close-invalidation.service", () => ({
  recordInventoryValuationCloseInvalidationInTx: jest.fn(),
}))

jest.mock("@/services/accounting/journal-close-invalidation.service", () => ({
  recordOrderedReversedJournalCloseInvalidationsInTx: jest.fn(),
}))

jest.mock("@/services/accounting/journal-reversal-order.service", () => ({
  lockJournalReversalCatalogInTx: jest.fn(),
  lockJournalReversalClosePeriodsInTx: jest.fn(),
}))

const mockedDb = db as unknown as {
  $transaction: jest.Mock
  accountingPeriod: { findFirst: jest.Mock }
  accountingSourceLink: { create: jest.Mock }
  auditLog: { create: jest.Mock }
  businessEvent: { findUnique: jest.Mock; create: jest.Mock; update: jest.Mock }
  inventoryLevel: { findUnique: jest.Mock; updateMany: jest.Mock }
  inventoryTransaction: { findMany: jest.Mock; create: jest.Mock }
  journalEntry: { count: jest.Mock; findFirst: jest.Mock; create: jest.Mock; update: jest.Mock }
  ledgerAuditEvent: { create: jest.Mock }
  ledgerPostingBatch: { findFirst: jest.Mock; create: jest.Mock; update: jest.Mock }
  stockAdjustment: { findFirst: jest.Mock; create: jest.Mock; update: jest.Mock }
  stockAdjustmentLine: { create: jest.Mock }
}

const mockedInventoryInvalidation = recordInventoryValuationCloseInvalidationInTx as jest.MockedFunction<
  typeof recordInventoryValuationCloseInvalidationInTx
>
const mockedJournalInvalidation = recordOrderedReversedJournalCloseInvalidationsInTx as jest.MockedFunction<
  typeof recordOrderedReversedJournalCloseInvalidationsInTx
>
const mockedCatalogLock = jest.mocked(lockJournalReversalCatalogInTx)
const mockedPeriodLocks = jest.mocked(lockJournalReversalClosePeriodsInTx)

const effectiveAt = new Date("2026-07-15T09:00:00.000Z")
const originalAt = new Date("2026-07-14T09:00:00.000Z")
const affectedPeriodIds = ["period-future", "period-original", "period-reversal"]

function decimal(value: string | number) {
  return new Prisma.Decimal(value)
}

function originalAdjustment(overrides: Record<string, unknown> = {}) {
  return {
    id: "adjustment-original",
    adjustmentNumber: "ADJ-20260714-0001",
    status: "COMPLETED",
    locationId: "location-1",
    organizationId: "org-1",
    documentHash: "sha256:original",
    adjustmentDate: originalAt,
    ledgerPostingBatchId: "batch-original",
    reversalOfAdjustmentId: null,
    correctionKind: null,
    reversedByAdjustment: null,
    ...overrides,
  }
}

function originalMovement(overrides: Record<string, unknown> = {}) {
  return {
    id: "movement-original",
    organizationId: "org-1",
    itemId: "item-1",
    locationId: "location-1",
    quantity: decimal("5.000"),
    unitCost: decimal("100.00"),
    totalCost: decimal("500.00"),
    effectiveAt: originalAt,
    item: { id: "item-1", organizationId: "org-1" },
    location: { id: "location-1", organizationId: "org-1" },
    reversedByTransaction: null,
    ...overrides,
  }
}

function inventoryLevel(overrides: Record<string, unknown> = {}) {
  return {
    id: "level-1",
    itemId: "item-1",
    locationId: "location-1",
    quantityOnHand: decimal("15.000"),
    quantityAvailable: decimal("15.000"),
    totalValue: decimal("1500.00"),
    averageCost: decimal("100.00"),
    version: 7,
    ...overrides,
  }
}

function originalJournalLine(overrides: Record<string, unknown> = {}) {
  return {
    accountId: "account-inventory",
    lineNumber: 1,
    description: "Inventory adjustment",
    debit: decimal("500.00"),
    credit: decimal("0.00"),
    currency: "XAF",
    exchangeRate: decimal("1.000000"),
    baseDebit: decimal("500.00"),
    baseCredit: decimal("0.00"),
    locationId: "location-1",
    customerId: null,
    supplierId: null,
    itemId: "item-1",
    dimensions: { warehouse: "main" },
    metadata: { source: "adjustment" },
    ...overrides,
  }
}

function originalPostingBatch() {
  return {
    id: "batch-original",
    status: "POSTED",
    sourceType: "STOCK_ADJUSTMENT",
    sourceId: "adjustment-original",
    postingPurpose: "INVENTORY_ADJUSTMENT",
    periodId: "period-original",
    journalEntries: [
      {
        id: "journal-original",
        status: "POSTED",
        journalId: "journal-inventory",
        periodId: "period-original",
        entryDate: originalAt,
        entryNumber: "INVADJ-20260714-0001",
        currency: "XAF",
        reversalOfEntryId: null,
        reversedByEntries: [],
        lines: [
          originalJournalLine(),
          originalJournalLine({
            accountId: "account-variance",
            lineNumber: 2,
            debit: decimal("0.00"),
            credit: decimal("500.00"),
            baseDebit: decimal("0.00"),
            baseCredit: decimal("500.00"),
          }),
        ],
      },
    ],
    sourceLinks: [
      {
        sourceType: "STOCK_ADJUSTMENT",
        sourceId: "adjustment-original",
        journalEntryId: "journal-original",
      },
    ],
  }
}

function reversalInput(overrides: Record<string, unknown> = {}) {
  return {
    organizationId: "org-1",
    originalAdjustmentId: "adjustment-original",
    requestedById: "requester-1",
    approvedById: "approver-1",
    reason: "Reverse the duplicated warehouse adjustment",
    effectiveAt,
    idempotencyKey: "inventory-reversal-adjustment-original",
    correlationId: "correction-run-005",
    ...overrides,
  }
}

beforeEach(() => {
  jest.resetAllMocks()
  mockedCatalogLock.mockResolvedValue(undefined)
  mockedPeriodLocks.mockResolvedValue(affectedPeriodIds)
  mockedDb.$transaction.mockImplementation(async (callback) => callback(mockedDb))
  mockedDb.businessEvent.findUnique.mockResolvedValue(null)
  mockedDb.stockAdjustment.findFirst.mockResolvedValue(originalAdjustment())
  mockedDb.inventoryTransaction.findMany.mockResolvedValue([originalMovement()])
  mockedDb.ledgerPostingBatch.findFirst
    .mockResolvedValueOnce(originalPostingBatch())
    .mockResolvedValueOnce(null)
  mockedDb.inventoryLevel.findUnique.mockResolvedValue(inventoryLevel())
  mockedDb.accountingPeriod.findFirst.mockResolvedValue({
    id: "period-reversal",
    organizationId: "org-1",
    startDate: new Date("2026-07-01T00:00:00.000Z"),
    endDate: new Date("2026-07-31T23:59:59.999Z"),
    status: "OPEN",
  })
  mockedDb.stockAdjustment.create.mockResolvedValue({
    id: "adjustment-reversal",
    adjustmentNumber: "REV-ADJ-20260714-0001-ginal",
  })
  mockedDb.inventoryLevel.updateMany.mockResolvedValue({ count: 1 })
  mockedDb.stockAdjustmentLine.create.mockResolvedValue({ id: "line-reversal" })
  mockedDb.inventoryTransaction.create.mockResolvedValue({ id: "movement-reversal" })
  mockedDb.ledgerPostingBatch.create.mockResolvedValue({
    id: "batch-reversal",
    status: "PENDING",
  })
  mockedDb.ledgerPostingBatch.update.mockResolvedValue({
    id: "batch-reversal",
    status: "POSTED",
  })
  mockedDb.journalEntry.count.mockResolvedValue(0)
  mockedDb.journalEntry.create.mockResolvedValue({ id: "journal-reversal" })
  mockedDb.journalEntry.findFirst.mockResolvedValue({ id: "journal-reversal" })
  mockedDb.journalEntry.update.mockResolvedValue({ id: "journal-original", status: "REVERSED" })
  mockedDb.accountingSourceLink.create.mockResolvedValue({ id: "source-link-reversal" })
  mockedDb.ledgerAuditEvent.create.mockResolvedValue({ id: "ledger-audit-reversal" })
  mockedDb.businessEvent.create.mockImplementation(async (args) => ({
    id: "event-reversal",
    ...args.data,
    outboxMessages: [],
  }))
  mockedDb.businessEvent.update.mockResolvedValue({ id: "event-reversal", status: "APPLIED" })
  mockedDb.stockAdjustment.update.mockResolvedValue({ id: "adjustment-reversal" })
  mockedDb.auditLog.create.mockResolvedValue({ id: "audit-reversal" })
  mockedInventoryInvalidation.mockResolvedValue({ invalidatedCount: 0, results: [] })
  mockedJournalInvalidation.mockResolvedValue({ invalidatedCount: 0, results: [] })
})

describe("reverseStockAdjustment", () => {
  it("creates one exact compensating movement and journal while preserving the original", async () => {
    const result = await reverseStockAdjustment(reversalInput())

    expect(result).toMatchObject({
      originalAdjustmentId: "adjustment-original",
      correctionAdjustmentId: "adjustment-reversal",
      eventId: "event-reversal",
      movementTransactionIds: ["movement-reversal"],
      postingBatchId: "batch-reversal",
      journalEntryId: "journal-reversal",
      replayed: false,
    })
    expect(mockedDb.stockAdjustment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: "org-1",
        type: "CORRECTION",
        status: "COMPLETED",
        createdById: "requester-1",
        approvedById: "approver-1",
        correctionKind: "REVERSAL",
        reversalOfAdjustmentId: "adjustment-original",
      }),
    })
    expect(mockedDb.inventoryLevel.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          quantityOnHand: decimal("10.000"),
          quantityAvailable: decimal("10.000"),
          totalValue: decimal("1000.00"),
          averageCost: decimal("100.00"),
        }),
      }),
    )
    expect(mockedDb.inventoryTransaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: "ADJUSTMENT_OUT",
        quantity: decimal("-5.000"),
        unitCost: decimal("100.00"),
        totalCost: decimal("500.00"),
        balanceAfter: decimal("10.000"),
        reversalOfTransactionId: "movement-original",
      }),
    })
    expect(mockedDb.journalEntry.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        sourceType: "STOCK_ADJUSTMENT",
        sourceId: "adjustment-reversal",
        postingPurpose: "REVERSAL",
        reversalOfEntryId: "journal-original",
        lines: {
          create: [
            expect.objectContaining({ debit: decimal("0.00"), credit: decimal("500.00") }),
            expect.objectContaining({ debit: decimal("500.00"), credit: decimal("0.00") }),
          ],
        },
      }),
    })
    expect(mockedDb.journalEntry.update).toHaveBeenCalledWith({
      where: { id: "journal-original" },
      data: expect.objectContaining({ status: "REVERSED", reversedById: "approver-1" }),
    })
    expect(mockedInventoryInvalidation).toHaveBeenCalledWith(
      mockedDb,
      expect.objectContaining({ sourceId: "adjustment-reversal", periodId: "period-reversal" }),
    )
    expect(mockedJournalInvalidation).toHaveBeenCalledWith(
      mockedDb,
      "org-1",
      expect.objectContaining({
        originalJournalEntryId: "journal-original",
        reversalJournalEntryId: "journal-reversal",
      }),
      expect.objectContaining({ actorId: "approver-1" }),
    )
  })

  it("rejects a second reversal before any stock or ledger write", async () => {
    mockedDb.stockAdjustment.findFirst.mockResolvedValue(
      originalAdjustment({ reversedByAdjustment: { id: "adjustment-reversal-existing" } }),
    )

    await expect(reverseStockAdjustment(reversalInput())).rejects.toBeInstanceOf(ConflictError)

    expect(mockedDb.inventoryLevel.findUnique).not.toHaveBeenCalled()
    expect(mockedDb.stockAdjustment.create).not.toHaveBeenCalled()
    expect(mockedDb.ledgerPostingBatch.create).not.toHaveBeenCalled()
  })

  it("replays the same persisted correction without posting again", async () => {
    mockedDb.businessEvent.findUnique.mockResolvedValue({
      id: "event-reversal",
      eventType: "stock.adjustment.reversed",
      sourceType: "STOCK_ADJUSTMENT",
      sourceId: "adjustment-reversal",
      documentHash: "sha256:reversal",
      postingBatchId: "batch-reversal",
    })
    mockedDb.stockAdjustment.findFirst.mockResolvedValue({
      id: "adjustment-reversal",
      createdById: "requester-1",
      approvedById: "approver-1",
      documentHash: "sha256:reversal",
      ledgerPostingBatchId: "batch-reversal",
      postedBusinessEventId: "event-reversal",
    })
    mockedDb.inventoryTransaction.findMany.mockResolvedValue([{ id: "movement-reversal" }])

    const result = await reverseStockAdjustment(reversalInput())

    expect(result).toMatchObject({
      correctionAdjustmentId: "adjustment-reversal",
      eventId: "event-reversal",
      movementTransactionIds: ["movement-reversal"],
      journalEntryId: "journal-reversal",
      replayed: true,
    })
    expect(mockedDb.stockAdjustment.create).not.toHaveBeenCalled()
    expect(mockedDb.inventoryLevel.updateMany).not.toHaveBeenCalled()
    expect(mockedDb.journalEntry.create).not.toHaveBeenCalled()
    expect(mockedCatalogLock).not.toHaveBeenCalled()
    expect(mockedPeriodLocks).not.toHaveBeenCalled()
    expect(mockedInventoryInvalidation).not.toHaveBeenCalled()
    expect(mockedJournalInvalidation).not.toHaveBeenCalled()
  })

  it("rejects maker-checker reuse before opening a database transaction", async () => {
    await expect(
      reverseStockAdjustment(reversalInput({ approvedById: "requester-1" })),
    ).rejects.toBeInstanceOf(ZodError)

    expect(mockedDb.$transaction).not.toHaveBeenCalled()
  })

  it("rejects a reversal when current quantity or value cannot support the exact compensation", async () => {
    mockedDb.inventoryLevel.findUnique.mockResolvedValue(
      inventoryLevel({
        quantityOnHand: decimal("4.000"),
        quantityAvailable: decimal("4.000"),
        totalValue: decimal("400.00"),
      }),
    )

    await expect(reverseStockAdjustment(reversalInput())).rejects.toBeInstanceOf(InsufficientStockError)

    expect(mockedDb.stockAdjustment.create).not.toHaveBeenCalled()
    expect(mockedDb.inventoryLevel.updateMany).not.toHaveBeenCalled()
    expect(mockedDb.ledgerPostingBatch.create).not.toHaveBeenCalled()
  })

  it("rejects a movement whose related item belongs to another tenant", async () => {
    mockedDb.inventoryTransaction.findMany.mockResolvedValue([
      originalMovement({ item: { id: "item-1", organizationId: "org-foreign" } }),
    ])

    await expect(reverseStockAdjustment(reversalInput())).rejects.toBeInstanceOf(BusinessRuleError)

    expect(mockedDb.stockAdjustment.create).not.toHaveBeenCalled()
    expect(mockedDb.inventoryLevel.updateMany).not.toHaveBeenCalled()
  })

  it("holds the complete period boundary before compensation and invalidates that same union inventory first", async () => {
    await reverseStockAdjustment(reversalInput())

    expect(mockedDb.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
    })
    expect(mockedCatalogLock).toHaveBeenCalledWith(mockedDb, "org-1")
    expect(mockedCatalogLock.mock.invocationCallOrder[0]).toBeLessThan(mockedDb.accountingPeriod.findFirst.mock.invocationCallOrder[0])
    expect(mockedDb.accountingPeriod.findFirst.mock.invocationCallOrder[0]).toBeLessThan(mockedPeriodLocks.mock.invocationCallOrder[0])
    expect(mockedPeriodLocks).toHaveBeenCalledWith(mockedDb, "org-1", {
      originalPeriodId: "period-original", reversalPeriodId: "period-reversal",
      originalEntryDate: originalAt, reversalDate: effectiveAt, includeLaterPeriods: true,
      additionalEvidenceDates: [originalAt, originalAt], additionalPeriodIds: ["period-original"],
    })
    expect(mockedPeriodLocks.mock.invocationCallOrder[0]).toBeLessThan(mockedDb.stockAdjustment.create.mock.invocationCallOrder[0])
    expect(mockedInventoryInvalidation).toHaveBeenCalledWith(mockedDb, expect.objectContaining({ affectedPeriodIds }))
    expect(mockedJournalInvalidation).toHaveBeenCalledWith(mockedDb, "org-1", expect.objectContaining({ affectedPeriodIds }), expect.any(Object))
    expect(mockedDb.businessEvent.update.mock.invocationCallOrder[0]).toBeLessThan(mockedInventoryInvalidation.mock.invocationCallOrder[0])
    expect(mockedInventoryInvalidation.mock.invocationCallOrder[0]).toBeLessThan(mockedJournalInvalidation.mock.invocationCallOrder[0])
  })

  it("includes distinct historical source dates even when journals have no account classification", async () => {
    const adjustmentDate = new Date("2026-05-15T09:00:00.000Z")
    const movementDate = new Date("2026-06-15T09:00:00.000Z")
    mockedDb.stockAdjustment.findFirst.mockResolvedValue(originalAdjustment({ adjustmentDate }))
    mockedDb.inventoryTransaction.findMany.mockResolvedValue([originalMovement({ effectiveAt: movementDate })])

    await reverseStockAdjustment(reversalInput())

    expect(mockedPeriodLocks).toHaveBeenCalledWith(mockedDb, "org-1", expect.objectContaining({
      includeLaterPeriods: true, additionalEvidenceDates: [adjustmentDate, movementDate],
    }))
  })

  it("retains a nullable legacy journal period while including its independently linked batch period", async () => {
    const batch = originalPostingBatch()
    mockedDb.ledgerPostingBatch.findFirst.mockReset()
    mockedDb.ledgerPostingBatch.findFirst.mockResolvedValueOnce({
      ...batch, journalEntries: [{ ...batch.journalEntries[0], periodId: null }],
    }).mockResolvedValueOnce(null)

    await reverseStockAdjustment(reversalInput())

    expect(mockedPeriodLocks).toHaveBeenCalledWith(mockedDb, "org-1", expect.objectContaining({
      originalPeriodId: null, additionalPeriodIds: ["period-original"],
    }))
    expect(mockedJournalInvalidation).toHaveBeenCalledWith(mockedDb, "org-1", expect.objectContaining({
      originalPeriodId: null, affectedPeriodIds,
    }), expect.any(Object))
  })

  it("does not begin compensation while the complete period lock is waiting", async () => {
    let entered!: () => void
    let release!: () => void
    const reached = new Promise<void>(resolve => { entered = resolve })
    const held = new Promise<void>(resolve => { release = resolve })
    mockedPeriodLocks.mockImplementationOnce(async () => { entered(); await held; return affectedPeriodIds })

    const reversal = reverseStockAdjustment(reversalInput())
    await reached
    expect(mockedDb.stockAdjustment.create).not.toHaveBeenCalled()
    expect(mockedDb.inventoryLevel.updateMany).not.toHaveBeenCalled()
    expect(mockedDb.inventoryTransaction.create).not.toHaveBeenCalled()
    release()
    await expect(reversal).resolves.toMatchObject({ replayed: false })
  })

  it.each(["catalog", "period"])("refuses a failed %s boundary without stock, ledger or evidence writes", async boundary => {
    const refusal = new ConflictError("Close evidence boundary is unavailable.")
    if (boundary === "catalog") mockedCatalogLock.mockRejectedValueOnce(refusal)
    else mockedPeriodLocks.mockRejectedValueOnce(refusal)

    await expect(reverseStockAdjustment(reversalInput())).rejects.toBe(refusal)

    expect(mockedDb.stockAdjustment.create).not.toHaveBeenCalled()
    expect(mockedDb.inventoryLevel.updateMany).not.toHaveBeenCalled()
    expect(mockedDb.inventoryTransaction.create).not.toHaveBeenCalled()
    expect(mockedDb.ledgerPostingBatch.create).not.toHaveBeenCalled()
    expect(mockedDb.businessEvent.create).not.toHaveBeenCalled()
    expect(mockedDb.auditLog.create).not.toHaveBeenCalled()
    expect(mockedInventoryInvalidation).not.toHaveBeenCalled()
    expect(mockedJournalInvalidation).not.toHaveBeenCalled()
  })

  it("propagates unsupported inherited isolation before any period read or write and never opens a replacement transaction", async () => {
    const { $transaction: _transaction, ...suppliedTx } = mockedDb
    const refusal = new ConflictError("Journal reversal requires Read Committed or a Serializable transaction with a fresh evidence reader.")
    mockedCatalogLock.mockRejectedValueOnce(refusal)

    await expect(reverseStockAdjustment(reversalInput(), suppliedTx as unknown as Prisma.TransactionClient)).rejects.toBe(refusal)

    expect(mockedCatalogLock).toHaveBeenCalledWith(suppliedTx, "org-1")
    expect(mockedDb.$transaction).not.toHaveBeenCalled()
    expect(mockedDb.accountingPeriod.findFirst).not.toHaveBeenCalled()
    expect(mockedDb.stockAdjustment.create).not.toHaveBeenCalled()
    expect(mockedDb.inventoryLevel.updateMany).not.toHaveBeenCalled()
  })

  it("preserves stock CAS refusal after a boundary wait without emitting compensation evidence", async () => {
    mockedDb.inventoryLevel.updateMany.mockResolvedValueOnce({ count: 0 })

    await expect(reverseStockAdjustment(reversalInput())).rejects.toBeInstanceOf(ConcurrentStockUpdateError)

    expect(mockedPeriodLocks).toHaveBeenCalledTimes(1)
    expect(mockedDb.inventoryTransaction.create).not.toHaveBeenCalled()
    expect(mockedDb.ledgerPostingBatch.create).not.toHaveBeenCalled()
    expect(mockedDb.businessEvent.create).not.toHaveBeenCalled()
    expect(mockedInventoryInvalidation).not.toHaveBeenCalled()
    expect(mockedJournalInvalidation).not.toHaveBeenCalled()
  })

  it("lets an invalidation failure abort the owning transaction instead of reporting a completed reversal", async () => {
    const failure = new Error("Synthetic invalidation storage failure")
    mockedInventoryInvalidation.mockRejectedValueOnce(failure)

    await expect(reverseStockAdjustment(reversalInput())).rejects.toMatchObject({
      message: "Stock adjustment reversal could not be completed.",
    })

    expect(mockedDb.$transaction).toHaveBeenCalledTimes(1)
    expect(mockedInventoryInvalidation).toHaveBeenCalledTimes(1)
    expect(mockedJournalInvalidation).not.toHaveBeenCalled()
  })
})
