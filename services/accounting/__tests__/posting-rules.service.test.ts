import {
  AccountingPostingPurpose,
  AccountingSourceType,
  PostingRuleAmountSource,
  PostingRuleLineSide,
} from "@prisma/client"

jest.mock("@/prisma/db", () => ({
  db: {
    $transaction: jest.fn(),
    chartOfAccount: { findMany: jest.fn() },
  },
}))

import { db } from "@/prisma/db"
import {
  createPostingRule,
  requireActivePostingRule,
  validatePostingRuleLines,
} from "../posting-rules.service"

const mockTx = {
  chartOfAccount: { findMany: jest.fn() },
  postingRule: {
    create: jest.fn(),
    findFirst: jest.fn(),
  },
  ledgerAuditEvent: { create: jest.fn() },
}

const mockDb = db as unknown as {
  $transaction: jest.Mock
  chartOfAccount: { findMany: jest.Mock }
}

const mappedAccounts = [
  {
    id: "cash",
    code: "571",
    mappingKey: "CASH_ON_HAND",
    organizationId: "org-1",
    isActive: true,
    deletedAt: null,
    _count: { children: 0 },
  },
  {
    id: "sales",
    code: "701",
    mappingKey: "SALES_REVENUE",
    organizationId: "org-1",
    isActive: true,
    deletedAt: null,
    _count: { children: 0 },
  },
]

describe("posting rules service", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockDb.$transaction.mockImplementation(async (handler: (tx: typeof mockTx) => Promise<unknown>) => handler(mockTx))
    mockTx.chartOfAccount.findMany.mockResolvedValue(mappedAccounts)
    mockDb.chartOfAccount.findMany.mockResolvedValue(mappedAccounts)
    mockTx.ledgerAuditEvent.create.mockResolvedValue({ id: "audit-1" })
  })

  it("rejects rules without both debit and credit sides", async () => {
    await expect(
      validatePostingRuleLines("org-1", [
        {
          side: PostingRuleLineSide.DEBIT,
          mappingKey: "CASH_ON_HAND",
          amountSource: PostingRuleAmountSource.GROSS_AMOUNT,
        },
        {
          side: PostingRuleLineSide.DEBIT,
          mappingKey: "SALES_REVENUE",
          amountSource: PostingRuleAmountSource.GROSS_AMOUNT,
        },
      ]),
    ).rejects.toThrow(/both debit and credit/i)
  })

  it("rejects mapping keys that do not resolve to active leaf accounts", async () => {
    mockDb.chartOfAccount.findMany.mockResolvedValue([])

    await expect(
      validatePostingRuleLines("org-1", [
        {
          side: PostingRuleLineSide.DEBIT,
          mappingKey: "CASH_ON_HAND",
          amountSource: PostingRuleAmountSource.GROSS_AMOUNT,
        },
        {
          side: PostingRuleLineSide.CREDIT,
          mappingKey: "SALES_REVENUE",
          amountSource: PostingRuleAmountSource.GROSS_AMOUNT,
        },
      ]),
    ).rejects.toThrow(/does not resolve/i)
  })

  it("creates a validated posting rule and records an audit event", async () => {
    mockTx.postingRule.create.mockResolvedValue({
      id: "rule-1",
      code: "POS_SALE",
      sourceType: AccountingSourceType.POS_SALE,
      postingPurpose: AccountingPostingPurpose.SALE_COMPLETION,
      lines: [{ id: "line-1" }, { id: "line-2" }],
    })

    const result = await createPostingRule(
      "org-1",
      {
        code: "pos_sale",
        nameEn: "POS sale",
        sourceType: AccountingSourceType.POS_SALE,
        postingPurpose: AccountingPostingPurpose.SALE_COMPLETION,
        lines: [
          {
            side: PostingRuleLineSide.DEBIT,
            mappingKey: "CASH_ON_HAND",
            amountSource: PostingRuleAmountSource.GROSS_AMOUNT,
          },
          {
            side: PostingRuleLineSide.CREDIT,
            mappingKey: "SALES_REVENUE",
            amountSource: PostingRuleAmountSource.GROSS_AMOUNT,
          },
        ],
      },
      "user-1",
    )

    expect(result).toMatchObject({ id: "rule-1", code: "POS_SALE" })
    expect(mockTx.postingRule.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org-1",
          code: "POS_SALE",
          lines: expect.objectContaining({
            create: expect.arrayContaining([
              expect.objectContaining({ organizationId: "org-1", mappingKey: "CASH_ON_HAND" }),
            ]),
          }),
        }),
      }),
    )
    expect(mockTx.ledgerAuditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "POSTING_RULE_CREATE",
          actorId: "user-1",
        }),
      }),
    )
  })

  it("requires an active validated posting rule for automation", async () => {
    mockDb.chartOfAccount.findMany.mockResolvedValue(mappedAccounts)
    mockTx.postingRule.findFirst.mockResolvedValue({
      id: "rule-1",
      code: "POS_SALE",
      sourceType: AccountingSourceType.POS_SALE,
      postingPurpose: AccountingPostingPurpose.SALE_COMPLETION,
      lines: [
        {
          side: PostingRuleLineSide.DEBIT,
          mappingKey: "CASH_ON_HAND",
          amountSource: PostingRuleAmountSource.GROSS_AMOUNT,
          multiplier: "1",
        },
        {
          side: PostingRuleLineSide.CREDIT,
          mappingKey: "SALES_REVENUE",
          amountSource: PostingRuleAmountSource.GROSS_AMOUNT,
          multiplier: "1",
        },
      ],
    })

    await expect(
      requireActivePostingRule(
        "org-1",
        {
          sourceType: AccountingSourceType.POS_SALE,
          postingPurpose: AccountingPostingPurpose.SALE_COMPLETION,
        },
        mockTx as never,
      ),
    ).resolves.toMatchObject({ id: "rule-1" })
  })
})
