import { AccountingDataTable } from "@/components/accounting/AccountingDataTable"

import { BookOpenCheck, ClipboardCheck, FilePlus2, FileSearch, Landmark, ListTree, Scale, Settings2, ShieldCheck } from "lucide-react"

import { getAccountingDashboardSummaryAction } from "@/actions/accounting/reports.actions"
import { checkPermission } from "@/config/useAuth"
import { Link } from "@/i18n/navigation"
import {
  AccountingLinkButton,
  AccountingPageShell,
  AccountingPanel,
  AccountingStatCard,
  accountingDate,
  formatAccountingMoney,
} from "./_components/accounting-ui"
import { routeByKey, withAccountingSurfaceAccess } from "./accounting-route-access"

type AccountingSummary = {
  settings: { accountingEnabled: boolean; setupStatus: string; baseCurrency: string } | null
  counts: {
    accounts: number
    journals: number
    openPeriods: number
    draftEntries: number
    postedEntries: number
  }
  latestEntries: Array<{
    id: string
    entryNumber: string
    entryDate: Date
    status: string
    journalCode: string
    periodName: string
    debit: string
    credit: string
  }>
}

async function AccountingDashboardPageImpl() {
  await checkPermission("accounting.reports.read")

  const summaryResponse = await getAccountingDashboardSummaryAction({})
  const summary = summaryResponse.success ? (summaryResponse.data as AccountingSummary) : null
  const currency = summary?.settings?.baseCurrency || "XAF"

  return (
    <AccountingPageShell
      eyebrow="Accounting backbone"
      title="Accounting Ledger"
      description="Manual journal control, posting discipline, and financial reporting from the double-entry kernel."
      icon={Landmark}
      actions={
        <>
          <AccountingLinkButton href="/dashboard/accounting/journals/new">
            <FilePlus2 className="h-4 w-4" />
            <span>New entry</span>
          </AccountingLinkButton>
          <AccountingLinkButton href="/dashboard/accounting/setup" variant="outline">
            <Settings2 className="h-4 w-4" />
            <span>Setup</span>
          </AccountingLinkButton>
          <AccountingLinkButton href="/dashboard/accounting/control-center" variant="outline">
            <ShieldCheck className="h-4 w-4" />
            <span>Control center</span>
          </AccountingLinkButton>
          <AccountingLinkButton href="/dashboard/accounting/accountant-portal" variant="outline">
            <FileSearch className="h-4 w-4" />
            <span>Accountant portal</span>
          </AccountingLinkButton>
          <AccountingLinkButton href="/dashboard/accounting/close" variant="outline">
            <ClipboardCheck className="h-4 w-4" />
            <span>Close center</span>
          </AccountingLinkButton>
        </>
      }
    >
      {!summary ? (
        <AccountingPanel title="Accounting access" description={summaryResponse.error || "Accounting data is unavailable."}>
          <div className="p-6 text-sm text-[var(--dash-text-soft)]">Check the accounting permissions for this role.</div>
        </AccountingPanel>
      ) : (
        <div className="space-y-6">
          <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
            <AccountingStatCard
              label="Setup status"
              value={summary.settings?.setupStatus || "Not started"}
              sub={summary.settings?.accountingEnabled ? "Ledger enabled" : "Ledger disabled"}
              icon={Settings2}
              accent="var(--dash-brand)"
              soft="var(--dash-brand-soft)"
            />
            <AccountingStatCard
              label="Accounts"
              value={summary.counts.accounts.toString()}
              sub="Chart nodes"
              icon={ListTree}
              accent="var(--dash-info)"
              soft="var(--dash-info-soft)"
            />
            <AccountingStatCard
              label="Open periods"
              value={summary.counts.openPeriods.toString()}
              sub="Posting windows"
              icon={BookOpenCheck}
              accent="var(--dash-success)"
              soft="var(--dash-success-soft)"
            />
            <AccountingStatCard
              label="Draft entries"
              value={summary.counts.draftEntries.toString()}
              sub="Awaiting post"
              icon={FilePlus2}
              accent="var(--dash-warning)"
              soft="var(--dash-warning-soft)"
            />
            <AccountingStatCard
              label="Posted entries"
              value={summary.counts.postedEntries.toString()}
              sub="Ledger activity"
              icon={Scale}
              accent="var(--dash-gold)"
              soft="var(--dash-gold-soft)"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Control center", href: "/dashboard/accounting/control-center", text: "Readiness gates and setup lock" },
              { label: "Accountant portal", href: "/dashboard/accounting/accountant-portal", text: "Trust packs and source links" },
              { label: "Close center", href: "/dashboard/accounting/close", text: "Blockers, evidence, provenance" },
              { label: "Setup", href: "/dashboard/accounting/setup", text: "Settings, journals, and periods" },
              { label: "Accounts", href: "/dashboard/accounting/accounts", text: "Chart of accounts" },
              { label: "Journals", href: "/dashboard/accounting/journals", text: "Drafts, posting, reversals" },
              { label: "Financial reports", href: "/dashboard/accounting/reports/financial-statements", text: "P&L, EBITDA, and Balance Sheet" },
              { label: "Trial balance", href: "/dashboard/accounting/reports/trial-balance", text: "Posted ledger report" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-surface)] p-4 text-[var(--dash-text)] transition hover:border-[var(--dash-brand)]"
              >
                <div className="text-sm font-semibold">{item.label}</div>
                <div className="mt-1 text-xs leading-5 text-[var(--dash-text-soft)]">{item.text}</div>
              </Link>
            ))}
          </div>

          <AccountingPanel title="Latest journal entries" description="Recent activity from draft and posted journals.">
            <div className="overflow-x-auto">
              <AccountingDataTable
                caption={"Latest journal entries"}
                emptyMessage={"No journal entries yet."}
                columns={[
                  { label: "Entry" },
                  { label: "Date" },
                  { label: "Journal" },
                  { label: "Period" },
                  { label: "Debit", className: "text-right" },
                  { label: "Credit", className: "text-right" },
                  { label: "Status" },
                ]}
                rows={summary.latestEntries.map((entry) => {
                  return {
                    id: entry.id,
                    searchText: [
                      entry.entryNumber,
                      accountingDate(entry.entryDate),
                      entry.journalCode,
                      entry.periodName,
                      entry.debit,
                      entry.credit,
                      entry.status,
                    ]
                      .filter((value) => value !== null && value !== undefined)
                      .join(" "),
                    cells: [
                      <div key="cell-0" className="font-medium text-[var(--dash-text)]">
                        {entry.entryNumber}
                      </div>,
                      <div key="cell-1" className="text-[var(--dash-text-soft)]">
                        {accountingDate(entry.entryDate)}
                      </div>,
                      <div key="cell-2" className="text-[var(--dash-text-soft)]">
                        {entry.journalCode}
                      </div>,
                      <div key="cell-3" className="text-[var(--dash-text-soft)]">
                        {entry.periodName}
                      </div>,
                      <div key="cell-4" className="text-right text-[var(--dash-text)]">
                        {formatAccountingMoney(entry.debit, currency)}
                      </div>,
                      <div key="cell-5" className="text-right text-[var(--dash-text)]">
                        {formatAccountingMoney(entry.credit, currency)}
                      </div>,
                      <div key="cell-6" className="text-[var(--dash-text-soft)]">
                        {entry.status}
                      </div>,
                    ],
                  }
                })}
              />
            </div>
          </AccountingPanel>
        </div>
      )}
    </AccountingPageShell>
  )
}



export default async function AccountingRoutePage(props: any = {}) {
  const surface = routeByKey("accounting-dashboard")

  if (!surface) {
    throw new Error("Missing accounting route surface definition: accounting-dashboard")
  }

  return withAccountingSurfaceAccess({
    params: (props as { params?: Promise<{ locale: string }> }).params ?? Promise.resolve({ locale: "en" }),
    surface,
    onAllowed: async () => AccountingDashboardPageImpl(),
  })
}
