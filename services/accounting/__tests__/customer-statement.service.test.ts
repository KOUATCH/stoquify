import { LedgerEntryType, Prisma } from "@prisma/client"

import {
  hashBusinessPayload,
  markBusinessEventAppliedInTx,
  recordBusinessEventInTx,
} from "@/services/events/business-event.service"

import {
  type AROpenItem,
  getCustomerAROpenItems,
} from "../ar-open-item.service"
import {
  CUSTOMER_STATEMENT_ITEM_LIMIT,
  createCustomerStatementSnapshotInTx,
} from "../customer-statement.service"

jest.mock("../ar-open-item.service", () => ({
  getCustomerAROpenItems: jest.fn(),
}))

jest.mock("@/services/events/business-event.service", () => {
  const actual = jest.requireActual(
    "@/services/events/business-event.service",
  )
  return {
    ...actual,
    recordBusinessEventInTx: jest.fn(),
    markBusinessEventAppliedInTx: jest.fn(),
  }
})

const mockOpenItems = getCustomerAROpenItems as jest.MockedFunction<
  typeof getCustomerAROpenItems
>
const mockRecordBusinessEvent =
  recordBusinessEventInTx as jest.MockedFunction<
    typeof recordBusinessEventInTx
  >
const mockMarkBusinessEvent =
  markBusinessEventAppliedInTx as jest.MockedFunction<
    typeof markBusinessEventAppliedInTx
  >

const NOW = new Date("2026-08-09T12:00:00.000Z")
const PERIOD_START = new Date("2026-08-01T00:00:00.000Z")
const PERIOD_END = new Date("2026-08-09T11:00:00.000Z")

function input(overrides: Record<string, unknown> = {}) {
  return {
    organizationId: "org-1",
    customerId: "customer-1",
    periodStart: PERIOD_START,
    periodEnd: PERIOD_END,
    currency: "XAF",
    generatedById: "user-1",
    idempotencyKey: "statement-idempotency-001",
    correlationId: "statement-correlation-001",
    now: NOW,
    ...overrides,
  }
}

function openItem(
  overrides: Partial<AROpenItem> = {},
): AROpenItem {
  return {
    customerId: "customer-1",
    customerName: "Ada Retail",
    referenceType: "CUSTOMER_RECEIVABLE_DOCUMENT",
    referenceId: "receivable-1",
    documentNumber: "INV-001",
    documentVersion: 1,
    documentHash: "a".repeat(64),
    stateHash: "b".repeat(64),
    currency: "XAF",
    orderNumber: "SO-001",
    invoiceDate: "2026-07-15T10:00:00.000Z",
    dueDate: "2026-08-05T10:00:00.000Z",
    openingAmount: "100.00",
    initialPaidAmount: "60.00",
    initialUnpaidAmount: "40.00",
    paidAmount: "75.00",
    allocatedAmount: "75.00",
    openAmount: "25.00",
    status: "partial",
    daysPastDue: 4,
    agingBucket: "1-30",
    evidenceGrade: "posted",
    allocations: [
      {
        ledgerEntryId: "ledger-1",
        type: LedgerEntryType.PAYMENT,
        amount: "15.00",
        entryDate: "2026-08-04T09:00:00.000Z",
        recordedAt: "2026-08-04T09:00:01.000Z",
        description: "Settlement ST-001",
      },
    ],
    ...overrides,
  }
}

function arResult(items: AROpenItem[], asOf: Date) {
  return {
    items,
    summary: {
      itemCount: items.length,
      openItemCount: items.filter((item) => item.openAmount !== "0.00").length,
      settledItemCount: items.filter((item) => item.openAmount === "0.00").length,
      totalOpened: "0.00",
      totalAllocated: "0.00",
      totalOpen: "0.00",
      overdueAmount: "0.00",
    },
    recordedThrough: NOW.toISOString(),
    asOf: asOf.toISOString(),
  }
}

function buildTx(options: {
  existing?: Record<string, unknown> | null
  latest?: Record<string, unknown> | null
} = {}) {
  const findFirst = jest
    .fn()
    .mockResolvedValueOnce(options.existing ?? null)
  if (!options.existing) {
    findFirst.mockResolvedValueOnce(options.latest ?? null)
  }
  const create = jest.fn(async ({ data }: { data: Record<string, unknown> }) => ({
    id: "statement-1",
    createdAt: NOW,
    ...data,
  }))
  return {
    tx: {
      customerStatementSnapshot: { findFirst, create },
      user: {
        findFirst: jest.fn().mockResolvedValue({ id: "user-1" }),
      },
      organization: {
        findFirst: jest.fn().mockResolvedValue({
          id: "org-1",
          name: "Stoquify Demo",
          tradeName: "Stoquify",
          taxIdentifier: "TAX-1",
          address: "Douala",
          country: "Cameroon",
          countryCode: "CM",
          currency: "XAF",
          timezone: "Africa/Douala",
          defaultLocale: "EN",
        }),
      },
      customer: {
        findFirst: jest.fn().mockResolvedValue({
          id: "customer-1",
          name: "Ada Retail",
          code: "C-001",
          taxId: "C-TAX-1",
          preferredLocale: "EN",
        }),
      },
      auditLog: { create: jest.fn().mockResolvedValue({ id: "audit-1" }) },
    } as unknown as Prisma.TransactionClient,
    findFirst,
    create,
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockRecordBusinessEvent.mockResolvedValue({
    event: { id: "event-1" },
  } as never)
  mockMarkBusinessEvent.mockResolvedValue(undefined as never)
})

describe("customer statement snapshot service", () => {
  it("freezes a complete redacted statement with reconciled balances and source hashes", async () => {
    const opening = openItem({
      stateHash: "c".repeat(64),
      paidAmount: "60.00",
      allocatedAmount: "60.00",
      openAmount: "40.00",
      allocations: [],
    })
    const closing = openItem()
    mockOpenItems
      .mockResolvedValueOnce(arResult([opening], new Date(PERIOD_START.getTime() - 1)))
      .mockResolvedValueOnce(arResult([closing], PERIOD_END))
    const { tx, create } = buildTx()

    const result = await createCustomerStatementSnapshotInTx(tx, input())

    expect(result).toMatchObject({
      statementId: "statement-1",
      version: 1,
      currency: "XAF",
      openingBalance: "40.00",
      periodDebits: "0.00",
      periodCredits: "15.00",
      closingBalance: "25.00",
      overdueBalance: "25.00",
      itemCount: 1,
      movementCount: 1,
      truncated: false,
      replayed: false,
      businessEventId: "event-1",
    })
    expect(result.contentHash).toMatch(/^[0-9a-f]{64}$/)
    const createData = create.mock.calls[0][0].data
    expect(createData).toMatchObject({
      sourceItemCount: 1,
      includedItemCount: 1,
      itemLimit: CUSTOMER_STATEMENT_ITEM_LIMIT,
      truncated: false,
      sourceDocumentHashes: ["a".repeat(64)],
      sourceStateHashes: ["b".repeat(64), "c".repeat(64)],
      sourceLedgerEntryIds: ["ledger-1"],
    })
    const serialized = JSON.stringify(createData.statementPayload)
    expect(serialized).toContain("CUSTOMER_STATEMENT_EXTERNAL_SAFE_V1")
    expect(serialized).toContain('"contactAndAuthenticationFieldsIncluded":false')
    expect(serialized).not.toContain('"email"')
    expect(serialized).not.toContain('"phone"')
    expect(serialized).not.toContain('"notes"')
    expect(mockRecordBusinessEvent.mock.invocationCallOrder[0]).toBeLessThan(
      create.mock.invocationCallOrder[0],
    )
    expect(mockMarkBusinessEvent).toHaveBeenCalledWith(tx, "org-1", "event-1")
  })

  it("reconciles a receivable issued in-period using its immutable initial paid evidence", async () => {
    const closing = openItem({
      invoiceDate: "2026-08-02T10:00:00.000Z",
      initialPaidAmount: "70.00",
      initialUnpaidAmount: "30.00",
      paidAmount: "75.00",
      openAmount: "25.00",
      allocations: [
        {
          ledgerEntryId: "ledger-2",
          type: LedgerEntryType.PAYMENT,
          amount: "5.00",
          entryDate: "2026-08-07T09:00:00.000Z",
          recordedAt: "2026-08-07T09:00:01.000Z",
          description: "Settlement ST-002",
        },
      ],
    })
    mockOpenItems
      .mockResolvedValueOnce(arResult([], new Date(PERIOD_START.getTime() - 1)))
      .mockResolvedValueOnce(arResult([closing], PERIOD_END))
    const { tx, create } = buildTx()

    const result = await createCustomerStatementSnapshotInTx(tx, input())

    expect(result).toMatchObject({
      openingBalance: "0.00",
      periodDebits: "100.00",
      periodCredits: "75.00",
      closingBalance: "25.00",
      movementCount: 3,
    })
    expect(create.mock.calls[0][0].data.statementPayload.lines[0]).toMatchObject({
      debitAmount: "100.00",
      initialCreditAmount: "70.00",
      movementCreditAmount: "5.00",
      periodCreditAmount: "75.00",
      closingBalance: "25.00",
    })
  })

  it("fails closed when movement evidence cannot reconcile a receivable", async () => {
    const opening = openItem({ openAmount: "40.00", allocations: [] })
    const closing = openItem({
      openAmount: "30.00",
      allocations: [
        {
          ledgerEntryId: "ledger-bad",
          type: LedgerEntryType.PAYMENT,
          amount: "5.00",
          entryDate: "2026-08-04T09:00:00.000Z",
          recordedAt: "2026-08-04T09:00:01.000Z",
          description: "Incomplete settlement evidence",
        },
      ],
    })
    mockOpenItems
      .mockResolvedValueOnce(arResult([opening], new Date(PERIOD_START.getTime() - 1)))
      .mockResolvedValueOnce(arResult([closing], PERIOD_END))
    const { tx, create } = buildTx()

    await expect(
      createCustomerStatementSnapshotInTx(tx, input()),
    ).rejects.toThrow("does not reconcile for receivable INV-001")
    expect(create).not.toHaveBeenCalled()
    expect(mockRecordBusinessEvent).not.toHaveBeenCalled()
  })

  it("fails closed instead of persisting a truncated statement", async () => {
    const items = Array.from(
      { length: CUSTOMER_STATEMENT_ITEM_LIMIT + 1 },
      (_, index) =>
        openItem({
          referenceId: "receivable-" + index,
          documentNumber: "INV-" + index,
          documentHash: index.toString(16).padStart(64, "0"),
          stateHash: (index + 1).toString(16).padStart(64, "0"),
          invoiceDate: "2026-08-02T10:00:00.000Z",
          openingAmount: "1.00",
          initialPaidAmount: "0.00",
          initialUnpaidAmount: "1.00",
          paidAmount: "0.00",
          allocatedAmount: "0.00",
          openAmount: "1.00",
          allocations: [],
        }),
    )
    mockOpenItems
      .mockResolvedValueOnce(arResult([], new Date(PERIOD_START.getTime() - 1)))
      .mockResolvedValueOnce(arResult(items, PERIOD_END))
    const { tx, create } = buildTx()

    await expect(
      createCustomerStatementSnapshotInTx(tx, input()),
    ).rejects.toThrow("exceeds the complete snapshot item limit")
    expect(create).not.toHaveBeenCalled()
    expect(mockRecordBusinessEvent).not.toHaveBeenCalled()
  })

  it("replays the exact idempotent snapshot without rebuilding source truth", async () => {
    const command = input()
    const existing = {
      id: "statement-existing",
      statementNumber: "STM-20260809-EXISTING",
      version: 2,
      contentHash: "d".repeat(64),
      businessEventId: "event-existing",
      periodStart: PERIOD_START,
      periodEnd: PERIOD_END,
      asOf: PERIOD_END,
      recordedThrough: NOW,
      currency: "XAF",
      openingBalance: new Prisma.Decimal(40),
      periodDebits: new Prisma.Decimal(0),
      periodCredits: new Prisma.Decimal(15),
      closingBalance: new Prisma.Decimal(25),
      overdueBalance: new Prisma.Decimal(25),
      itemCount: 1,
      movementCount: 1,
      truncated: false,
      statementPayload: { schemaVersion: "customer-statement.v1" },
      idempotencyKey: command.idempotencyKey,
      idempotencyPayloadHash: hashBusinessPayload({
        organizationId: command.organizationId,
        customerId: command.customerId,
        periodStart: PERIOD_START.toISOString(),
        periodEnd: PERIOD_END.toISOString(),
        currency: command.currency,
        generatedById: command.generatedById,
        correlationId: command.correlationId,
      }),
      customerId: command.customerId,
      generatedById: command.generatedById,
      correlationId: command.correlationId,
    }
    const { tx, create } = buildTx({ existing })

    const result = await createCustomerStatementSnapshotInTx(tx, command)

    expect(result).toMatchObject({
      statementId: "statement-existing",
      version: 2,
      replayed: true,
    })
    expect(mockOpenItems).not.toHaveBeenCalled()
    expect(create).not.toHaveBeenCalled()
    expect(mockRecordBusinessEvent).not.toHaveBeenCalled()
  })

  it("appends a new immutable version that supersedes the prior scope snapshot", async () => {
    mockOpenItems
      .mockResolvedValueOnce(arResult([], new Date(PERIOD_START.getTime() - 1)))
      .mockResolvedValueOnce(arResult([], PERIOD_END))
    const { tx, create } = buildTx({
      latest: {
        id: "statement-prior",
        version: 3,
        createdAt: new Date("2026-08-09T10:00:00.000Z"),
      },
    })

    const result = await createCustomerStatementSnapshotInTx(tx, input())

    expect(result.version).toBe(4)
    expect(create.mock.calls[0][0].data).toMatchObject({
      version: 4,
      supersedesStatementId: "statement-prior",
      openingBalance: new Prisma.Decimal(0),
      closingBalance: new Prisma.Decimal(0),
    })
  })
})
