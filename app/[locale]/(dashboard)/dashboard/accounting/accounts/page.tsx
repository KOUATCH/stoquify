import { redirect } from "next/navigation"
import { Archive, ListTree, Plus } from "lucide-react"

import {
  archiveChartAccountAction,
  createChartAccountAction,
  listChartAccountsAction,
} from "@/actions/accounting/accounts.actions"
import {
  AccountingMessage,
  AccountingPageShell,
  AccountingPanel,
  AccountingStatCard,
} from "../_components/accounting-ui"

type AccountRow = {
  id: string
  code: string
  nameEn: string
  nameFr: string | null
  type: string
  normalBalance: string
  isActive: boolean
  allowManualPost: boolean
  isControlAccount: boolean
  currency: string | null
  _count: { children: number; journalLines: number }
}

type PageProps = {
  params: Promise<{ locale: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

const accountTypes = [
  "ASSET",
  "LIABILITY",
  "EQUITY",
  "REVENUE",
  "EXPENSE",
  "CONTRA_ASSET",
  "CONTRA_REVENUE",
  "MEMO",
]

function resultPath(locale: string, ok: boolean, text: string) {
  const key = ok ? "notice" : "error"
  return `/${locale}/dashboard/accounting/accounts?${key}=${encodeURIComponent(text)}`
}

export default async function AccountingAccountsPage({ params, searchParams }: PageProps) {
  const { locale } = await params
  const resolvedSearchParams = searchParams ? await searchParams : {}
  const accountsResponse = await listChartAccountsAction({ includeInactive: true })
  const accounts = accountsResponse.success ? (accountsResponse.data as AccountRow[]) : []

  async function createAccount(formData: FormData) {
    "use server"
    const result = await createChartAccountAction({
      code: String(formData.get("code") || ""),
      nameEn: String(formData.get("nameEn") || ""),
      nameFr: String(formData.get("nameFr") || ""),
      type: String(formData.get("type") || "ASSET"),
      normalBalance: String(formData.get("normalBalance") || "DEBIT"),
      currency: String(formData.get("currency") || ""),
      syscohadaClass: String(formData.get("syscohadaClass") || ""),
      syscohadaReference: String(formData.get("syscohadaReference") || ""),
      mappingKey: String(formData.get("mappingKey") || ""),
      isControlAccount: formData.get("isControlAccount") === "on",
      allowManualPost: formData.get("allowManualPost") === "on",
    })

    redirect(resultPath(locale, result.success, result.success ? "Account created" : result.error))
  }

  async function archiveAccount(formData: FormData) {
    "use server"
    const result = await archiveChartAccountAction({
      accountId: String(formData.get("accountId") || ""),
    })

    redirect(resultPath(locale, result.success, result.success ? "Account archived" : result.error))
  }

  return (
    <AccountingPageShell
      eyebrow="Chart of accounts"
      title="Accounting Accounts"
      description="Create and maintain postable OHADA/SYSCOHADA account nodes before journal automation."
      icon={ListTree}
    >
      <AccountingMessage error={resolvedSearchParams.error} notice={resolvedSearchParams.notice} />

      <div className="mb-6 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-3">
        <AccountingStatCard
          label="Total accounts"
          value={accounts.length.toString()}
          sub="Including inactive"
          icon={ListTree}
          accent="var(--dash-brand)"
          soft="var(--dash-brand-soft)"
        />
        <AccountingStatCard
          label="Postable"
          value={accounts.filter((account) => account.allowManualPost && account._count.children === 0).length.toString()}
          sub="Manual journal lines"
          icon={Plus}
          accent="var(--dash-success)"
          soft="var(--dash-success-soft)"
        />
        <AccountingStatCard
          label="Archived"
          value={accounts.filter((account) => !account.isActive).length.toString()}
          sub="Disabled nodes"
          icon={Archive}
          accent="var(--dash-warning)"
          soft="var(--dash-warning-soft)"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.6fr]">
        <AccountingPanel title="Create account" description="Use leaf accounts for manual journal posting.">
          <form action={createAccount} className="grid gap-4 p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm">
                <span className="text-[var(--dash-text-soft)]">Code</span>
                <input name="code" required className="h-10 w-full rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-surface)] px-3 text-[var(--dash-text)]" />
              </label>
              <label className="space-y-2 text-sm">
                <span className="text-[var(--dash-text-soft)]">SYSCOHADA class</span>
                <input name="syscohadaClass" className="h-10 w-full rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-surface)] px-3 text-[var(--dash-text)]" />
              </label>
            </div>
            <label className="space-y-2 text-sm">
              <span className="text-[var(--dash-text-soft)]">English name</span>
              <input name="nameEn" required className="h-10 w-full rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-surface)] px-3 text-[var(--dash-text)]" />
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-[var(--dash-text-soft)]">French name</span>
              <input name="nameFr" className="h-10 w-full rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-surface)] px-3 text-[var(--dash-text)]" />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm">
                <span className="text-[var(--dash-text-soft)]">Type</span>
                <select name="type" className="h-10 w-full rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-surface)] px-3 text-[var(--dash-text)]">
                  {accountTypes.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 text-sm">
                <span className="text-[var(--dash-text-soft)]">Normal balance</span>
                <select name="normalBalance" className="h-10 w-full rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-surface)] px-3 text-[var(--dash-text)]">
                  <option value="DEBIT">DEBIT</option>
                  <option value="CREDIT">CREDIT</option>
                </select>
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm">
                <span className="text-[var(--dash-text-soft)]">Currency</span>
                <input name="currency" maxLength={3} placeholder="XAF" className="h-10 w-full rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-surface)] px-3 text-[var(--dash-text)]" />
              </label>
              <label className="space-y-2 text-sm">
                <span className="text-[var(--dash-text-soft)]">Mapping key</span>
                <input name="mappingKey" className="h-10 w-full rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-surface)] px-3 text-[var(--dash-text)]" />
              </label>
            </div>
            <label className="flex items-center gap-3 text-sm text-[var(--dash-text-soft)]">
              <input name="allowManualPost" type="checkbox" defaultChecked className="h-4 w-4 rounded border-[var(--dash-border-subtle)]" />
              Allow manual posting
            </label>
            <label className="flex items-center gap-3 text-sm text-[var(--dash-text-soft)]">
              <input name="isControlAccount" type="checkbox" className="h-4 w-4 rounded border-[var(--dash-border-subtle)]" />
              Control account
            </label>
            <button className="dashboard-button-create h-10 rounded-lg px-4 text-sm font-medium">Create account</button>
          </form>
        </AccountingPanel>

        <AccountingPanel title="Account list" description={accountsResponse.success ? "Active and archived account nodes." : accountsResponse.error || "Accounts unavailable."}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="border-b border-[var(--dash-border-subtle)] text-left text-xs uppercase text-[var(--dash-text-faint)]">
                <tr>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Normal</th>
                  <th className="px-4 py-3">Manual</th>
                  <th className="px-4 py-3">Lines</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {accounts.length ? (
                  accounts.map((account) => (
                    <tr key={account.id} className="border-b border-[var(--dash-border-subtle)]">
                      <td className="px-4 py-3 font-medium text-[var(--dash-text)]">{account.code}</td>
                      <td className="px-4 py-3 text-[var(--dash-text-soft)]">{account.nameEn}</td>
                      <td className="px-4 py-3 text-[var(--dash-text-soft)]">{account.type}</td>
                      <td className="px-4 py-3 text-[var(--dash-text-soft)]">{account.normalBalance}</td>
                      <td className="px-4 py-3 text-[var(--dash-text-soft)]">{account.allowManualPost ? "Yes" : "No"}</td>
                      <td className="px-4 py-3 text-[var(--dash-text-soft)]">{account._count.journalLines}</td>
                      <td className="px-4 py-3 text-right">
                        {account.isActive ? (
                          <form action={archiveAccount}>
                            <input type="hidden" name="accountId" value={account.id} />
                            <button className="dashboard-button-secondary h-9 rounded-lg px-3 text-xs font-medium">Archive</button>
                          </form>
                        ) : (
                          <span className="text-xs text-[var(--dash-text-faint)]">Archived</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-[var(--dash-text-soft)]">No accounts yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </AccountingPanel>
      </div>
    </AccountingPageShell>
  )
}

