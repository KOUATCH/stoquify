jest.mock("@/prisma/db", () => ({
  db: {
    accountingPeriod: { findFirst: jest.fn(), findMany: jest.fn() },
    chartOfAccount: { findMany: jest.fn() },
    journalEntryLine: { groupBy: jest.fn() },
    organizationAccountingSettings: { findUnique: jest.fn() },
    organization: { findUnique: jest.fn() },
  },
}));

import {
  ChartAccountNormalBalance,
  ChartAccountType,
  JournalEntryStatus,
  Prisma,
} from "@prisma/client";

import { db } from "@/prisma/db";
import {
  buildFinancialStatementsReadModel,
  getFinancialStatements,
} from "@/services/accounting/financial-statements.service";

const mockDb = db as unknown as {
  accountingPeriod: { findFirst: jest.Mock; findMany: jest.Mock };
  chartOfAccount: { findMany: jest.Mock };
  journalEntryLine: { groupBy: jest.Mock };
  organizationAccountingSettings: { findUnique: jest.Mock };
  organization: { findUnique: jest.Mock };
};

const period = {
  id: "period-2026-06",
  name: "June 2026",
  fiscalYearId: "fy-2026",
  startDate: new Date("2026-06-01T00:00:00.000Z"),
  endDate: new Date("2026-06-30T23:59:59.999Z"),
  status: "CLOSED",
};

const accounts = [
  account(
    "cash",
    "521",
    "Cash",
    ChartAccountType.ASSET,
    ChartAccountNormalBalance.DEBIT,
    "CASH_ON_HAND",
  ),
  account(
    "payable",
    "401",
    "Payables",
    ChartAccountType.LIABILITY,
    ChartAccountNormalBalance.CREDIT,
    "ACCOUNTS_PAYABLE",
  ),
  account(
    "equity",
    "101",
    "Capital",
    ChartAccountType.EQUITY,
    ChartAccountNormalBalance.CREDIT,
    "SHARE_CAPITAL",
  ),
  account(
    "sales",
    "701",
    "Sales",
    ChartAccountType.REVENUE,
    ChartAccountNormalBalance.CREDIT,
    "SALES_REVENUE",
  ),
  account(
    "cogs",
    "603",
    "Cost of sales",
    ChartAccountType.EXPENSE,
    ChartAccountNormalBalance.DEBIT,
    "COGS",
  ),
  account(
    "rent",
    "622",
    "Rent",
    ChartAccountType.EXPENSE,
    ChartAccountNormalBalance.DEBIT,
    null,
  ),
  account(
    "depreciation",
    "681",
    "Depreciation",
    ChartAccountType.EXPENSE,
    ChartAccountNormalBalance.DEBIT,
    "DEPRECIATION_EXPENSE",
  ),
  account(
    "interest",
    "671",
    "Interest",
    ChartAccountType.EXPENSE,
    ChartAccountNormalBalance.DEBIT,
    "INTEREST_EXPENSE",
  ),
  account(
    "tax",
    "891",
    "Income tax",
    ChartAccountType.EXPENSE,
    ChartAccountNormalBalance.DEBIT,
    "INCOME_TAX_EXPENSE",
  ),
];

function account(
  id: string,
  code: string,
  nameEn: string,
  type: ChartAccountType,
  normalBalance: ChartAccountNormalBalance,
  mappingKey: string | null,
) {
  return {
    id,
    code,
    nameEn,
    nameFr: null,
    type,
    normalBalance,
    mappingKey,
    syscohadaClass: code.slice(0, 1),
  };
}

describe("financial statements retain archived posted account evidence", () => {
  const descriptors = [
    { ...account("retained-cash", "571", "Retained cash", ChartAccountType.ASSET, ChartAccountNormalBalance.DEBIT, "CASH_ON_HAND"), deletedAt: new Date("2026-08-01"), organizationId: "org-1" },
    { ...account("retained-equity", "101", "Retained capital", ChartAccountType.EQUITY, ChartAccountNormalBalance.CREDIT, "SHARE_CAPITAL"), deletedAt: new Date("2026-08-01"), organizationId: "org-1" },
    { ...account("retained-sales", "701", "Retained revenue", ChartAccountType.REVENUE, ChartAccountNormalBalance.CREDIT, "SALES_REVENUE"), deletedAt: new Date("2026-08-01"), organizationId: "org-1" },
    { ...account("retained-expense", "622", "Retained expense", ChartAccountType.EXPENSE, ChartAccountNormalBalance.DEBIT, null), deletedAt: new Date("2026-08-01"), organizationId: "org-1" },
    { ...account("active-unused", "521", "Unused active account", ChartAccountType.ASSET, ChartAccountNormalBalance.DEBIT, null), deletedAt: null, organizationId: "org-1" },
    { ...account("archived-unused", "522", "Unused archived account", ChartAccountType.ASSET, ChartAccountNormalBalance.DEBIT, null), deletedAt: new Date("2026-08-01"), organizationId: "org-1" },
    { ...account("draft-only", "523", "Draft-only account", ChartAccountType.ASSET, ChartAccountNormalBalance.DEBIT, null), deletedAt: new Date("2026-08-01"), organizationId: "org-1" },
    { ...account("future-only", "524", "Future-only account", ChartAccountType.ASSET, ChartAccountNormalBalance.DEBIT, null), deletedAt: new Date("2026-08-01"), organizationId: "org-1" },
    { ...account("foreign", "525", "Other tenant account", ChartAccountType.ASSET, ChartAccountNormalBalance.DEBIT, null), deletedAt: new Date("2026-08-01"), organizationId: "org-other" },
  ];
  const entries = [
    { accountId: "retained-cash", debit: 200, credit: 0, entryDate: new Date("2026-05-15"), periodId: "period-may", status: "POSTED", organizationId: "org-1" },
    { accountId: "retained-equity", debit: 0, credit: 200, entryDate: new Date("2026-05-15"), periodId: "period-may", status: "POSTED", organizationId: "org-1" },
    { accountId: "retained-cash", debit: 100, credit: 0, entryDate: new Date("2026-06-15"), periodId: period.id, status: "POSTED", organizationId: "org-1" },
    { accountId: "retained-sales", debit: 0, credit: 100, entryDate: new Date("2026-06-15"), periodId: period.id, status: "POSTED", organizationId: "org-1" },
    { accountId: "retained-expense", debit: 30, credit: 0, entryDate: new Date("2026-06-16"), periodId: period.id, status: "REVERSED", organizationId: "org-1" },
    { accountId: "retained-cash", debit: 0, credit: 30, entryDate: new Date("2026-06-16"), periodId: period.id, status: "REVERSED", organizationId: "org-1" },
    { accountId: "draft-only", debit: 500, credit: 0, entryDate: new Date("2026-06-16"), periodId: period.id, status: "DRAFT", organizationId: "org-1" },
    { accountId: "future-only", debit: 600, credit: 0, entryDate: new Date("2026-07-16"), periodId: "period-july", status: "POSTED", organizationId: "org-1" },
    { accountId: "foreign", debit: 700, credit: 0, entryDate: new Date("2026-06-16"), periodId: period.id, status: "POSTED", organizationId: "org-other" },
  ];
  function matchingEntries(where: Record<string, any>) {
    const entryWhere = where.journalEntry ?? {};
    return entries.filter(entry =>
      (!where.organizationId || where.organizationId === entry.organizationId) &&
      (!entryWhere.organizationId || entryWhere.organizationId === entry.organizationId) &&
      (!entryWhere.status || entryWhere.status.in.includes(entry.status)) &&
      (!entryWhere.periodId || entryWhere.periodId === entry.periodId) &&
      (!entryWhere.entryDate?.gte || entry.entryDate >= entryWhere.entryDate.gte) &&
      (!entryWhere.entryDate?.lte || entry.entryDate <= entryWhere.entryDate.lte),
    );
  }
  let readDescriptors: typeof descriptors;

  beforeEach(() => {
    jest.clearAllMocks();
    readDescriptors = [];
    mockDb.accountingPeriod.findFirst.mockResolvedValue(period);
    mockDb.accountingPeriod.findMany.mockResolvedValue([period]);
    mockDb.organizationAccountingSettings.findUnique.mockResolvedValue({ baseCurrency: "XAF" });
    mockDb.organization.findUnique.mockResolvedValue({ currency: "XAF" });
    mockDb.chartOfAccount.findMany.mockImplementation(async ({ where }) => {
      readDescriptors = descriptors.filter(descriptor => {
        if (where.organizationId !== descriptor.organizationId || (where.type && !where.type.in.includes(descriptor.type))) return false;
        if (where.deletedAt === null && descriptor.deletedAt !== null) return false;
        return !where.OR || where.OR.some((condition: Record<string, any>) =>
          condition.deletedAt === null ? descriptor.deletedAt === null :
            condition.journalLines?.some && matchingEntries(condition.journalLines.some).some(entry => entry.accountId === descriptor.id),
        );
      });
      return readDescriptors;
    });
    mockDb.journalEntryLine.groupBy.mockImplementation(async ({ where }) => {
      const totals = new Map<string, { debit: number; credit: number }>();
      for (const entry of matchingEntries(where)) {
        const total = totals.get(entry.accountId) ?? { debit: 0, credit: 0 };
        total.debit += entry.debit;
        total.credit += entry.credit;
        totals.set(entry.accountId, total);
      }
      return [...totals].map(([accountId, total]) => ({ accountId, _count: { _all: 1, baseDebit: 1, baseCredit: 1 }, _sum: { baseDebit: new Prisma.Decimal(total.debit), baseCredit: new Prisma.Decimal(total.credit) } }));
    });
  });

  it("preserves prior-period opening evidence and archived current-period revenue and costs", async () => {
    const report = await getFinancialStatements({ organizationId: "org-1", periodId: period.id });
    expect(report.profitAndLoss.totals).toMatchObject({ revenue: "100.00", operatingExpenses: "30.00", netIncome: "70.00" });
    expect(report.balanceSheet.totals).toMatchObject({ assets: "270.00", equity: "200.00", accumulatedEarnings: "70.00", liabilitiesAndEquity: "270.00", difference: "0.00", isBalanced: true });
    expect(report.ledgerChecks.periodActivity.isBalanced).toBe(true);
    expect(report.ledgerChecks.cumulativeActivity.isBalanced).toBe(true);
  });

  it("includes current unused accounts while excluding archived rows without in-scope posted evidence", async () => {
    await getFinancialStatements({ organizationId: "org-1", periodId: period.id });
    expect(readDescriptors.map(descriptor => descriptor.id)).toEqual([
      "retained-cash", "retained-equity", "retained-sales", "retained-expense", "active-unused",
    ]);
    expect(mockDb.chartOfAccount.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ organizationId: "org-1", OR: [
        { deletedAt: null },
        { journalLines: { some: { organizationId: "org-1", journalEntry: { organizationId: "org-1", status: { in: ["POSTED", "REVERSED"] }, entryDate: { lte: period.endDate } } } } },
      ] }),
    }));
  });

  it("propagates a failed descriptor read rather than certifying a zero statement", async () => {
    mockDb.chartOfAccount.findMany.mockRejectedValue(new Error("account evidence unavailable"));
    await expect(getFinancialStatements({ organizationId: "org-1", periodId: period.id })).rejects.toThrow("account evidence unavailable");
  });

  it.each(["period", "cumulative"])("rejects missing %s account evidence instead of omitting posted amounts", async (scope) => {
    const unknownActivity = [{ accountId: "missing-account", _sum: { debit: new Prisma.Decimal(50), credit: new Prisma.Decimal(0) } }];
    mockDb.journalEntryLine.groupBy
      .mockResolvedValueOnce(scope === "period" ? unknownActivity : [])
      .mockResolvedValueOnce(scope === "cumulative" ? unknownActivity : []);
    await expect(getFinancialStatements({ organizationId: "org-1", periodId: period.id })).rejects.toThrow(/account evidence/i);
  });

  it("rejects foreign account descriptors even when a scoped ledger result refers to their ID", async () => {
    mockDb.chartOfAccount.findMany.mockResolvedValue([{ ...descriptors[0], organizationId: "org-other" }]);
    mockDb.journalEntryLine.groupBy.mockResolvedValue([{ accountId: "retained-cash", _sum: { debit: new Prisma.Decimal(50), credit: new Prisma.Decimal(0) } }]);
    await expect(getFinancialStatements({ organizationId: "org-1", periodId: period.id })).rejects.toThrow(/account evidence/i);
  });

  it("recognizes retained MEMO descriptors without classifying them as financial statement accounts", async () => {
    mockDb.chartOfAccount.findMany.mockResolvedValue([{
      ...account("memo", "900", "Memo only", ChartAccountType.MEMO, ChartAccountNormalBalance.DEBIT, null),
      organizationId: "org-1",
    }]);
    mockDb.journalEntryLine.groupBy.mockResolvedValue([{
      accountId: "memo", _count: { _all: 1, baseDebit: 1, baseCredit: 1 }, _sum: { baseDebit: new Prisma.Decimal(50), baseCredit: new Prisma.Decimal(50) },
    }]);
    const report = await getFinancialStatements({ organizationId: "org-1", periodId: period.id });
    expect(report.profitAndLoss.totals.revenue).toBe("0.00");
    expect(report.balanceSheet.totals.assets).toBe("0.00");
    expect(report.ledgerChecks.periodActivity.isBalanced).toBe(true);
  });
});

function activity(accountId: string, debit: number, credit: number) {
  return {
    accountId,
    _sum: {
      debit: new Prisma.Decimal(debit),
      credit: new Prisma.Decimal(credit),
    },
  };
}

describe("accounting financial statements", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("builds a reconciled P&L, management EBITDA bridge, and cumulative balance sheet", () => {
    const periodActivity = [
      activity("cash", 300, 0),
      activity("sales", 0, 1000),
      activity("cogs", 400, 0),
      activity("rent", 200, 0),
      activity("depreciation", 50, 0),
      activity("interest", 20, 0),
      activity("tax", 30, 0),
    ];
    const cumulativeActivity = [
      activity("cash", 1000, 0),
      activity("payable", 0, 300),
      activity("equity", 0, 400),
      activity("sales", 0, 1000),
      activity("cogs", 400, 0),
      activity("rent", 200, 0),
      activity("depreciation", 50, 0),
      activity("interest", 20, 0),
      activity("tax", 30, 0),
    ];

    const report = buildFinancialStatementsReadModel({
      organizationId: "org-1",
      currency: "xaf",
      period,
      availablePeriods: [period],
      accounts,
      periodActivity,
      cumulativeActivity,
      generatedAt: new Date("2026-07-01T08:00:00.000Z"),
    });

    expect(report.currency).toBe("XAF");
    expect(report.profitAndLoss.totals).toMatchObject({
      revenue: "1000.00",
      costOfSales: "400.00",
      grossProfit: "600.00",
      operatingExpenses: "200.00",
      ebitda: "400.00",
      operatingProfit: "350.00",
      profitBeforeTax: "330.00",
      netIncome: "300.00",
      grossMarginPercent: "60.0",
      ebitdaMarginPercent: "40.0",
      netMarginPercent: "30.0",
    });
    expect(report.profitAndLoss.ebitda.reconciliation).toEqual({
      netIncome: "300.00",
      incomeTax: "30.00",
      financeCosts: "20.00",
      depreciationAndAmortization: "50.00",
      ebitda: "400.00",
    });
    expect(report.profitAndLoss.ebitda.classification.status).toBe(
      "REVIEW_RECOMMENDED",
    );
    expect(
      report.profitAndLoss.ebitda.classification.operatingFallbackAccounts,
    ).toEqual([
      expect.objectContaining({
        accountId: "rent",
        classificationSource: "ACCOUNT_TYPE_FALLBACK",
      }),
    ]);
    expect(report.balanceSheet.totals).toEqual({
      assets: "1000.00",
      liabilities: "300.00",
      equity: "400.00",
      accumulatedEarnings: "300.00",
      liabilitiesAndEquity: "1000.00",
      difference: "0.00",
      isBalanced: true,
    });
    expect(report.ledgerChecks.periodActivity.isBalanced).toBe(true);
    expect(report.ledgerChecks.cumulativeActivity.isBalanced).toBe(true);
  });

  it("enforces tenant-owned periods and distinct period/cumulative ledger windows", async () => {
    mockDb.accountingPeriod.findFirst.mockResolvedValue(period);
    mockDb.accountingPeriod.findMany.mockResolvedValue([period]);
    mockDb.chartOfAccount.findMany.mockResolvedValue([]);
    mockDb.journalEntryLine.groupBy
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    mockDb.organizationAccountingSettings.findUnique.mockResolvedValue({
      baseCurrency: "XAF",
    });
    mockDb.organization.findUnique.mockResolvedValue({ currency: "USD" });

    await getFinancialStatements({
      organizationId: "org-1",
      periodId: period.id,
    });

    expect(mockDb.accountingPeriod.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: period.id, organizationId: "org-1" },
      }),
    );
    expect(mockDb.chartOfAccount.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org-1",
          OR: expect.arrayContaining([{ deletedAt: null }]),
        }),
      }),
    );
    expect(mockDb.journalEntryLine.groupBy).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: {
          organizationId: "org-1",
          journalEntry: expect.objectContaining({
            organizationId: "org-1",
            periodId: period.id,
            status: {
              in: [JournalEntryStatus.POSTED, JournalEntryStatus.REVERSED],
            },
            entryDate: { gte: period.startDate, lte: period.endDate },
          }),
        },
      }),
    );
    expect(mockDb.journalEntryLine.groupBy).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: {
          organizationId: "org-1",
          journalEntry: expect.objectContaining({
            organizationId: "org-1",
            status: {
              in: [JournalEntryStatus.POSTED, JournalEntryStatus.REVERSED],
            },
            entryDate: { lte: period.endDate },
          }),
        },
      }),
    );
  });

  it("aggregates 100 EUR and 100 XAF into 65,695.70 XAF without mixing nominal amounts", async () => {
    mockDb.accountingPeriod.findFirst.mockResolvedValue(period);
    mockDb.accountingPeriod.findMany.mockResolvedValue([period]);
    mockDb.chartOfAccount.findMany.mockResolvedValue(accounts.filter((value) => ["cash", "sales"].includes(value.id)).map((value) => ({ ...value, organizationId: "org-1" })));
    mockDb.organizationAccountingSettings.findUnique.mockResolvedValue({ baseCurrency: "XAF" });
    mockDb.organization.findUnique.mockResolvedValue({ currency: "XAF" });
    const entries: Array<{ accountId: string; debit: string; credit: string; baseDebit: string; baseCredit: string }> = [
      { accountId: "cash", debit: "100", credit: "0", baseDebit: "65595.70", baseCredit: "0" },
      { accountId: "cash", debit: "100", credit: "0", baseDebit: "100", baseCredit: "0" },
      { accountId: "sales", debit: "0", credit: "100", baseDebit: "0", baseCredit: "65595.70" },
      { accountId: "sales", debit: "0", credit: "100", baseDebit: "0", baseCredit: "100" },
    ];
    mockDb.journalEntryLine.groupBy.mockImplementation(async ({ _sum }) => ["cash", "sales"].map((accountId) => ({
      accountId,
      _count: { _all: 2, baseDebit: 2, baseCredit: 2 },
      _sum: Object.fromEntries(Object.keys(_sum).map((key) => [key, entries.filter((row) => row.accountId === accountId).reduce((sum, row) => sum.plus(row[key as "debit" | "credit" | "baseDebit" | "baseCredit"]), new Prisma.Decimal(0))])),
    })));
    const report = await getFinancialStatements({ organizationId: "org-1", periodId: period.id });
    expect(report.currency).toBe("XAF");
    expect(report.profitAndLoss.totals.revenue).toBe("65695.70");
    expect(report.balanceSheet.totals.assets).toBe("65695.70");
    expect(report.ledgerChecks.periodActivity).toMatchObject({ debit: "65695.70", credit: "65695.70", isBalanced: true });
  });

  it("rejects incomplete functional sums instead of silently dropping null historical amounts", async () => {
    mockDb.accountingPeriod.findFirst.mockResolvedValue(period);
    mockDb.accountingPeriod.findMany.mockResolvedValue([period]);
    mockDb.chartOfAccount.findMany.mockResolvedValue([{ ...accounts[0], organizationId: "org-1" }]);
    mockDb.organizationAccountingSettings.findUnique.mockResolvedValue({ baseCurrency: "XAF" });
    mockDb.organization.findUnique.mockResolvedValue({ currency: "XAF" });
    mockDb.journalEntryLine.groupBy.mockResolvedValue([{ accountId: "cash", _count: { _all: 2, baseDebit: 1, baseCredit: 2 }, _sum: { baseDebit: new Prisma.Decimal(100), baseCredit: new Prisma.Decimal(0) } }]);
    await expect(getFinancialStatements({ organizationId: "org-1", periodId: period.id })).rejects.toThrow(/functional-currency evidence/i);
  });

  it("rejects a period outside the organization before reading ledger data", async () => {
    mockDb.accountingPeriod.findFirst.mockResolvedValue(null);

    await expect(
      getFinancialStatements({
        organizationId: "org-1",
        periodId: "period-other-tenant",
      }),
    ).rejects.toThrow("Accounting period is unavailable for this organization");
    expect(mockDb.journalEntryLine.groupBy).not.toHaveBeenCalled();
  });
});
