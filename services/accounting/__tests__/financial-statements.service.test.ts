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
          deletedAt: null,
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
