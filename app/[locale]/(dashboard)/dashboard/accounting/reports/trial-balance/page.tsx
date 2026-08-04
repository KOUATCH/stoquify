import { Scale } from "lucide-react"

import { getTrialBalanceAction } from "@/actions/accounting/reports.actions"
import { checkPermission } from "@/config/useAuth"
import {
  AccountingPageShell,
  AccountingPanel,
  AccountingStatCard,
  formatAccountingMoney,
} from "../../_components/accounting-ui"
import { TrialBalanceTable } from "./trial-balance-table"

type TrialBalance = {
  rows: Array<{
    accountId: string
    code: string
    nameEn: string
    type: string
    normalBalance: string
    activityDebit: string
    activityCredit: string
    debitBalance: string
    creditBalance: string
  }>
  totals: {
    activityDebit: string
    activityCredit: string
    debitBalance: string
    creditBalance: string
    isBalanced: boolean
  }
}

export default async function TrialBalancePage() {
  await checkPermission("accounting.reports.read")

  const reportResponse = await getTrialBalanceAction({ includeZeroBalance: true })
  const report = reportResponse.success ? (reportResponse.data as TrialBalance) : null

  return (
    <AccountingPageShell
      eyebrow="Accounting reports"
      title="Trial Balance"
      description="A ledger-first report generated from posted and reversed journal entry lines."
      icon={Scale}
    >
      {!report ? (
        <AccountingPanel title="Trial balance access" description={reportResponse.error || "Report data is unavailable."}>
          <div className="p-6 text-sm text-[var(--dash-text-soft)]">Check accounting report permissions for this role.</div>
        </AccountingPanel>
      ) : (
        <div className="space-y-6">
          <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-3">
            <AccountingStatCard
              label="Activity debit"
              value={formatAccountingMoney(report.totals.activityDebit)}
              sub="Posted and reversed debit movement"
              icon={Scale}
              accent="var(--dash-brand)"
              soft="var(--dash-brand-soft)"
            />
            <AccountingStatCard
              label="Activity credit"
              value={formatAccountingMoney(report.totals.activityCredit)}
              sub="Posted and reversed credit movement"
              icon={Scale}
              accent="var(--dash-info)"
              soft="var(--dash-info-soft)"
            />
            <AccountingStatCard
              label="Balance check"
              value={report.totals.isBalanced ? "Balanced" : "Out of balance"}
              sub={`Debit ${formatAccountingMoney(report.totals.debitBalance)} · Credit ${formatAccountingMoney(report.totals.creditBalance)}`}
              icon={Scale}
              accent={report.totals.isBalanced ? "var(--dash-success)" : "var(--dash-danger)"}
              soft={report.totals.isBalanced ? "var(--dash-success-soft)" : "var(--dash-danger-soft)"}
            />
          </div>

          <AccountingPanel title="Account balances" description="Search, filter, and review the canonical report without losing full-report totals.">
            <TrialBalanceTable rows={report.rows} totals={report.totals} />
          </AccountingPanel>
        </div>
      )}
    </AccountingPageShell>
  )
}

