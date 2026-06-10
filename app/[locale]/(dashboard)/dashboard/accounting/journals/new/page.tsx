import { redirect } from "next/navigation"
import { FilePlus2, Scale } from "lucide-react"

import { listChartAccountsAction } from "@/actions/accounting/accounts.actions"
import { createManualJournalEntryAction, listJournalsAction } from "@/actions/accounting/journals.actions"
import {
  AccountingLinkButton,
  AccountingMessage,
  AccountingPageShell,
  AccountingPanel,
} from "../../_components/accounting-ui"

type AccountRow = {
  id: string
  code: string
  nameEn: string
  allowManualPost: boolean
  isActive: boolean
  currency: string | null
  _count: { children: number }
}

type JournalRow = {
  id: string
  code: string
  nameEn: string
  allowManualEntries: boolean
  isActive: boolean
}

type PageProps = {
  params: Promise<{ locale: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

function resultPath(locale: string, ok: boolean, text: string) {
  const key = ok ? "notice" : "error"
  return `/${locale}/dashboard/accounting/journals${ok ? "" : "/new"}?${key}=${encodeURIComponent(text)}`
}

export default async function NewJournalEntryPage({ params, searchParams }: PageProps) {
  const { locale } = await params
  const resolvedSearchParams = searchParams ? await searchParams : {}
  const [accountsResponse, journalsResponse] = await Promise.all([
    listChartAccountsAction({}),
    listJournalsAction({}),
  ])
  const accounts = accountsResponse.success ? (accountsResponse.data as AccountRow[]) : []
  const journals = journalsResponse.success ? (journalsResponse.data as JournalRow[]) : []
  const postableAccounts = accounts.filter((account) => account.isActive && account.allowManualPost && account._count.children === 0)
  const manualJournals = journals.filter((journal) => journal.isActive && journal.allowManualEntries)
  const today = new Date().toISOString().slice(0, 10)

  async function createEntry(formData: FormData) {
    "use server"
    const lines = [0, 1, 2, 3, 4, 5]
      .map((index) => ({
        accountId: String(formData.get(`accountId-${index}`) || ""),
        description: String(formData.get(`description-${index}`) || ""),
        debit: String(formData.get(`debit-${index}`) || ""),
        credit: String(formData.get(`credit-${index}`) || ""),
        currency: String(formData.get("currency") || "XAF"),
      }))
      .filter((line) => line.accountId && (line.debit || line.credit))

    const result = await createManualJournalEntryAction({
      journalId: String(formData.get("journalId") || ""),
      entryDate: String(formData.get("entryDate") || ""),
      memo: String(formData.get("memo") || ""),
      reference: String(formData.get("reference") || ""),
      lines,
    })

    redirect(resultPath(locale, result.success, result.success ? "Journal draft created" : result.error))
  }

  return (
    <AccountingPageShell
      eyebrow="Manual journal"
      title="New Journal Entry"
      description="Enter a balanced debit and credit draft before posting it to the ledger."
      icon={FilePlus2}
      actions={
        <AccountingLinkButton href="/dashboard/accounting/journals" variant="outline">
          <Scale className="h-4 w-4" />
          <span>Journal queue</span>
        </AccountingLinkButton>
      }
    >
      <AccountingMessage error={resolvedSearchParams.error} notice={resolvedSearchParams.notice} />

      <AccountingPanel
        title="Manual entry"
        description={
          accountsResponse.success && journalsResponse.success
            ? "Only postable leaf accounts and manual journals are shown."
            : accountsResponse.error || journalsResponse.error || "Accounting setup data unavailable."
        }
      >
        <form action={createEntry} className="space-y-5 p-5">
          <div className="grid gap-4 lg:grid-cols-4">
            <label className="space-y-2 text-sm lg:col-span-2">
              <span className="text-[var(--dash-text-soft)]">Journal</span>
              <select name="journalId" required className="h-10 w-full rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-surface)] px-3 text-[var(--dash-text)]">
                <option value="">Select journal</option>
                {manualJournals.map((journal) => (
                  <option key={journal.id} value={journal.id}>{journal.code} - {journal.nameEn}</option>
                ))}
              </select>
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-[var(--dash-text-soft)]">Entry date</span>
              <input name="entryDate" type="date" defaultValue={today} required className="h-10 w-full rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-surface)] px-3 text-[var(--dash-text)]" />
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-[var(--dash-text-soft)]">Currency</span>
              <input name="currency" maxLength={3} defaultValue="XAF" className="h-10 w-full rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-surface)] px-3 text-[var(--dash-text)]" />
            </label>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <label className="space-y-2 text-sm">
              <span className="text-[var(--dash-text-soft)]">Reference</span>
              <input name="reference" className="h-10 w-full rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-surface)] px-3 text-[var(--dash-text)]" />
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-[var(--dash-text-soft)]">Memo</span>
              <input name="memo" className="h-10 w-full rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-surface)] px-3 text-[var(--dash-text)]" />
            </label>
          </div>

          <div className="overflow-x-auto rounded-lg border border-[var(--dash-border-subtle)]">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="border-b border-[var(--dash-border-subtle)] text-left text-xs uppercase text-[var(--dash-text-faint)]">
                <tr>
                  <th className="px-4 py-3">Account</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3 text-right">Debit</th>
                  <th className="px-4 py-3 text-right">Credit</th>
                </tr>
              </thead>
              <tbody>
                {[0, 1, 2, 3, 4, 5].map((index) => (
                  <tr key={index} className="border-b border-[var(--dash-border-subtle)]">
                    <td className="px-4 py-3">
                      <select name={`accountId-${index}`} className="h-10 w-full rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-surface)] px-3 text-[var(--dash-text)]">
                        <option value="">Select account</option>
                        {postableAccounts.map((account) => (
                          <option key={account.id} value={account.id}>{account.code} - {account.nameEn}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <input name={`description-${index}`} className="h-10 w-full rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-surface)] px-3 text-[var(--dash-text)]" />
                    </td>
                    <td className="px-4 py-3">
                      <input name={`debit-${index}`} inputMode="decimal" className="h-10 w-full rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-surface)] px-3 text-right text-[var(--dash-text)]" />
                    </td>
                    <td className="px-4 py-3">
                      <input name={`credit-${index}`} inputMode="decimal" className="h-10 w-full rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-surface)] px-3 text-right text-[var(--dash-text)]" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button className="dashboard-button-create h-10 rounded-lg px-4 text-sm font-medium">Create draft</button>
        </form>
      </AccountingPanel>
    </AccountingPageShell>
  )
}

