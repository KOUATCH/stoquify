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
  SalesOrderStatus,
} from "@prisma/client"

jest.mock("@/prisma/db", () => ({
  db: {
    $transaction: jest.fn(),
  },
}))

import { db } from "@/prisma/db"
import { postPayment } from "./post-payment"

const mockTx = {
  payment: {
    findFirst: jest.fn(),
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
    count: jest.fn(),
    findFirst: jest.fn(),
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

const paymentDate = new Date("2026-06-09T10:15:00.000Z")
const saleDate = new Date("2026-06-09T10:00:00.000Z")
const openPeriod = {
  id: "period-1",
  organizationId: "org-1",
  name: "June 2026",
  startDate: new Date("2026-06-01T00:00:00.000Z"),
  endDate: new Date("2026-06-30T23:59:59.999Z"),
  status: "OPEN",
}
const sale = {
  id: "sale-1",
  organizationId: "org-1",
  orderNumber: "SALE-20260609-0001",
  status: SalesOrderStatus.COMPLETED,
  orderDate: saleDate,
  locationId: "loc-1",
  customerId: "customer-1",
  deletedAt: null,
}
const cardPayment = {
  id: "payment-1",
  organizationId: "org-1",
  paymentNumber: "PAY-20260609-0001",
  amount: new Prisma.Decimal(118),
  method: PaymentMethod.CARD,
  status: PaymentStatus.PAID,
  idempotencyKey: "pay-key-1",
  salesOrderId: "sale-1",
  processedAt: paymentDate,
  processedById: "cashier-1",
  refundedAmount: new Prisma.Decimal(0),
  cashTendered: null,
  changeGiven: null,
  cardType: "VISA",
  cardLast4: "4242",
  authorizationCode: "AUTH-1",
  mobileMoneyProvider: null,
  mobileMoneyReference: null,
  mobileMoneyStatus: null,
  mobileMoneyFeesAmount: null,
  bankReference: null,
  bankName: null,
  chequeNumber: null,
  chequeBank: null,
  chequeDate: null,
  transactionId: "AUTH-1",
  createdAt: paymentDate,
  deletedAt: null,
  salesOrder: sale,
}
const saleTrace = [
  {
    id: "sale-link-1",
    journalEntryId: "sale-je-1",
    postingBatch: {
      id: "sale-batch-1",
      postingPurpose: AccountingPostingPurpose.SALE_COMPLETION,
      status: LedgerPostingBatchStatus.POSTED,
    },
    journalEntry: {
      id: "sale-je-1",
      status: JournalEntryStatus.POSTED,
    },
  },
]
const accounts = [
  {
    id: "cash",
    code: "571",
    organizationId: "org-1",
    mappingKey: "CASH_ON_HAND",
    isActive: true,
    deletedAt: null,
    currency: null,
    _count: { children: 0 },
  },
  {
    id: "card-clearing",
    code: "512CARD",
    organizationId: "org-1",
    mappingKey: "CARD_CLEARING",
    isActive: true,
    deletedAt: null,
    currency: null,
    _count: { children: 0 },
  },
  {
    id: "ar",
    code: "411",
    organizationId: "org-1",
    mappingKey: "ACCOUNTS_RECEIVABLE",
    isActive: true,
    deletedAt: null,
    currency: null,
    _count: { children: 0 },
  },
]
const paymentReceiptRule = {
  id: "rule-payment-1",
  code: "POS-PAYMENT",
  organizationId: "org-1",
  sourceType: AccountingSourceType.POS_PAYMENT,
  postingPurpose: AccountingPostingPurpose.PAYMENT_RECEIPT,
  lines: [
    {
      id: "rule-line-cash",
      postingRuleId: "rule-payment-1",
      organizationId: "org-1",
      lineNumber: 1,
      side: PostingRuleLineSide.DEBIT,
      accountId: null,
      mappingKey: "CASH_ON_HAND",
      amountSource: PostingRuleAmountSource.SOURCE_AMOUNT,
      multiplier: new Prisma.Decimal(1),
      condition: { paymentMethod: "CASH" },
      description: "Receive cash",
      dimensions: null,
      account: null,
    },
    {
      id: "rule-line-card",
      postingRuleId: "rule-payment-1",
      organizationId: "org-1",
      lineNumber: 2,
      side: PostingRuleLineSide.DEBIT,
      accountId: null,
      mappingKey: "CARD_CLEARING",
      amountSource: PostingRuleAmountSource.SOURCE_AMOUNT,
      multiplier: new Prisma.Decimal(1),
      condition: { paymentMethods: ["CARD"] },
      description: "Receive card settlement",
      dimensions: null,
      account: null,
    },
    {
      id: "rule-line-ar",
      postingRuleId: "rule-payment-1",
      organizationId: "org-1",
      lineNumber: 3,
      side: PostingRuleLineSide.CREDIT,
      accountId: null,
      mappingKey: "ACCOUNTS_RECEIVABLE",
      amountSource: PostingRuleAmountSource.SOURCE_AMOUNT,
      multiplier: new Prisma.Decimal(1),
      condition: null,
      description: "Clear customer receivable",
      dimensions: null,
      account: null,
    },
  ],
}
const bankJournal = {
  id: "journal-bank",
  code: "BQ",
  type: JournalType.BANK,
  organizationId: "org-1",
  isActive: true,
}
const pendingBatch = {
  id: "batch-payment-1",
  organizationId: "org-1",
  sourceType: AccountingSourceType.POS_PAYMENT,
  sourceId: "payment-1",
  postingPurpose: AccountingPostingPurpose.PAYMENT_RECEIPT,
  status: LedgerPostingBatchStatus.PENDING,
}
const postedBatch = {
  ...pendingBatch,
  status: LedgerPostingBatchStatus.POSTED,
}
const postedEntry = {
  id: "payment-je-1",
  organizationId: "org-1",
  entryNumber: "PY-20260609-0001",
  entryDate: paymentDate,
  status: JournalEntryStatus.POSTED,
  postingBatchId: "batch-payment-1",
  sourceType: AccountingSourceType.POS_PAYMENT,
  sourceId: "payment-1",
  postingPurpose: AccountingPostingPurpose.PAYMENT_RECEIPT,
  lines: [],
}

function arrangeNewPaymentPosting() {
  mockTx.payment.findFirst.mockResolvedValue(cardPayment)
  mockTx.accountingSourceLink.findMany.mockResolvedValue(saleTrace)
  mockTx.ledgerPostingBatch.findFirst.mockResolvedValue(null)
  mockTx.ledgerPostingBatch.create.mockResolvedValue(pendingBatch)
  mockTx.journalEntry.findFirst.mockResolvedValue(null)
  mockTx.accountingPeriod.findFirst.mockResolvedValue(openPeriod)
  mockTx.postingRule.findFirst.mockResolvedValue(paymentReceiptRule)
  mockTx.chartOfAccount.findMany.mockResolvedValue(accounts)
  mockTx.journal.findFirst.mockResolvedValue(bankJournal)
  mockTx.journalEntry.count.mockResolvedValue(0)
  mockTx.ledgerPostingBatch.update.mockResolvedValue(postedBatch)
  mockTx.journalEntry.create.mockResolvedValue(postedEntry)
  mockTx.accountingSourceLink.findFirst.mockResolvedValue(null)
  mockTx.accountingSourceLink.create.mockResolvedValue({ id: "payment-link-1" })
  mockTx.ledgerAuditEvent.create.mockResolvedValue({ id: "audit-1" })
}

describe("post payment accounting posting", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockDb.$transaction.mockImplementation(async (handler: (tx: typeof mockTx) => Promise<unknown>) => handler(mockTx))
    arrangeNewPaymentPosting()
  })

  it("posts a captured POS payment and clears the sale receivable", async () => {
    const result = await postPayment("org-1", {
      paymentId: "payment-1",
      actorId: "controller-1",
    })

    expect(result).toMatchObject({ id: "payment-je-1", status: JournalEntryStatus.POSTED })
    expect(mockTx.accountingSourceLink.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org-1",
          sourceType: AccountingSourceType.POS_SALE,
          sourceId: "sale-1",
        }),
      }),
    )

    const createCall = mockTx.journalEntry.create.mock.calls[0][0]
    expect(createCall.data).toMatchObject({
      organizationId: "org-1",
      journalId: "journal-bank",
      periodId: "period-1",
      postingBatchId: "batch-payment-1",
      entryNumber: "PY-20260609-0001",
      status: JournalEntryStatus.POSTED,
      sourceType: AccountingSourceType.POS_PAYMENT,
      sourceId: "payment-1",
      postingPurpose: AccountingPostingPurpose.PAYMENT_RECEIPT,
      reference: "PAY-20260609-0001",
      postedById: "controller-1",
    })

    const lines = createCall.data.lines.create
    expect(lines).toHaveLength(2)
    expect(lines[0]).toMatchObject({ accountId: "card-clearing", lineNumber: 1, currency: "XAF" })
    expect(lines[0].debit.toFixed(2)).toBe("118.00")
    expect(lines[0].credit.toFixed(2)).toBe("0.00")
    expect(lines[1]).toMatchObject({ accountId: "ar", lineNumber: 2 })
    expect(lines[1].debit.toFixed(2)).toBe("0.00")
    expect(lines[1].credit.toFixed(2)).toBe("118.00")

    expect(mockTx.accountingSourceLink.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org-1",
          postingBatchId: "batch-payment-1",
          journalEntryId: "payment-je-1",
          sourceType: AccountingSourceType.POS_PAYMENT,
          sourceId: "payment-1",
          sourceNumber: "PAY-20260609-0001",
        }),
      }),
    )
    expect(mockTx.ledgerAuditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "POS_PAYMENT_POST",
          resourceType: "Payment",
          resourceId: "payment-1",
          postingBatchId: "batch-payment-1",
          journalEntryId: "payment-je-1",
        }),
      }),
    )
  })

  it("returns the posted payment journal entry idempotently", async () => {
    mockTx.ledgerPostingBatch.findFirst.mockResolvedValue(postedBatch)
    mockTx.journalEntry.findFirst.mockResolvedValue(postedEntry)

    const result = await postPayment("org-1", {
      paymentId: "payment-1",
      actorId: "controller-1",
    })

    expect(result).toMatchObject({ id: "payment-je-1", status: JournalEntryStatus.POSTED })
    expect(mockTx.postingRule.findFirst).not.toHaveBeenCalled()
    expect(mockTx.journalEntry.create).not.toHaveBeenCalled()
    expect(mockTx.accountingSourceLink.create).not.toHaveBeenCalled()
  })

  it("requires the linked sale to be posted before clearing receivables", async () => {
    mockTx.accountingSourceLink.findMany.mockResolvedValue([])

    await expect(
      postPayment("org-1", {
        paymentId: "payment-1",
        actorId: "controller-1",
      }),
    ).rejects.toThrow(/No accounting source trace/i)

    expect(mockTx.ledgerPostingBatch.create).not.toHaveBeenCalled()
    expect(mockTx.journalEntry.create).not.toHaveBeenCalled()
  })

  it("rejects on-account credit rows because they are not payment receipts", async () => {
    mockTx.payment.findFirst.mockResolvedValue({
      ...cardPayment,
      method: PaymentMethod.CREDIT,
      status: PaymentStatus.PENDING,
    })

    await expect(
      postPayment("org-1", {
        paymentId: "payment-1",
        actorId: "controller-1",
      }),
    ).rejects.toThrow(/on-account credit/i)

    expect(mockTx.accountingSourceLink.findMany).not.toHaveBeenCalled()
    expect(mockTx.journalEntry.create).not.toHaveBeenCalled()
  })

  it("fails closed when method conditions leave the receipt without a debit line", async () => {
    mockTx.payment.findFirst.mockResolvedValue({
      ...cardPayment,
      method: PaymentMethod.MOBILE_MONEY,
      mobileMoneyProvider: "MTN_MOMO",
      mobileMoneyReference: "MOMO-1",
    })
    mockTx.postingRule.findFirst.mockResolvedValue({
      ...paymentReceiptRule,
      lines: [
        paymentReceiptRule.lines[0],
        paymentReceiptRule.lines[2],
      ],
    })

    await expect(
      postPayment("org-1", {
        paymentId: "payment-1",
        actorId: "controller-1",
      }),
    ).rejects.toThrow(/did not produce enough/i)

    expect(mockTx.journalEntry.create).not.toHaveBeenCalled()
    expect(mockTx.accountingSourceLink.create).not.toHaveBeenCalled()
  })
})
