import { AccountingDataTable } from "@/components/accounting/AccountingDataTable"

import { redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { BookOpenCheck, FilePlus2, RotateCcw, Scale } from "lucide-react"

import {
  listJournalEntriesAction,
  listJournalsAction,
  postJournalEntryAction,
  reverseJournalEntryAction,
} from "@/actions/accounting/journals.actions"
import { checkPermission } from "@/config/useAuth"
import {
  accountingDraftJournalEntriesTableContract,
  accountingPostedJournalEntriesTableContract,
} from "@/components/DataTableComponents"
import {
  AccountingLinkButton,
  AccountingMessage,
  AccountingPageShell,
  AccountingPanel,
  AccountingStatCard,
  accountingDate,
  formatAccountingMoney,
} from "../_components/accounting-ui"
import { routeByKey, withAccountingSurfaceAccess } from "../accounting-route-access"

type JournalEntryRow = {
  id: string
  entryNumber: string
  entryDate: Date
  status: string
  sourceType?: string
  memo: string | null
  journal: { code: string; nameEn: string }
  period: { name: string }
  lines: Array<{ debit: string | number; credit: string | number }>
}

type JournalRow = {
  id: string
  code: string
  isActive: boolean
}

type PageProps = {
  params: Promise<{ locale: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

function sumLines(lines: JournalEntryRow["lines"], side: "debit" | "credit") {
  return lines.reduce((total, line) => total + Number(line[side] || 0), 0)
}

function resultPath(locale: string, ok: boolean, text: string) {
  const key = ok ? "notice" : "error"
  return `/${locale}/dashboard/accounting/journals?${key}=${encodeURIComponent(text)}`
}

type JournalAction = (formData: FormData) => Promise<void>

function JournalEntriesTable({
  entries,
  locale,
  mode,
  postEntry,
  reverseEntry,
  suspenseReversalNotice,
}: {
  entries: JournalEntryRow[]
  locale: string
  mode: "draft" | "posted"
  postEntry: JournalAction
  reverseEntry: JournalAction
  suspenseReversalNotice: string
}) {
  const contract = mode === "draft" ? accountingDraftJournalEntriesTableContract : accountingPostedJournalEntriesTableContract

  return (
    <div data-journal-scope={mode}>
      <AccountingDataTable
        caption={mode === "draft" ? "Draft journal entries" : "Posted journal evidence"}
        locale={locale === "fr" ? "fr" : "en"}
        emptyMessage={mode === "draft" ? "No journal entries yet." : "No posted journal entries yet."}
        contract={contract}
        scopeFilters={{ status: mode === "draft" ? ["DRAFT"] : ["POSTED", "REVERSED"] }}
        columns={[
          { label: "Entry" },
          { label: "Date" },
          { label: "Journal" },
          { label: "Period" },
          { label: "Debit", className: "text-right" },
          { label: "Credit", className: "text-right" },
          { label: "Status" },
          { label: "Action", className: "text-right" },
        ]}
        rows={entries.map((entry) => {
          return {
            id: entry.id,
            searchText: [
              entry.entryNumber,
              entry.memo,
              accountingDate(entry.entryDate),
              entry.journal.code,
              entry.period.name,
              sumLines(entry.lines, "debit"),
              sumLines(entry.lines, "credit"),
              entry.status,
            ]
              .filter((value) => value !== null && value !== undefined)
              .join(" "),
            cells: [
              <div key="cell-0">
                <div className="font-medium text-[var(--dash-text)]">{entry.entryNumber}</div>
                <div className="mt-1 max-w-[18rem] truncate text-xs text-[var(--dash-text-faint)]">
                  {entry.memo || "No memo"}
                </div>
              </div>,
              <div key="cell-1" className="text-[var(--dash-text-soft)]">
                {accountingDate(entry.entryDate)}
              </div>,
              <div key="cell-2" className="text-[var(--dash-text-soft)]">
                {entry.journal.code}
              </div>,
              <div key="cell-3" className="text-[var(--dash-text-soft)]">
                {entry.period.name}
              </div>,
              <div key="cell-4" className="text-right text-[var(--dash-text)]">
                {formatAccountingMoney(sumLines(entry.lines, "debit"))}
              </div>,
              <div key="cell-5" className="text-right text-[var(--dash-text)]">
                {formatAccountingMoney(sumLines(entry.lines, "credit"))}
              </div>,
              <div key="cell-6" className="text-[var(--dash-text-soft)]">
                {entry.status}
              </div>,
              <div key="cell-7">
                <div className="flex justify-end gap-2">
                  {mode === "draft" && entry.status === "DRAFT" ? (
                    <form action={postEntry}>
                      <input type="hidden" name="journalEntryId" value={entry.id} />
                      <button className="dashboard-button-create h-9 rounded-lg px-3 text-xs font-medium">
                        Post
                      </button>
                    </form>
                  ) : null}
                  {mode === "posted" && entry.status === "POSTED" && entry.sourceType === "PAYMENT_SUSPENSE" ? (
                    <p className="max-w-64 whitespace-normal text-xs text-[var(--dash-warning)]">
                      {suspenseReversalNotice}
                    </p>
                  ) : null}
                  {mode === "posted" && entry.status === "POSTED" && entry.sourceType !== "PAYMENT_SUSPENSE" ? (
                    <form action={reverseEntry}>
                      <input type="hidden" name="journalEntryId" value={entry.id} />
                      <input type="hidden" name="reason" value="Manual reversal" />
                      <button className="dashboard-button-secondary inline-flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-medium">
                        <RotateCcw className="h-3.5 w-3.5" />
                        Reverse
                      </button>
                    </form>
                  ) : null}
                </div>
              </div>,
            ],
          }
        })}
      />
    </div>
  )
}

async function AccountingJournalsPageImpl({ params, searchParams }: PageProps) {
  await checkPermission("accounting.journal.read")

  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "paymentReconciliationWorkbench.suspenseWorkflow" })
  const resolvedSearchParams = searchParams ? await searchParams : {}
  const [journalsResponse, entriesResponse] = await Promise.all([
    listJournalsAction({}),
    listJournalEntriesAction({ take: 100 }),
  ])
  const journals = journalsResponse.success ? (journalsResponse.data as JournalRow[]) : []
  const entries = entriesResponse.success ? (entriesResponse.data as JournalEntryRow[]) : []

  async function postEntry(formData: FormData) {
    "use server"
    const result = await postJournalEntryAction({
      journalEntryId: String(formData.get("journalEntryId") || ""),
    })

    redirect(resultPath(locale, result.success, result.success ? "Journal entry posted" : result.error))
  }

  async function reverseEntry(formData: FormData) {
    "use server"
    const result = await reverseJournalEntryAction({
      journalEntryId: String(formData.get("journalEntryId") || ""),
      reason: String(formData.get("reason") || "Manual reversal"),
    })

    redirect(resultPath(locale, result.success, result.success ? "Journal entry reversed" : result.error))
  }

  return (
    <AccountingPageShell
      eyebrow="Manual ledger"
      title="Journal Entries"
      description="Create balanced drafts, post them to the ledger, and reverse posted entries with an audit trail."
      icon={BookOpenCheck}
      actions={
        <AccountingLinkButton href="/dashboard/accounting/journals/new">
          <FilePlus2 className="h-4 w-4" />
          <span>New entry</span>
        </AccountingLinkButton>
      }
    >
      <AccountingMessage error={resolvedSearchParams.error} notice={resolvedSearchParams.notice} />

      <div className="mb-6 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-3" data-finance-result="journals" data-finance-result-state={journalsResponse.success && entriesResponse.success ? "ready" : "error"}>
        <AccountingStatCard
          label="Journals"
          value={journals.filter((journal) => journal.isActive).length.toString()}
          sub="Active books"
          icon={BookOpenCheck}
          accent="var(--dash-brand)"
          soft="var(--dash-brand-soft)"
        />
        <AccountingStatCard
          label="Drafts"
          value={entries.filter((entry) => entry.status === "DRAFT").length.toString()}
          sub="Awaiting post"
          icon={FilePlus2}
          accent="var(--dash-warning)"
          soft="var(--dash-warning-soft)"
        />
        <AccountingStatCard
          label="Posted"
          value={entries.filter((entry) => entry.status === "POSTED" || entry.status === "REVERSED").length.toString()}
          sub="Ledger-visible"
          icon={Scale}
          accent="var(--dash-success)"
          soft="var(--dash-success-soft)"
        />
      </div>

      <AccountingPanel
        title="Draft journal entries"
        description={entriesResponse.success ? "Editable drafts awaiting controlled post." : entriesResponse.error || "Entries unavailable."}
      >
        <JournalEntriesTable
          entries={entries.filter((entry) => entry.status === "DRAFT")}
          locale={locale}
          mode="draft"
          suspenseReversalNotice={t("reversalUnavailable")}
          postEntry={postEntry}
          reverseEntry={reverseEntry}
        />
      </AccountingPanel>

      <AccountingPanel
        title="Posted journal evidence"
        description="Posted and reversed entries remain evidence-backed; reversal is a protected action."
      >
        <JournalEntriesTable
          entries={entries.filter((entry) => entry.status === "POSTED" || entry.status === "REVERSED")}
          locale={locale}
          mode="posted"
          suspenseReversalNotice={t("reversalUnavailable")}
          postEntry={postEntry}
          reverseEntry={reverseEntry}
        />
      </AccountingPanel>
    </AccountingPageShell>
  )
}




export default async function AccountingRoutePage(props: any = {}) {
  const surface = routeByKey("accounting-journals")

  if (!surface) {
    throw new Error("Missing accounting route surface definition: accounting-journals")
  }

  return withAccountingSurfaceAccess({
    params: (props as { params?: Promise<{ locale: string }> }).params ?? Promise.resolve({ locale: "en" }),
    surface,
    onAllowed: async () => AccountingJournalsPageImpl(props),
  })
}
