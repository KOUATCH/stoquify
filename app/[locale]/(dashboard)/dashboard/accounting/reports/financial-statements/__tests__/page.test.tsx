import { render, screen } from "@testing-library/react";

import { getFinancialStatementsAction } from "@/actions/accounting/reports.actions";
import { checkPermission } from "@/config/useAuth";

import FinancialStatementsPage from "../page";

jest.mock("@/config/useAuth", () => ({
  checkPermission: jest.fn(),
}));

jest.mock("@/actions/accounting/reports.actions", () => ({
  getFinancialStatementsAction: jest.fn(),
}));

jest.mock("@/i18n/navigation", () => ({
  Link: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={String(href)} {...props}>
      {children}
    </a>
  ),
}));

jest.mock("lucide-react", () => {
  const React = jest.requireActual("react");
  const Icon = (props: Record<string, unknown>) =>
    React.createElement("svg", props);

  return {
    BadgeCheck: Icon,
    BarChart3: Icon,
    BookOpenText: Icon,
    Calculator: Icon,
    CircleAlert: Icon,
    FileBarChart2: Icon,
    Scale: Icon,
    ShieldCheck: Icon,
    TrendingUp: Icon,
  };
});

jest.mock("../../../_components/accounting-ui", () => ({
  AccountingPageShell: ({
    title,
    children,
  }: {
    title: string;
    children: React.ReactNode;
  }) => (
    <main>
      <h1>{title}</h1>
      {children}
    </main>
  ),
  AccountingPanel: ({
    title,
    description,
    children,
  }: {
    title: string;
    description?: string;
    children: React.ReactNode;
  }) => (
    <section>
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
      {children}
    </section>
  ),
  AccountingStatCard: ({ label, value }: { label: string; value: string }) => (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  ),
  AccountingLinkButton: ({
    href,
    children,
  }: {
    href: string;
    children: React.ReactNode;
  }) => <a href={href}>{children}</a>,
  accountingDate: (value: string) => value.slice(0, 10),
  formatAccountingMoney: (value: string | number, currency = "XAF") =>
    `${currency} ${Number(value).toFixed(0)}`,
}));

const mockCheckPermission = checkPermission as jest.Mock;
const mockGetFinancialStatementsAction =
  getFinancialStatementsAction as jest.Mock;

const report = {
  schemaVersion: "accounting-financial-statements.v1",
  organizationId: "org-1",
  generatedAt: "2026-07-01T00:00:00.000Z",
  currency: "XAF",
  period: {
    id: "period-1",
    name: "June 2026",
    fiscalYearId: "fy-2026",
    startDate: "2026-06-01T00:00:00.000Z",
    endDate: "2026-06-30T23:59:59.999Z",
    status: "CLOSED",
  },
  availablePeriods: [
    {
      id: "period-1",
      name: "June 2026",
      fiscalYearId: "fy-2026",
      startDate: "2026-06-01T00:00:00.000Z",
      endDate: "2026-06-30T23:59:59.999Z",
      status: "CLOSED",
    },
  ],
  source: {
    kind: "POSTED_LEDGER_READ_MODEL",
    entryStatuses: ["POSTED", "REVERSED"],
    profitAndLossWindow: "SELECTED_PERIOD_ACTIVITY",
    balanceSheetWindow: "CUMULATIVE_THROUGH_PERIOD_END",
    redactionStatus: "NO_CONTACT_AUTHENTICATION_OR_PERSON_LEVEL_PAYROLL_FIELDS",
  },
  certification: {
    status: "INTERNAL_ACCOUNTING_REPORT_ONLY",
    label: "Internal management report · not a certified OHADA filing",
    limitations: [],
  },
  ledgerChecks: {
    periodActivity: {
      debit: "1000.00",
      credit: "1000.00",
      difference: "0.00",
      isBalanced: true,
    },
    cumulativeActivity: {
      debit: "1000.00",
      credit: "1000.00",
      difference: "0.00",
      isBalanced: true,
    },
  },
  profitAndLoss: {
    sections: {
      revenue: [
        line("sales", "701", "Sales", "1000.00", "EXPLICIT_MAPPING_KEY"),
      ],
      costOfSales: [
        line("cogs", "603", "Cost of sales", "400.00", "EXPLICIT_MAPPING_KEY"),
      ],
      operatingExpenses: [
        line("rent", "622", "Rent", "200.00", "ACCOUNT_TYPE_FALLBACK"),
      ],
      depreciationAndAmortization: [],
      financeCosts: [],
      incomeTax: [],
    },
    totals: {
      revenue: "1000.00",
      costOfSales: "400.00",
      grossProfit: "600.00",
      operatingExpenses: "200.00",
      ebitda: "400.00",
      depreciationAndAmortization: "0.00",
      operatingProfit: "400.00",
      financeCosts: "0.00",
      profitBeforeTax: "400.00",
      incomeTax: "0.00",
      netIncome: "400.00",
      grossMarginPercent: "60.0",
      ebitdaMarginPercent: "40.0",
      netMarginPercent: "40.0",
    },
    ebitda: {
      status: "MANAGEMENT_PERFORMANCE_MEASURE",
      formula:
        "Net income + income tax + finance costs + depreciation and amortization",
      reconciliation: {
        netIncome: "400.00",
        incomeTax: "0.00",
        financeCosts: "0.00",
        depreciationAndAmortization: "0.00",
        ebitda: "400.00",
      },
      classification: {
        status: "REVIEW_RECOMMENDED",
        totalExpenseAccounts: 2,
        explicitlyMappedExpenseAccounts: 1,
        operatingFallbackAccounts: [
          line("rent", "622", "Rent", "200.00", "ACCOUNT_TYPE_FALLBACK"),
        ],
        guidance: "Review fallback accounts.",
      },
    },
  },
  balanceSheet: {
    sections: {
      assets: [line("cash", "521", "Cash", "1000.00", "ACCOUNT_TYPE_FALLBACK")],
      liabilities: [
        line("payable", "401", "Payables", "300.00", "ACCOUNT_TYPE_FALLBACK"),
      ],
      equity: [
        line("equity", "101", "Capital", "300.00", "ACCOUNT_TYPE_FALLBACK"),
      ],
    },
    totals: {
      assets: "1000.00",
      liabilities: "300.00",
      equity: "300.00",
      accumulatedEarnings: "400.00",
      liabilitiesAndEquity: "1000.00",
      difference: "0.00",
      isBalanced: true,
    },
  },
};

function line(
  accountId: string,
  code: string,
  nameEn: string,
  amount: string,
  classificationSource: string,
) {
  return {
    accountId,
    code,
    nameEn,
    nameFr: null,
    mappingKey: accountId.toUpperCase(),
    syscohadaClass: code.slice(0, 1),
    amount,
    classificationSource,
  };
}

describe("FinancialStatementsPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckPermission.mockResolvedValue(true);
    mockGetFinancialStatementsAction.mockResolvedValue({
      success: true,
      data: report,
    });
  });

  it("guards access and renders a period-scoped Profit & Loss with EBITDA disclosure", async () => {
    render(
      await FinancialStatementsPage({
        searchParams: Promise.resolve({
          periodId: "period-1",
          view: "profit-loss",
        }),
      }),
    );

    expect(mockCheckPermission).toHaveBeenCalledWith("accounting.reports.read");
    expect(mockGetFinancialStatementsAction).toHaveBeenCalledWith({
      periodId: "period-1",
    });
    expect(
      screen.getByRole("heading", { name: "Financial Reports" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Profit & Loss statement" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Internal management report · not a certified OHADA filing",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "EBITDA is shown for management analysis and comparability. It is not labelled as a SYSCOHADA statement line.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Currently treated as operating expense"),
    ).toBeInTheDocument();
  });

  it("stops before report data access when the route permission is denied", async () => {
    mockCheckPermission.mockRejectedValue(new Error("Forbidden"));

    await expect(FinancialStatementsPage({})).rejects.toThrow("Forbidden");
    expect(mockGetFinancialStatementsAction).not.toHaveBeenCalled();
  });

  it("keeps safe action errors inside the Accounting report surface", async () => {
    mockGetFinancialStatementsAction.mockResolvedValue({
      success: false,
      error: "Financial reports unavailable",
    });

    render(await FinancialStatementsPage({}));

    expect(
      screen.getByRole("heading", { name: "Financial reports unavailable" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Open accounting setup")).toBeInTheDocument();
  });
});
