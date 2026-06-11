import {
  AccountingPostingPurpose,
  AccountingSourceType,
  JournalEntryStatus,
  JournalType,
  LedgerPostingBatchStatus,
  PaymentMethod,
  PaymentStatus,
  PostingRuleAmountSource,
  PostingRuleLineSide,
  Prisma,
  RefundStatus,
  SalesOrderStatus,
  TransactionReferenceType,
  TransactionType,
} from "@prisma/client"

jest.mock("@/prisma/db", () => ({
  db: {
    $transaction: jest.fn(),
  },
}))

import { db } from "@/prisma/db"
import { postRefund } from "./post-refund"
import { postVoid } from "./post-void"

const mockTx = {
  paymentRefund: {
    findFirst: jest.fn(),
  },
  salesOrder: {
    findFirst: jest.fn(),
  },
  inventoryTransaction: {
    findMany: jest.fn(),
  },
  accountingSourceLink: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  ledgerPostingBatch: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  journalEntry: {
    findFirst: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
  },
  accountingPeriod: {
    findFirst: jest.fn(),
  },
  postingRule: {
    findFirst: jest.fn(),
  },
  chartOfAccount: {
    findMany: jest.fn(),
  },
  journal: {
    findFirst: jest.fn(),
  },
  ledgerAuditEvent: {
    create: jest.fn(),
  },
}

const mockDb = db as unknown as { $transaction: jest.Mock }
const postingDate = new Date("2026-06-10T10:00:00.000Z")
const openPeriod = {
  id: "period-1",
  status: "OPEN",
  startDate: new Date("2026-06-01T00:00:00.000Z"),
  endDate: new Date("2026-06-30T23:59:59.999Z"),
}
function sourceTrace(postingPurpose: AccountingPostingPurpose) {
  return [
    {
      postingBatch: {
        id: "source-batch",
        status: LedgerPostingBatchStatus.POSTED,
        postingPurpose,
      },
      journalEntryId: "source-je",
      journalEntry: {
        id: "source-je",
        status: JournalEntryStatus.POSTED,
      },
    },
  ]
}
const accounts = [
  { id: "sales", code: "701", mappingKey: "SALES_REVENUE", currency: null, _count: { children: 0 } },
  { id: "vat", code: "443", mappingKey: "OUTPUT_VAT", currency: null, _count: { children: 0 } },
  { id: "inventory", code: "31", mappingKey: "INVENTORY", currency: null, _count: { children: 0 } },
  { id: "cogs", code: "603", mappingKey: "COGS", currency: null, _count: { children: 0 } },
  { id: "card", code: "5121", mappingKey: "CARD_CLEARING", currency: null, _count: { children: 0 } },
]
const reversalRuleLines = [
  {
    id: "line-sales",
    lineNumber: 1,
    side: PostingRuleLineSide.DEBIT,
    accountId: null,
    mappingKey: "SALES_REVENUE",
    amountSource: PostingRuleAmountSource.NET_AMOUNT,
    multiplier: new Prisma.Decimal(1),
    condition: null,
    description: "Reverse revenue",
    dimensions: null,
  },
  {
    id: "line-vat",
    lineNumber: 2,
    side: PostingRuleLineSide.DEBIT,
    accountId: null,
    mappingKey: "OUTPUT_VAT",
    amountSource: PostingRuleAmountSource.TAX_AMOUNT,
    multiplier: new Prisma.Decimal(1),
    condition: null,
    description: "Reverse VAT",
    dimensions: null,
  },
  {
    id: "line-inventory",
    lineNumber: 3,
    side: PostingRuleLineSide.DEBIT,
    accountId: null,
    mappingKey: "INVENTORY",
    amountSource: PostingRuleAmountSource.COST_AMOUNT,
    multiplier: new Prisma.Decimal(1),
    condition: null,
    description: "Restore inventory",
    dimensions: null,
  },
  {
    id: "line-cogs",
    lineNumber: 4,
    side: PostingRuleLineSide.CREDIT,
    accountId: null,
    mappingKey: "COGS",
    amountSource: PostingRuleAmountSource.COST_AMOUNT,
    multiplier: new Prisma.Decimal(1),
    condition: null,
    description: "Reverse COGS",
    dimensions: null,
  },
  {
    id: "line-card",
    lineNumber: 5,
    side: PostingRuleLineSide.CREDIT,
    accountId: null,
    mappingKey: "CARD_CLEARING",
    amountSource: PostingRuleAmountSource.SOURCE_AMOUNT,
    multiplier: new Prisma.Decimal(1),
    condition: { paymentMethod: "CARD" },
    description: "Reverse card",
    dimensions: null,
  },
]
const originalSaleCostMovements = [
  {
    id: "movement-1",
    organizationId: "org-1",
    itemId: "item-1",
    type: TransactionType.SALE,
    referenceType: TransactionReferenceType.SALES_ORDER,
    referenceId: "sale-1",
    quantity: new Prisma.Decimal(-2),
    totalCost: new Prisma.Decimal(60),
  },
]
const pendingBatch = {
  id: "batch-1",
  organizationId: "org-1",
  status: LedgerPostingBatchStatus.PENDING,
}
const postedBatch = {
  ...pendingBatch,
  status: LedgerPostingBatchStatus.POSTED,
}
const createdEntry = {
  id: "reversal-je-1",
  entryNumber: "RF-20260610-0001",
  status: JournalEntryStatus.POSTED,
  lines: [],
}

function refundFixture() {
  return {
    id: "refund-1",
    organizationId: "org-1",
    refundNumber: "REF-20260610-0001",
    amount: new Prisma.Decimal(118),
    reason: "Customer return",
    status: RefundStatus.PROCESSED,
    processedAt: postingDate,
    processedById: "cashier-1",
    notes: null,
    createdAt: postingDate,
    paymentId: "payment-1",
    payment: {
      id: "payment-1",
      organizationId: "org-1",
      paymentNumber: "PAY-20260610-0001",
      amount: new Prisma.Decimal(118),
      method: PaymentMethod.CARD,
      status: PaymentStatus.REFUNDED,
      refundedAmount: new Prisma.Decimal(118),
      salesOrderId: "sale-1",
      processedAt: postingDate,
      processedById: "cashier-1",
      salesOrder: {
        id: "sale-1",
        organizationId: "org-1",
        orderNumber: "POS-20260610-0001",
        status: SalesOrderStatus.RETURNED,
        orderDate: postingDate,
        total: new Prisma.Decimal(118),
        taxAmount: new Prisma.Decimal(18),
        locationId: "loc-1",
        customerId: "customer-1",
        createdById: "cashier-1",
        deletedAt: null,
      },
    },
  }
}

function voidSaleFixture() {
  return {
    id: "sale-1",
    organizationId: "org-1",
    orderNumber: "POS-20260610-0001",
    status: SalesOrderStatus.CANCELLED,
    orderDate: postingDate,
    total: new Prisma.Decimal(118),
    taxAmount: new Prisma.Decimal(18),
    locationId: "loc-1",
    customerId: "customer-1",
    createdById: "cashier-1",
    deletedAt: null,
    payments: [
      {
        id: "payment-1",
        paymentNumber: "PAY-20260610-0001",
        amount: new Prisma.Decimal(118),
        method: PaymentMethod.CARD,
        status: PaymentStatus.CANCELLED,
        deletedAt: null,
        refunds: [],
      },
    ],
  }
}

function arrangePosting(rulePurpose: AccountingPostingPurpose, entryPrefix: string, journalType: JournalType) {
  mockTx.accountingSourceLink.findMany.mockImplementation(async ({ where }: { where: any }) =>
    sourceTrace(
      where.sourceType === AccountingSourceType.POS_PAYMENT
        ? AccountingPostingPurpose.PAYMENT_RECEIPT
        : AccountingPostingPurpose.SALE_COMPLETION,
    ),
  )
  mockTx.inventoryTransaction.findMany.mockResolvedValue(originalSaleCostMovements)
  mockTx.ledgerPostingBatch.findFirst.mockResolvedValue(null)
  mockTx.ledgerPostingBatch.create.mockResolvedValue(pendingBatch)
  mockTx.journalEntry.findFirst.mockResolvedValue(null)
  mockTx.accountingPeriod.findFirst.mockResolvedValue(openPeriod)
  mockTx.postingRule.findFirst.mockResolvedValue({
    id: `rule-${rulePurpose}`,
    code: `POS-${rulePurpose}`,
    postingPurpose: rulePurpose,
    lines: reversalRuleLines,
  })
  mockTx.chartOfAccount.findMany.mockResolvedValue(accounts)
  mockTx.journal.findFirst.mockResolvedValue({
    id: `journal-${journalType}`,
    type: journalType,
    isActive: true,
  })
  mockTx.journalEntry.count.mockResolvedValue(0)
  mockTx.ledgerPostingBatch.update.mockResolvedValue(postedBatch)
  mockTx.journalEntry.create.mockImplementation(async ({ data }: { data: any }) => ({
    ...createdEntry,
    entryNumber: `${entryPrefix}-20260610-0001`,
    ...data,
  }))
  mockTx.accountingSourceLink.findFirst.mockResolvedValue(null)
  mockTx.accountingSourceLink.create.mockResolvedValue({ id: "source-link-1" })
  mockTx.ledgerAuditEvent.create.mockResolvedValue({ id: "audit-1" })
}

describe("POS reversal accounting postings", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockDb.$transaction.mockImplementation(async (handler: (tx: typeof mockTx) => Promise<unknown>) => handler(mockTx))
  })

  it("posts a processed POS refund from original sale and payment traces", async () => {
    mockTx.paymentRefund.findFirst.mockResolvedValue(refundFixture())
    arrangePosting(AccountingPostingPurpose.REFUND, "RF", JournalType.BANK)

    const result = await postRefund("org-1", {
      refundId: "refund-1",
      actorId: "controller-1",
      postingDate,
    })

    expect(result).toMatchObject({ id: "reversal-je-1", status: JournalEntryStatus.POSTED })
    expect(mockTx.accountingSourceLink.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org-1",
          sourceType: AccountingSourceType.POS_PAYMENT,
          sourceId: "payment-1",
        }),
      }),
    )

    const createCall = mockTx.journalEntry.create.mock.calls[0][0]
    expect(createCall.data).toMatchObject({
      organizationId: "org-1",
      journalId: "journal-BANK",
      sourceType: AccountingSourceType.POS_REFUND,
      sourceId: "refund-1",
      postingPurpose: AccountingPostingPurpose.REFUND,
      reference: "REF-20260610-0001",
    })

    const lines = createCall.data.lines.create
    expect(lines).toHaveLength(5)
    expect(lines[0].debit.toFixed(2)).toBe("100.00")
    expect(lines[1].debit.toFixed(2)).toBe("18.00")
    expect(lines[2].debit.toFixed(2)).toBe("60.00")
    expect(lines[3].credit.toFixed(2)).toBe("60.00")
    expect(lines[4].credit.toFixed(2)).toBe("118.00")
  })

  it("posts a POS void after sale and payment traces exist", async () => {
    mockTx.salesOrder.findFirst.mockResolvedValue(voidSaleFixture())
    arrangePosting(AccountingPostingPurpose.VOID, "VD", JournalType.GENERAL)

    const result = await postVoid("org-1", {
      salesOrderId: "sale-1",
      actorId: "controller-1",
      postingDate,
    })

    expect(result).toMatchObject({ id: "reversal-je-1", status: JournalEntryStatus.POSTED })

    const createCall = mockTx.journalEntry.create.mock.calls[0][0]
    expect(createCall.data).toMatchObject({
      organizationId: "org-1",
      journalId: "journal-GENERAL",
      sourceType: AccountingSourceType.POS_VOID,
      sourceId: "sale-1",
      postingPurpose: AccountingPostingPurpose.VOID,
      reference: "POS-20260610-0001",
    })
    expect(createCall.data.lines.create.map((line: any) => [line.debit.toFixed(2), line.credit.toFixed(2)])).toEqual([
      ["100.00", "0.00"],
      ["18.00", "0.00"],
      ["60.00", "0.00"],
      ["0.00", "60.00"],
      ["0.00", "118.00"],
    ])
  })

  it("requires source traces before posting a refund", async () => {
    mockTx.paymentRefund.findFirst.mockResolvedValue(refundFixture())
    mockTx.accountingSourceLink.findMany.mockResolvedValue([])

    await expect(
      postRefund("org-1", {
        refundId: "refund-1",
        actorId: "controller-1",
      }),
    ).rejects.toThrow(/No accounting source trace/i)

    expect(mockTx.ledgerPostingBatch.create).not.toHaveBeenCalled()
    expect(mockTx.journalEntry.create).not.toHaveBeenCalled()
  })
})
