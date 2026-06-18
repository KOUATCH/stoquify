import { PostingRuleAmountSource, PostingRuleLineSide } from "@prisma/client"

jest.mock("@/prisma/db", () => ({
  db: {
    chartOfAccount: { findMany: jest.fn() },
    ledgerAuditEvent: { create: jest.fn() },
    postingRule: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
  },
}))

import {
  ensureDefaultAPPostingRules,
  ensureDefaultPayrollPostingRules,
  ensureDefaultPOSPostingRules,
  getDefaultPostingRuleTemplates,
} from "../default-posting-rules.service"

const mockTx = {
  chartOfAccount: { findMany: jest.fn() },
  ledgerAuditEvent: { create: jest.fn() },
  postingRule: {
    create: jest.fn(),
    findFirst: jest.fn(),
  },
}

const mappedAccounts = [
  "ACCOUNTS_RECEIVABLE",
  "SALES_REVENUE",
  "OUTPUT_VAT",
  "ACCOUNTS_PAYABLE",
  "INPUT_VAT",
  "COGS",
  "INVENTORY",
  "CASH_ON_HAND",
  "CARD_CLEARING",
  "MOBILE_MONEY_CLEARING",
  "BANK",
  "CHEQUE_CLEARING",
  "STORE_CREDIT_LIABILITY",
  "PAYROLL_GROSS_EXPENSE",
  "PAYROLL_EMPLOYER_CHARGE_EXPENSE",
  "EMPLOYEE_PAYABLES",
  "PAYROLL_WITHHOLDING_PAYABLE",
  "SOCIAL_CONTRIBUTIONS_PAYABLE",
].map((mappingKey, index) => ({
  id: `acct-${index + 1}`,
  code: String(400 + index),
  mappingKey,
  organizationId: "org-1",
  isActive: true,
  deletedAt: null,
  _count: { children: 0 },
}))

function resolveMappedAccounts(mappingKeys: string[], missing: string[] = []) {
  return mappedAccounts.filter((account) => mappingKeys.includes(account.mappingKey) && !missing.includes(account.mappingKey))
}

describe("default POS posting rules", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockTx.postingRule.findFirst.mockResolvedValue(null)
    mockTx.postingRule.create.mockImplementation(async ({ data }: { data: any }) => ({
      id: data.id ?? `rule-${data.code}`,
      ...data,
      lines: data.lines.create.map((line: any, index: number) => ({
        id: `line-${data.code}-${index + 1}`,
        ...line,
      })),
    }))
    mockTx.chartOfAccount.findMany.mockImplementation(async ({ where }: { where: any }) =>
      resolveMappedAccounts(where.mappingKey.in),
    )
    mockTx.ledgerAuditEvent.create.mockResolvedValue({ id: "audit-1" })
  })

  it("creates the sale, payment, refund, and void posting rules when they are missing", async () => {
    const rules = await ensureDefaultPOSPostingRules("org-1", "user-1", mockTx as never)

    expect(rules).toHaveLength(4)
    expect(mockTx.postingRule.create).toHaveBeenCalledTimes(4)
    expect(mockTx.postingRule.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          code: "POS-SALE-COMPLETION",
          lines: expect.objectContaining({
            create: expect.arrayContaining([
              expect.objectContaining({
                mappingKey: "ACCOUNTS_RECEIVABLE",
                side: PostingRuleLineSide.DEBIT,
                amountSource: PostingRuleAmountSource.GROSS_AMOUNT,
              }),
              expect.objectContaining({
                mappingKey: "SALES_REVENUE",
                side: PostingRuleLineSide.CREDIT,
                amountSource: PostingRuleAmountSource.NET_AMOUNT,
              }),
            ]),
          }),
        }),
      }),
    )
    expect(mockTx.postingRule.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          code: "POS-PAYMENT-RECEIPT",
          lines: expect.objectContaining({
            create: expect.arrayContaining([
              expect.objectContaining({ mappingKey: "CARD_CLEARING", condition: { paymentMethod: "CARD" } }),
              expect.objectContaining({ mappingKey: "MOBILE_MONEY_CLEARING", condition: { paymentMethod: "MOBILE_MONEY" } }),
              expect.objectContaining({ mappingKey: "ACCOUNTS_RECEIVABLE", side: PostingRuleLineSide.CREDIT }),
            ]),
          }),
        }),
      }),
    )
    expect(mockTx.postingRule.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          code: "POS-REFUND",
          lines: expect.objectContaining({
            create: expect.arrayContaining([
              expect.objectContaining({ mappingKey: "SALES_REVENUE", side: PostingRuleLineSide.DEBIT }),
              expect.objectContaining({ mappingKey: "CARD_CLEARING", side: PostingRuleLineSide.CREDIT }),
            ]),
          }),
        }),
      }),
    )
    expect(mockTx.postingRule.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          code: "POS-VOID",
          lines: expect.objectContaining({
            create: expect.arrayContaining([
              expect.objectContaining({ mappingKey: "SALES_REVENUE", side: PostingRuleLineSide.DEBIT }),
              expect.objectContaining({ mappingKey: "ACCOUNTS_RECEIVABLE", condition: { paymentMethod: "CREDIT" } }),
            ]),
          }),
        }),
      }),
    )
    expect(mockTx.ledgerAuditEvent.create).toHaveBeenCalledTimes(4)
  })

  it("validates existing rules instead of silently trusting stale mappings", async () => {
    mockTx.postingRule.findFirst
      .mockResolvedValueOnce({
        id: "sale-rule",
        code: "POS-SALE-COMPLETION",
        lines: [
          {
            lineNumber: 1,
            side: PostingRuleLineSide.DEBIT,
            mappingKey: "ACCOUNTS_RECEIVABLE",
            amountSource: PostingRuleAmountSource.GROSS_AMOUNT,
          },
          {
            lineNumber: 2,
            side: PostingRuleLineSide.CREDIT,
            mappingKey: "SALES_REVENUE",
            amountSource: PostingRuleAmountSource.NET_AMOUNT,
          },
        ],
      })
      .mockResolvedValueOnce({
        id: "payment-rule",
        code: "POS-PAYMENT-RECEIPT",
        lines: [
          {
            lineNumber: 1,
            side: PostingRuleLineSide.DEBIT,
            mappingKey: "CASH_ON_HAND",
            amountSource: PostingRuleAmountSource.SOURCE_AMOUNT,
          },
          {
            lineNumber: 2,
            side: PostingRuleLineSide.CREDIT,
            mappingKey: "ACCOUNTS_RECEIVABLE",
            amountSource: PostingRuleAmountSource.SOURCE_AMOUNT,
          },
        ],
      })
      .mockResolvedValueOnce({
        id: "refund-rule",
        code: "POS-REFUND",
        lines: [
          {
            lineNumber: 1,
            side: PostingRuleLineSide.DEBIT,
            mappingKey: "SALES_REVENUE",
            amountSource: PostingRuleAmountSource.NET_AMOUNT,
          },
          {
            lineNumber: 2,
            side: PostingRuleLineSide.CREDIT,
            mappingKey: "CARD_CLEARING",
            amountSource: PostingRuleAmountSource.SOURCE_AMOUNT,
          },
        ],
      })
      .mockResolvedValueOnce({
        id: "void-rule",
        code: "POS-VOID",
        lines: [
          {
            lineNumber: 1,
            side: PostingRuleLineSide.DEBIT,
            mappingKey: "SALES_REVENUE",
            amountSource: PostingRuleAmountSource.NET_AMOUNT,
          },
          {
            lineNumber: 2,
            side: PostingRuleLineSide.CREDIT,
            mappingKey: "CARD_CLEARING",
            amountSource: PostingRuleAmountSource.SOURCE_AMOUNT,
          },
        ],
      })

    await expect(ensureDefaultPOSPostingRules("org-1", "user-1", mockTx as never)).resolves.toHaveLength(4)

    expect(mockTx.postingRule.create).not.toHaveBeenCalled()
    expect(mockTx.chartOfAccount.findMany).toHaveBeenCalledTimes(4)
  })

  it("fails fast when a required clearing account mapping is missing", async () => {
    mockTx.chartOfAccount.findMany.mockImplementation(async ({ where }: { where: any }) =>
      resolveMappedAccounts(where.mappingKey.in, ["CARD_CLEARING"]),
    )

    await expect(ensureDefaultPOSPostingRules("org-1", "user-1", mockTx as never)).rejects.toThrow(/CARD_CLEARING/)
  })

  it("exposes balanced AP invoice and supplier payment recipes for accounting readiness", async () => {
    const apRules = await ensureDefaultAPPostingRules("org-1", "user-1", mockTx as never)

    expect(apRules).toHaveLength(2)
    expect(getDefaultPostingRuleTemplates().map((rule) => rule.code)).toEqual(
      expect.arrayContaining(["AP-SUPPLIER-INVOICE", "AP-SUPPLIER-PAYMENT"]),
    )
    expect(mockTx.postingRule.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          code: "AP-SUPPLIER-INVOICE",
          lines: expect.objectContaining({
            create: expect.arrayContaining([
              expect.objectContaining({
                mappingKey: "INVENTORY",
                side: PostingRuleLineSide.DEBIT,
                amountSource: PostingRuleAmountSource.NET_AMOUNT,
              }),
              expect.objectContaining({
                mappingKey: "INPUT_VAT",
                side: PostingRuleLineSide.DEBIT,
                amountSource: PostingRuleAmountSource.TAX_AMOUNT,
              }),
              expect.objectContaining({
                mappingKey: "ACCOUNTS_PAYABLE",
                side: PostingRuleLineSide.CREDIT,
                amountSource: PostingRuleAmountSource.GROSS_AMOUNT,
              }),
            ]),
          }),
        }),
      }),
    )
    expect(mockTx.postingRule.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          code: "AP-SUPPLIER-PAYMENT",
          lines: expect.objectContaining({
            create: expect.arrayContaining([
              expect.objectContaining({ mappingKey: "ACCOUNTS_PAYABLE", side: PostingRuleLineSide.DEBIT }),
              expect.objectContaining({ mappingKey: "BANK", condition: { paymentMethod: "BANK_TRANSFER" } }),
              expect.objectContaining({ mappingKey: "MOBILE_MONEY_CLEARING", condition: { paymentMethod: "MOBILE_MONEY" } }),
            ]),
          }),
        }),
      }),
    )
  })

  it("exposes balanced payroll run and payroll payment recipes for accounting readiness", async () => {
    const payrollRules = await ensureDefaultPayrollPostingRules("org-1", "user-1", mockTx as never)

    expect(payrollRules).toHaveLength(2)
    expect(getDefaultPostingRuleTemplates().map((rule) => rule.code)).toEqual(
      expect.arrayContaining(["PAYROLL-RUN", "PAYROLL-PAYMENT"]),
    )
    expect(mockTx.postingRule.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          code: "PAYROLL-RUN",
          lines: expect.objectContaining({
            create: expect.arrayContaining([
              expect.objectContaining({
                mappingKey: "PAYROLL_GROSS_EXPENSE",
                side: PostingRuleLineSide.DEBIT,
                amountSource: PostingRuleAmountSource.GROSS_AMOUNT,
              }),
              expect.objectContaining({
                mappingKey: "PAYROLL_EMPLOYER_CHARGE_EXPENSE",
                side: PostingRuleLineSide.DEBIT,
                amountSource: PostingRuleAmountSource.EMPLOYER_CHARGE_AMOUNT,
              }),
              expect.objectContaining({
                mappingKey: "EMPLOYEE_PAYABLES",
                side: PostingRuleLineSide.CREDIT,
                amountSource: PostingRuleAmountSource.NET_PAYABLE_AMOUNT,
              }),
              expect.objectContaining({
                mappingKey: "PAYROLL_WITHHOLDING_PAYABLE",
                side: PostingRuleLineSide.CREDIT,
                amountSource: PostingRuleAmountSource.EMPLOYEE_DEDUCTION_AMOUNT,
              }),
              expect.objectContaining({
                mappingKey: "SOCIAL_CONTRIBUTIONS_PAYABLE",
                side: PostingRuleLineSide.CREDIT,
                amountSource: PostingRuleAmountSource.EMPLOYER_CHARGE_AMOUNT,
              }),
            ]),
          }),
        }),
      }),
    )
    expect(mockTx.postingRule.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          code: "PAYROLL-PAYMENT",
          lines: expect.objectContaining({
            create: expect.arrayContaining([
              expect.objectContaining({ mappingKey: "EMPLOYEE_PAYABLES", side: PostingRuleLineSide.DEBIT }),
              expect.objectContaining({ mappingKey: "BANK", condition: { paymentMethod: "BANK_TRANSFER" } }),
              expect.objectContaining({ mappingKey: "MOBILE_MONEY_CLEARING", condition: { paymentMethod: "MOBILE_MONEY" } }),
            ]),
          }),
        }),
      }),
    )
  })
})
