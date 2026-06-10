import { redirect } from "next/navigation"
import { BookOpenCheck, FilePlus2, RotateCcw, Scale } from "lucide-react"

import {
  listJournalEntriesAction,
  listJournalsAction,
  postJournalEntryAction,
  reverseJournalEntryAction,
} from "@/actions/accounting/journals.actions"
import {
  AccountingLinkButton,
  AccountingMessage,
  AccountingPageShell,
  AccountingPanel,
  AccountingStatCard,
  accountingDate,
  formatAccountingMoney,
} from "../_components/accounting-ui"

type JournalEntryRow = {
  id: string
  entryNumber: string
  entryDate: Date
  status: string
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

export default async function AccountingJournalsPage({ params, searchParams }: PageProps) {
  const { locale } = await params
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

      <div className="mb-6 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-3">
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

      <AccountingPanel title="Journal queue" description={entriesResponse.success ? "Draft, posted, and reversed manual ledger entries." : entriesResponse.error || "Entries unavailable."}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="border-b border-[var(--dash-border-subtle)] text-left text-xs uppercase text-[var(--dash-text-faint)]">
              <tr>
                <th className="px-4 py-3">Entry</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Journal</th>
                <th className="px-4 py-3">Period</th>
                <th className="px-4 py-3 text-right">Debit</th>
                <th className="px-4 py-3 text-right">Credit</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {entries.length ? (
                entries.map((entry) => (
                  <tr key={entry.id} className="border-b border-[var(--dash-border-subtle)]">
                    <td className="px-4 py-3">
                      <div className="font-medium text-[var(--dash-text)]">{entry.entryNumber}</div>
                      <div className="mt-1 max-w-[18rem] truncate text-xs text-[var(--dash-text-faint)]">{entry.memo || "No memo"}</div>
                    </td>
                    <td className="px-4 py-3 text-[var(--dash-text-soft)]">{accountingDate(entry.entryDate)}</td>
                    <td className="px-4 py-3 text-[var(--dash-text-soft)]">{entry.journal.code}</td>
                    <td className="px-4 py-3 text-[var(--dash-text-soft)]">{entry.period.name}</td>
                    <td className="px-4 py-3 text-right text-[var(--dash-text)]">{formatAccountingMoney(sumLines(entry.lines, "debit"))}</td>
                    <td className="px-4 py-3 text-right text-[var(--dash-text)]">{formatAccountingMoney(sumLines(entry.lines, "credit"))}</td>
                    <td className="px-4 py-3 text-[var(--dash-text-soft)]">{entry.status}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {entry.status === "DRAFT" ? (
                          <form action={postEntry}>
                            <input type="hidden" name="journalEntryId" value={entry.id} />
                            <button className="dashboard-button-create h-9 rounded-lg px-3 text-xs font-medium">Post</button>
                          </form>
                        ) : null}
                        {entry.status === "POSTED" ? (
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
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-[var(--dash-text-soft)]">No journal entries yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </AccountingPanel>
    </AccountingPageShell>
  )
}

