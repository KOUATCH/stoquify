import {
  ChartAccountNormalBalance,
  ChartAccountType,
  JournalEntryStatus,
  Prisma,
} from "@prisma/client";

import { db } from "@/prisma/db";
import { BusinessRuleError } from "@/services/_shared/action-errors";

const COST_OF_SALES_MAPPING_KEYS = new Set([
  "COGS",
  "COST_OF_GOODS_SOLD",
  "COST_OF_SALES",
  "INVENTORY_VARIANCE",
]);

const DEPRECIATION_AMORTIZATION_MAPPING_KEYS = new Set([
  "AMORTIZATION_EXPENSE",
  "DEPRECIATION_AND_AMORTIZATION",
  "DEPRECIATION_EXPENSE",
]);

const FINANCE_COST_MAPPING_KEYS = new Set([
  "FINANCE_COST",
  "FINANCE_COSTS",
  "INTEREST_EXPENSE",
]);

const INCOME_TAX_MAPPING_KEYS = new Set([
  "CORPORATE_INCOME_TAX_EXPENSE",
  "INCOME_TAX_EXPENSE",
]);

const STATEMENT_ACCOUNT_TYPES = new Set<ChartAccountType>([
  ChartAccountType.ASSET,
  ChartAccountType.CONTRA_ASSET,
  ChartAccountType.CONTRA_REVENUE,
  ChartAccountType.EQUITY,
  ChartAccountType.EXPENSE,
  ChartAccountType.LIABILITY,
  ChartAccountType.REVENUE,
]);

export type FinancialStatementsInput = {
  organizationId: string;
  periodId?: string | null;
  now?: Date;
};

type StatementAccount = {
  id: string;
  code: string;
  nameEn: string;
  nameFr: string | null;
  type: ChartAccountType;
  normalBalance: ChartAccountNormalBalance;
  mappingKey: string | null;
  syscohadaClass: string | null;
};

type AggregatedAccountAmount = {
  accountId: string;
  _sum: {
    debit: Prisma.Decimal | null;
    credit: Prisma.Decimal | null;
  };
};

export type FinancialStatementLine = {
  accountId: string;
  code: string;
  nameEn: string;
  nameFr: string | null;
  mappingKey: string | null;
  syscohadaClass: string | null;
  amount: string;
  classificationSource: "EXPLICIT_MAPPING_KEY" | "ACCOUNT_TYPE_FALLBACK";
};

type StatementPeriod = {
  id: string;
  name: string;
  fiscalYearId: string;
  startDate: Date;
  endDate: Date;
  status: string;
};

type BuildFinancialStatementsInput = {
  organizationId: string;
  currency: string;
  period: StatementPeriod;
  availablePeriods: StatementPeriod[];
  accounts: StatementAccount[];
  periodActivity: AggregatedAccountAmount[];
  cumulativeActivity: AggregatedAccountAmount[];
  generatedAt?: Date;
};

function decimalZero() {
  return new Prisma.Decimal(0);
}

function money(value: Prisma.Decimal) {
  return value.toDecimalPlaces(2).toFixed(2);
}

function percent(numerator: Prisma.Decimal, denominator: Prisma.Decimal) {
  if (denominator.eq(0)) return null;
  return numerator.div(denominator).times(100).toDecimalPlaces(1).toFixed(1);
}

function normalizeMappingKey(value: string | null) {
  return value?.trim().toUpperCase() || null;
}

function amountMap(rows: AggregatedAccountAmount[]) {
  return new Map(
    rows.map((row) => [
      row.accountId,
      {
        debit: row._sum.debit ?? decimalZero(),
        credit: row._sum.credit ?? decimalZero(),
      },
    ]),
  );
}

function naturalAmount(
  account: StatementAccount,
  amounts: Map<string, { debit: Prisma.Decimal; credit: Prisma.Decimal }>,
) {
  const activity = amounts.get(account.id) ?? {
    debit: decimalZero(),
    credit: decimalZero(),
  };
  return account.normalBalance === ChartAccountNormalBalance.CREDIT
    ? activity.credit.minus(activity.debit)
    : activity.debit.minus(activity.credit);
}

function statementLine(
  account: StatementAccount,
  amount: Prisma.Decimal,
  classificationSource: FinancialStatementLine["classificationSource"],
): FinancialStatementLine {
  return {
    accountId: account.id,
    code: account.code,
    nameEn: account.nameEn,
    nameFr: account.nameFr,
    mappingKey: account.mappingKey,
    syscohadaClass: account.syscohadaClass,
    amount: money(amount),
    classificationSource,
  };
}

function sumLines(lines: FinancialStatementLine[]) {
  return lines.reduce((sum, line) => sum.plus(line.amount), decimalZero());
}

function nonZeroLines(lines: FinancialStatementLine[]) {
  return lines.filter((line) => !new Prisma.Decimal(line.amount).eq(0));
}

function expenseCategory(mappingKey: string | null) {
  if (mappingKey && COST_OF_SALES_MAPPING_KEYS.has(mappingKey))
    return "COST_OF_SALES" as const;
  if (mappingKey && DEPRECIATION_AMORTIZATION_MAPPING_KEYS.has(mappingKey))
    return "DEPRECIATION_AMORTIZATION" as const;
  if (mappingKey && FINANCE_COST_MAPPING_KEYS.has(mappingKey))
    return "FINANCE_COST" as const;
  if (mappingKey && INCOME_TAX_MAPPING_KEYS.has(mappingKey))
    return "INCOME_TAX" as const;
  return "OPERATING_EXPENSE" as const;
}

function classifyProfitAndLoss(
  accounts: StatementAccount[],
  amounts: Map<string, { debit: Prisma.Decimal; credit: Prisma.Decimal }>,
) {
  const revenue: FinancialStatementLine[] = [];
  const costOfSales: FinancialStatementLine[] = [];
  const operatingExpenses: FinancialStatementLine[] = [];
  const depreciationAndAmortization: FinancialStatementLine[] = [];
  const financeCosts: FinancialStatementLine[] = [];
  const incomeTax: FinancialStatementLine[] = [];

  for (const account of accounts) {
    const accountAmount = naturalAmount(account, amounts);

    if (account.type === ChartAccountType.REVENUE) {
      revenue.push(
        statementLine(account, accountAmount, "ACCOUNT_TYPE_FALLBACK"),
      );
      continue;
    }

    if (account.type === ChartAccountType.CONTRA_REVENUE) {
      revenue.push(
        statementLine(
          account,
          accountAmount.negated(),
          "ACCOUNT_TYPE_FALLBACK",
        ),
      );
      continue;
    }

    if (account.type !== ChartAccountType.EXPENSE) continue;

    const mappingKey = normalizeMappingKey(account.mappingKey);
    const category = expenseCategory(mappingKey);
    const source =
      category === "OPERATING_EXPENSE"
        ? "ACCOUNT_TYPE_FALLBACK"
        : "EXPLICIT_MAPPING_KEY";
    const line = statementLine(account, accountAmount, source);

    if (category === "COST_OF_SALES") costOfSales.push(line);
    if (category === "OPERATING_EXPENSE") operatingExpenses.push(line);
    if (category === "DEPRECIATION_AMORTIZATION")
      depreciationAndAmortization.push(line);
    if (category === "FINANCE_COST") financeCosts.push(line);
    if (category === "INCOME_TAX") incomeTax.push(line);
  }

  return {
    revenue: nonZeroLines(revenue),
    costOfSales: nonZeroLines(costOfSales),
    operatingExpenses: nonZeroLines(operatingExpenses),
    depreciationAndAmortization: nonZeroLines(depreciationAndAmortization),
    financeCosts: nonZeroLines(financeCosts),
    incomeTax: nonZeroLines(incomeTax),
  };
}

function statementActivityTotals(rows: AggregatedAccountAmount[]) {
  const debit = rows.reduce(
    (sum, row) => sum.plus(row._sum.debit ?? decimalZero()),
    decimalZero(),
  );
  const credit = rows.reduce(
    (sum, row) => sum.plus(row._sum.credit ?? decimalZero()),
    decimalZero(),
  );
  const difference = debit.minus(credit);

  return {
    debit: money(debit),
    credit: money(credit),
    difference: money(difference),
    isBalanced: difference.abs().lte(new Prisma.Decimal("0.01")),
  };
}

export function buildFinancialStatementsReadModel(
  input: BuildFinancialStatementsInput,
) {
  const statementAccounts = input.accounts.filter((account) =>
    STATEMENT_ACCOUNT_TYPES.has(account.type),
  );
  const periodAmounts = amountMap(input.periodActivity);
  const cumulativeAmounts = amountMap(input.cumulativeActivity);
  const periodProfitAndLoss = classifyProfitAndLoss(
    statementAccounts,
    periodAmounts,
  );
  const cumulativeProfitAndLoss = classifyProfitAndLoss(
    statementAccounts,
    cumulativeAmounts,
  );

  const revenue = sumLines(periodProfitAndLoss.revenue);
  const costOfSales = sumLines(periodProfitAndLoss.costOfSales);
  const operatingExpenses = sumLines(periodProfitAndLoss.operatingExpenses);
  const depreciationAndAmortization = sumLines(
    periodProfitAndLoss.depreciationAndAmortization,
  );
  const financeCosts = sumLines(periodProfitAndLoss.financeCosts);
  const incomeTax = sumLines(periodProfitAndLoss.incomeTax);
  const grossProfit = revenue.minus(costOfSales);
  const ebitda = grossProfit.minus(operatingExpenses);
  const operatingProfit = ebitda.minus(depreciationAndAmortization);
  const profitBeforeTax = operatingProfit.minus(financeCosts);
  const netIncome = profitBeforeTax.minus(incomeTax);

  const assets: FinancialStatementLine[] = [];
  const liabilities: FinancialStatementLine[] = [];
  const equity: FinancialStatementLine[] = [];

  for (const account of statementAccounts) {
    const amount = naturalAmount(account, cumulativeAmounts);
    if (amount.eq(0)) continue;

    if (account.type === ChartAccountType.ASSET) {
      assets.push(statementLine(account, amount, "ACCOUNT_TYPE_FALLBACK"));
    } else if (account.type === ChartAccountType.CONTRA_ASSET) {
      assets.push(
        statementLine(account, amount.negated(), "ACCOUNT_TYPE_FALLBACK"),
      );
    } else if (account.type === ChartAccountType.LIABILITY) {
      liabilities.push(statementLine(account, amount, "ACCOUNT_TYPE_FALLBACK"));
    } else if (account.type === ChartAccountType.EQUITY) {
      equity.push(statementLine(account, amount, "ACCOUNT_TYPE_FALLBACK"));
    }
  }

  const cumulativeRevenue = sumLines(cumulativeProfitAndLoss.revenue);
  const cumulativeExpenses = [
    ...cumulativeProfitAndLoss.costOfSales,
    ...cumulativeProfitAndLoss.operatingExpenses,
    ...cumulativeProfitAndLoss.depreciationAndAmortization,
    ...cumulativeProfitAndLoss.financeCosts,
    ...cumulativeProfitAndLoss.incomeTax,
  ];
  const accumulatedEarnings = cumulativeRevenue.minus(
    sumLines(cumulativeExpenses),
  );
  const totalAssets = sumLines(assets);
  const totalLiabilities = sumLines(liabilities);
  const totalEquity = sumLines(equity);
  const totalLiabilitiesAndEquity = totalLiabilities
    .plus(totalEquity)
    .plus(accumulatedEarnings);
  const balanceDifference = totalAssets.minus(totalLiabilitiesAndEquity);
  const fallbackExpenseAccounts = periodProfitAndLoss.operatingExpenses.filter(
    (line) => line.classificationSource === "ACCOUNT_TYPE_FALLBACK",
  );
  const explicitExpenseCount =
    periodProfitAndLoss.costOfSales.length +
    periodProfitAndLoss.depreciationAndAmortization.length +
    periodProfitAndLoss.financeCosts.length +
    periodProfitAndLoss.incomeTax.length;
  const totalExpenseCount =
    explicitExpenseCount + fallbackExpenseAccounts.length;

  return {
    schemaVersion: "accounting-financial-statements.v1" as const,
    organizationId: input.organizationId,
    generatedAt: (input.generatedAt ?? new Date()).toISOString(),
    currency: input.currency.trim().toUpperCase(),
    period: {
      ...input.period,
      startDate: input.period.startDate.toISOString(),
      endDate: input.period.endDate.toISOString(),
    },
    availablePeriods: input.availablePeriods.map((period) => ({
      ...period,
      startDate: period.startDate.toISOString(),
      endDate: period.endDate.toISOString(),
    })),
    source: {
      kind: "POSTED_LEDGER_READ_MODEL" as const,
      entryStatuses: [
        JournalEntryStatus.POSTED,
        JournalEntryStatus.REVERSED,
      ] as const,
      profitAndLossWindow: "SELECTED_PERIOD_ACTIVITY" as const,
      balanceSheetWindow: "CUMULATIVE_THROUGH_PERIOD_END" as const,
      redactionStatus:
        "NO_CONTACT_AUTHENTICATION_OR_PERSON_LEVEL_PAYROLL_FIELDS" as const,
    },
    certification: {
      status: "INTERNAL_ACCOUNTING_REPORT_ONLY" as const,
      label: "Internal management report · not a certified OHADA filing",
      limitations: [
        "Statement lines use account types and explicit mapping keys configured in the tenant chart of accounts.",
        "Close & Assurance controls have not certified or signed this presentation.",
      ],
    },
    ledgerChecks: {
      periodActivity: statementActivityTotals(input.periodActivity),
      cumulativeActivity: statementActivityTotals(input.cumulativeActivity),
    },
    profitAndLoss: {
      sections: periodProfitAndLoss,
      totals: {
        revenue: money(revenue),
        costOfSales: money(costOfSales),
        grossProfit: money(grossProfit),
        operatingExpenses: money(operatingExpenses),
        ebitda: money(ebitda),
        depreciationAndAmortization: money(depreciationAndAmortization),
        operatingProfit: money(operatingProfit),
        financeCosts: money(financeCosts),
        profitBeforeTax: money(profitBeforeTax),
        incomeTax: money(incomeTax),
        netIncome: money(netIncome),
        grossMarginPercent: percent(grossProfit, revenue),
        ebitdaMarginPercent: percent(ebitda, revenue),
        netMarginPercent: percent(netIncome, revenue),
      },
      ebitda: {
        status: "MANAGEMENT_PERFORMANCE_MEASURE" as const,
        formula:
          "Net income + income tax + finance costs + depreciation and amortization",
        reconciliation: {
          netIncome: money(netIncome),
          incomeTax: money(incomeTax),
          financeCosts: money(financeCosts),
          depreciationAndAmortization: money(depreciationAndAmortization),
          ebitda: money(
            netIncome
              .plus(incomeTax)
              .plus(financeCosts)
              .plus(depreciationAndAmortization),
          ),
        },
        classification: {
          status: fallbackExpenseAccounts.length
            ? ("REVIEW_RECOMMENDED" as const)
            : ("EXPLICIT" as const),
          totalExpenseAccounts: totalExpenseCount,
          explicitlyMappedExpenseAccounts: explicitExpenseCount,
          operatingFallbackAccounts: fallbackExpenseAccounts,
          guidance: fallbackExpenseAccounts.length
            ? "Review fallback operating-expense accounts and add explicit mapping keys for any depreciation, amortization, finance-cost, or income-tax accounts."
            : "All non-zero expense accounts in this period use an explicit EBITDA category mapping.",
        },
      },
    },
    balanceSheet: {
      sections: { assets, liabilities, equity },
      totals: {
        assets: money(totalAssets),
        liabilities: money(totalLiabilities),
        equity: money(totalEquity),
        accumulatedEarnings: money(accumulatedEarnings),
        liabilitiesAndEquity: money(totalLiabilitiesAndEquity),
        difference: money(balanceDifference),
        isBalanced: balanceDifference.abs().lte(new Prisma.Decimal("0.01")),
      },
    },
  };
}

export async function getFinancialStatements(input: FinancialStatementsInput) {
  const now = input.now ?? new Date();
  const requestedPeriod = input.periodId
    ? await db.accountingPeriod.findFirst({
        where: { id: input.periodId, organizationId: input.organizationId },
        select: {
          id: true,
          name: true,
          fiscalYearId: true,
          startDate: true,
          endDate: true,
          status: true,
        },
      })
    : await db.accountingPeriod.findFirst({
        where: {
          organizationId: input.organizationId,
          startDate: { lte: now },
        },
        orderBy: [{ endDate: "desc" }, { createdAt: "desc" }],
        select: {
          id: true,
          name: true,
          fiscalYearId: true,
          startDate: true,
          endDate: true,
          status: true,
        },
      });

  if (!requestedPeriod) {
    throw new BusinessRuleError(
      input.periodId
        ? "Accounting period is unavailable for this organization"
        : "Create an accounting period before generating financial statements",
    );
  }

  const statementTypes = Array.from(STATEMENT_ACCOUNT_TYPES);
  const [
    availablePeriods,
    accounts,
    periodActivity,
    cumulativeActivity,
    settings,
    organization,
  ] = await Promise.all([
    db.accountingPeriod.findMany({
      where: { organizationId: input.organizationId },
      orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
      take: 60,
      select: {
        id: true,
        name: true,
        fiscalYearId: true,
        startDate: true,
        endDate: true,
        status: true,
      },
    }),
    db.chartOfAccount.findMany({
      where: {
        organizationId: input.organizationId,
        deletedAt: null,
        type: { in: statementTypes },
      },
      orderBy: { code: "asc" },
      select: {
        id: true,
        code: true,
        nameEn: true,
        nameFr: true,
        type: true,
        normalBalance: true,
        mappingKey: true,
        syscohadaClass: true,
      },
    }),
    db.journalEntryLine.groupBy({
      by: ["accountId"],
      where: {
        organizationId: input.organizationId,
        journalEntry: {
          organizationId: input.organizationId,
          periodId: requestedPeriod.id,
          status: {
            in: [JournalEntryStatus.POSTED, JournalEntryStatus.REVERSED],
          },
          entryDate: {
            gte: requestedPeriod.startDate,
            lte: requestedPeriod.endDate,
          },
        },
      },
      _sum: { debit: true, credit: true },
    }),
    db.journalEntryLine.groupBy({
      by: ["accountId"],
      where: {
        organizationId: input.organizationId,
        journalEntry: {
          organizationId: input.organizationId,
          status: {
            in: [JournalEntryStatus.POSTED, JournalEntryStatus.REVERSED],
          },
          entryDate: { lte: requestedPeriod.endDate },
        },
      },
      _sum: { debit: true, credit: true },
    }),
    db.organizationAccountingSettings.findUnique({
      where: { organizationId: input.organizationId },
      select: { baseCurrency: true },
    }),
    db.organization.findUnique({
      where: { id: input.organizationId },
      select: { currency: true },
    }),
  ]);

  return buildFinancialStatementsReadModel({
    organizationId: input.organizationId,
    currency: settings?.baseCurrency || organization?.currency || "XAF",
    period: requestedPeriod,
    availablePeriods,
    accounts,
    periodActivity,
    cumulativeActivity,
  });
}

export type FinancialStatementsReport = Awaited<
  ReturnType<typeof getFinancialStatements>
>;
