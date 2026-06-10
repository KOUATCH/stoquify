import { Scale } from "lucide-react"

import { getTrialBalanceAction } from "@/actions/accounting/reports.actions"
import {
  AccountingPageShell,
  AccountingPanel,
  AccountingStatCard,
  formatAccountingMoney,
} from "../../_components/accounting-ui"

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
  const reportResponse = await getTrialBalanceAction({ includeZeroBalance: true })
  const report = reportResponse.success ? (reportResponse.data as TrialBalance) : null

  return (
    <AccountingPageShell
      eyebrow="Accounting reports"
      title="Trial Balance"
      description="A ledger-first report generated from posted journal entry lines."
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
              sub="Posted debit movement"
              icon={Scale}
              accent="var(--dash-brand)"
              soft="var(--dash-brand-soft)"
            />
            <AccountingStatCard
              label="Activity credit"
              value={formatAccountingMoney(report.totals.activityCredit)}
              sub="Posted credit movement"
              icon={Scale}
              accent="var(--dash-info)"
              soft="var(--dash-info-soft)"
            />
            <AccountingStatCard
              label="Balance check"
              value={report.totals.isBalanced ? "Balanced" : "Out of balance"}
              sub={`${formatAccountingMoney(report.totals.debitBalance)} / ${formatAccountingMoney(report.totals.creditBalance)}`}
              icon={Scale}
              accent={report.totals.isBalanced ? "var(--dash-success)" : "var(--dash-danger)"}
              soft={report.totals.isBalanced ? "var(--dash-success-soft)" : "var(--dash-danger-soft)"}
            />
          </div>

          <AccountingPanel title="Trial balance rows" description="Accounts with their posted activity and net balance.">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-sm">
                <thead className="border-b border-[var(--dash-border-subtle)] text-left text-xs uppercase text-[var(--dash-text-faint)]">
                  <tr>
                    <th className="px-4 py-3">Account</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Normal</th>
                    <th className="px-4 py-3 text-right">Activity debit</th>
                    <th className="px-4 py-3 text-right">Activity credit</th>
                    <th className="px-4 py-3 text-right">Debit balance</th>
                    <th className="px-4 py-3 text-right">Credit balance</th>
                  </tr>
                </thead>
                <tbody>
                  {report.rows.length ? (
                    report.rows.map((row) => (
                      <tr key={row.accountId} className="border-b border-[var(--dash-border-subtle)]">
                        <td className="px-4 py-3">
                          <div className="font-medium text-[var(--dash-text)]">{row.code}</div>
                          <div className="mt-1 text-xs text-[var(--dash-text-soft)]">{row.nameEn}</div>
                        </td>
                        <td className="px-4 py-3 text-[var(--dash-text-soft)]">{row.type}</td>
                        <td className="px-4 py-3 text-[var(--dash-text-soft)]">{row.normalBalance}</td>
                        <td className="px-4 py-3 text-right text-[var(--dash-text)]">{formatAccountingMoney(row.activityDebit)}</td>
                        <td className="px-4 py-3 text-right text-[var(--dash-text)]">{formatAccountingMoney(row.activityCredit)}</td>
                        <td className="px-4 py-3 text-right text-[var(--dash-text)]">{formatAccountingMoney(row.debitBalance)}</td>
                        <td className="px-4 py-3 text-right text-[var(--dash-text)]">{formatAccountingMoney(row.creditBalance)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-[var(--dash-text-soft)]">No accounts or posted ledger lines yet.</td>
                    </tr>
                  )}
                </tbody>
                <tfoot className="border-t border-[var(--dash-border-subtle)] text-sm font-semibold text-[var(--dash-text)]">
                  <tr>
                    <td className="px-4 py-3" colSpan={3}>Totals</td>
                    <td className="px-4 py-3 text-right">{formatAccountingMoney(report.totals.activityDebit)}</td>
                    <td className="px-4 py-3 text-right">{formatAccountingMoney(report.totals.activityCredit)}</td>
                    <td className="px-4 py-3 text-right">{formatAccountingMoney(report.totals.debitBalance)}</td>
                    <td className="px-4 py-3 text-right">{formatAccountingMoney(report.totals.creditBalance)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </AccountingPanel>
        </div>
      )}
    </AccountingPageShell>
  )
}

