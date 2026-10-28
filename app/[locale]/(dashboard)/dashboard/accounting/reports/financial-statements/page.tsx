import {
  BadgeCheck,
  BarChart3,
  BookOpenText,
  Calculator,
  CircleAlert,
  FileBarChart2,
  Scale,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";

import { getFinancialStatementsAction } from "@/actions/accounting/reports.actions";
import { checkPermission } from "@/config/useAuth";
import { Link } from "@/i18n/navigation";
import type {
  FinancialStatementLine,
  FinancialStatementsReport,
} from "@/services/accounting/financial-statements.service";
import {
  AccountingLinkButton,
  AccountingPageShell,
  AccountingPanel,
  AccountingStatCard,
  accountingDate,
  formatAccountingMoney,
} from "../../_components/accounting-ui";
import { routeByKey, withAccountingSurfaceAccess } from "../../accounting-route-access"

type ReportView = "overview" | "profit-loss" | "balance-sheet";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function reportView(value: string | undefined): ReportView {
  return value === "profit-loss" || value === "balance-sheet"
    ? value
    : "overview";
}

function reportHref(periodId: string, view: ReportView) {
  return `/dashboard/accounting/reports/financial-statements?periodId=${encodeURIComponent(periodId)}&view=${view}`;
}

function signedMoney(value: string, currency: string) {
  return formatAccountingMoney(value, currency);
}

function MetricRow({
  label,
  value,
  currency,
  emphasis = false,
  detail,
}: {
  label: string;
  value: string;
  currency: string;
  emphasis?: boolean;
  detail?: string;
}) {
  const negative = Number(value) < 0;

  return (
    <div
      className={`flex items-center justify-between gap-4 px-4 py-3 ${emphasis ? "bg-[var(--dash-brand-soft)]" : ""}`}
    >
      <div className="min-w-0">
        <div
          className={`${emphasis ? "font-semibold text-[var(--dash-text)]" : "text-[var(--dash-text-soft)]"}`}
        >
          {label}
        </div>
        {detail ? (
          <div className="mt-0.5 text-xs text-[var(--dash-text-faint)]">
            {detail}
          </div>
        ) : null}
      </div>
      <div
        className={`shrink-0 text-right font-mono font-semibold tabular-nums ${negative ? "text-[var(--dash-danger)]" : "text-[var(--dash-text)]"}`}
      >
        {signedMoney(value, currency)}
      </div>
    </div>
  );
}

function StatementLines({
  title,
  lines,
  total,
  currency,
  open = false,
}: {
  title: string;
  lines: FinancialStatementLine[];
  total: string;
  currency: string;
  open?: boolean;
}) {
  return (
    <details
      className="group border-b border-[var(--dash-border-subtle)] last:border-b-0"
      open={open}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 transition hover:bg-[var(--dash-surface-muted)] marker:content-none">
        <div className="min-w-0">
          <div className="font-medium text-[var(--dash-text)]">{title}</div>
          <div className="mt-0.5 text-xs text-[var(--dash-text-faint)]">
            {lines.length} active {lines.length === 1 ? "account" : "accounts"}{" "}
            · select to review
          </div>
        </div>
        <div className="shrink-0 text-right font-mono font-semibold tabular-nums text-[var(--dash-text)]">
          {signedMoney(total, currency)}
        </div>
      </summary>
      <div className="max-h-[28rem] overflow-auto border-t border-[var(--dash-border-subtle)]">
        <table className="dashboard-table-base w-full min-w-[640px] text-sm">
          <caption className="sr-only">{title} account detail</caption>
          <thead className="sticky top-0 z-10 bg-[var(--dash-surface)] text-left text-[0.68rem] uppercase tracking-[0.12em] text-[var(--dash-text-faint)]">
            <tr>
              <th className="px-4 py-2.5 font-semibold">Account</th>
              <th className="px-4 py-2.5 font-semibold">Classification</th>
              <th className="px-4 py-2.5 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {lines.length ? (
              lines.map((line) => (
                <tr
                  key={line.accountId}
                  className="border-t border-[var(--dash-border-subtle)]"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-[var(--dash-text)]">
                      {line.code} · {line.nameEn}
                    </div>
                    <div className="mt-0.5 text-xs text-[var(--dash-text-faint)]">
                      {line.mappingKey || "No mapping key"}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--dash-text-soft)]">
                    {line.classificationSource === "EXPLICIT_MAPPING_KEY"
                      ? "Explicit mapping"
                      : "Account-type fallback"}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-medium tabular-nums text-[var(--dash-text)]">
                    {signedMoney(line.amount, currency)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={3}
                  className="px-4 py-8 text-center text-sm text-[var(--dash-text-soft)]"
                >
                  No posted activity in this section for the selected period.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function Overview({ report }: { report: FinancialStatementsReport }) {
  const { totals, ebitda } = report.profitAndLoss;
  const balance = report.balanceSheet.totals;

  return (
    <div className="grid gap-4 xl:grid-cols-12">
      <div className="xl:col-span-5">
        <AccountingPanel
          title="Performance bridge"
          description="A compact path from revenue to net income."
        >
          <div className="divide-y divide-[var(--dash-border-subtle)] text-sm">
            <MetricRow
              label="Net revenue"
              value={totals.revenue}
              currency={report.currency}
            />
            <MetricRow
              label="Cost of sales"
              value={totals.costOfSales}
              currency={report.currency}
            />
            <MetricRow
              label="Gross profit"
              value={totals.grossProfit}
              currency={report.currency}
              emphasis
              detail={`${totals.grossMarginPercent ?? "—"}% gross margin`}
            />
            <MetricRow
              label="Operating expenses"
              value={totals.operatingExpenses}
              currency={report.currency}
            />
            <MetricRow
              label="Management EBITDA"
              value={totals.ebitda}
              currency={report.currency}
              emphasis
              detail={`${totals.ebitdaMarginPercent ?? "—"}% EBITDA margin`}
            />
            <MetricRow
              label="Net income"
              value={totals.netIncome}
              currency={report.currency}
              emphasis
              detail={`${totals.netMarginPercent ?? "—"}% net margin`}
            />
          </div>
        </AccountingPanel>
      </div>

      <div className="xl:col-span-4">
        <AccountingPanel
          title="EBITDA reconciliation"
          description="Transparent management measure; not a statutory subtotal."
        >
          <div className="divide-y divide-[var(--dash-border-subtle)] text-sm">
            <MetricRow
              label="Net income"
              value={ebitda.reconciliation.netIncome}
              currency={report.currency}
            />
            <MetricRow
              label="Add: income tax"
              value={ebitda.reconciliation.incomeTax}
              currency={report.currency}
            />
            <MetricRow
              label="Add: finance costs"
              value={ebitda.reconciliation.financeCosts}
              currency={report.currency}
            />
            <MetricRow
              label="Add: depreciation & amortization"
              value={ebitda.reconciliation.depreciationAndAmortization}
              currency={report.currency}
            />
            <MetricRow
              label="Management EBITDA"
              value={ebitda.reconciliation.ebitda}
              currency={report.currency}
              emphasis
            />
          </div>
          <div
            className={`border-t px-4 py-3 text-xs leading-5 ${ebitda.classification.status === "REVIEW_RECOMMENDED" ? "border-[var(--dash-warning)] bg-[var(--dash-warning-soft)] text-[var(--dash-text)]" : "border-[var(--dash-success)] bg-[var(--dash-success-soft)] text-[var(--dash-text)]"}`}
          >
            <div className="flex items-start gap-2">
              {ebitda.classification.status === "REVIEW_RECOMMENDED" ? (
                <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-[var(--dash-warning)]" />
              ) : (
                <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--dash-success)]" />
              )}
              <div>
                <div className="font-semibold">
                  {ebitda.classification.explicitlyMappedExpenseAccounts} of{" "}
                  {ebitda.classification.totalExpenseAccounts} active expense
                  accounts use an explicit EBITDA category.
                </div>
                <div className="mt-1 text-[var(--dash-text-soft)]">
                  {ebitda.classification.guidance}
                </div>
              </div>
            </div>
          </div>
        </AccountingPanel>
      </div>

      <div className="xl:col-span-3">
        <AccountingPanel
          title="Position snapshot"
          description={`Cumulative through ${accountingDate(report.period.endDate)}.`}
        >
          <div className="divide-y divide-[var(--dash-border-subtle)] text-sm">
            <MetricRow
              label="Assets"
              value={balance.assets}
              currency={report.currency}
            />
            <MetricRow
              label="Liabilities"
              value={balance.liabilities}
              currency={report.currency}
            />
            <MetricRow
              label="Equity"
              value={balance.equity}
              currency={report.currency}
            />
            <MetricRow
              label="Accumulated earnings"
              value={balance.accumulatedEarnings}
              currency={report.currency}
            />
            <MetricRow
              label="Liabilities + equity"
              value={balance.liabilitiesAndEquity}
              currency={report.currency}
              emphasis
            />
          </div>
          <div
            className={`border-t px-4 py-3 text-xs ${balance.isBalanced ? "border-[var(--dash-success)] bg-[var(--dash-success-soft)]" : "border-[var(--dash-danger)] bg-[var(--dash-danger-soft)]"}`}
          >
            <div className="flex items-center gap-2 font-semibold text-[var(--dash-text)]">
              <Scale
                className={`h-4 w-4 ${balance.isBalanced ? "text-[var(--dash-success)]" : "text-[var(--dash-danger)]"}`}
              />
              {balance.isBalanced
                ? "Balance equation reconciles"
                : `Difference ${signedMoney(balance.difference, report.currency)}`}
            </div>
          </div>
        </AccountingPanel>
      </div>
    </div>
  );
}

function ProfitAndLoss({ report }: { report: FinancialStatementsReport }) {
  const { sections, totals, ebitda } = report.profitAndLoss;

  return (
    <div className="grid gap-4 xl:grid-cols-12">
      <div className="xl:col-span-8">
        <AccountingPanel
          title="Profit & Loss statement"
          description={`${accountingDate(report.period.startDate)} to ${accountingDate(report.period.endDate)} · posted ledger activity only.`}
        >
          <StatementLines
            title="Revenue"
            lines={sections.revenue}
            total={totals.revenue}
            currency={report.currency}
            open
          />
          <StatementLines
            title="Cost of sales"
            lines={sections.costOfSales}
            total={totals.costOfSales}
            currency={report.currency}
          />
          <MetricRow
            label="Gross profit"
            value={totals.grossProfit}
            currency={report.currency}
            emphasis
            detail={`${totals.grossMarginPercent ?? "—"}% margin`}
          />
          <StatementLines
            title="Operating expenses"
            lines={sections.operatingExpenses}
            total={totals.operatingExpenses}
            currency={report.currency}
          />
          <MetricRow
            label="Management EBITDA"
            value={totals.ebitda}
            currency={report.currency}
            emphasis
            detail={`${totals.ebitdaMarginPercent ?? "—"}% margin`}
          />
          <StatementLines
            title="Depreciation & amortization"
            lines={sections.depreciationAndAmortization}
            total={totals.depreciationAndAmortization}
            currency={report.currency}
          />
          <MetricRow
            label="Operating profit"
            value={totals.operatingProfit}
            currency={report.currency}
            emphasis
          />
          <StatementLines
            title="Finance costs"
            lines={sections.financeCosts}
            total={totals.financeCosts}
            currency={report.currency}
          />
          <MetricRow
            label="Profit before tax"
            value={totals.profitBeforeTax}
            currency={report.currency}
            emphasis
          />
          <StatementLines
            title="Income tax"
            lines={sections.incomeTax}
            total={totals.incomeTax}
            currency={report.currency}
          />
          <MetricRow
            label="Net income"
            value={totals.netIncome}
            currency={report.currency}
            emphasis
            detail={`${totals.netMarginPercent ?? "—"}% margin`}
          />
        </AccountingPanel>
      </div>

      <div className="space-y-4 xl:col-span-4">
        <AccountingPanel
          title="Management EBITDA"
          description="Formula and account-classification control."
        >
          <div className="p-4 text-sm leading-6 text-[var(--dash-text-soft)]">
            <div className="rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-surface-muted)] p-3 font-mono text-xs text-[var(--dash-text)]">
              {ebitda.formula}
            </div>
            <p className="mt-3">
              EBITDA is shown for management analysis and comparability. It is
              not labelled as a SYSCOHADA statement line.
            </p>
          </div>
        </AccountingPanel>

        <AccountingPanel
          title="Classification review"
          description="Accounts that need finance-team confirmation."
        >
          <div className="p-4 text-sm">
            <div className="flex items-center justify-between gap-3 text-[var(--dash-text)]">
              <span>Operating fallback accounts</span>
              <span className="rounded-full bg-[var(--dash-warning-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--dash-warning)]">
                {ebitda.classification.operatingFallbackAccounts.length}
              </span>
            </div>
            <p className="mt-2 text-xs leading-5 text-[var(--dash-text-soft)]">
              {ebitda.classification.guidance}
            </p>
            {ebitda.classification.operatingFallbackAccounts.length ? (
              <div className="mt-3 max-h-56 space-y-2 overflow-auto pe-1">
                {ebitda.classification.operatingFallbackAccounts.map((line) => (
                  <div
                    key={line.accountId}
                    className="rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-surface-muted)] px-3 py-2"
                  >
                    <div className="font-medium text-[var(--dash-text)]">
                      {line.code} · {line.nameEn}
                    </div>
                    <div className="mt-0.5 text-xs text-[var(--dash-text-faint)]">
                      Currently treated as operating expense
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </AccountingPanel>
      </div>
    </div>
  );
}

function BalanceSheet({ report }: { report: FinancialStatementsReport }) {
  const { sections, totals } = report.balanceSheet;

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <AccountingPanel
        title="Assets"
        description={`Balances accumulated through ${accountingDate(report.period.endDate)}.`}
      >
        <StatementLines
          title="Asset accounts"
          lines={sections.assets}
          total={totals.assets}
          currency={report.currency}
          open
        />
        <MetricRow
          label="Total assets"
          value={totals.assets}
          currency={report.currency}
          emphasis
        />
      </AccountingPanel>

      <AccountingPanel
        title="Liabilities & equity"
        description="Obligations, contributed equity, and accumulated ledger earnings."
      >
        <StatementLines
          title="Liabilities"
          lines={sections.liabilities}
          total={totals.liabilities}
          currency={report.currency}
          open
        />
        <StatementLines
          title="Equity"
          lines={sections.equity}
          total={totals.equity}
          currency={report.currency}
          open
        />
        <MetricRow
          label="Accumulated earnings"
          value={totals.accumulatedEarnings}
          currency={report.currency}
          detail="Revenue less expenses cumulatively through period end"
        />
        <MetricRow
          label="Total liabilities & equity"
          value={totals.liabilitiesAndEquity}
          currency={report.currency}
          emphasis
        />
      </AccountingPanel>

      <div className="xl:col-span-2">
        <div
          className={`rounded-lg border p-4 ${totals.isBalanced ? "border-[var(--dash-success)] bg-[var(--dash-success-soft)]" : "border-[var(--dash-danger)] bg-[var(--dash-danger-soft)]"}`}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <Scale
                className={`mt-0.5 h-5 w-5 shrink-0 ${totals.isBalanced ? "text-[var(--dash-success)]" : "text-[var(--dash-danger)]"}`}
              />
              <div>
                <div className="font-semibold text-[var(--dash-text)]">
                  {totals.isBalanced
                    ? "Accounting equation reconciles"
                    : "Balance Sheet requires review"}
                </div>
                <div className="mt-1 text-sm text-[var(--dash-text-soft)]">
                  Assets minus liabilities and equity equals{" "}
                  {signedMoney(totals.difference, report.currency)}.
                </div>
              </div>
            </div>
            <div className="font-mono text-lg font-semibold tabular-nums text-[var(--dash-text)]">
              {signedMoney(totals.difference, report.currency)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

async function FinancialStatementsPageImpl({
  searchParams,
}: PageProps) {
  await checkPermission("accounting.reports.read");

  const params = searchParams ? await searchParams : {};
  const periodId = firstParam(params.periodId);
  const view = reportView(firstParam(params.view));
  const response = await getFinancialStatementsAction({
    periodId: periodId || undefined,
  });
  const report = response.success
    ? (response.data as FinancialStatementsReport)
    : null;

  return (
    <AccountingPageShell
      eyebrow="Accounting reports"
      title="Financial Reports"
      description="Decision-ready Profit & Loss, management EBITDA, and Balance Sheet views from the posted ledger."
      icon={FileBarChart2}
      actions={
        <AccountingLinkButton
          href="/dashboard/accounting/reports/trial-balance"
          variant="outline"
        >
          <Scale className="h-4 w-4" />
          <span>Trial balance</span>
        </AccountingLinkButton>
      }
    >
      {!report ? (
        <AccountingPanel
          title="Financial reports unavailable"
          description={response.error || "Report data is unavailable."}
        >
          <div className="flex flex-col gap-3 p-6 text-sm text-[var(--dash-text-soft)] sm:flex-row sm:items-center sm:justify-between">
            <span>
              Create an accounting period and confirm report access for this
              role.
            </span>
            <AccountingLinkButton
              href="/dashboard/accounting/setup"
              variant="outline"
            >
              Open accounting setup
            </AccountingLinkButton>
          </div>
        </AccountingPanel>
      ) : (
        <div className="space-y-5">
          <div className="rounded-lg border border-[var(--dash-info)] bg-[var(--dash-info-soft)] p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[var(--dash-info)]" />
                <div className="min-w-0">
                  <div className="font-semibold text-[var(--dash-text)]">
                    {report.certification.label}
                  </div>
                  <div className="mt-1 text-sm leading-6 text-[var(--dash-text-soft)]">
                    Source: posted and reversed journal lines · P&amp;L uses
                    selected-period activity · Balance Sheet is cumulative
                    through period end.
                  </div>
                </div>
              </div>
              <div className="shrink-0 rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-surface)] px-3 py-2 text-xs text-[var(--dash-text-soft)]">
                <div className="font-semibold text-[var(--dash-text)]">
                  {report.period.name} · {report.period.status}
                </div>
                <div className="mt-1">
                  {accountingDate(report.period.startDate)} –{" "}
                  {accountingDate(report.period.endDate)}
                </div>
              </div>
            </div>
          </div>

          <div className="dashboard-glass-panel rounded-lg border border-[var(--dash-border-subtle)] p-3">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <form
                className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-end"
                method="get"
              >
                <input type="hidden" name="view" value={view} />
                <label className="min-w-0 text-xs font-semibold uppercase tracking-[0.1em] text-[var(--dash-text-faint)]">
                  Accounting period
                  <select
                    name="periodId"
                    defaultValue={report.period.id}
                    className="mt-1 block h-10 w-full min-w-0 rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-surface)] px-3 text-sm normal-case tracking-normal text-[var(--dash-text)] outline-none focus:border-[var(--dash-brand)] sm:w-72"
                  >
                    {report.availablePeriods.map((period) => (
                      <option key={period.id} value={period.id}>
                        {period.name} · {period.status}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="submit"
                  className="dashboard-button-secondary h-10 rounded-lg px-4 text-sm font-semibold"
                >
                  Apply period
                </button>
              </form>

              <nav
                aria-label="Financial report views"
                className="grid grid-cols-3 gap-1 rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-surface-muted)] p-1"
              >
                {(
                  [
                    ["overview", "Overview", BarChart3],
                    ["profit-loss", "Profit & Loss", TrendingUp],
                    ["balance-sheet", "Balance Sheet", BookOpenText],
                  ] as const
                ).map(([value, label, Icon]) => (
                  <Link
                    key={value}
                    href={reportHref(report.period.id, value)}
                    aria-current={view === value ? "page" : undefined}
                    className={`flex min-h-9 items-center justify-center gap-2 rounded-md px-2.5 py-2 text-xs font-semibold transition sm:text-sm ${view === value ? "bg-[var(--dash-brand)] text-white shadow-sm" : "text-[var(--dash-text-soft)] hover:bg-[var(--dash-surface)] hover:text-[var(--dash-text)]"}`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{label}</span>
                  </Link>
                ))}
              </nav>
            </div>
          </div>

          <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <AccountingStatCard
              label="Net revenue"
              value={signedMoney(
                report.profitAndLoss.totals.revenue,
                report.currency,
              )}
              sub={`${report.profitAndLoss.totals.grossMarginPercent ?? "—"}% gross margin`}
              icon={TrendingUp}
              accent="var(--dash-brand)"
              soft="var(--dash-brand-soft)"
            />
            <AccountingStatCard
              label="Management EBITDA"
              value={signedMoney(
                report.profitAndLoss.totals.ebitda,
                report.currency,
              )}
              sub={`${report.profitAndLoss.totals.ebitdaMarginPercent ?? "—"}% margin · non-statutory`}
              icon={Calculator}
              accent="var(--dash-gold)"
              soft="var(--dash-gold-soft)"
            />
            <AccountingStatCard
              label="Net income"
              value={signedMoney(
                report.profitAndLoss.totals.netIncome,
                report.currency,
              )}
              sub={`${report.profitAndLoss.totals.netMarginPercent ?? "—"}% net margin`}
              icon={BarChart3}
              accent={
                Number(report.profitAndLoss.totals.netIncome) >= 0
                  ? "var(--dash-success)"
                  : "var(--dash-danger)"
              }
              soft={
                Number(report.profitAndLoss.totals.netIncome) >= 0
                  ? "var(--dash-success-soft)"
                  : "var(--dash-danger-soft)"
              }
            />
            <AccountingStatCard
              label="Balance check"
              value={
                report.balanceSheet.totals.isBalanced
                  ? "Reconciled"
                  : "Review required"
              }
              sub={`Difference ${signedMoney(report.balanceSheet.totals.difference, report.currency)}`}
              icon={Scale}
              accent={
                report.balanceSheet.totals.isBalanced
                  ? "var(--dash-success)"
                  : "var(--dash-danger)"
              }
              soft={
                report.balanceSheet.totals.isBalanced
                  ? "var(--dash-success-soft)"
                  : "var(--dash-danger-soft)"
              }
            />
          </div>

          {view === "overview" ? <Overview report={report} /> : null}
          {view === "profit-loss" ? <ProfitAndLoss report={report} /> : null}
          {view === "balance-sheet" ? <BalanceSheet report={report} /> : null}
        </div>
      )}
    </AccountingPageShell>
  );
}



export default async function AccountingRoutePage(props: any = {}) {
  const surface = routeByKey("accounting-reports-financial-statements")

  if (!surface) {
    throw new Error("Missing accounting route surface definition: accounting-reports-financial-statements")
  }

  return withAccountingSurfaceAccess({
    params: (props as { params?: Promise<{ locale: string }> }).params ?? Promise.resolve({ locale: "en" }),
    surface,
    onAllowed: async () => FinancialStatementsPageImpl(props),
  })
}
