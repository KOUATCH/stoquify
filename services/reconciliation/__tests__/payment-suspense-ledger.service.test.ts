import {
  AccountingPostingPurpose,
  AccountingSourceType,
  JournalEntryStatus,
  LedgerPostingBatchStatus,
  PaymentDirection,
  PostingRuleAmountSource,
  PostingRuleLineSide,
  Prisma,
  SuspenseStatus,
  SuspenseType,
} from "@prisma/client"

import { createLedgerPostingBatch } from "@/services/accounting/posting.service"
import { requireActivePostingRule } from "@/services/accounting/posting-rules.service"
import { createAccountingSourceLink } from "@/services/accounting/source-link.service"

import {
  assertPaymentSuspenseLedgerTruthInTx,
  postPaymentSuspenseToLedger,
} from "../payment-suspense-ledger.service"

jest.mock("@/services/accounting/posting.service", () => ({
  createLedgerPostingBatch: jest.fn(),
}))

jest.mock("@/services/accounting/posting-rules.service", () => ({
  requireActivePostingRule: jest.fn(),
}))

jest.mock("@/services/accounting/source-link.service", () => ({
  createAccountingSourceLink: jest.fn(),
}))

const mockCreateBatch = createLedgerPostingBatch as jest.Mock
const mockRequireRule = requireActivePostingRule as jest.Mock
const mockCreateSourceLink = createAccountingSourceLink as jest.Mock

function amount(value: string | number) {
  return new Prisma.Decimal(value)
}

function suspense() {
  return {
    id: "suspense-1",
    organizationId: "org-1",
    providerAccountId: "provider-1",
    suspenseLedgerAccountId: "account-47",
    status: SuspenseStatus.RESOLUTION_PROPOSED,
    type: SuspenseType.UNKNOWN_CREDIT,
    direction: PaymentDirection.INBOUND,
    amount: amount(5000),
    currencyCode: "XAF",
    providerAccount: {
      providerCode: "MTN",
      paymentRailId: "rail-1",
      suspenseLedgerAccountId: "account-47",
    },
  }
}

function postingRule() {
  return {
    id: "rule-1",
    organizationId: "org-1",
    code: "PAYMENT_SUSPENSE_INBOUND",
    sourceType: AccountingSourceType.PAYMENT_SUSPENSE,
    postingPurpose: AccountingPostingPurpose.SUSPENSE_RECLASSIFICATION,
    lines: [
      {
        id: "rule-line-1",
        lineNumber: 1,
        accountId: "account-47",
        mappingKey: null,
        side: PostingRuleLineSide.DEBIT,
        amountSource: PostingRuleAmountSource.SOURCE_AMOUNT,
        multiplier: amount(1),
        condition: { direction: "INBOUND" },
        description: "Payment suspense",
        dimensions: null,
      },
      {
        id: "rule-line-2",
        lineNumber: 2,
        accountId: "account-58",
        mappingKey: null,
        side: PostingRuleLineSide.CREDIT,
        amountSource: PostingRuleAmountSource.SOURCE_AMOUNT,
        multiplier: amount(1),
        condition: { direction: "INBOUND" },
        description: "Unidentified payment counterpart",
        dimensions: null,
      },
    ],
  }
}

function sourceLink() {
  return {
    id: "source-link-1",
    organizationId: "org-1",
    postingBatchId: "batch-1",
    journalEntryId: "journal-1",
    sourceType: AccountingSourceType.PAYMENT_SUSPENSE,
    sourceId: "suspense-1",
  }
}

function transaction() {
  const tx = {
    suspenseItem: {
      findFirst: jest.fn().mockResolvedValue(suspense()),
      findMany: jest.fn(),
    },
    chartOfAccount: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: "account-47",
          code: "471",
          mappingKey: "PAYMENT_SUSPENSE",
          currency: "XAF",
          _count: { children: 0 },
        },
        {
          id: "account-58",
          code: "585",
          mappingKey: "UNIDENTIFIED_PAYMENT",
          currency: "XAF",
          _count: { children: 0 },
        },
      ]),
    },
    journal: {
      findFirst: jest.fn().mockResolvedValue({ id: "journal-adjustment-1" }),
    },
    journalEntry: {
      findFirst: jest.fn().mockResolvedValue(null),
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn(),
    },
    ledgerPostingBatch: {
      update: jest.fn(),
    },
    ledgerAuditEvent: {
      create: jest.fn().mockResolvedValue({ id: "audit-1" }),
    },
  }

  tx.ledgerPostingBatch.update.mockResolvedValue({
    id: "batch-1",
    organizationId: "org-1",
    periodId: "period-1",
    sourceType: AccountingSourceType.PAYMENT_SUSPENSE,
    sourceId: "suspense-1",
    postingPurpose: AccountingPostingPurpose.SUSPENSE_RECLASSIFICATION,
    status: LedgerPostingBatchStatus.POSTED,
  })
  tx.journalEntry.create.mockImplementation(async ({ data }) => ({
    id: "journal-1",
    ...data,
    postingBatch: null,
    sourceLinks: [],
    lines: data.lines.create.map((line: Record<string, unknown>, index: number) => ({
      id: `journal-line-${index + 1}`,
      journalEntryId: "journal-1",
      ...line,
      account: {
        id: line.accountId,
        code: line.accountId === "account-47" ? "471" : "585",
        mappingKey: line.accountId === "account-47" ? "PAYMENT_SUSPENSE" : "UNIDENTIFIED_PAYMENT",
      },
    })),
  }))
  return tx
}

describe("payment suspense ledger service", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCreateBatch.mockResolvedValue({
      id: "batch-1",
      organizationId: "org-1",
      periodId: "period-1",
      sourceType: AccountingSourceType.PAYMENT_SUSPENSE,
      sourceId: "suspense-1",
      postingPurpose: AccountingPostingPurpose.SUSPENSE_RECLASSIFICATION,
      status: LedgerPostingBatchStatus.PENDING,
    })
    mockRequireRule.mockResolvedValue(postingRule())
    mockCreateSourceLink.mockResolvedValue(sourceLink())
  })

  it("creates a balanced posted journal and source link before returning success", async () => {
    const tx = transaction()

    const result = await postPaymentSuspenseToLedger(
      {
        organizationId: "org-1",
        suspenseItemId: "suspense-1",
        suspenseLedgerAccountId: "account-47",
        periodId: "period-1",
        postingDate: new Date("2026-06-14T00:00:00Z"),
        actorId: "checker-1",
        correlationId: "corr-1",
      },
      tx as never,
    )

    expect(result).toMatchObject({
      replayed: false,
      ledgerBatch: { id: "batch-1", status: LedgerPostingBatchStatus.POSTED },
      journalEntry: { id: "journal-1", status: JournalEntryStatus.POSTED },
    })
    expect(mockRequireRule).toHaveBeenCalledWith(
      "org-1",
      expect.objectContaining({
        sourceType: AccountingSourceType.PAYMENT_SUSPENSE,
        postingPurpose: AccountingPostingPurpose.SUSPENSE_RECLASSIFICATION,
      }),
      tx,
    )
    expect(tx.journalEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: JournalEntryStatus.POSTED,
          sourceId: "suspense-1",
          lines: {
            create: expect.arrayContaining([
              expect.objectContaining({
                accountId: "account-47",
                debit: amount(5000),
                credit: amount(0),
              }),
              expect.objectContaining({
                accountId: "account-58",
                debit: amount(0),
                credit: amount(5000),
              }),
            ]),
          },
        }),
      }),
    )
    expect(mockCreateSourceLink).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceType: AccountingSourceType.PAYMENT_SUSPENSE,
        sourceId: "suspense-1",
        postingBatchId: "batch-1",
        journalEntryId: "journal-1",
      }),
      tx,
      expect.any(Object),
    )
  })

  it("fails closed before journal mutation when no approved posting rule exists", async () => {
    const tx = transaction()
    mockRequireRule.mockRejectedValue(new Error("No active posting rule"))

    await expect(
      postPaymentSuspenseToLedger(
        {
          organizationId: "org-1",
          suspenseItemId: "suspense-1",
          suspenseLedgerAccountId: "account-47",
          periodId: "period-1",
          postingDate: new Date("2026-06-14T00:00:00Z"),
          actorId: "checker-1",
          correlationId: "corr-1",
        },
        tx as never,
      ),
    ).rejects.toThrow(/No active posting rule/i)

    expect(tx.ledgerPostingBatch.update).not.toHaveBeenCalled()
    expect(tx.journalEntry.create).not.toHaveBeenCalled()
    expect(mockCreateSourceLink).not.toHaveBeenCalled()
  })

  it("blocks certification when a posted suspense item points to a draft ledger batch", async () => {
    const tx = transaction()
    tx.suspenseItem.findMany.mockResolvedValue([
      {
        id: "suspense-1",
        organizationId: "org-1",
        amount: amount(5000),
        currencyCode: "XAF",
        suspenseLedgerAccountId: "account-47",
        ledgerPostingBatchId: "batch-1",
        ledgerPostingBatch: {
          id: "batch-1",
          status: LedgerPostingBatchStatus.PENDING,
          sourceType: AccountingSourceType.PAYMENT_SUSPENSE,
          sourceId: "suspense-1",
          postingPurpose: AccountingPostingPurpose.SUSPENSE_RECLASSIFICATION,
          journalEntries: [],
        },
      },
    ])

    await expect(
      assertPaymentSuspenseLedgerTruthInTx(tx as never, {
        organizationId: "org-1",
        reconciliationRunId: "run-1",
      }),
    ).rejects.toThrow(/exactly one journal entry/i)
  })
})
