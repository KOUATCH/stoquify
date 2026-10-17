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
  formatAccountingMoney,
} from "./_components/accounting-ui"
import { accountingOverviewCopy } from "./_components/accounting-overview-copy"
import { getJournalWorkflowCopy } from "@/components/accounting/journal-workflow-copy"
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

async function AccountingDashboardPageImpl(locale: "en" | "fr") {
  const t = accountingOverviewCopy[locale]
  const { page: journal, statuses } = getJournalWorkflowCopy(locale)
  const accountingDate = (value: Date) => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(new Date(value))
  const entryStatus = (value: string) => statuses[value as keyof typeof statuses] ?? statuses.UNKNOWN
  await checkPermission("accounting.reports.read")

  const summaryResponse = await getAccountingDashboardSummaryAction({})
  const summary = summaryResponse.success ? (summaryResponse.data as AccountingSummary) : null
  const currency = summary?.settings?.baseCurrency || "XAF"

  return (
    <AccountingPageShell
      eyebrow={t.eyebrow}
      title={t.title}
      description={t.description}
      icon={Landmark}
      actions={
        <>
          <AccountingLinkButton href="/dashboard/accounting/journals/new">
            <FilePlus2 className="h-4 w-4" />
            <span>{t.newEntry}</span>
          </AccountingLinkButton>
          <AccountingLinkButton href="/dashboard/accounting/setup" variant="outline">
            <Settings2 className="h-4 w-4" />
            <span>{t.setup}</span>
          </AccountingLinkButton>
          <AccountingLinkButton href="/dashboard/accounting/control-center" variant="outline">
            <ShieldCheck className="h-4 w-4" />
            <span>{t.control}</span>
          </AccountingLinkButton>
          <AccountingLinkButton href="/dashboard/accounting/accountant-portal" variant="outline">
            <FileSearch className="h-4 w-4" />
            <span>{t.portal}</span>
          </AccountingLinkButton>
          <AccountingLinkButton href="/dashboard/accounting/close" variant="outline">
            <ClipboardCheck className="h-4 w-4" />
            <span>{t.close}</span>
          </AccountingLinkButton>
        </>
      }
    >
      {!summary ? (
        <AccountingPanel title={t.access} description={summaryResponse.error || t.unavailable}>
          <div className="p-6 text-sm text-[var(--dash-text-soft)]">{t.permissions}</div>
        </AccountingPanel>
      ) : (
        <div className="space-y-6">
          <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
            <AccountingStatCard
              label={t.setupStatus}
              value={t.setupStates[(summary.settings?.setupStatus || "NOT_STARTED") as keyof typeof t.setupStates] ?? t.unknownSetup}
              sub={summary.settings?.accountingEnabled ? t.enabled : t.disabled}
              icon={Settings2}
              accent="var(--dash-brand)"
              soft="var(--dash-brand-soft)"
            />
            <AccountingStatCard
              label={t.accounts}
              value={summary.counts.accounts.toString()}
              sub={t.chartNodes}
              icon={ListTree}
              accent="var(--dash-info)"
              soft="var(--dash-info-soft)"
            />
            <AccountingStatCard
              label={t.openPeriods}
              value={summary.counts.openPeriods.toString()}
              sub={t.postingWindows}
              icon={BookOpenCheck}
              accent="var(--dash-success)"
              soft="var(--dash-success-soft)"
            />
            <AccountingStatCard
              label={t.drafts}
              value={summary.counts.draftEntries.toString()}
              sub={t.awaitingPost}
              icon={FilePlus2}
              accent="var(--dash-warning)"
              soft="var(--dash-warning-soft)"
            />
            <AccountingStatCard
              label={t.posted}
              value={summary.counts.postedEntries.toString()}
              sub={t.ledgerActivity}
              icon={Scale}
              accent="var(--dash-gold)"
              soft="var(--dash-gold-soft)"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: t.control, href: "/dashboard/accounting/control-center", text: t.controlHelp },
              { label: t.portal, href: "/dashboard/accounting/accountant-portal", text: t.portalHelp },
              { label: t.close, href: "/dashboard/accounting/close", text: t.closeHelp },
              { label: t.setup, href: "/dashboard/accounting/setup", text: t.setupHelp },
              { label: t.accounts, href: "/dashboard/accounting/accounts", text: t.accountsHelp },
              { label: t.journals, href: "/dashboard/accounting/journals", text: t.journalsHelp },
              { label: t.reports, href: "/dashboard/accounting/reports/financial-statements", text: t.reportsHelp },
              { label: t.trialBalance, href: "/dashboard/accounting/reports/trial-balance", text: t.trialHelp },
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

          <AccountingPanel title={t.latest} description={t.recent}>
            <div className="overflow-x-auto">
              <AccountingDataTable
                caption={t.latest}
                locale={locale}
                emptyMessage={t.empty}
                columns={[
                  { label: journal.entry },
                  { label: journal.date },
                  { label: journal.journal },
                  { label: journal.period },
                  { label: journal.debit, className: "text-right" },
                  { label: journal.credit, className: "text-right" },
                  { label: journal.status },
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
                      entryStatus(entry.status),
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
                        {entryStatus(entry.status)}
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
    onAllowed: async (_context, locale) => AccountingDashboardPageImpl(locale),
  })
}
