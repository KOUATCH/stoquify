import {
  AccountingPostingPurpose,
  AccountingSourceType,
  CustomerSettlementStatus,
  LedgerPostingBatchStatus,
  PaymentMethod,
  PaymentDirection,
  PaymentRailType,
  PaymentTransactionState,
  ProviderAccountStatus,
  ProviderEventStatus,
  PostingRuleAmountSource,
  PostingRuleLineSide,
  Prisma,
} from "@prisma/client"

import { NotFoundError } from "@/services/_shared/action-errors"
import {
  collectCustomerSettlementWithControls,
  CUSTOMER_SETTLEMENT_MAX_SERIALIZABLE_ATTEMPTS,
} from "../customer-settlement.service"
import { createCustomerLedgerEntry } from "../customer-ledger.service"
import { recordPostedJournalCloseInvalidationInTx } from "../journal-close-invalidation.service"
import {
  ensurePostedCustomerReceivableDocumentInTx,
} from "../customer-receivable-document.service"
import {
  recordCustomerReceivableSettlementAppliedInTx,
} from "../customer-receivable-lifecycle.service"
import { getOpenPeriodForDate } from "../periods.service"
import { createLedgerPostingBatch } from "../posting.service"
import { requireActivePostingRule } from "../posting-rules.service"
import { createAccountingSourceLink } from "../source-link.service"
import {
  hashBusinessPayload,
  markBusinessEventAppliedInTx,
  recordBusinessEventInTx,
} from "@/services/events/business-event.service"

jest.mock("../customer-ledger.service", () => ({
  createCustomerLedgerEntry: jest.fn(),
}))
jest.mock("../customer-receivable-document.service", () => ({
  CUSTOMER_RECEIVABLE_REFERENCE_TYPE: "CUSTOMER_RECEIVABLE_DOCUMENT",
  ensurePostedCustomerReceivableDocumentInTx: jest.fn(),
}))
jest.mock("../customer-receivable-lifecycle.service", () => ({
  recordCustomerReceivableSettlementAppliedInTx: jest.fn(),
}))
jest.mock("../journal-close-invalidation.service", () => ({
  recordPostedJournalCloseInvalidationInTx: jest.fn(),
}))
jest.mock("../periods.service", () => ({
  getOpenPeriodForDate: jest.fn(),
}))
jest.mock("../posting.service", () => ({
  createLedgerPostingBatch: jest.fn(),
}))
jest.mock("../posting-rules.service", () => ({
  requireActivePostingRule: jest.fn(),
}))
jest.mock("../source-link.service", () => ({
  createAccountingSourceLink: jest.fn(),
}))
jest.mock("@/services/events/business-event.service", () => ({
  hashBusinessPayload: jest.fn(() => "f".repeat(64)),
  recordBusinessEventInTx: jest.fn(),
  markBusinessEventAppliedInTx: jest.fn(),
}))

const mockCreateCustomerLedgerEntry = jest.mocked(createCustomerLedgerEntry)
const mockEnsurePostedReceivable = jest.mocked(
  ensurePostedCustomerReceivableDocumentInTx,
)
const mockRecordReceivableSettlementApplied = jest.mocked(
  recordCustomerReceivableSettlementAppliedInTx,
)
const mockRecordCloseInvalidation = jest.mocked(
  recordPostedJournalCloseInvalidationInTx,
)
const mockGetOpenPeriodForDate = jest.mocked(getOpenPeriodForDate)
const mockCreateLedgerPostingBatch = jest.mocked(createLedgerPostingBatch)
const mockRequireActivePostingRule = jest.mocked(requireActivePostingRule)
const mockCreateAccountingSourceLink = jest.mocked(createAccountingSourceLink)
const mockHashBusinessPayload = jest.mocked(hashBusinessPayload)
const mockRecordBusinessEventInTx = jest.mocked(recordBusinessEventInTx)
const mockMarkBusinessEventAppliedInTx = jest.mocked(markBusinessEventAppliedInTx)

const NOW = new Date("2026-08-08T10:00:00.000Z")
const DOCUMENT_HASH = "a".repeat(64)
const EVIDENCE_HASH = "b".repeat(64)

const INPUT = {
  customerId: "customer-1",
  method: "CASH" as const,
  amount: "100.00",
  settlementDate: "2026-08-08T09:30:00.000Z",
  idempotencyKey: "settlement-key-1",
  correlationId: "settlement-correlation-1",
  externalReference: "private-cash-reference",
  documentHash: DOCUMENT_HASH,
  evidenceHash: EVIDENCE_HASH,
  notes: "Internal collection note",
  allocations: [
    { salesOrderId: "sale-1", amount: "60.00" },
    { salesOrderId: "sale-2", amount: "40.00" },
  ],
}

const CONTROL = {
  organizationId: "org-1",
  actorId: "actor-1",
  actorPermissions: ["finance.receivables.collect"],
  lastAuthAt: NOW,
  now: NOW,
}

function settlementRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: "settlement-1",
    organizationId: "org-1",
    customerId: "customer-1",
    settlementNumber: "CSET-20260808-ABCDEF1234",
    status: CustomerSettlementStatus.POSTED,
    method: PaymentMethod.CASH,
    amount: new Prisma.Decimal("100.00"),
    currency: "XAF",
    settlementDate: new Date(INPUT.settlementDate),
    idempotencyKey: INPUT.idempotencyKey,
    idempotencyPayloadHash: "f".repeat(64),
    correlationId: INPUT.correlationId,
    externalReference: INPUT.externalReference,
    documentHash: DOCUMENT_HASH,
    evidenceHash: EVIDENCE_HASH,
    receivedById: "actor-1",
    ledgerPostingBatchId: null,
    journalEntryId: null,
    postedBusinessEventId: null,
    reversedAt: null,
    reversedById: null,
    reversalReason: null,
    reversalIdempotencyKey: null,
    reversalEvidenceHash: null,
    reversalLedgerPostingBatchId: null,
    reversalJournalEntryId: null,
    reversalBusinessEventId: null,
    notes: INPUT.notes,
    metadata: null,
    createdAt: NOW,
    updatedAt: NOW,
    allocations: [
      {
        id: "allocation-1",
        organizationId: "org-1",
        customerSettlementId: "settlement-1",
        salesOrderId: "sale-1",
        customerReceivableDocumentId: "document-1",
        customerLedgerEntryId: "ledger-1",
        amount: new Prisma.Decimal("60.00"),
        createdAt: NOW,
      },
      {
        id: "allocation-2",
        organizationId: "org-1",
        customerSettlementId: "settlement-1",
        salesOrderId: "sale-2",
        customerReceivableDocumentId: "document-2",
        customerLedgerEntryId: "ledger-2",
        amount: new Prisma.Decimal("40.00"),
        createdAt: NOW,
      },
    ],
    ...overrides,
  }
}

function postingRule() {
  return {
    id: "rule-1",
    code: "AR-CUSTOMER-SETTLEMENT",
    lines: [
      {
        accountId: null,
        mappingKey: "CASH_ON_HAND",
        lineNumber: 1,
        side: PostingRuleLineSide.DEBIT,
        amountSource: PostingRuleAmountSource.SOURCE_AMOUNT,
        multiplier: new Prisma.Decimal(1),
        description: "Receive cash",
        condition: { paymentMethod: "CASH" },
      },
      {
        accountId: null,
        mappingKey: "ACCOUNTS_RECEIVABLE",
        lineNumber: 2,
        side: PostingRuleLineSide.CREDIT,
        amountSource: PostingRuleAmountSource.SOURCE_AMOUNT,
        multiplier: new Prisma.Decimal(1),
        description: "Clear receivable",
        condition: null,
      },
    ],
  }
}

function buildHarness() {
  const created = settlementRecord()
  const completed = settlementRecord({
    ledgerPostingBatchId: "batch-1",
    journalEntryId: "journal-entry-1",
    postedBusinessEventId: "event-1",
  })
  const tx = {
    $queryRaw: jest.fn().mockResolvedValue([{ id: "provider-payment-1" }]),
    paymentTransaction: {
      findFirst: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    providerAccount: {
      findFirst: jest.fn().mockResolvedValue({ settlementLedgerAccount: {
        id: "bank-account", organizationId: "org-1", isActive: true, deletedAt: null, type: "ASSET", normalBalance: "DEBIT", currency: "XAF",
      } }),
    },
    journalEntryLine: { findMany: jest.fn().mockResolvedValue([{ debit: new Prisma.Decimal(100), credit: new Prisma.Decimal(0), currency: "XAF" }]) },
    organization: {
      findFirst: jest.fn().mockResolvedValue({ id: "org-1", currency: "XAF" }),
    },
    user: {
      findFirst: jest.fn().mockResolvedValue({ id: "actor-1" }),
    },
    customer: {
      findFirst: jest.fn().mockResolvedValue({ id: "customer-1" }),
    },
    salesOrder: {
      findMany: jest.fn().mockResolvedValue([
        { id: "sale-1", orderNumber: "SO-1" },
        { id: "sale-2", orderNumber: "SO-2" },
      ]),
    },
    customerSettlement: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(created),
      update: jest.fn().mockResolvedValue(completed),
    },
    customerSettlementAllocation: {
      create: jest.fn()
        .mockResolvedValueOnce(created.allocations[0])
        .mockResolvedValueOnce(created.allocations[1]),
    },
    customerLedgerEntry: {
      groupBy: jest.fn().mockResolvedValue([
        {
          referenceId: "sale-1",
          _sum: {
            debit: new Prisma.Decimal("80.00"),
            credit: new Prisma.Decimal("0.00"),
          },
        },
        {
          referenceId: "sale-2",
          _sum: {
            debit: new Prisma.Decimal("70.00"),
            credit: new Prisma.Decimal("10.00"),
          },
        },
      ]),
      findMany: jest.fn(),
    },
    journal: {
      findFirst: jest.fn().mockResolvedValue({ id: "journal-1" }),
    },
    chartOfAccount: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: "cash-account",
          code: "571",
          mappingKey: "CASH_ON_HAND",
          isActive: true,
          deletedAt: null,
          _count: { children: 0 },
        },
        {
          id: "ar-account",
          code: "411",
          mappingKey: "ACCOUNTS_RECEIVABLE",
          isActive: true,
          deletedAt: null,
          _count: { children: 0 },
        },
      ]),
    },
    ledgerPostingBatch: {
      update: jest.fn().mockResolvedValue({
        id: "batch-1",
        status: LedgerPostingBatchStatus.POSTED,
      }),
    },
    journalEntry: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: "journal-entry-1" }),
    },
    ledgerAuditEvent: {
      create: jest.fn().mockResolvedValue({ id: "ledger-audit-1" }),
    },
    accountingSourceLink: {
      findFirst: jest.fn().mockResolvedValue({ id: "source-link-1" }),
    },
    auditLog: {
      create: jest.fn().mockResolvedValue({ id: "audit-1" }),
    },
  }
  const client = {
    paymentTransaction: tx.paymentTransaction,
    journalEntryLine: tx.journalEntryLine,
    $transaction: jest.fn(async (work: (transaction: typeof tx) => unknown) =>
      work(tx),
    ),
    auditLog: {
      create: jest.fn().mockResolvedValue({ id: "denied-audit-1" }),
    },
    customerSettlement: {
      findFirst: jest.fn().mockResolvedValue(null),
    },
    accountingSourceLink: {
      findFirst: jest.fn().mockResolvedValue({ id: "source-link-1" }),
    },
    customerLedgerEntry: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: "ledger-1",
          referenceType: "CUSTOMER_RECEIVABLE_DOCUMENT",
          referenceId: "document-1",
          debit: new Prisma.Decimal(0),
          credit: new Prisma.Decimal("60.00"),
        },
        {
          id: "ledger-2",
          referenceType: "CUSTOMER_RECEIVABLE_DOCUMENT",
          referenceId: "document-2",
          debit: new Prisma.Decimal(0),
          credit: new Prisma.Decimal("40.00"),
        },
      ]),
    },
  }

  return { tx, client, created, completed }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockHashBusinessPayload.mockReturnValue("f".repeat(64))
  mockEnsurePostedReceivable.mockImplementation(async (_tx, input) => {
    const suffix = input.salesOrderId === "sale-1" ? "1" : "2"
    return {
      document: { id: `document-${suffix}` },
      state: {
        unpaidAmount: new Prisma.Decimal(
          input.salesOrderId === "sale-1" ? "80.00" : "60.00",
        ),
      },
      replayed: false,
    } as never
  })
  mockRecordReceivableSettlementApplied.mockResolvedValue({
    state: { id: "receivable-state" },
    replayed: false,
  } as never)
  mockGetOpenPeriodForDate.mockResolvedValue({ id: "period-1" } as never)
  mockRequireActivePostingRule.mockResolvedValue(postingRule() as never)
  mockCreateLedgerPostingBatch.mockResolvedValue({
    id: "batch-1",
    status: LedgerPostingBatchStatus.PENDING,
  } as never)
  mockCreateAccountingSourceLink.mockResolvedValue({ id: "source-link-1" } as never)
  mockCreateCustomerLedgerEntry
    .mockResolvedValueOnce({ id: "ledger-1" } as never)
    .mockResolvedValueOnce({ id: "ledger-2" } as never)
  mockRecordBusinessEventInTx.mockResolvedValue({
    event: { id: "event-1" },
    created: true,
  } as never)
  mockMarkBusinessEventAppliedInTx.mockResolvedValue({ id: "event-1" } as never)
  mockRecordCloseInvalidation.mockResolvedValue([] as never)
})

describe("customer settlement source command", () => {
  it("commits allocations, per-order ledger credits, strict posting, event, and audit in one serializable transaction", async () => {
    const { tx, client } = buildHarness()

    const result = await collectCustomerSettlementWithControls(
      INPUT,
      CONTROL,
      client as never,
    )

    expect(result).toMatchObject({
      settlementId: "settlement-1",
      allocationIds: ["allocation-1", "allocation-2"],
      customerLedgerEntryIds: ["ledger-1", "ledger-2"],
      postingBatchId: "batch-1",
      journalEntryId: "journal-entry-1",
      sourceLinkId: "source-link-1",
      businessEventId: "event-1",
      replayed: false,
    })
    expect(client.$transaction).toHaveBeenCalledWith(
      expect.any(Function),
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    )
    expect(tx.organization.findFirst).toHaveBeenCalledWith({
      where: { id: "org-1", isActive: true, deletedAt: null },
      select: { id: true, currency: true },
    })
    expect(tx.user.findFirst).toHaveBeenCalledWith({
      where: { id: "actor-1", organizationId: "org-1", isActive: true },
      select: { id: true },
    })
    expect(tx.salesOrder.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org-1",
          customerId: "customer-1",
          deletedAt: null,
        }),
      }),
    )
    expect(mockEnsurePostedReceivable).toHaveBeenNthCalledWith(
      1,
      tx,
      expect.objectContaining({
        organizationId: "org-1",
        customerId: "customer-1",
        salesOrderId: "sale-1",
        actorId: "actor-1",
      }),
    )
    expect(mockEnsurePostedReceivable).toHaveBeenNthCalledWith(
      2,
      tx,
      expect.objectContaining({ salesOrderId: "sale-2" }),
    )
    expect(mockCreateCustomerLedgerEntry).toHaveBeenNthCalledWith(
      1,
      tx,
      expect.objectContaining({
        organizationId: "org-1",
        customerId: "customer-1",
        credit: new Prisma.Decimal("60.00"),
        referenceType: "CUSTOMER_RECEIVABLE_DOCUMENT",
        referenceId: "document-1",
      }),
    )
    expect(mockCreateCustomerLedgerEntry).toHaveBeenNthCalledWith(
      2,
      tx,
      expect.objectContaining({
        credit: new Prisma.Decimal("40.00"),
        referenceType: "CUSTOMER_RECEIVABLE_DOCUMENT",
        referenceId: "document-2",
      }),
    )
    expect(tx.customerSettlementAllocation.create).toHaveBeenNthCalledWith(
      1,
      {
        data: {
          organizationId: "org-1",
          customerSettlementId: "settlement-1",
          salesOrderId: "sale-1",
          customerReceivableDocumentId: "document-1",
          customerLedgerEntryId: "ledger-1",
          amount: new Prisma.Decimal("60.00"),
        },
      },
    )
    expect(tx.customerSettlementAllocation.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: expect.objectContaining({
          salesOrderId: "sale-2",
          customerReceivableDocumentId: "document-2",
          customerLedgerEntryId: "ledger-2",
          amount: new Prisma.Decimal("40.00"),
        }),
      }),
    )
    expect(mockCreateLedgerPostingBatch).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        sourceType: AccountingSourceType.CUSTOMER_SETTLEMENT,
        sourceId: "settlement-1",
        postingPurpose: AccountingPostingPurpose.CUSTOMER_SETTLEMENT,
      }),
      tx,
    )
    expect(tx.journalEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          sourceType: AccountingSourceType.CUSTOMER_SETTLEMENT,
          postingPurpose: AccountingPostingPurpose.CUSTOMER_SETTLEMENT,
          lines: {
            create: [
              expect.objectContaining({
                accountId: "cash-account",
                debit: new Prisma.Decimal("100.00"),
                credit: new Prisma.Decimal("0.00"),
                customerId: "customer-1",
              }),
              expect.objectContaining({
                accountId: "ar-account",
                debit: new Prisma.Decimal("0.00"),
                credit: new Prisma.Decimal("100.00"),
                customerId: "customer-1",
              }),
            ],
          },
        }),
      }),
    )
    expect(mockCreateAccountingSourceLink).toHaveBeenCalled()
    expect(mockRecordCloseInvalidation).toHaveBeenCalled()
    expect(mockMarkBusinessEventAppliedInTx).toHaveBeenCalledWith(
      tx,
      "org-1",
      "event-1",
    )
    expect(tx.customerSettlement.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "settlement-1" },
        data: expect.objectContaining({
          ledgerPostingBatchId: "batch-1",
          journalEntryId: "journal-entry-1",
          postedBusinessEventId: "event-1",
        }),
      }),
    )

    const eventInput = mockRecordBusinessEventInTx.mock.calls[0][1]
    expect(JSON.stringify(eventInput)).not.toContain(INPUT.externalReference)
    expect(JSON.stringify(eventInput)).not.toContain(INPUT.notes)
    expect(tx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "CUSTOMER_SETTLEMENT_POSTED",
          organizationId: "org-1",
          userId: "actor-1",
        }),
      }),
    )
  })

  it("denies missing collection permission before opening a transaction and persists the denial audit", async () => {
    const { client } = buildHarness()

    await expect(
      collectCustomerSettlementWithControls(
        INPUT,
        { ...CONTROL, actorPermissions: [] },
        client as never,
      ),
    ).rejects.toThrow("not allowed")

    expect(client.$transaction).not.toHaveBeenCalled()
    expect(client.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "CUSTOMER_SETTLEMENT_COLLECT_CONTROL_DENIED",
        }),
      }),
    )
  })

  it("requires fresh authentication before opening a transaction", async () => {
    const { client } = buildHarness()

    await expect(
      collectCustomerSettlementWithControls(
        INPUT,
        {
          ...CONTROL,
          lastAuthAt: new Date("2026-08-08T09:54:59.000Z"),
        },
        client as never,
      ),
    ).rejects.toThrow("Fresh authentication required")

    expect(client.$transaction).not.toHaveBeenCalled()
  })

  it("rejects duplicate allocations before database work", async () => {
    const { client } = buildHarness()

    await expect(
      collectCustomerSettlementWithControls(
        {
          ...INPUT,
          allocations: [
            { salesOrderId: "sale-1", amount: "60.00" },
            { salesOrderId: "sale-1", amount: "40.00" },
          ],
        },
        CONTROL,
        client as never,
      ),
    ).rejects.toThrow("duplicate sales-order allocations")

    expect(client.$transaction).not.toHaveBeenCalled()
  })

  it("rejects allocation totals that do not equal the settlement amount", async () => {
    const { client } = buildHarness()

    await expect(
      collectCustomerSettlementWithControls(
        {
          ...INPUT,
          allocations: [
            { salesOrderId: "sale-1", amount: "59.99" },
            { salesOrderId: "sale-2", amount: "40.00" },
          ],
        },
        CONTROL,
        client as never,
      ),
    ).rejects.toThrow("exactly equal")
  })

  it("rejects cross-customer or cross-tenant sales-order allocations", async () => {
    const { tx, client } = buildHarness()
    tx.salesOrder.findMany.mockResolvedValue([
      { id: "sale-1", orderNumber: "SO-1" },
    ])

    await expect(
      collectCustomerSettlementWithControls(INPUT, CONTROL, client as never),
    ).rejects.toThrow("this customer's sales orders")

    expect(tx.customerSettlement.create).not.toHaveBeenCalled()
  })

  it("rejects allocations above the posted receivable lifecycle open balance", async () => {
    const { tx, client } = buildHarness()
    mockEnsurePostedReceivable.mockResolvedValueOnce({
      document: { id: "document-1" },
      state: {
        unpaidAmount: new Prisma.Decimal("59.99"),
      },
      replayed: false,
    } as never)

    await expect(
      collectCustomerSettlementWithControls(INPUT, CONTROL, client as never),
    ).rejects.toThrow("exceeds the receivable document open balance")

    expect(tx.customerSettlement.create).not.toHaveBeenCalled()
  })

  it("returns an exact replay without repeating financial writes", async () => {
    const { tx, client } = buildHarness()
    const existing = settlementRecord({
      ledgerPostingBatchId: "batch-1",
      journalEntryId: "journal-entry-1",
      postedBusinessEventId: "event-1",
    })
    tx.customerSettlement.findFirst.mockResolvedValueOnce(existing)
    tx.customerLedgerEntry.findMany.mockResolvedValue([
      {
        id: "ledger-1",
        referenceType: "CUSTOMER_RECEIVABLE_DOCUMENT",
        referenceId: "document-1",
        debit: new Prisma.Decimal(0),
        credit: new Prisma.Decimal("60.00"),
      },
      {
        id: "ledger-2",
        referenceType: "CUSTOMER_RECEIVABLE_DOCUMENT",
        referenceId: "document-2",
        debit: new Prisma.Decimal(0),
        credit: new Prisma.Decimal("40.00"),
      },
    ])

    const result = await collectCustomerSettlementWithControls(
      INPUT,
      CONTROL,
      client as never,
    )

    expect(result.replayed).toBe(true)
    expect(tx.customerSettlement.create).not.toHaveBeenCalled()
    expect(mockCreateCustomerLedgerEntry).not.toHaveBeenCalled()
    expect(mockCreateLedgerPostingBatch).not.toHaveBeenCalled()
    expect(mockRecordBusinessEventInTx).not.toHaveBeenCalled()
  })

  it("rejects replay when the allocation-to-ledger evidence does not match", async () => {
    const { tx, client } = buildHarness()
    const existing = settlementRecord({
      ledgerPostingBatchId: "batch-1",
      journalEntryId: "journal-entry-1",
      postedBusinessEventId: "event-1",
    })
    tx.customerSettlement.findFirst.mockResolvedValueOnce(existing)
    tx.customerLedgerEntry.findMany.mockResolvedValue([
      {
        id: "ledger-1",
        referenceType: "CUSTOMER_RECEIVABLE_DOCUMENT",
        referenceId: "document-1",
        debit: new Prisma.Decimal(0),
        credit: new Prisma.Decimal("59.99"),
      },
      {
        id: "ledger-2",
        referenceType: "CUSTOMER_RECEIVABLE_DOCUMENT",
        referenceId: "document-2",
        debit: new Prisma.Decimal(0),
        credit: new Prisma.Decimal("40.00"),
      },
    ])

    await expect(
      collectCustomerSettlementWithControls(INPUT, CONTROL, client as never),
    ).rejects.toThrow("allocation ledger evidence does not match")
  })

  it("rejects replay when an allocation has no direct ledger evidence link", async () => {
    const { tx, client } = buildHarness()
    const existing = settlementRecord({
      ledgerPostingBatchId: "batch-1",
      journalEntryId: "journal-entry-1",
      postedBusinessEventId: "event-1",
      allocations: settlementRecord().allocations.map((allocation, index) => ({
        ...allocation,
        customerLedgerEntryId: index === 0 ? null : allocation.customerLedgerEntryId,
      })),
    })
    tx.customerSettlement.findFirst.mockResolvedValueOnce(existing)

    await expect(
      collectCustomerSettlementWithControls(INPUT, CONTROL, client as never),
    ).rejects.toThrow("allocation ledger evidence is incomplete")
  })

  it("rejects idempotency reuse with a different normalized payload", async () => {
    const { tx, client } = buildHarness()
    tx.customerSettlement.findFirst.mockResolvedValueOnce(
      settlementRecord({ idempotencyPayloadHash: "0".repeat(64) }),
    )

    await expect(
      collectCustomerSettlementWithControls(INPUT, CONTROL, client as never),
    ).rejects.toThrow("different payload")
  })

  it("fails closed when the configured settlement posting rule is missing", async () => {
    const { tx, client } = buildHarness()
    mockRequireActivePostingRule.mockRejectedValueOnce(
      new NotFoundError("No active posting rule"),
    )

    await expect(
      collectCustomerSettlementWithControls(INPUT, CONTROL, client as never),
    ).rejects.toThrow("No active posting rule")

    expect(tx.customerSettlement.update).not.toHaveBeenCalled()
    expect(mockRecordBusinessEventInTx).not.toHaveBeenCalled()
  })

  it.each([{ code: "P2034" }, { code: "P2010", meta: { code: "40001" } }, { code: "P2010", meta: { code: "40P01" } }])("retries bounded serialization and native-lock conflicts %#", async conflict => {
    const { tx, client } = buildHarness()
    client.$transaction
      .mockRejectedValueOnce(conflict)
      .mockImplementationOnce(async (work: (transaction: typeof tx) => unknown) =>
        work(tx),
      )

    const result = await collectCustomerSettlementWithControls(
      INPUT,
      CONTROL,
      client as never,
    )

    expect(result.replayed).toBe(false)
    expect(client.$transaction).toHaveBeenCalledTimes(2)
    expect(CUSTOMER_SETTLEMENT_MAX_SERIALIZABLE_ATTEMPTS).toBe(3)
  })

  it.each([{ code: "P2034" }, { code: "P2010", meta: { code: "40001" } }, { code: "P2010", meta: { code: "40P01" } }])("returns a conflict when the complete transaction exhausts its retries %#", async conflict => {
    const { tx, client } = buildHarness()
    client.$transaction.mockRejectedValue(conflict)
    await expect(collectCustomerSettlementWithControls(INPUT, CONTROL, client as never))
      .rejects.toMatchObject({ code: "CONFLICT", status: 409 })
    expect(client.$transaction).toHaveBeenCalledTimes(CUSTOMER_SETTLEMENT_MAX_SERIALIZABLE_ATTEMPTS)
    expect(tx.customerSettlement.create).not.toHaveBeenCalled()
    expect(mockCreateLedgerPostingBatch).not.toHaveBeenCalled()
  })

  it.each([{ code: "P2010", meta: { code: "23505" } }, { code: "P2010" }])("does not retry an unrelated raw-query error %#", async failure => {
    const { tx, client } = buildHarness()
    client.$transaction.mockRejectedValue(failure)
    await expect(collectCustomerSettlementWithControls(INPUT, CONTROL, client as never))
      .rejects.toMatchObject({ code: "INTERNAL_ERROR", status: 500 })
    expect(client.$transaction).toHaveBeenCalledTimes(1)
    expect(tx.customerSettlement.create).not.toHaveBeenCalled()
  })

  it("returns a complete exact replay after an idempotency unique race", async () => {
    const { client } = buildHarness()
    const existing = settlementRecord({
      ledgerPostingBatchId: "batch-1",
      journalEntryId: "journal-entry-1",
      postedBusinessEventId: "event-1",
    })
    client.$transaction.mockRejectedValueOnce({ code: "P2002" })
    client.customerSettlement.findFirst.mockResolvedValue(existing)

    const result = await collectCustomerSettlementWithControls(
      INPUT,
      CONTROL,
      client as never,
    )

    expect(result.replayed).toBe(true)
    expect(result.customerLedgerEntryIds).toEqual(["ledger-1", "ledger-2"])
  })

  it.each(["CREDIT", "STORE_CREDIT", "MIXED"])(
    "rejects unsupported settlement method %s",
    async (method) => {
      const { client } = buildHarness()
      await expect(
        collectCustomerSettlementWithControls(
          { ...INPUT, method: method as never },
          CONTROL,
          client as never,
        ),
      ).rejects.toThrow()
      expect(client.$transaction).not.toHaveBeenCalled()
    },
  )

  it("rejects a settlement date beyond the service control clock", async () => {
    const { client } = buildHarness()

    await expect(
      collectCustomerSettlementWithControls(
        { ...INPUT, settlementDate: "2026-08-08T10:05:01.000Z" },
        CONTROL,
        client as never,
      ),
    ).rejects.toThrow("cannot be in the future")
  })

  it("rejects inactive or cross-tenant actors before source mutation", async () => {
    const { tx, client } = buildHarness()
    tx.user.findFirst.mockResolvedValue(null)

    await expect(
      collectCustomerSettlementWithControls(INPUT, CONTROL, client as never),
    ).rejects.toThrow("Active settlement actor not found")

    expect(tx.customerSettlement.findFirst).not.toHaveBeenCalled()
    expect(tx.customerSettlement.create).not.toHaveBeenCalled()
  })

  it("requires strong payment evidence hashes", async () => {
    const { client } = buildHarness()

    await expect(
      collectCustomerSettlementWithControls(
        { ...INPUT, evidenceHash: "weak" },
        CONTROL,
        client as never,
      ),
    ).rejects.toThrow()

    expect(client.$transaction).not.toHaveBeenCalled()
  })

  it("retains the legacy manual hash shape when no provider receipt is selected", async () => {
    const { tx, client } = buildHarness()
    await collectCustomerSettlementWithControls(INPUT, CONTROL, client as never)
    expect(mockHashBusinessPayload.mock.calls[0][0]).not.toHaveProperty("paymentTransactionId")
    expect(tx.paymentTransaction.findFirst).not.toHaveBeenCalled()
    expect(tx.paymentTransaction.updateMany).not.toHaveBeenCalled()
  })

  it.each(["CASH", "CHEQUE"] as const)("rejects a provider receipt for %s before database work", async method => {
    const { client } = buildHarness()
    await expect(collectCustomerSettlementWithControls({ ...INPUT, method, paymentTransactionId: "provider-payment-1" }, CONTROL, client as never)).rejects.toThrow("only for electronic collections")
    expect(client.$transaction).not.toHaveBeenCalled()
  })
})

function linkedProviderFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: "provider-payment-1", organizationId: "org-1", legacyPaymentId: null, ledgerPostingBatchId: null, sourceType: null,
    providerAccountId: "provider-account-1", providerAuthorityEventId: "provider-event-1", direction: PaymentDirection.INBOUND,
    state: PaymentTransactionState.CONFIRMED, amount: new Prisma.Decimal(100), currencyCode: "XAF",
    providerTransactionId: "provider-tx-1", providerReference: "provider-ref-1", confirmedAt: NOW,
    providerAccount: { id: "provider-account-1", organizationId: "org-1", providerCode: "BANK", displayName: "Approved bank", status: ProviderAccountStatus.ACTIVE, currencyCode: "XAF",
      paymentRail: { organizationId: "org-1", type: PaymentRailType.BANK_TRANSFER, isActive: true, currencyCode: "XAF" } },
    providerAuthorityEvent: { id: "provider-event-1", organizationId: "org-1", providerAccountId: "provider-account-1", providerTransactionId: "provider-tx-1", providerReference: "provider-ref-1",
      status: ProviderEventStatus.PROCESSED, signatureValid: true, occurredAt: NOW, direction: PaymentDirection.INBOUND, amount: new Prisma.Decimal(100), currencyCode: "XAF" },
    ...overrides,
  }
}

const LINKED_INPUT = { ...INPUT, method: "BANK_TRANSFER" as const, paymentTransactionId: "provider-payment-1" }
const AUTHORITY = { version: 1, paymentMethod: "BANK_TRANSFER", paymentTransactionId: "provider-payment-1", providerEventId: "provider-event-1", providerAccountId: "provider-account-1",
  providerTransactionId: "provider-tx-1", providerReference: "provider-ref-1", providerName: "Approved bank", mobileMoneyProvider: null, state: "CONFIRMED", ledgerAccountId: "bank-account", amount: "100.00", currencyCode: "XAF" }

function linkedHarness() {
  const harness = buildHarness()
  harness.tx.paymentTransaction.findFirst.mockResolvedValue(linkedProviderFixture())
  const rule = postingRule()
  rule.lines[0] = { ...rule.lines[0], mappingKey: "BANK", condition: { paymentMethod: "BANK_TRANSFER" } }
  mockRequireActivePostingRule.mockResolvedValue(rule as never)
  harness.tx.chartOfAccount.findMany.mockResolvedValue([
    { id: "bank-account", code: "521", mappingKey: "BANK", isActive: true, deletedAt: null, _count: { children: 0 } },
    { id: "ar-account", code: "411", mappingKey: "ACCOUNTS_RECEIVABLE", isActive: true, deletedAt: null, _count: { children: 0 } },
  ])
  return harness
}

describe("customer collection provider receipt linkage", () => {
  it("claims the native receipt for the existing single posting and retains canonical authority in source evidence", async () => {
    const { tx, client } = linkedHarness()
    await collectCustomerSettlementWithControls(LINKED_INPUT, CONTROL, client as never)
    expect(mockHashBusinessPayload.mock.calls[0][0]).toHaveProperty("paymentTransactionId", "provider-payment-1")
    expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(tx.customerSettlement.create.mock.invocationCallOrder[0])
    expect(mockCreateLedgerPostingBatch).toHaveBeenCalledTimes(1)
    expect(tx.journalEntry.create).toHaveBeenCalledTimes(1)
    expect(tx.paymentTransaction.updateMany).toHaveBeenCalledWith({
      where: expect.objectContaining({ id: "provider-payment-1", organizationId: "org-1", providerAuthorityEventId: "provider-event-1", legacyPaymentId: null, ledgerPostingBatchId: null }),
      data: { sourceType: "CUSTOMER_SETTLEMENT", sourceId: "settlement-1", ledgerPostingBatchId: "batch-1" },
    })
    expect(tx.customerSettlement.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ metadata: expect.objectContaining({ providerAuthority: AUTHORITY }) }) }))
    expect(mockRecordBusinessEventInTx).toHaveBeenCalledWith(tx, expect.objectContaining({ payload: expect.objectContaining({ providerAuthority: AUTHORITY }) }))
    expect(mockCreateAccountingSourceLink).toHaveBeenCalledWith(expect.objectContaining({ metadata: expect.objectContaining({ providerAuthority: AUTHORITY }) }), tx, expect.any(Object))
  })

  it.each([
    { organizationId: "foreign-org" },
    { amount: new Prisma.Decimal("99.00") },
    { currencyCode: "EUR" },
    { legacyPaymentId: "pos-payment" },
    { ledgerPostingBatchId: "already-posted-batch" },
    { sourceType: "CUSTOMER_SETTLEMENT" },
  ])("rejects unavailable or incompatible native authority before source mutation: %j", async override => {
    const { tx, client } = linkedHarness()
    tx.paymentTransaction.findFirst.mockResolvedValue(linkedProviderFixture(override))
    await expect(collectCustomerSettlementWithControls(LINKED_INPUT, CONTROL, client as never)).rejects.toThrow()
    expect(tx.customerSettlement.create).not.toHaveBeenCalled()
    expect(mockCreateLedgerPostingBatch).not.toHaveBeenCalled()
    expect(tx.paymentTransaction.updateMany).not.toHaveBeenCalled()
  })

  it("rejects a wrong provider rail before source mutation", async () => {
    const { tx, client } = linkedHarness(), native = linkedProviderFixture()
    native.providerAccount.paymentRail.type = PaymentRailType.CARD
    tx.paymentTransaction.findFirst.mockResolvedValue(native)
    await expect(collectCustomerSettlementWithControls(LINKED_INPUT, CONTROL, client as never)).rejects.toThrow("rail is not authorized")
    expect(tx.customerSettlement.create).not.toHaveBeenCalled()
  })

  it("rejects a different provider ledger mapping before posting or claiming", async () => {
    const { tx, client } = linkedHarness()
    tx.providerAccount.findFirst.mockResolvedValue({ settlementLedgerAccount: { id: "different-bank", organizationId: "org-1", isActive: true, deletedAt: null, type: "ASSET", normalBalance: "DEBIT", currency: "XAF" } })
    await expect(collectCustomerSettlementWithControls(LINKED_INPUT, CONTROL, client as never)).rejects.toThrow("confirmed provider's ledger account")
    expect(mockCreateLedgerPostingBatch).not.toHaveBeenCalled()
    expect(tx.paymentTransaction.updateMany).not.toHaveBeenCalled()
  })

  it("propagates a lost provider claim so the owning transaction cannot acknowledge the financial write", async () => {
    const { tx, client } = linkedHarness()
    tx.paymentTransaction.updateMany.mockResolvedValue({ count: 0 })
    await expect(collectCustomerSettlementWithControls(LINKED_INPUT, CONTROL, client as never)).rejects.toThrow("changed or was already used")
    expect(tx.customerSettlement.update).not.toHaveBeenCalled()
    expect(mockRecordBusinessEventInTx).not.toHaveBeenCalled()
    expect(client.$transaction).toHaveBeenCalledTimes(1)
  })

  it("returns an exact linked replay without resolving or claiming the provider again", async () => {
    const { tx, client } = linkedHarness()
    tx.customerSettlement.findFirst.mockResolvedValueOnce(settlementRecord({ method: PaymentMethod.BANK_TRANSFER, ledgerPostingBatchId: "batch-1", journalEntryId: "journal-entry-1", postedBusinessEventId: "event-1", metadata: { providerAuthority: AUTHORITY } }))
    tx.paymentTransaction.findFirst.mockResolvedValue({ providerAuthorityEventId: "provider-event-1", providerAccountId: "provider-account-1", providerTransactionId: "provider-tx-1", amount: new Prisma.Decimal(100), currencyCode: "XAF" })
    tx.customerLedgerEntry.findMany.mockResolvedValue(await client.customerLedgerEntry.findMany())
    const result = await collectCustomerSettlementWithControls(LINKED_INPUT, CONTROL, client as never)
    expect(result.replayed).toBe(true)
    expect(tx.providerAccount.findFirst).not.toHaveBeenCalled()
    expect(tx.paymentTransaction.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ sourceType: "CUSTOMER_SETTLEMENT", sourceId: "settlement-1", ledgerPostingBatchId: "batch-1" }) }))
    expect(tx.paymentTransaction.updateMany).not.toHaveBeenCalled()
    expect(mockCreateLedgerPostingBatch).not.toHaveBeenCalled()
    expect(tx.customerSettlement.create).not.toHaveBeenCalled()
  })

  it("rejects reuse with a changed provider receipt before native reads or financial writes", async () => {
    const { tx, client } = linkedHarness()
    tx.customerSettlement.findFirst.mockResolvedValueOnce(settlementRecord({ idempotencyPayloadHash: "0".repeat(64) }))
    await expect(collectCustomerSettlementWithControls({ ...LINKED_INPUT, paymentTransactionId: "provider-payment-2" }, CONTROL, client as never)).rejects.toThrow("different payload")
    expect(tx.paymentTransaction.findFirst).not.toHaveBeenCalled()
    expect(tx.customerSettlement.create).not.toHaveBeenCalled()
  })

  it("rejects a linked replay whose native claim is no longer available", async () => {
    const { tx, client } = linkedHarness()
    tx.customerSettlement.findFirst.mockResolvedValueOnce(settlementRecord({ method: PaymentMethod.BANK_TRANSFER, ledgerPostingBatchId: "batch-1", journalEntryId: "journal-entry-1", postedBusinessEventId: "event-1", metadata: { providerAuthority: AUTHORITY } }))
    tx.paymentTransaction.findFirst.mockResolvedValue(null)
    await expect(collectCustomerSettlementWithControls(LINKED_INPUT, CONTROL, client as never)).rejects.toThrow("changed or is unavailable")
    expect(tx.paymentTransaction.updateMany).not.toHaveBeenCalled()
  })

  it("checks native lineage during a linked uniqueness-race replay without issuing another claim", async () => {
    const { tx, client } = linkedHarness()
    client.$transaction.mockRejectedValueOnce({ code: "P2002" })
    client.customerSettlement.findFirst.mockResolvedValue(settlementRecord({ method: PaymentMethod.BANK_TRANSFER, ledgerPostingBatchId: "batch-1", journalEntryId: "journal-entry-1", postedBusinessEventId: "event-1", metadata: { providerAuthority: AUTHORITY } }))
    tx.paymentTransaction.findFirst.mockResolvedValue({ providerAuthorityEventId: "provider-event-1", providerAccountId: "provider-account-1", providerTransactionId: "provider-tx-1", amount: new Prisma.Decimal(100), currencyCode: "XAF" })
    const result = await collectCustomerSettlementWithControls(LINKED_INPUT, CONTROL, client as never)
    expect(result.replayed).toBe(true)
    expect(tx.paymentTransaction.updateMany).not.toHaveBeenCalled()
    expect(tx.paymentTransaction.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ sourceType: "CUSTOMER_SETTLEMENT", sourceId: "settlement-1", ledgerPostingBatchId: "batch-1" }) }))
  })
})
