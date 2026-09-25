import { AccountingDataTable } from "@/components/accounting/AccountingDataTable"

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
import { checkPermission } from "@/config/useAuth"
import {
  AccountingMessage,
  AccountingPageShell,
  AccountingPanel,
  AccountingStatCard,
  accountingDate,
} from "../_components/accounting-ui"
import { routeByKey, withAccountingSurfaceAccess } from "../accounting-route-access"

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

async function AccountingSetupPageImpl({ params, searchParams }: PageProps) {
  await checkPermission("accounting.setup.manage")

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
          <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-4">
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

          <div className="grid min-w-0 grid-cols-1 gap-6">
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
                <AccountingDataTable
                  caption={"Journals"}
                  locale={locale === "fr" ? "fr" : "en"}
                  columns={[{ label: "Code" }, { label: "Name" }, { label: "Type" }, { label: "Manual" }]}
                  rows={setup.journals.map((journal) => {
                    return {
                      id: journal.id,
                      searchText: [journal.code, journal.nameEn, journal.type, journal.allowManualEntries ? "Yes" : "No"]
                        .filter((value) => value !== null && value !== undefined)
                        .join(" "),
                      cells: [
                        <div key="cell-0" className="font-medium">
                          {journal.code}
                        </div>,
                        <div key="cell-1" className="text-[var(--dash-text-soft)]">
                          {journal.nameEn}
                        </div>,
                        <div key="cell-2" className="text-[var(--dash-text-soft)]">
                          {journal.type}
                        </div>,
                        <div key="cell-3" className="text-[var(--dash-text-soft)]">
                          {journal.allowManualEntries ? "Yes" : "No"}
                        </div>,
                      ],
                    }
                  })}
                />
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
                <AccountingDataTable
                  caption={"Accounting periods"}
                  locale={locale === "fr" ? "fr" : "en"}
                  columns={[
                    { label: "Period" },
                    { label: "Dates" },
                    { label: "Status" },
                    { label: "Action", className: "text-right" },
                  ]}
                  rows={setup.periods.map((period) => {
                    return {
                      id: period.id,
                      searchText: [
                        period.name,
                        accountingDate(period.startDate),
                        accountingDate(period.endDate),
                        period.status,
                      ]
                        .filter((value) => value !== null && value !== undefined)
                        .join(" "),
                      cells: [
                        <div key="cell-0" className="font-medium">
                          {period.name}
                        </div>,
                        <div key="cell-1" className="text-[var(--dash-text-soft)]">
                          {accountingDate(period.startDate)} to {accountingDate(period.endDate)}
                        </div>,
                        <div key="cell-2" className="text-[var(--dash-text-soft)]">
                          {period.status}
                        </div>,
                        <div key="cell-3" className="text-right">
                          {period.status === "OPEN" ? (
                            <form action={closePeriod}>
                              <input type="hidden" name="periodId" value={period.id} />
                              <button className="dashboard-button-secondary h-9 rounded-lg px-3 text-xs font-medium">
                                Close
                              </button>
                            </form>
                          ) : null}
                        </div>,
                      ],
                    }
                  })}
                />
              </div>
            </AccountingPanel>
          </div>
        </div>
      )}
    </AccountingPageShell>
  )
}




export default async function AccountingRoutePage(props: any = {}) {
  const surface = routeByKey("accounting-setup")

  if (!surface) {
    throw new Error("Missing accounting route surface definition: accounting-setup")
  }

  return withAccountingSurfaceAccess({
    params: (props as { params?: Promise<{ locale: string }> }).params ?? Promise.resolve({ locale: "en" }),
    surface,
    onAllowed: async () => AccountingSetupPageImpl(props),
  })
}
