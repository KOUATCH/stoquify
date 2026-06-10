import { redirect } from "next/navigation"
import { BookOpenCheck, CalendarDays, CheckCircle2, Landmark, Settings2 } from "lucide-react"

import {
  closeAccountingPeriodAction,
  createFiscalYearAction,
  ensureDefaultJournalsAction,
  getAccountingSetupDataAction,
  markAccountingSetupReadyAction,
  updateAccountingSettingsAction,
} from "@/actions/accounting/settings.actions"
import {
  AccountingMessage,
  AccountingPageShell,
  AccountingPanel,
  AccountingStatCard,
  accountingDate,
} from "../_components/accounting-ui"

type SetupData = {
  settings: {
    accountingEnabled: boolean
    setupStatus: string
    baseCurrency: string
    countryPack: string | null
    fiscalYearStartMonth: number
    fiscalYearStartDay: number
  }
  fiscalYears: Array<{ id: string; name: string; startDate: Date; endDate: Date; status: string }>
  periods: Array<{ id: string; name: string; startDate: Date; endDate: Date; status: string }>
  journals: Array<{ id: string; code: string; nameEn: string; type: string; isActive: boolean; allowManualEntries: boolean }>
}

type PageProps = {
  params: Promise<{ locale: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

function resultPath(locale: string, ok: boolean, text: string) {
  const key = ok ? "notice" : "error"
  return `/${locale}/dashboard/accounting/setup?${key}=${encodeURIComponent(text)}`
}

export default async function AccountingSetupPage({ params, searchParams }: PageProps) {
  const { locale } = await params
  const resolvedSearchParams = searchParams ? await searchParams : {}
  const setupResponse = await getAccountingSetupDataAction({})
  const setup = setupResponse.success ? (setupResponse.data as SetupData) : null
  const now = new Date()
  const year = now.getFullYear()

  async function saveSettings(formData: FormData) {
    "use server"
    const result = await updateAccountingSettingsAction({
      countryPack: String(formData.get("countryPack") || "OHADA"),
      baseCurrency: String(formData.get("baseCurrency") || "XAF"),
      fiscalYearStartMonth: Number(formData.get("fiscalYearStartMonth") || 1),
      fiscalYearStartDay: Number(formData.get("fiscalYearStartDay") || 1),
      setupStatus: "IN_PROGRESS",
    })

    redirect(resultPath(locale, result.success, result.success ? "Accounting settings saved" : result.error))
  }

  async function ensureJournals() {
    "use server"
    const result = await ensureDefaultJournalsAction({})
    redirect(resultPath(locale, result.success, result.success ? "Default journals ensured" : result.error))
  }

  async function createFiscalYear(formData: FormData) {
    "use server"
    const result = await createFiscalYearAction({
      name: String(formData.get("name") || ""),
      startDate: String(formData.get("startDate") || ""),
      endDate: String(formData.get("endDate") || ""),
      createMonthlyPeriods: true,
    })

    redirect(resultPath(locale, result.success, result.success ? "Fiscal year created" : result.error))
  }

  async function closePeriod(formData: FormData) {
    "use server"
    const result = await closeAccountingPeriodAction({
      periodId: String(formData.get("periodId") || ""),
    })

    redirect(resultPath(locale, result.success, result.success ? "Accounting period closed" : result.error))
  }

  async function markReady() {
    "use server"
    const result = await markAccountingSetupReadyAction({})
    redirect(resultPath(locale, result.success, result.success ? "Accounting setup marked ready" : result.error))
  }

  return (
    <AccountingPageShell
      eyebrow="Accounting setup"
      title="Ledger Setup"
      description="Prepare the organization accounting settings, journals, fiscal year, and open periods before posting."
      icon={Settings2}
    >
      <AccountingMessage error={resolvedSearchParams.error} notice={resolvedSearchParams.notice} />

      {!setup ? (
        <AccountingPanel title="Accounting setup access" description={setupResponse.error || "Setup data is unavailable."}>
          <div className="p-6 text-sm text-[var(--dash-text-soft)]">Check accounting setup permissions for this role.</div>
        </AccountingPanel>
      ) : (
        <div className="space-y-6">
          <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <AccountingStatCard
              label="Status"
              value={setup.settings.setupStatus}
              sub={setup.settings.accountingEnabled ? "Enabled" : "Disabled"}
              icon={CheckCircle2}
              accent="var(--dash-brand)"
              soft="var(--dash-brand-soft)"
            />
            <AccountingStatCard
              label="Currency"
              value={setup.settings.baseCurrency}
              sub={setup.settings.countryPack || "OHADA"}
              icon={Landmark}
              accent="var(--dash-gold)"
              soft="var(--dash-gold-soft)"
            />
            <AccountingStatCard
              label="Journals"
              value={setup.journals.length.toString()}
              sub="Configured books"
              icon={BookOpenCheck}
              accent="var(--dash-info)"
              soft="var(--dash-info-soft)"
            />
            <AccountingStatCard
              label="Open periods"
              value={setup.periods.filter((period) => period.status === "OPEN").length.toString()}
              sub="Posting allowed"
              icon={CalendarDays}
              accent="var(--dash-success)"
              soft="var(--dash-success-soft)"
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <AccountingPanel title="Organization accounting settings" description="These values anchor currency and fiscal-period behavior.">
              <form action={saveSettings} className="grid gap-4 p-5 sm:grid-cols-2">
                <label className="space-y-2 text-sm">
                  <span className="text-[var(--dash-text-soft)]">Country pack</span>
                  <input name="countryPack" defaultValue={setup.settings.countryPack || "OHADA"} className="h-10 w-full rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-surface)] px-3 text-[var(--dash-text)]" />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-[var(--dash-text-soft)]">Base currency</span>
                  <input name="baseCurrency" defaultValue={setup.settings.baseCurrency || "XAF"} maxLength={3} className="h-10 w-full rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-surface)] px-3 text-[var(--dash-text)]" />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-[var(--dash-text-soft)]">Fiscal start month</span>
                  <input name="fiscalYearStartMonth" type="number" min={1} max={12} defaultValue={setup.settings.fiscalYearStartMonth || 1} className="h-10 w-full rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-surface)] px-3 text-[var(--dash-text)]" />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-[var(--dash-text-soft)]">Fiscal start day</span>
                  <input name="fiscalYearStartDay" type="number" min={1} max={31} defaultValue={setup.settings.fiscalYearStartDay || 1} className="h-10 w-full rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-surface)] px-3 text-[var(--dash-text)]" />
                </label>
                <button className="dashboard-button-create h-10 rounded-lg px-4 text-sm font-medium sm:col-span-2">
                  Save settings
                </button>
              </form>
            </AccountingPanel>

            <AccountingPanel title="Fiscal year" description="Creates monthly accounting periods for manual posting.">
              <form action={createFiscalYear} className="grid gap-4 p-5 sm:grid-cols-2">
                <label className="space-y-2 text-sm sm:col-span-2">
                  <span className="text-[var(--dash-text-soft)]">Name</span>
                  <input name="name" defaultValue={`FY ${year}`} className="h-10 w-full rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-surface)] px-3 text-[var(--dash-text)]" />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-[var(--dash-text-soft)]">Start date</span>
                  <input name="startDate" type="date" defaultValue={`${year}-01-01`} className="h-10 w-full rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-surface)] px-3 text-[var(--dash-text)]" />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-[var(--dash-text-soft)]">End date</span>
                  <input name="endDate" type="date" defaultValue={`${year}-12-31`} className="h-10 w-full rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-surface)] px-3 text-[var(--dash-text)]" />
                </label>
                <button className="dashboard-button-create h-10 rounded-lg px-4 text-sm font-medium sm:col-span-2">
                  Create fiscal year
                </button>
              </form>
            </AccountingPanel>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <AccountingPanel
              title="Journals"
              description="Default books for manual setup and future automated posting."
              actions={
                <form action={ensureJournals}>
                  <button className="dashboard-button-secondary h-10 rounded-lg px-4 text-sm font-medium">Ensure defaults</button>
                </form>
              }
            >
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead className="border-b border-[var(--dash-border-subtle)] text-left text-xs uppercase text-[var(--dash-text-faint)]">
                    <tr>
                      <th className="px-4 py-3">Code</th>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Manual</th>
                    </tr>
                  </thead>
                  <tbody>
                    {setup.journals.map((journal) => (
                      <tr key={journal.id} className="border-b border-[var(--dash-border-subtle)]">
                        <td className="px-4 py-3 font-medium">{journal.code}</td>
                        <td className="px-4 py-3 text-[var(--dash-text-soft)]">{journal.nameEn}</td>
                        <td className="px-4 py-3 text-[var(--dash-text-soft)]">{journal.type}</td>
                        <td className="px-4 py-3 text-[var(--dash-text-soft)]">{journal.allowManualEntries ? "Yes" : "No"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </AccountingPanel>

            <AccountingPanel
              title="Accounting periods"
              description="Only open periods can receive postings."
              actions={
                <form action={markReady}>
                  <button className="dashboard-button-create h-10 rounded-lg px-4 text-sm font-medium">Mark ready</button>
                </form>
              }
            >
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] text-sm">
                  <thead className="border-b border-[var(--dash-border-subtle)] text-left text-xs uppercase text-[var(--dash-text-faint)]">
                    <tr>
                      <th className="px-4 py-3">Period</th>
                      <th className="px-4 py-3">Dates</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {setup.periods.slice(0, 12).map((period) => (
                      <tr key={period.id} className="border-b border-[var(--dash-border-subtle)]">
                        <td className="px-4 py-3 font-medium">{period.name}</td>
                        <td className="px-4 py-3 text-[var(--dash-text-soft)]">
                          {accountingDate(period.startDate)} to {accountingDate(period.endDate)}
                        </td>
                        <td className="px-4 py-3 text-[var(--dash-text-soft)]">{period.status}</td>
                        <td className="px-4 py-3 text-right">
                          {period.status === "OPEN" ? (
                            <form action={closePeriod}>
                              <input type="hidden" name="periodId" value={period.id} />
                              <button className="dashboard-button-secondary h-9 rounded-lg px-3 text-xs font-medium">Close</button>
                            </form>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </AccountingPanel>
          </div>
        </div>
      )}
    </AccountingPageShell>
  )
}

