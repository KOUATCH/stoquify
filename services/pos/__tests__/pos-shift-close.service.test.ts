import { AccountingSourceType, Prisma } from "@prisma/client"

jest.mock("@/services/accounting/postings/post-refund", () => ({ postRefund: jest.fn() }))
jest.mock("@/services/accounting/postings/post-payment", () => ({ postPayment: jest.fn() }))
jest.mock("@/services/accounting/postings/post-sale", () => ({ postSale: jest.fn() }))
jest.mock("@/services/accounting/postings/post-void", () => ({ postVoid: jest.fn() }))
jest.mock("@/services/accounting/customer-ledger.service", () => ({
  createCustomerLedgerEntry: jest.fn(),
}))
jest.mock("@/services/compliance/fiscal-document.service", () => ({
  createFiscalDocumentFromPostedSource: jest.fn(),
}))
jest.mock("@/services/compliance/country-pack-hooks", () => ({
  resolveEInvoicingMetadata: jest.fn(),
}))
jest.mock("@/services/inventory/inventory-stock-event.service", () => ({
  postPOSStockIssue: jest.fn(),
  postPOSStockReturn: jest.fn(),
}))
jest.mock("@/services/payments/payment-reconciliation.service", () => ({
  assertNoDuplicateProviderCapture: jest.fn(),
  assertUniqueProviderCaptureReferences: jest.fn(),
  resolveProviderCaptureEvidence: jest.fn(),
}))
jest.mock("@/services/pos/receipt.service", () => ({
  getSalesReceipt: jest.fn(),
  sendReceipt: jest.fn(),
}))

jest.mock("@/prisma/db", () => ({
  db: {
    $transaction: jest.fn(),
    auditLog: { create: jest.fn() },
  },
}))

import { db } from "@/prisma/db"
import { hashBusinessPayload } from "@/services/events/business-event.service"
import { closeShiftSchema } from "../pos.schemas"
import { closePOSShift } from "../pos.service"

const mockDb = db as unknown as {
  $transaction: jest.Mock
  auditLog: { create: jest.Mock }
}

const mockTx = {
  pOSSession: {
    findFirst: jest.fn(),
    updateMany: jest.fn(),
  },
  pOSStation: {
    updateMany: jest.fn(),
  },
  cashDrawer: {
    updateMany: jest.fn(),
  },
  cashDrawerTransaction: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  organization: {
    findUnique: jest.fn(),
  },
  businessEvent: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  auditLog: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
}

const openedAt = new Date("2026-07-19T08:00:00.000Z")

function decimal(value: Prisma.Decimal.Value) {
  return new Prisma.Decimal(value)
}

function activeSession() {
  return {
    id: "session-1",
    sessionNumber: "SHIFT-0001",
    status: "ACTIVE",
    startTime: openedAt,
    endTime: null,
    terminalId: "terminal-1",
    locationId: "location-1",
    userId: "cashier-1",
    openingBalance: decimal(20),
    closingBalance: null,
    expectedBalance: decimal(100),
    variance: null,
    totalSales: decimal(160),
    totalTax: decimal(20),
    totalDiscount: decimal(0),
    transactionCount: 4,
    cashTotal: decimal(80),
    cardTotal: decimal(80),
    mobileMoneyTotal: decimal(0),
    bankTransferTotal: decimal(0),
    creditTotal: decimal(0),
    notes: null,
    terminal: {
      organizationId: "org-1",
      locationId: "location-1",
      currentSessionId: "session-1",
    },
  }
}

function closeInput(actualBalance: string | number = "100.00", notes?: string) {
  return {
    organizationId: "org-1",
    userId: "cashier-1",
    sessionId: "session-1",
    actualBalance,
    notes,
  }
}

let createdEvent: Record<string, any> | null
let createdAudit: Record<string, any> | null

function prepareReplay(session: ReturnType<typeof activeSession>, actualBalance: string, notes: string | null) {
  if (!createdEvent) throw new Error("Expected a committed event fixture")
  if (!createdAudit) throw new Error("Expected a committed audit fixture")

  mockTx.pOSSession.findFirst.mockResolvedValue({
    ...session,
    status: "CLOSED",
    endTime: createdEvent.occurredAt,
    closingBalance: decimal(actualBalance),
    variance: decimal(actualBalance).minus(session.expectedBalance),
    notes,
    terminal: { ...session.terminal, currentSessionId: null },
  })
  mockTx.businessEvent.findUnique.mockResolvedValue(createdEvent)
  mockTx.cashDrawerTransaction.findFirst.mockResolvedValue({
    cashDrawerId: "drawer-1",
    userId: "cashier-1",
    amount: decimal(actualBalance),
    balanceBefore: decimal(100),
    balanceAfter: decimal(actualBalance),
  })
  mockTx.auditLog.findMany.mockResolvedValue([createdAudit])
}

describe("POS shift close evidence", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    createdEvent = null
    createdAudit = null

    mockDb.$transaction.mockImplementation(
      async (handler: (tx: typeof mockTx) => Promise<unknown>) => handler(mockTx),
    )
    mockDb.auditLog.create.mockResolvedValue({ id: "conflict-audit-1" })
    mockTx.pOSSession.findFirst.mockResolvedValue(activeSession())
    mockTx.pOSSession.updateMany.mockResolvedValue({ count: 1 })
    mockTx.pOSStation.updateMany.mockResolvedValue({ count: 1 })
    mockTx.cashDrawer.updateMany.mockResolvedValue({ count: 1 })
    mockTx.cashDrawerTransaction.findMany.mockResolvedValue([
      {
        cashDrawer: {
          id: "drawer-1",
          isOpen: true,
          currentBalance: decimal(100),
          expectedBalance: decimal(100),
        },
      },
    ])
    mockTx.cashDrawerTransaction.findFirst.mockResolvedValue(null)
    mockTx.cashDrawerTransaction.create.mockResolvedValue({ id: "closing-transaction-1" })
    mockTx.organization.findUnique.mockResolvedValue({ currency: "XAF" })
    mockTx.businessEvent.findUnique.mockResolvedValue(null)
    mockTx.businessEvent.create.mockImplementation(async ({ data }) => {
      const eventId = "shift-close-event-1"
      createdEvent = {
        id: eventId,
        status: "RECORDED",
        processedAt: null,
        ...data,
        outboxMessages: data.outboxMessages.create.map((message: Record<string, unknown>, index: number) => ({
          id: `outbox-${index + 1}`,
          businessEventId: eventId,
          ...message,
        })),
      }
      return createdEvent
    })
    mockTx.businessEvent.update.mockImplementation(async ({ where, data }) => {
      if (
        !createdEvent ||
        createdEvent.id !== where.id ||
        createdEvent.organizationId !== where.organizationId
      ) {
        throw new Error("Business event fixture identity mismatch")
      }
      createdEvent = { ...createdEvent, ...data }
      return createdEvent
    })
    mockTx.auditLog.findMany.mockResolvedValue([])
    mockTx.auditLog.create.mockImplementation(async ({ data }) => {
      createdAudit = { id: "audit-1", ...data }
      return createdAudit
    })
  })

  it("requires an explicit non-negative closing count while preserving zero", () => {
    expect(closeShiftSchema.parse({ sessionId: "session-1", actualBalance: "0" }).actualBalance).toBe("0")
    expect(closeShiftSchema.parse({ sessionId: "session-1", actualBalance: 0 }).actualBalance).toBe("0")

    for (const actualBalance of ["", "  ", -1, "1.234", "1000000000000"]) {
      expect(closeShiftSchema.safeParse({ sessionId: "session-1", actualBalance }).success).toBe(false)
    }
  })

  it("closes through one serializable transaction and records durable event, outbox, and audit evidence", async () => {
    const result = await closePOSShift(closeInput())

    expect(result).toMatchObject({
      sessionId: "session-1",
      terminalId: "terminal-1",
      locationId: "location-1",
      cashDrawerId: "drawer-1",
      closingTransactionId: "closing-transaction-1",
      eventId: "shift-close-event-1",
      variance: 0,
      varianceDirection: "BALANCED",
      replayed: false,
    })
    expect(mockDb.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    })
    expect(mockTx.pOSSession.updateMany).toHaveBeenCalledWith({
      where: {
        id: "session-1",
        organizationId: "org-1",
        terminalId: "terminal-1",
        locationId: "location-1",
        userId: "cashier-1",
        status: "ACTIVE",
      },
      data: expect.objectContaining({
        status: "CLOSED",
        closingBalance: expect.any(Prisma.Decimal),
        variance: expect.any(Prisma.Decimal),
        notes: null,
      }),
    })
    expect(mockTx.cashDrawer.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: "drawer-1", isOpen: true }),
      data: { currentBalance: expect.any(Prisma.Decimal), isOpen: false },
    }))
    expect(mockTx.pOSStation.updateMany).toHaveBeenCalledWith({
      where: {
        id: "terminal-1",
        organizationId: "org-1",
        locationId: "location-1",
        currentSessionId: "session-1",
      },
      data: { currentSessionId: null },
    })
    expect(mockTx.cashDrawerTransaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        cashDrawerId: "drawer-1",
        sessionId: "session-1",
        userId: "cashier-1",
        type: "CLOSING_BALANCE",
        reason: "Shift closing count - balanced",
        notes: null,
      }),
    })
    expect(mockTx.businessEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: "org-1",
        eventType: "pos.shift.closed",
        eventSource: "POS",
        schemaVersion: 1,
        idempotencyKey: "pos-shift:session-1:closed",
        actorId: "cashier-1",
        locationId: "location-1",
        registerId: "terminal-1",
        sourceType: AccountingSourceType.CASH_DRAWER_CLOSE,
        sourceId: "session-1",
        documentHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        payloadHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        payload: expect.objectContaining({
          authorityMode: "SELF",
          countedBalance: "100.00",
          expectedBalance: "100.00",
          variance: "0.00",
          varianceDirection: "BALANCED",
          explanation: null,
        }),
        outboxMessages: {
          create: [
            expect.objectContaining({
              organizationId: "org-1",
              channel: "NOTIFICATION",
              eventName: "pos.shift.closed",
              idempotencyKey: "POS:pos-shift:session-1:closed:NOTIFICATION:pos.shift.closed",
            }),
          ],
        },
      }),
      include: { outboxMessages: true },
    })
    expect(mockTx.businessEvent.update).toHaveBeenCalledWith({
      where: { id: "shift-close-event-1", organizationId: "org-1" },
      data: {
        status: "APPLIED",
        processedAt: expect.any(Date),
      },
    })
    expect(createdEvent).toMatchObject({
      status: "APPLIED",
      processedAt: expect.any(Date),
    })
    expect(createdEvent?.payloadHash).toBe(hashBusinessPayload(createdEvent?.payload))
    expect(mockTx.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        entityType: "POSSession",
        entityId: "session-1",
        action: "POS_SHIFT_CLOSED",
        organizationId: "org-1",
        userId: "cashier-1",
        changes: expect.objectContaining({
          after: expect.objectContaining({ businessEventId: "shift-close-event-1" }),
        }),
      }),
    })
    expect(mockTx.pOSSession.updateMany.mock.invocationCallOrder[0]).toBeLessThan(
      mockTx.cashDrawerTransaction.create.mock.invocationCallOrder[0],
    )
    expect(mockTx.businessEvent.create.mock.invocationCallOrder[0]).toBeLessThan(
      mockTx.businessEvent.update.mock.invocationCallOrder[0],
    )
    expect(mockTx.businessEvent.update.mock.invocationCallOrder[0]).toBeLessThan(
      mockTx.auditLog.create.mock.invocationCallOrder[0],
    )
  })

  it("requires an explanation before recording a cash shortage or overage", async () => {
    await expect(closePOSShift(closeInput("99.00"))).rejects.toThrow(/variance explanation is required/i)

    expect(mockTx.pOSSession.updateMany).not.toHaveBeenCalled()
    expect(mockTx.cashDrawerTransaction.create).not.toHaveBeenCalled()
    expect(mockTx.businessEvent.create).not.toHaveBeenCalled()
    expect(mockTx.auditLog.create).not.toHaveBeenCalled()
  })

  it("treats a sub-franc XAF difference as balanced without a manager explanation", async () => {
    const session = { ...activeSession(), expectedBalance: decimal("100.49") }
    mockTx.pOSSession.findFirst.mockResolvedValue(session)
    mockTx.cashDrawerTransaction.findMany.mockResolvedValue([
      {
        cashDrawer: {
          id: "drawer-1",
          isOpen: true,
          currentBalance: decimal("100.49"),
          expectedBalance: decimal("100.49"),
        },
      },
    ])

    const result = await closePOSShift(closeInput("100.00"))

    expect(result).toMatchObject({ variance: 0, varianceDirection: "BALANCED" })
    expect(mockTx.pOSSession.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ variance: decimal(0), notes: null }),
    }))
    expect(createdEvent?.payload).toMatchObject({
      countedBalance: "100.00",
      expectedBalance: "100.49",
      variance: "0.00",
      varianceDirection: "BALANCED",
      explanation: null,
    })
  })

  it("retains cent-level variance controls for currencies with decimal minor units", async () => {
    const session = { ...activeSession(), expectedBalance: decimal("100.01") }
    mockTx.pOSSession.findFirst.mockResolvedValue(session)
    mockTx.cashDrawerTransaction.findMany.mockResolvedValue([
      {
        cashDrawer: {
          id: "drawer-1",
          isOpen: true,
          currentBalance: decimal("100.01"),
          expectedBalance: decimal("100.01"),
        },
      },
    ])
    mockTx.organization.findUnique.mockResolvedValue({ currency: "USD" })

    await expect(closePOSShift(closeInput("100.00"))).rejects.toThrow(/variance explanation is required/i)

    expect(mockTx.pOSSession.updateMany).not.toHaveBeenCalled()
    expect(mockTx.businessEvent.create).not.toHaveBeenCalled()
  })

  it("stops before close audit when the event cannot reach APPLIED", async () => {
    mockTx.businessEvent.update.mockRejectedValueOnce(new Error("injected event apply failure"))

    await expect(closePOSShift(closeInput())).rejects.toThrow(/could not be completed safely/i)

    expect(mockTx.businessEvent.create).toHaveBeenCalledTimes(1)
    expect(mockTx.businessEvent.update).toHaveBeenCalledTimes(1)
    expect(mockTx.auditLog.create).not.toHaveBeenCalled()
  })

  it("allows only the cashier who opened the shift to close it", async () => {
    mockTx.pOSSession.findFirst.mockResolvedValue({ ...activeSession(), userId: "cashier-2" })

    await expect(closePOSShift(closeInput())).rejects.toMatchObject({ code: "FORBIDDEN", status: 403 })

    expect(mockTx.businessEvent.findUnique).not.toHaveBeenCalled()
    expect(mockTx.pOSSession.updateMany).not.toHaveBeenCalled()
  })

  it("returns the original evidence for an exact replay without writing a second close", async () => {
    const session = activeSession()
    const first = await closePOSShift(closeInput())
    prepareReplay(session, "100.00", null)
    mockTx.pOSSession.updateMany.mockClear()
    mockTx.cashDrawer.updateMany.mockClear()
    mockTx.pOSStation.updateMany.mockClear()
    mockTx.cashDrawerTransaction.create.mockClear()
    mockTx.businessEvent.create.mockClear()
    mockTx.businessEvent.update.mockClear()
    mockTx.auditLog.create.mockClear()

    const replay = await closePOSShift(closeInput())

    expect(replay).toEqual({ ...first, replayed: true })
    expect(mockTx.pOSSession.updateMany).not.toHaveBeenCalled()
    expect(mockTx.cashDrawer.updateMany).not.toHaveBeenCalled()
    expect(mockTx.pOSStation.updateMany).not.toHaveBeenCalled()
    expect(mockTx.cashDrawerTransaction.create).not.toHaveBeenCalled()
    expect(mockTx.businessEvent.create).not.toHaveBeenCalled()
    expect(mockTx.businessEvent.update).not.toHaveBeenCalled()
    expect(mockTx.auditLog.create).not.toHaveBeenCalled()
  })

  it("fails closed when exact replay evidence has not reached APPLIED", async () => {
    const session = activeSession()
    await closePOSShift(closeInput())
    prepareReplay(session, "100.00", null)
    if (!createdEvent) throw new Error("Expected a committed event fixture")
    createdEvent = {
      ...createdEvent,
      status: "RECORDED",
      processedAt: null,
    }
    mockTx.businessEvent.findUnique.mockResolvedValue(createdEvent)

    await expect(closePOSShift(closeInput())).rejects.toThrow(/evidence is incomplete or inconsistent/i)
  })

  it("rejects a changed replay and records a durable conflict audit outside the rolled-back transaction", async () => {
    const session = activeSession()
    await closePOSShift(closeInput())
    prepareReplay(session, "100.00", null)
    mockDb.auditLog.create.mockClear()

    await expect(
      closePOSShift(closeInput("99.00", "Second count differs")),
    ).rejects.toMatchObject({ code: "CONFLICT", status: 409 })

    expect(mockDb.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        entityType: "POSSession",
        entityId: "session-1",
        action: "POS_SHIFT_CLOSE_IDEMPOTENCY_CONFLICT",
        organizationId: "org-1",
        userId: "cashier-1",
        changes: {
          before: expect.objectContaining({
            businessEventId: "shift-close-event-1",
            commandHash: expect.stringMatching(/^[a-f0-9]{64}$/),
            payloadHash: expect.stringMatching(/^[a-f0-9]{64}$/),
          }),
          after: expect.objectContaining({ attemptedCommandHash: expect.stringMatching(/^[a-f0-9]{64}$/) }),
        },
      }),
    })
  })

  it("fails closed when replay outbox tenant, identity, payload, or hash evidence is inconsistent", async () => {
    const session = activeSession()
    await closePOSShift(closeInput())
    prepareReplay(session, "100.00", null)
    if (!createdEvent) throw new Error("Expected a committed event fixture")
    createdEvent = {
      ...createdEvent,
      outboxMessages: createdEvent.outboxMessages.map((message: Record<string, any>) => ({
        ...message,
        organizationId: "org-other",
        payload: { ...message.payload, sessionId: "session-other" },
      })),
    }
    mockTx.businessEvent.findUnique.mockResolvedValue(createdEvent)

    await expect(closePOSShift(closeInput())).rejects.toThrow(/evidence is incomplete or inconsistent/i)

    expect(mockTx.pOSSession.updateMany).toHaveBeenCalledTimes(1)
  })

  it("fails closed when the committed close audit envelope is missing", async () => {
    const session = activeSession()
    await closePOSShift(closeInput())
    prepareReplay(session, "100.00", null)
    mockTx.auditLog.findMany.mockResolvedValue([])

    await expect(closePOSShift(closeInput())).rejects.toThrow(/evidence is incomplete or inconsistent/i)

    expect(mockTx.businessEvent.create).toHaveBeenCalledTimes(1)
  })

  it("refuses a legacy closed session that has no certified close event", async () => {
    mockTx.pOSSession.findFirst.mockResolvedValue({
      ...activeSession(),
      status: "CLOSED",
      endTime: new Date("2026-07-19T17:00:00.000Z"),
      closingBalance: decimal(100),
      variance: decimal(0),
    })

    await expect(closePOSShift(closeInput())).rejects.toThrow(/legacy shift close has no certified evidence/i)

    expect(mockTx.pOSSession.updateMany).not.toHaveBeenCalled()
    expect(mockTx.businessEvent.create).not.toHaveBeenCalled()
  })

  it("retries a transition collision once and then returns a safe conflict", async () => {
    mockTx.pOSSession.updateMany.mockResolvedValue({ count: 0 })

    await expect(closePOSShift(closeInput())).rejects.toMatchObject({ code: "CONFLICT", status: 409 })

    expect(mockDb.$transaction).toHaveBeenCalledTimes(2)
    expect(mockTx.cashDrawer.updateMany).not.toHaveBeenCalled()
    expect(mockTx.cashDrawerTransaction.create).not.toHaveBeenCalled()
    expect(mockTx.businessEvent.create).not.toHaveBeenCalled()
  })
})
