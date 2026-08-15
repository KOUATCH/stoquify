import {
  AccountingPostingPurpose,
  AccountingSourceType,
  CustomerSettlementStatus,
  JournalEntryStatus,
  LedgerEntryType,
  LedgerPostingBatchStatus,
  PaymentMethod,
  Prisma,
} from "@prisma/client";

import {
  CUSTOMER_SETTLEMENT_REVERSAL_SOURCE_VERSION,
  reverseCustomerSettlementWithControls,
  type CustomerSettlementReversalControlContext,
} from "../customer-settlement-reversal.service";
import { CUSTOMER_SETTLEMENT_MAX_SERIALIZABLE_ATTEMPTS } from "../customer-settlement.service";
import { createCustomerLedgerEntry } from "../customer-ledger.service";
import {
  recordCustomerReceivableSettlementReversedInTx,
} from "../customer-receivable-lifecycle.service";
import { recordReversedJournalCloseInvalidationsInTx } from "../journal-close-invalidation.service";
import { getOpenPeriodForDate } from "../periods.service";
import { createLedgerPostingBatch } from "../posting.service";
import { createAccountingSourceLink } from "../source-link.service";
import {
  hashBusinessPayload,
  markBusinessEventAppliedInTx,
  recordBusinessEventInTx,
} from "@/services/events/business-event.service";

jest.mock("@/lib/security/auth-session", () => ({
  SESSION_ASSURANCE_LEVEL: { NONE: 0, PASSWORD: 1 },
}));

jest.mock("../customer-ledger.service", () => ({
  createCustomerLedgerEntry: jest.fn(),
}));
jest.mock("../customer-receivable-lifecycle.service", () => ({
  recordCustomerReceivableSettlementReversedInTx: jest.fn(),
}));
jest.mock("../journal-close-invalidation.service", () => ({
  recordReversedJournalCloseInvalidationsInTx: jest.fn(),
}));
jest.mock("../periods.service", () => ({
  getOpenPeriodForDate: jest.fn(),
}));
jest.mock("../posting.service", () => ({
  createLedgerPostingBatch: jest.fn(),
}));
jest.mock("../source-link.service", () => ({
  createAccountingSourceLink: jest.fn(),
}));
jest.mock("@/services/events/business-event.service", () => ({
  hashBusinessPayload: jest.fn(() => "f".repeat(64)),
  recordBusinessEventInTx: jest.fn(),
  markBusinessEventAppliedInTx: jest.fn(),
}));

const mockCreateCustomerLedgerEntry = jest.mocked(createCustomerLedgerEntry);
const mockRecordReceivableSettlementReversed = jest.mocked(
  recordCustomerReceivableSettlementReversedInTx,
);
const mockRecordCloseInvalidations = jest.mocked(
  recordReversedJournalCloseInvalidationsInTx,
);
const mockGetOpenPeriodForDate = jest.mocked(getOpenPeriodForDate);
const mockCreateLedgerPostingBatch = jest.mocked(createLedgerPostingBatch);
const mockCreateAccountingSourceLink = jest.mocked(createAccountingSourceLink);
const mockHashBusinessPayload = jest.mocked(hashBusinessPayload);
const mockRecordBusinessEventInTx = jest.mocked(recordBusinessEventInTx);
const mockMarkBusinessEventAppliedInTx = jest.mocked(
  markBusinessEventAppliedInTx,
);

const NOW = new Date("2026-08-08T10:00:00.000Z");
const REVERSAL_DATE = new Date("2026-08-08T09:45:00.000Z");
const DOCUMENT_HASH = "a".repeat(64);
const EVIDENCE_HASH = "b".repeat(64);

const INPUT = {
  customerSettlementId: "settlement-1",
  reversalDate: REVERSAL_DATE.toISOString(),
  reason: "Duplicate customer receipt",
  idempotencyKey: "reversal-key-1",
  correlationId: "reversal-correlation-1",
  documentHash: DOCUMENT_HASH,
  evidenceHash: EVIDENCE_HASH,
};

function control(
  overrides: Partial<CustomerSettlementReversalControlContext> = {},
): CustomerSettlementReversalControlContext {
  const actorId = overrides.actorId ?? "actor-2";
  const organizationId = overrides.organizationId ?? "org-1";
  const lastAuthAt = NOW;

  return {
    organizationId,
    actorId,
    actorPermissions: ["finance.receivables.reverse"],
    freshAuth: {
      lastAuthAt,
      claims: {
        userId: actorId,
        tenantId: organizationId,
        assuranceOrganizationId: organizationId,
        assuranceLevel: 1,
        lastAuthAt: lastAuthAt.getTime(),
      },
    },
    ...overrides,
  };
}

function allocation(
  id: string,
  salesOrderId: string,
  ledgerEntryId: string,
  amount: string,
  reversalLedgerEntryId: string | null = null,
) {
  return {
    id,
    organizationId: "org-1",
    customerSettlementId: "settlement-1",
    salesOrderId,
    customerReceivableDocumentId:
      salesOrderId === "sale-1" ? "document-1" : "document-2",
    customerLedgerEntryId: ledgerEntryId,
    reversalCustomerLedgerEntryId: reversalLedgerEntryId,
    amount: new Prisma.Decimal(amount),
    createdAt: NOW,
  };
}

function settlementRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: "settlement-1",
    organizationId: "org-1",
    customerId: "customer-1",
    settlementNumber: "CSET-20260808-0001",
    status: CustomerSettlementStatus.POSTED,
    method: PaymentMethod.CASH,
    amount: new Prisma.Decimal("100.00"),
    currency: "XAF",
    settlementDate: new Date("2026-08-08T09:30:00.000Z"),
    idempotencyKey: "collection-key-1",
    idempotencyPayloadHash: "c".repeat(64),
    correlationId: "collection-correlation-1",
    externalReference: "private-reference",
    documentHash: "d".repeat(64),
    evidenceHash: "e".repeat(64),
    receivedById: "actor-1",
    ledgerPostingBatchId: "batch-original",
    journalEntryId: "journal-original",
    postedBusinessEventId: "event-original",
    reversedAt: null,
    reversalDate: null,
    reversedById: null,
    reversalReason: null,
    reversalIdempotencyKey: null,
    reversalIdempotencyPayloadHash: null,
    reversalCorrelationId: null,
    reversalDocumentHash: null,
    reversalEvidenceHash: null,
    reversalLedgerPostingBatchId: null,
    reversalJournalEntryId: null,
    reversalAccountingSourceLinkId: null,
    reversalBusinessEventId: null,
    notes: "private note",
    metadata: null,
    createdAt: NOW,
    updatedAt: NOW,
    allocations: [
      allocation("allocation-1", "sale-1", "ledger-original-1", "60.00"),
      allocation("allocation-2", "sale-2", "ledger-original-2", "40.00"),
    ],
    ...overrides,
  };
}

function completedSettlement(overrides: Record<string, unknown> = {}) {
  return settlementRecord({
    status: CustomerSettlementStatus.REVERSED,
    reversedAt: NOW,
    reversalDate: REVERSAL_DATE,
    reversedById: "actor-2",
    reversalReason: INPUT.reason,
    reversalIdempotencyKey: INPUT.idempotencyKey,
    reversalIdempotencyPayloadHash: "f".repeat(64),
    reversalCorrelationId: INPUT.correlationId,
    reversalDocumentHash: DOCUMENT_HASH,
    reversalEvidenceHash: EVIDENCE_HASH,
    reversalLedgerPostingBatchId: "batch-reversal",
    reversalJournalEntryId: "journal-reversal",
    reversalAccountingSourceLinkId: "source-link-reversal",
    reversalBusinessEventId: "event-reversal",
    allocations: [
      allocation(
        "allocation-1",
        "sale-1",
        "ledger-original-1",
        "60.00",
        "ledger-reversal-1",
      ),
      allocation(
        "allocation-2",
        "sale-2",
        "ledger-original-2",
        "40.00",
        "ledger-reversal-2",
      ),
    ],
    ...overrides,
  });
}

function originalLedgerEntries() {
  return [
    {
      id: "ledger-original-1",
      type: LedgerEntryType.PAYMENT,
      referenceType: "CUSTOMER_RECEIVABLE_DOCUMENT",
      referenceId: "document-1",
      debit: new Prisma.Decimal(0),
      credit: new Prisma.Decimal("60.00"),
    },
    {
      id: "ledger-original-2",
      type: LedgerEntryType.PAYMENT,
      referenceType: "CUSTOMER_RECEIVABLE_DOCUMENT",
      referenceId: "document-2",
      debit: new Prisma.Decimal(0),
      credit: new Prisma.Decimal("40.00"),
    },
  ];
}

function reversalLedgerEntries() {
  return [
    {
      id: "ledger-reversal-1",
      type: LedgerEntryType.PAYMENT_REVERSAL,
      referenceType: "CUSTOMER_RECEIVABLE_DOCUMENT",
      referenceId: "document-1",
      debit: new Prisma.Decimal("60.00"),
      credit: new Prisma.Decimal(0),
    },
    {
      id: "ledger-reversal-2",
      type: LedgerEntryType.PAYMENT_REVERSAL,
      referenceType: "CUSTOMER_RECEIVABLE_DOCUMENT",
      referenceId: "document-2",
      debit: new Prisma.Decimal("40.00"),
      credit: new Prisma.Decimal(0),
    },
  ];
}

function originalJournal(status = JournalEntryStatus.POSTED) {
  return {
    id: "journal-original",
    organizationId: "org-1",
    journalId: "journal-1",
    periodId: "period-original",
    postingBatchId: "batch-original",
    entryNumber: "JE-ORIGINAL",
    entryDate: new Date("2026-08-08T09:30:00.000Z"),
    status,
    currency: "XAF",
    sourceType: AccountingSourceType.CUSTOMER_SETTLEMENT,
    sourceId: "settlement-1",
    postingPurpose: AccountingPostingPurpose.CUSTOMER_SETTLEMENT,
    reversalOfEntryId: null,
    reversedByEntries: [],
    lines: [
      {
        lineNumber: 1,
        accountId: "cash-account",
        debit: new Prisma.Decimal("100.00"),
        credit: new Prisma.Decimal(0),
        baseDebit: new Prisma.Decimal("100.00"),
        baseCredit: new Prisma.Decimal(0),
        currency: "XAF",
        exchangeRate: new Prisma.Decimal(1),
        locationId: null,
        customerId: null,
        supplierId: null,
        itemId: null,
        description: "Customer settlement",
        dimensions: null,
        metadata: null,
      },
      {
        lineNumber: 2,
        accountId: "ar-account",
        debit: new Prisma.Decimal(0),
        credit: new Prisma.Decimal("100.00"),
        baseDebit: new Prisma.Decimal(0),
        baseCredit: new Prisma.Decimal("100.00"),
        currency: "XAF",
        exchangeRate: new Prisma.Decimal(1),
        locationId: null,
        customerId: "customer-1",
        supplierId: null,
        itemId: null,
        description: "Clear receivable",
        dimensions: null,
        metadata: null,
      },
    ],
  };
}

function reversalJournal() {
  const original = originalJournal(JournalEntryStatus.REVERSED);
  return {
    ...original,
    id: "journal-reversal",
    postingBatchId: "batch-reversal",
    entryNumber: "ARREV-CSET-20260808-0001",
    entryDate: REVERSAL_DATE,
    status: JournalEntryStatus.POSTED,
    postingPurpose: AccountingPostingPurpose.REVERSAL,
    reversalOfEntryId: "journal-original",
    lines: original.lines.map((line) => ({
      ...line,
      debit: line.credit,
      credit: line.debit,
      baseDebit: line.baseCredit,
      baseCredit: line.baseDebit,
    })),
  };
}

function buildHarness(initialSettlement = settlementRecord()) {
  const completed = completedSettlement();
  const tx = {
    organization: {
      findFirst: jest.fn().mockResolvedValue({ id: "org-1" }),
    },
    user: {
      findFirst: jest.fn().mockResolvedValue({ id: "actor-2" }),
    },
    customerSettlement: {
      findFirst: jest
        .fn()
        .mockResolvedValueOnce(initialSettlement)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(completed),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    customerSettlementAllocation: {
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    customerLedgerEntry: {
      findMany: jest.fn().mockResolvedValue(originalLedgerEntries()),
    },
    ledgerPostingBatch: {
      findFirst: jest.fn().mockResolvedValue({ id: "batch-original" }),
      update: jest.fn().mockResolvedValue({
        id: "batch-reversal",
        status: LedgerPostingBatchStatus.POSTED,
      }),
    },
    journalEntry: {
      findFirst: jest
        .fn()
        .mockResolvedValueOnce(originalJournal())
        .mockResolvedValueOnce(null),
      create: jest.fn().mockImplementation(async ({ data }) => ({
        id: "journal-reversal",
        ...data,
        lines: data.lines.create,
      })),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    accountingSourceLink: {
      findMany: jest.fn().mockResolvedValue([{ id: "source-link-original" }]),
      findFirst: jest.fn().mockResolvedValue({ id: "source-link-reversal" }),
    },
    businessEvent: {
      findFirst: jest.fn().mockResolvedValue({
        id: "event-reversal",
        payloadHash: "f".repeat(64),
        outboxMessages: [{ payloadHash: "f".repeat(64) }],
      }),
    },
    ledgerAuditEvent: {
      create: jest.fn().mockResolvedValue({ id: "ledger-audit-1" }),
    },
    auditLog: {
      create: jest.fn().mockResolvedValue({ id: "audit-1" }),
    },
  };
  const client = {
    $transaction: jest.fn(async (work: (transaction: typeof tx) => unknown) =>
      work(tx),
    ),
    auditLog: {
      create: jest.fn().mockResolvedValue({ id: "preflight-audit-1" }),
    },
  };

  return { tx, client, completed };
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  jest.setSystemTime(NOW);
  mockHashBusinessPayload.mockReturnValue("f".repeat(64));
  mockRecordReceivableSettlementReversed.mockResolvedValue({
    state: { id: "receivable-state" },
    replayed: false,
  } as never);
  mockGetOpenPeriodForDate.mockResolvedValue({
    id: "period-reversal",
  } as never);
  mockCreateLedgerPostingBatch.mockResolvedValue({
    id: "batch-reversal",
    status: LedgerPostingBatchStatus.PENDING,
  } as never);
  mockCreateAccountingSourceLink.mockResolvedValue({
    id: "source-link-reversal",
  } as never);
  mockCreateCustomerLedgerEntry
    .mockResolvedValueOnce({ id: "ledger-reversal-1" } as never)
    .mockResolvedValueOnce({ id: "ledger-reversal-2" } as never);
  mockRecordBusinessEventInTx.mockResolvedValue({
    event: { id: "event-reversal" },
    created: true,
  } as never);
  mockMarkBusinessEventAppliedInTx.mockResolvedValue({
    id: "event-reversal",
  } as never);
  mockRecordCloseInvalidations.mockResolvedValue([] as never);
});

afterAll(() => {
  jest.useRealTimers();
});

describe("customer settlement compensating reversal", () => {
  it("commits exact compensation and complete reversal evidence through one final serializable CAS", async () => {
    const { tx, client } = buildHarness();

    const result = await reverseCustomerSettlementWithControls(
      INPUT,
      control(),
      client as never,
    );

    expect(result).toMatchObject({
      settlementId: "settlement-1",
      status: CustomerSettlementStatus.REVERSED,
      originalCustomerLedgerEntryIds: [
        "ledger-original-1",
        "ledger-original-2",
      ],
      reversalCustomerLedgerEntryIds: [
        "ledger-reversal-1",
        "ledger-reversal-2",
      ],
      reversalPostingBatchId: "batch-reversal",
      reversalJournalEntryId: "journal-reversal",
      reversalSourceLinkId: "source-link-reversal",
      reversalBusinessEventId: "event-reversal",
      replayed: false,
    });
    expect(client.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
    expect(mockHashBusinessPayload).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        actorId: "actor-2",
        customerSettlementId: "settlement-1",
      }),
    );
    expect(mockCreateCustomerLedgerEntry).toHaveBeenNthCalledWith(
      1,
      tx,
      expect.objectContaining({
        type: LedgerEntryType.PAYMENT_REVERSAL,
        debit: new Prisma.Decimal("60.00"),
        referenceType: "CUSTOMER_RECEIVABLE_DOCUMENT",
        referenceId: "document-1",
      }),
    );
    expect(tx.customerSettlementAllocation.updateMany).toHaveBeenCalledTimes(2);
    expect(mockRecordReceivableSettlementReversed).toHaveBeenNthCalledWith(
      1,
      tx,
      expect.objectContaining({
        organizationId: "org-1",
        documentId: "document-1",
        settlementAllocationId: "allocation-1",
        amount: new Prisma.Decimal("60.00"),
      }),
    );
    expect(tx.customerSettlement.updateMany).toHaveBeenCalledTimes(1);
    expect(tx.customerSettlement.updateMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        id: "settlement-1",
        organizationId: "org-1",
        status: CustomerSettlementStatus.POSTED,
        reversalIdempotencyKey: null,
        reversalJournalEntryId: null,
        reversalBusinessEventId: null,
      }),
      data: expect.objectContaining({
        status: CustomerSettlementStatus.REVERSED,
        reversedById: "actor-2",
        reversalIdempotencyKey: INPUT.idempotencyKey,
        reversalIdempotencyPayloadHash: "f".repeat(64),
        reversalLedgerPostingBatchId: "batch-reversal",
        reversalAccountingSourceLinkId: "source-link-reversal",
      }),
    });
    expect(tx.journalEntry.create.mock.calls[0][0].data.lines.create).toEqual([
      expect.objectContaining({
        lineNumber: 1,
        accountId: "cash-account",
        debit: new Prisma.Decimal(0),
        credit: new Prisma.Decimal("100.00"),
        baseDebit: new Prisma.Decimal(0),
        baseCredit: new Prisma.Decimal("100.00"),
      }),
      expect.objectContaining({
        lineNumber: 2,
        accountId: "ar-account",
        debit: new Prisma.Decimal("100.00"),
        credit: new Prisma.Decimal(0),
        baseDebit: new Prisma.Decimal("100.00"),
        baseCredit: new Prisma.Decimal(0),
      }),
    ]);
    expect(tx.journalEntry.updateMany).toHaveBeenCalledWith({
      where: {
        id: "journal-original",
        organizationId: "org-1",
        status: JournalEntryStatus.POSTED,
      },
      data: {
        status: JournalEntryStatus.REVERSED,
        reversedAt: NOW,
        reversedById: "actor-2",
      },
    });
  });

  it("returns an exact same-actor replay without repeating financial writes", async () => {
    const reversed = completedSettlement();
    const { tx, client } = buildHarness(reversed);
    tx.customerSettlement.findFirst.mockReset().mockResolvedValueOnce(reversed);
    tx.customerLedgerEntry.findMany
      .mockReset()
      .mockResolvedValueOnce(originalLedgerEntries())
      .mockResolvedValueOnce(reversalLedgerEntries());
    tx.ledgerPostingBatch.findFirst
      .mockReset()
      .mockResolvedValueOnce({ id: "batch-original" })
      .mockResolvedValueOnce({ id: "batch-reversal" });
    tx.journalEntry.findFirst
      .mockReset()
      .mockResolvedValueOnce(originalJournal(JournalEntryStatus.REVERSED))
      .mockResolvedValueOnce(reversalJournal());

    const result = await reverseCustomerSettlementWithControls(
      INPUT,
      control(),
      client as never,
    );

    expect(result.replayed).toBe(true);
    expect(mockCreateCustomerLedgerEntry).not.toHaveBeenCalled();
    expect(mockCreateLedgerPostingBatch).not.toHaveBeenCalled();
    expect(tx.customerSettlement.updateMany).not.toHaveBeenCalled();
    expect(mockRecordBusinessEventInTx).not.toHaveBeenCalled();
    expect(tx.businessEvent.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org-1",
          status: "APPLIED",
          sourceId: "settlement-1",
        }),
      }),
    );
  });

  it("rejects replay when applied business-event evidence is unavailable", async () => {
    const reversed = completedSettlement();
    const { tx, client } = buildHarness(reversed);
    tx.customerSettlement.findFirst.mockReset().mockResolvedValueOnce(reversed);
    tx.customerLedgerEntry.findMany
      .mockReset()
      .mockResolvedValueOnce(originalLedgerEntries())
      .mockResolvedValueOnce(reversalLedgerEntries());
    tx.ledgerPostingBatch.findFirst
      .mockReset()
      .mockResolvedValueOnce({ id: "batch-original" })
      .mockResolvedValueOnce({ id: "batch-reversal" });
    tx.journalEntry.findFirst
      .mockReset()
      .mockResolvedValueOnce(originalJournal(JournalEntryStatus.REVERSED))
      .mockResolvedValueOnce(reversalJournal());
    tx.businessEvent.findFirst.mockResolvedValue(null);

    await expect(
      reverseCustomerSettlementWithControls(INPUT, control(), client as never),
    ).rejects.toThrow("business event evidence is incomplete");

    expect(mockCreateCustomerLedgerEntry).not.toHaveBeenCalled();
    expect(tx.customerSettlement.updateMany).not.toHaveBeenCalled();
  });

  it("rejects replay by a different actor even when the idempotency key is unchanged", async () => {
    const reversed = completedSettlement();
    const { client } = buildHarness(reversed);

    await expect(
      reverseCustomerSettlementWithControls(
        INPUT,
        control({
          actorId: "actor-3",
          freshAuth: {
            lastAuthAt: NOW,
            claims: {
              userId: "actor-3",
              tenantId: "org-1",
              assuranceOrganizationId: "org-1",
              assuranceLevel: 1,
              lastAuthAt: NOW.getTime(),
            },
          },
        }),
        client as never,
      ),
    ).rejects.toThrow("reversal evidence does not match");
  });

  it.each([
    ["missing evidence", null],
    [
      "wrong actor evidence",
      {
        lastAuthAt: NOW,
        claims: {
          userId: "actor-other",
          tenantId: "org-1",
          assuranceOrganizationId: "org-1",
          assuranceLevel: 1,
          lastAuthAt: NOW.getTime(),
        },
      },
    ],
    [
      "wrong tenant evidence",
      {
        lastAuthAt: NOW,
        claims: {
          userId: "actor-2",
          tenantId: "org-other",
          assuranceOrganizationId: "org-other",
          assuranceLevel: 1,
          lastAuthAt: NOW.getTime(),
        },
      },
    ],
    [
      "low assurance evidence",
      {
        lastAuthAt: NOW,
        claims: {
          userId: "actor-2",
          tenantId: "org-1",
          assuranceOrganizationId: "org-1",
          assuranceLevel: 0,
          lastAuthAt: NOW.getTime(),
        },
      },
    ],
  ])(
    "fails closed and audits %s before opening a transaction",
    async (_name, freshAuth) => {
      const { client } = buildHarness();

      await expect(
        reverseCustomerSettlementWithControls(
          INPUT,
          control({ freshAuth: freshAuth as never }),
          client as never,
        ),
      ).rejects.toMatchObject({ code: "FRESH_AUTH_REQUIRED" });

      expect(client.$transaction).not.toHaveBeenCalled();
      expect(client.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: "CUSTOMER_SETTLEMENT_REVERSE_CONTROL_DENIED",
          changes: expect.objectContaining({
            reasonCode: "FRESH_AUTH_REQUIRED",
          }),
        }),
      });
    },
  );

  it("commits a maker-checker denial audit before rejecting self reversal", async () => {
    const { tx, client } = buildHarness(
      settlementRecord({ receivedById: "actor-2" }),
    );

    await expect(
      reverseCustomerSettlementWithControls(INPUT, control(), client as never),
    ).rejects.toThrow("independent approval");

    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "CUSTOMER_SETTLEMENT_REVERSE_CONTROL_DENIED",
        changes: expect.objectContaining({
          reasonCode: "SELF_APPROVAL_BLOCKED",
        }),
      }),
    });
    expect(mockCreateCustomerLedgerEntry).not.toHaveBeenCalled();
  });

  it("rejects incomplete original accounting evidence before compensation", async () => {
    const { tx, client } = buildHarness();
    tx.accountingSourceLink.findMany.mockResolvedValue([]);

    await expect(
      reverseCustomerSettlementWithControls(INPUT, control(), client as never),
    ).rejects.toThrow("original accounting evidence is incomplete");

    expect(mockCreateCustomerLedgerEntry).not.toHaveBeenCalled();
    expect(tx.customerSettlement.updateMany).not.toHaveBeenCalled();
  });

  it("fails the final aggregate CAS without silently repairing partial evidence", async () => {
    const { tx, client } = buildHarness();
    tx.customerSettlement.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      reverseCustomerSettlementWithControls(INPUT, control(), client as never),
    ).rejects.toThrow("reversal claim was lost");

    expect(mockRecordBusinessEventInTx).toHaveBeenCalled();
    expect(tx.auditLog.create).not.toHaveBeenCalledWith({
      data: expect.objectContaining({ action: "CUSTOMER_SETTLEMENT_REVERSED" }),
    });
  });

  it("retries bounded serialization conflicts", async () => {
    const { tx, client } = buildHarness();
    client.$transaction
      .mockRejectedValueOnce({ code: "P2034" })
      .mockImplementationOnce(
        async (work: (transaction: typeof tx) => unknown) => work(tx),
      );

    const result = await reverseCustomerSettlementWithControls(
      INPUT,
      control(),
      client as never,
    );

    expect(result.replayed).toBe(false);
    expect(client.$transaction).toHaveBeenCalledTimes(2);
  });

  it("stops after the bounded serialization retry budget is exhausted", async () => {
    const { client } = buildHarness();
    client.$transaction.mockRejectedValue({ code: "P2034" });

    await expect(
      reverseCustomerSettlementWithControls(INPUT, control(), client as never),
    ).rejects.toMatchObject({
      code: "CONFLICT",
      message: "Customer settlement reversal transaction could not be serialized",
    });

    expect(client.$transaction).toHaveBeenCalledTimes(
      CUSTOMER_SETTLEMENT_MAX_SERIALIZABLE_ATTEMPTS,
    );
  });

  it("recovers a uniqueness race only through exact same-actor replay evidence", async () => {
    const reversed = completedSettlement();
    const { tx, client } = buildHarness(reversed);
    tx.customerSettlement.findFirst.mockReset().mockResolvedValueOnce(reversed);
    tx.customerLedgerEntry.findMany
      .mockReset()
      .mockResolvedValueOnce(originalLedgerEntries())
      .mockResolvedValueOnce(reversalLedgerEntries());
    tx.ledgerPostingBatch.findFirst
      .mockReset()
      .mockResolvedValueOnce({ id: "batch-original" })
      .mockResolvedValueOnce({ id: "batch-reversal" });
    tx.journalEntry.findFirst
      .mockReset()
      .mockResolvedValueOnce(originalJournal(JournalEntryStatus.REVERSED))
      .mockResolvedValueOnce(reversalJournal());
    client.$transaction
      .mockRejectedValueOnce({ code: "P2002" })
      .mockImplementationOnce(
        async (work: (transaction: typeof tx) => unknown) => work(tx),
      );

    const result = await reverseCustomerSettlementWithControls(
      INPUT,
      control(),
      client as never,
    );

    expect(result.replayed).toBe(true);
    expect(client.$transaction).toHaveBeenCalledTimes(2);
    expect(mockCreateCustomerLedgerEntry).not.toHaveBeenCalled();
    expect(tx.customerSettlement.updateMany).not.toHaveBeenCalled();
  });

  it("keeps reason text out of events, outbox, and audit payloads", async () => {
    const { tx, client } = buildHarness();

    const result = await reverseCustomerSettlementWithControls(
      INPUT,
      control(),
      client as never,
    );
    expect(result).not.toHaveProperty("settlement");

    const serialized = JSON.stringify({
      result,
      event: mockRecordBusinessEventInTx.mock.calls,
      audit: tx.auditLog.create.mock.calls,
      sourceLink: mockCreateAccountingSourceLink.mock.calls,
      closeInvalidation: mockRecordCloseInvalidations.mock.calls,
    });
    expect(serialized).not.toContain(INPUT.reason);
    expect(serialized).not.toContain("private-reference");
    expect(serialized).not.toContain("private note");
    expect(mockRecordBusinessEventInTx).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        schemaVersion: CUSTOMER_SETTLEMENT_REVERSAL_SOURCE_VERSION,
        metadata: expect.objectContaining({ reasonProvided: true }),
      }),
    );
    expect(mockMarkBusinessEventAppliedInTx).toHaveBeenCalledWith(
      tx,
      "org-1",
      "event-reversal",
    );
  });
});
