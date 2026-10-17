import { getTranslations } from "next-intl/server"
import { FilePlus2, Scale } from "lucide-react"

import { listChartAccountsAction } from "@/actions/accounting/accounts.actions"
import { createManualJournalEntryAction, listJournalsAction } from "@/actions/accounting/journals.actions"
import { checkPermission } from "@/config/useAuth"
import { getModuleOperationErrorReason } from "@/lib/modules/module-operation-error"
import ManualJournalDraftForm from "./ManualJournalDraftForm"
import {
  AccountingLinkButton,
  AccountingMessage,
  AccountingPageShell,
  AccountingPanel,
} from "../../_components/accounting-ui"
import { routeByKey, withAccountingSurfaceAccess } from "../../accounting-route-access"

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

async function NewJournalEntryPageImpl({ params, searchParams }: PageProps) {
  await checkPermission("accounting.journal.create")
  await checkPermission("accounting.journal.read")

  const { locale } = await params
  const copy = locale === "fr" ? {
    eyebrow: "Écriture manuelle", title: "Nouvelle écriture comptable",
    description: "Préparez un brouillon équilibré entre débits et crédits avant de le comptabiliser dans le grand livre.",
    queue: "Liste des écritures", panel: "Saisie manuelle",
    eligibility: "Seuls les comptes imputables sans sous-comptes et les journaux autorisant la saisie manuelle sont affichés.",
    created: "Brouillon d’écriture créé", journal: "Journal", selectJournal: "Sélectionner un journal",
    date: "Date de l’écriture", currency: "Devise", reference: "Référence", memo: "Libellé",
    lines: "Lignes de l’écriture", account: "Compte", descriptionColumn: "Description",
    debit: "Débit", credit: "Crédit", selectAccount: "Sélectionner un compte",
    accessTitle: "Accès à la configuration comptable requis",
    accessDescription: "Votre session ne permet pas de consulter les comptes ou les journaux nécessaires à cette saisie. Demandez à un administrateur de l’organisation de vérifier vos droits avant de créer un brouillon.",
    returnQueue: "Retour aux journaux",
  } : {
    eyebrow: "Manual journal", title: "New Journal Entry",
    description: "Enter a balanced debit and credit draft before posting it to the ledger.",
    queue: "Journal queue", panel: "Manual entry",
    eligibility: "Only postable leaf accounts and manual journals are shown.",
    created: "Journal draft created", journal: "Journal", selectJournal: "Select journal",
    date: "Entry date", currency: "Currency", reference: "Reference", memo: "Memo",
    lines: "Journal entry lines", account: "Account", descriptionColumn: "Description",
    debit: "Debit", credit: "Credit", selectAccount: "Select account",
    accessTitle: "Accounting setup access required",
    accessDescription: "Your session cannot read the accounts or journals needed for this entry. Ask an organization administrator to review your permissions before creating a draft.",
    returnQueue: "Back to journals",
  }
  const t = await getTranslations({ locale, namespace: "moduleComposition.accountingCreate" })
  const resolvedSearchParams = searchParams ? await searchParams : {}
  const [accountsResponse, journalsResponse] = await Promise.all([
    listChartAccountsAction({}),
    listJournalsAction({}),
  ])
  const postableAccounts = accountsResponse.success ? (accountsResponse.data as AccountRow[]).filter((account) => account.isActive && account.allowManualPost && account._count.children === 0) : null
  const manualJournals = journalsResponse.success ? (journalsResponse.data as JournalRow[]).filter((journal) => journal.isActive && journal.allowManualEntries) : null
  const setupAccessDenied = (!accountsResponse.success && accountsResponse.code === "FORBIDDEN") ||
    (!journalsResponse.success && journalsResponse.code === "FORBIDDEN")
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

    if (result.success) return { success: true as const }
    return { success: false as const, error: result.error, code: result.code, reason: getModuleOperationErrorReason(result) }
  }

  return (
    <AccountingPageShell
      eyebrow={copy.eyebrow}
      title={copy.title}
      description={copy.description}
      icon={FilePlus2}
      actions={
        <AccountingLinkButton href="/dashboard/accounting/journals" variant="outline">
          <Scale className="h-4 w-4" />
          <span>{copy.queue}</span>
        </AccountingLinkButton>
      }
    >
      <AccountingMessage error={resolvedSearchParams.error} notice={resolvedSearchParams.notice} />

      <AccountingPanel
        title={copy.panel}
        description={
          accountsResponse.success && journalsResponse.success
            ? copy.eligibility
            : setupAccessDenied ? copy.accessDescription : t("loadFailedDescription")
        }
      >
        {!postableAccounts || !manualJournals ? <div className="space-y-4 p-5">
          <AccountingMessage error={setupAccessDenied ? copy.accessTitle : t("loadFailedTitle")} />
          <AccountingLinkButton href={setupAccessDenied ? "/dashboard/accounting/journals" : "/dashboard/accounting/journals/new"} variant="outline">{setupAccessDenied ? copy.returnQueue : t("retryLoad")}</AccountingLinkButton>
        </div> : postableAccounts.length === 0 || manualJournals.length === 0 ? <div className="p-5">
          <AccountingMessage notice={t("emptySetup")} />
        </div> : <ManualJournalDraftForm submitAction={createEntry}
          queueHref={`/${locale}/dashboard/accounting/journals`}
          successHref={`/${locale}/dashboard/accounting/journals?notice=${encodeURIComponent(copy.created)}`}
          labels={{ stoppedTitle: t("stoppedTitle"), stoppedDescription: t("stoppedDescription"), reviewAccess: t("reviewAccess"), openQueue: t("openQueue"), failedTitle: t("failedTitle"), connectionFailure: t("connectionFailure"), creating: t("creating"), createDraft: t("createDraft") }}>
          <div className="grid gap-4 lg:grid-cols-4">
            <label className="space-y-2 text-sm lg:col-span-2">
              <span className="text-[var(--dash-text-soft)]">{copy.journal}</span>
              <select name="journalId" required className="h-10 w-full rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-surface)] px-3 text-[var(--dash-text)]">
                <option value="">{copy.selectJournal}</option>
                {manualJournals.map((journal) => (
                  <option key={journal.id} value={journal.id}>{journal.code} - {journal.nameEn}</option>
                ))}
              </select>
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-[var(--dash-text-soft)]">{copy.date}</span>
              <input name="entryDate" type="date" defaultValue={today} required className="h-10 w-full rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-surface)] px-3 text-[var(--dash-text)]" />
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-[var(--dash-text-soft)]">{copy.currency}</span>
              <input name="currency" maxLength={3} defaultValue="XAF" className="h-10 w-full rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-surface)] px-3 text-[var(--dash-text)]" />
            </label>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <label className="space-y-2 text-sm">
              <span className="text-[var(--dash-text-soft)]">{copy.reference}</span>
              <input name="reference" className="h-10 w-full rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-surface)] px-3 text-[var(--dash-text)]" />
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-[var(--dash-text-soft)]">{copy.memo}</span>
              <input name="memo" className="h-10 w-full rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-surface)] px-3 text-[var(--dash-text)]" />
            </label>
          </div>

          <div role="region" aria-label={copy.lines} tabIndex={0} className="overflow-x-auto rounded-lg border border-[var(--dash-border-subtle)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--dash-brand)]">
            <table className="dashboard-table-base w-full min-w-[900px] text-sm">
              <thead className="border-b border-[var(--dash-border-subtle)] text-left text-xs uppercase text-[var(--dash-text-faint)]">
                <tr>
                  <th scope="col" className="px-4 py-3">{copy.account}</th>
                  <th scope="col" className="px-4 py-3">{copy.descriptionColumn}</th>
                  <th scope="col" className="px-4 py-3 text-right">{copy.debit}</th>
                  <th scope="col" className="px-4 py-3 text-right">{copy.credit}</th>
                </tr>
              </thead>
              <tbody>
                {[0, 1, 2, 3, 4, 5].map((index) => (
                  <tr key={index} className="border-b border-[var(--dash-border-subtle)]">
                    <td className="px-4 py-3">
                      <select aria-label={`${locale === "fr" ? "Compte — ligne" : "Account — line"} ${index + 1}`} name={`accountId-${index}`} className="h-10 w-full rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-surface)] px-3 text-[var(--dash-text)]">
                        <option value="">{copy.selectAccount}</option>
                        {postableAccounts.map((account) => (
                          <option key={account.id} value={account.id}>{account.code} - {account.nameEn}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <input aria-label={`${locale === "fr" ? "Description — ligne" : "Description — line"} ${index + 1}`} name={`description-${index}`} className="h-10 w-full rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-surface)] px-3 text-[var(--dash-text)]" />
                    </td>
                    <td className="px-4 py-3">
                      <input aria-label={`${locale === "fr" ? "Débit — ligne" : "Debit — line"} ${index + 1}`} name={`debit-${index}`} inputMode="decimal" className="h-10 w-full rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-surface)] px-3 text-right text-[var(--dash-text)]" />
                    </td>
                    <td className="px-4 py-3">
                      <input aria-label={`${locale === "fr" ? "Crédit — ligne" : "Credit — line"} ${index + 1}`} name={`credit-${index}`} inputMode="decimal" className="h-10 w-full rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-surface)] px-3 text-right text-[var(--dash-text)]" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </ManualJournalDraftForm>}
      </AccountingPanel>
    </AccountingPageShell>
  )
}




export default async function AccountingRoutePage(props: any = {}) {
  const surface = routeByKey("accounting-journals-new")

  if (!surface) {
    throw new Error("Missing accounting route surface definition: accounting-journals-new")
  }

  return withAccountingSurfaceAccess({
    params: (props as { params?: Promise<{ locale: string }> }).params ?? Promise.resolve({ locale: "en" }),
    surface,
    onAllowed: async () => NewJournalEntryPageImpl(props),
  })
}
