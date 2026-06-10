import {
  AccountingPostingPurpose,
  AccountingSourceType,
  JournalEntryStatus,
  JournalType,
  LedgerPostingBatchStatus,
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
import { postSale } from "./post-sale"

const mockTx = {
  salesOrder: {
    findFirst: jest.fn(),
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
  journalEntry: {
    count: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  ledgerPostingBatch: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  accountingSourceLink: {
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  ledgerAuditEvent: {
    create: jest.fn(),
  },
}

const mockDb = db as unknown as { $transaction: jest.Mock }

const saleDate = new Date("2026-06-09T10:00:00.000Z")
const openPeriod = {
  id: "period-1",
  organizationId: "org-1",
  name: "June 2026",
  startDate: new Date("2026-06-01T00:00:00.000Z"),
  endDate: new Date("2026-06-30T23:59:59.999Z"),
  status: "OPEN",
}
const completedSale = {
  id: "sale-1",
  organizationId: "org-1",
  orderNumber: "SALE-20260609-0001",
  status: SalesOrderStatus.COMPLETED,
  orderDate: saleDate,
  total: new Prisma.Decimal(118),
  taxAmount: new Prisma.Decimal(18),
  subtotal: new Prisma.Decimal(100),
  discount: new Prisma.Decimal(0),
  locationId: "loc-1",
  customerId: "customer-1",
  createdById: "cashier-1",
  lines: [
    {
      id: "line-1",
      itemId: "item-1",
      quantity: new Prisma.Decimal(2),
      lineTotal: new Prisma.Decimal(118),
      taxAmount: new Prisma.Decimal(18),
      item: {
        id: "item-1",
        costPrice: new Prisma.Decimal(40),
        trackInventory: true,
        inventoryLevels: [
          {
            locationId: "loc-1",
            averageCost: new Prisma.Decimal(42),
          },
        ],
      },
    },
  ],
}
const accounts = [
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
  {
    id: "sales",
    code: "701",
    organizationId: "org-1",
    mappingKey: "SALES_REVENUE",
    isActive: true,
    deletedAt: null,
    currency: null,
    _count: { children: 0 },
  },
  {
    id: "vat",
    code: "443",
    organizationId: "org-1",
    mappingKey: "OUTPUT_VAT",
    isActive: true,
    deletedAt: null,
    currency: null,
    _count: { children: 0 },
  },
  {
    id: "cogs",
    code: "603",
    organizationId: "org-1",
    mappingKey: "COGS",
    isActive: true,
    deletedAt: null,
    currency: null,
    _count: { children: 0 },
  },
  {
    id: "inventory",
    code: "31",
    organizationId: "org-1",
    mappingKey: "INVENTORY_ASSET",
    isActive: true,
    deletedAt: null,
    currency: null,
    _count: { children: 0 },
  },
]
const saleCompletionRule = {
  id: "rule-1",
  code: "POS-SALE",
  organizationId: "org-1",
  sourceType: AccountingSourceType.POS_SALE,
  postingPurpose: AccountingPostingPurpose.SALE_COMPLETION,
  lines: [
    {
      id: "rule-line-ar",
      postingRuleId: "rule-1",
      organizationId: "org-1",
      lineNumber: 1,
      side: PostingRuleLineSide.DEBIT,
      accountId: null,
      mappingKey: "ACCOUNTS_RECEIVABLE",
      amountSource: PostingRuleAmountSource.GROSS_AMOUNT,
      multiplier: new Prisma.Decimal(1),
      condition: null,
      description: "Recognize customer receivable",
      dimensions: null,
      account: null,
    },
    {
      id: "rule-line-sales",
      postingRuleId: "rule-1",
      organizationId: "org-1",
      lineNumber: 2,
      side: PostingRuleLineSide.CREDIT,
      accountId: null,
      mappingKey: "SALES_REVENUE",
      amountSource: PostingRuleAmountSource.NET_AMOUNT,
      multiplier: new Prisma.Decimal(1),
      condition: null,
      description: "Recognize sales revenue",
      dimensions: null,
      account: null,
    },
    {
      id: "rule-line-vat",
      postingRuleId: "rule-1",
      organizationId: "org-1",
      lineNumber: 3,
      side: PostingRuleLineSide.CREDIT,
      accountId: null,
      mappingKey: "OUTPUT_VAT",
      amountSource: PostingRuleAmountSource.TAX_AMOUNT,
      multiplier: new Prisma.Decimal(1),
      condition: null,
      description: "Recognize output VAT",
      dimensions: null,
      account: null,
    },
  ],
}
const salesJournal = {
  id: "journal-sales",
  code: "VT",
  type: JournalType.SALES,
  organizationId: "org-1",
  isActive: true,
}
const pendingBatch = {
  id: "batch-1",
  organizationId: "org-1",
  sourceType: AccountingSourceType.POS_SALE,
  sourceId: "sale-1",
  postingPurpose: AccountingPostingPurpose.SALE_COMPLETION,
  status: LedgerPostingBatchStatus.PENDING,
}
const postedBatch = {
  ...pendingBatch,
  status: LedgerPostingBatchStatus.POSTED,
}
const postedEntry = {
  id: "je-1",
  organizationId: "org-1",
  entryNumber: "VT-20260609-0001",
  entryDate: saleDate,
  status: JournalEntryStatus.POSTED,
  postingBatchId: "batch-1",
  sourceType: AccountingSourceType.POS_SALE,
  sourceId: "sale-1",
  postingPurpose: AccountingPostingPurpose.SALE_COMPLETION,
  lines: [],
}

function arrangeNewSalePosting() {
  mockTx.salesOrder.findFirst.mockResolvedValue(completedSale)
  mockTx.ledgerPostingBatch.findFirst.mockResolvedValue(null)
  mockTx.ledgerPostingBatch.create.mockResolvedValue(pendingBatch)
  mockTx.journalEntry.findFirst.mockResolvedValue(null)
  mockTx.accountingPeriod.findFirst.mockResolvedValue(openPeriod)
  mockTx.postingRule.findFirst.mockResolvedValue(saleCompletionRule)
  mockTx.chartOfAccount.findMany.mockResolvedValue(accounts)
  mockTx.journal.findFirst.mockResolvedValue(salesJournal)
  mockTx.journalEntry.count.mockResolvedValue(0)
  mockTx.journalEntry.create.mockResolvedValue(postedEntry)
  mockTx.ledgerPostingBatch.update.mockResolvedValue(postedBatch)
  mockTx.accountingSourceLink.findFirst.mockResolvedValue(null)
  mockTx.accountingSourceLink.create.mockResolvedValue({ id: "link-1" })
  mockTx.ledgerAuditEvent.create.mockResolvedValue({ id: "audit-1" })
}

describe("post sale accounting posting", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockDb.$transaction.mockImplementation(async (handler: (tx: typeof mockTx) => Promise<unknown>) => handler(mockTx))
    arrangeNewSalePosting()
  })

  it("posts a completed POS sale through posting rules and creates a source trace", async () => {
    const result = await postSale("org-1", {
      salesOrderId: "sale-1",
      actorId: "controller-1",
    })

    expect(result).toMatchObject({ id: "je-1", status: JournalEntryStatus.POSTED })

    const createCall = mockTx.journalEntry.create.mock.calls[0][0]
    expect(createCall.data).toMatchObject({
      organizationId: "org-1",
      journalId: "journal-sales",
      periodId: "period-1",
      postingBatchId: "batch-1",
      entryNumber: "VT-20260609-0001",
      status: JournalEntryStatus.POSTED,
      sourceType: AccountingSourceType.POS_SALE,
      sourceId: "sale-1",
      postingPurpose: AccountingPostingPurpose.SALE_COMPLETION,
      reference: "SALE-20260609-0001",
      postedById: "controller-1",
    })

    const lines = createCall.data.lines.create
    expect(lines).toHaveLength(3)
    expect(lines[0]).toMatchObject({ accountId: "ar", lineNumber: 1, currency: "XAF" })
    expect(lines[0].debit.toFixed(2)).toBe("118.00")
    expect(lines[0].credit.toFixed(2)).toBe("0.00")
    expect(lines[1]).toMatchObject({ accountId: "sales", lineNumber: 2 })
    expect(lines[1].debit.toFixed(2)).toBe("0.00")
    expect(lines[1].credit.toFixed(2)).toBe("100.00")
    expect(lines[2]).toMatchObject({ accountId: "vat", lineNumber: 3 })
    expect(lines[2].credit.toFixed(2)).toBe("18.00")

    expect(mockTx.accountingSourceLink.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org-1",
          postingBatchId: "batch-1",
          journalEntryId: "je-1",
          sourceType: AccountingSourceType.POS_SALE,
          sourceId: "sale-1",
          sourceNumber: "SALE-20260609-0001",
        }),
      }),
    )
    expect(mockTx.ledgerAuditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "POS_SALE_POST",
          resourceType: "SalesOrder",
          resourceId: "sale-1",
          postingBatchId: "batch-1",
          journalEntryId: "je-1",
        }),
      }),
    )
  })

  it("returns the posted journal entry idempotently when the sale was already posted", async () => {
    mockTx.ledgerPostingBatch.findFirst.mockResolvedValue(postedBatch)
    mockTx.journalEntry.findFirst.mockResolvedValue(postedEntry)

    const result = await postSale("org-1", {
      salesOrderId: "sale-1",
      actorId: "controller-1",
    })

    expect(result).toMatchObject({ id: "je-1", status: JournalEntryStatus.POSTED })
    expect(mockTx.postingRule.findFirst).not.toHaveBeenCalled()
    expect(mockTx.journalEntry.create).not.toHaveBeenCalled()
    expect(mockTx.accountingSourceLink.create).not.toHaveBeenCalled()
  })

  it("fails closed when no active sale completion posting rule exists", async () => {
    mockTx.postingRule.findFirst.mockResolvedValue(null)

    await expect(
      postSale("org-1", {
        salesOrderId: "sale-1",
        actorId: "controller-1",
      }),
    ).rejects.toThrow(/No active posting rule/i)

    expect(mockTx.journalEntry.create).not.toHaveBeenCalled()
    expect(mockTx.accountingSourceLink.create).not.toHaveBeenCalled()
  })

  it("fails when a cost posting rule is configured without any sale cost basis", async () => {
    mockTx.salesOrder.findFirst.mockResolvedValue({
      ...completedSale,
      lines: [
        {
          ...completedSale.lines[0],
          item: null,
        },
      ],
    })
    mockTx.postingRule.findFirst.mockResolvedValue({
      ...saleCompletionRule,
      lines: [
        {
          ...saleCompletionRule.lines[0],
          id: "rule-line-cogs",
          mappingKey: "COGS",
          amountSource: PostingRuleAmountSource.COST_AMOUNT,
          description: "Recognize cost of goods sold",
        },
        {
          ...saleCompletionRule.lines[1],
          id: "rule-line-inventory",
          mappingKey: "INVENTORY_ASSET",
          amountSource: PostingRuleAmountSource.COST_AMOUNT,
          description: "Relieve inventory",
        },
      ],
    })

    await expect(
      postSale("org-1", {
        salesOrderId: "sale-1",
        actorId: "controller-1",
      }),
    ).rejects.toThrow(/requires a cost amount/i)

    expect(mockTx.journalEntry.create).not.toHaveBeenCalled()
    expect(mockTx.accountingSourceLink.create).not.toHaveBeenCalled()
  })
})
