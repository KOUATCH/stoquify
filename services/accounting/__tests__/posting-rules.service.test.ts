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
  getPostingRuleReadiness,
  getActivePostingRule,
  requireActivePostingRule,
  validatePostingRuleLines,
} from "../posting-rules.service"

const mockTx = {
  chartOfAccount: { findMany: jest.fn() },
  postingRule: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
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

  const contract = { sourceType: AccountingSourceType.POS_SALE, postingPurpose: AccountingPostingPurpose.SALE_COMPLETION }
  function candidate(id = "selected") {
    return { id, code: id, ...contract, lines: [
      { side: PostingRuleLineSide.DEBIT, mappingKey: "CASH_ON_HAND", amountSource: PostingRuleAmountSource.GROSS_AMOUNT },
      { side: PostingRuleLineSide.CREDIT, mappingKey: "SALES_REVENUE", amountSource: PostingRuleAmountSource.GROSS_AMOUNT },
    ] }
  }

  it("uses the same source, effective window and deterministic precedence as posting", async () => {
    mockTx.postingRule.findMany.mockResolvedValue([candidate()])
    mockTx.postingRule.findFirst.mockResolvedValue(candidate())
    const now = new Date("2026-09-30T12:00:00Z")
    const readiness = await getPostingRuleReadiness("org-1", [contract], mockTx as never, now)
    expect(readiness[0]).toMatchObject({ rule: { id: "selected" }, validationError: null })
    await getActivePostingRule("org-1", { ...contract, effectiveAt: now }, mockTx as never)
    const readinessQuery = mockTx.postingRule.findMany.mock.calls[0][0]
    const postingQuery = mockTx.postingRule.findFirst.mock.calls[0][0]
    expect(readinessQuery.orderBy).toEqual(postingQuery.orderBy)
    expect(readinessQuery.orderBy).toEqual([{ priority: "asc" }, { createdAt: "desc" }, { id: "asc" }])
    expect(readinessQuery.where).toMatchObject({ organizationId: "org-1", isActive: true, OR: [contract], AND: postingQuery.where.AND })
  })

  it("does not count a different source type as the required capability", async () => {
    mockTx.postingRule.findMany.mockResolvedValue([{ ...candidate(), sourceType: AccountingSourceType.MANUAL }])
    expect(await getPostingRuleReadiness("org-1", [contract], mockTx as never)).toEqual([{ ...contract, rule: null, validationError: null }])
  })

  it.each(["inactive", "nonleaf", "unmapped", "zero_multiplier", "foreign_account"])("rejects the selected %s rule without falling through to a lower rule", async (scenario) => {
    const bad = candidate("selected-bad")
    if (scenario === "inactive") mockTx.chartOfAccount.findMany.mockResolvedValue([])
    if (scenario === "nonleaf") mockTx.chartOfAccount.findMany.mockResolvedValue(mappedAccounts.map(a => ({ ...a, _count: { children: 1 } })))
    if (scenario === "unmapped") bad.lines[0].mappingKey = "UNKNOWN"
    if (scenario === "zero_multiplier") Object.assign(bad.lines[0], { multiplier: 0 })
    if (scenario === "foreign_account") Object.assign(bad.lines[0], { mappingKey: null, accountId: "foreign-account" })
    mockTx.postingRule.findMany.mockResolvedValue([bad, candidate("lower-priority")])
    const [result] = await getPostingRuleReadiness("org-1", [contract], mockTx as never)
    expect(result.rule?.id).toBe("selected-bad")
    expect(result.validationError).toEqual(expect.any(String))
  })

  it("propagates unavailable account reads instead of reporting a successful empty check", async () => {
    mockTx.postingRule.findMany.mockResolvedValue([candidate()])
    mockTx.chartOfAccount.findMany.mockRejectedValue(new Error("Database unavailable"))
    await expect(getPostingRuleReadiness("org-1", [contract], mockTx as never)).rejects.toThrow("Database unavailable")
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
