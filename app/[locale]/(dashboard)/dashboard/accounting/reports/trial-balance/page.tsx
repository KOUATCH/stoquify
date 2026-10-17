import { Scale } from "lucide-react"

import { getTrialBalanceAction } from "@/actions/accounting/reports.actions"
import { checkPermission } from "@/config/useAuth"
import { localizePath } from "@/i18n/routing"
import type { Locale } from "@/types/bilingual"
import {
  AccountingPageShell,
  AccountingPanel,
  AccountingStatCard,
  formatAccountingMoney,
} from "../../_components/accounting-ui"
import { TrialBalanceTable } from "./trial-balance-table"
import { routeByKey, withAccountingSurfaceAccess } from "../../accounting-route-access"

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

const copy = {
  en: {
    eyebrow: "Accounting reports", title: "Trial Balance",
    description: "A ledger-first report generated from posted and reversed journal entry lines.",
    unavailable: "Trial balance unavailable", denied: "Trial balance access",
    fallback: "Report data is unavailable.",
    currencyEvidence: "Functional-currency evidence is missing from a journal line. Review the historical entry before reporting.",
    evidenceRecovery: "Review the affected journal entries with your accounting administrator, then reload this report. Totals are withheld until the evidence is complete.",
    permissionRecovery: "Ask your organization administrator to review your accounting report access.",
    retryRecovery: "The report could not be loaded. Review the message above, then try again.",
    journals: "Review journal entries", access: "Review my access", retry: "Reload report",
    activityDebit: "Activity debit", activityCredit: "Activity credit",
    debitMovement: "Posted and reversed debit movement", creditMovement: "Posted and reversed credit movement",
    balanceCheck: "Balance check", balanced: "Balanced", unbalanced: "Out of balance",
    debit: "Debit", credit: "Credit", balances: "Account balances",
    balancesDescription: "Search, filter, and review the canonical report without losing full-report totals.",
  },
  fr: {
    eyebrow: "Rapports comptables", title: "Balance générale",
    description: "Rapport établi à partir des lignes d’écritures comptabilisées et extournées du grand livre.",
    unavailable: "Balance générale indisponible", denied: "Accès à la balance générale",
    fallback: "Les données du rapport sont indisponibles.",
    currencyEvidence: "Les montants en devise fonctionnelle manquent sur une ligne d’écriture. Vérifiez l’écriture historique avant de produire le rapport.",
    evidenceRecovery: "Vérifiez les écritures concernées avec votre responsable comptable, puis rechargez ce rapport. Les totaux restent masqués tant que les justificatifs sont incomplets.",
    permissionRecovery: "Demandez à votre administrateur de vérifier vos droits d’accès aux rapports comptables.",
    retryRecovery: "Le rapport n’a pas pu être chargé. Consultez le message ci-dessus, puis réessayez.",
    journals: "Consulter les écritures", access: "Vérifier mes autorisations", retry: "Recharger le rapport",
    activityDebit: "Mouvements au débit", activityCredit: "Mouvements au crédit",
    debitMovement: "Mouvements débiteurs comptabilisés et extournés", creditMovement: "Mouvements créditeurs comptabilisés et extournés",
    balanceCheck: "Contrôle de l’équilibre", balanced: "Équilibrée", unbalanced: "Déséquilibrée",
    debit: "Débit", credit: "Crédit", balances: "Soldes des comptes",
    balancesDescription: "Recherchez, filtrez et consultez le rapport sans perdre les totaux de l’ensemble du rapport.",
  },
} as const

async function TrialBalancePageImpl(locale: Locale) {
  await checkPermission("accounting.reports.read")

  const labels = copy[locale]
  const reportResponse = await getTrialBalanceAction({ includeZeroBalance: true })
  const report = reportResponse.success ? (reportResponse.data as TrialBalance) : null
  const denied = !reportResponse.success && reportResponse.code === "FORBIDDEN"
  const missingCurrencyEvidence = !reportResponse.success && reportResponse.error === copy.en.currencyEvidence
  const recoveryHref = denied ? "/dashboard/access-requests" : missingCurrencyEvidence
    ? "/dashboard/accounting/journals" : "/dashboard/accounting/reports/trial-balance"

  return (
    <AccountingPageShell
      eyebrow={labels.eyebrow}
      title={labels.title}
      description={labels.description}
      icon={Scale}
    >
      {!report ? (
        <AccountingPanel title={denied ? labels.denied : labels.unavailable}
          description={missingCurrencyEvidence ? labels.currencyEvidence : reportResponse.error || labels.fallback}>
          <div className="space-y-4 p-6 text-sm text-[var(--dash-text-soft)]">
            <p>{denied ? labels.permissionRecovery : missingCurrencyEvidence ? labels.evidenceRecovery : labels.retryRecovery}</p>
            <a href={localizePath(recoveryHref, locale)}
              className="inline-flex min-h-10 max-w-full items-center justify-center whitespace-normal break-words rounded-lg border border-[var(--dash-border-subtle)] px-4 py-2 font-semibold text-[var(--dash-text)] hover:bg-[var(--dash-surface-raised)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dash-focus)]">
              {denied ? labels.access : missingCurrencyEvidence ? labels.journals : labels.retry}
            </a>
          </div>
        </AccountingPanel>
      ) : (
        <div className="space-y-6">
          <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-3">
            <AccountingStatCard
              label={labels.activityDebit}
              value={formatAccountingMoney(report.totals.activityDebit)}
              sub={labels.debitMovement}
              icon={Scale}
              accent="var(--dash-brand)"
              soft="var(--dash-brand-soft)"
            />
            <AccountingStatCard
              label={labels.activityCredit}
              value={formatAccountingMoney(report.totals.activityCredit)}
              sub={labels.creditMovement}
              icon={Scale}
              accent="var(--dash-info)"
              soft="var(--dash-info-soft)"
            />
            <AccountingStatCard
              label={labels.balanceCheck}
              value={report.totals.isBalanced ? labels.balanced : labels.unbalanced}
              sub={`${labels.debit} ${formatAccountingMoney(report.totals.debitBalance)} · ${labels.credit} ${formatAccountingMoney(report.totals.creditBalance)}`}
              icon={Scale}
              accent={report.totals.isBalanced ? "var(--dash-success)" : "var(--dash-danger)"}
              soft={report.totals.isBalanced ? "var(--dash-success-soft)" : "var(--dash-danger-soft)"}
            />
          </div>

          <AccountingPanel title={labels.balances} description={labels.balancesDescription}>
            <TrialBalanceTable rows={report.rows} totals={report.totals} locale={locale} />
          </AccountingPanel>
        </div>
      )}
    </AccountingPageShell>
  )
}




export default async function AccountingRoutePage(props: any = {}) {
  const surface = routeByKey("accounting-reports-trial-balance")

  if (!surface) {
    throw new Error("Missing accounting route surface definition: accounting-reports-trial-balance")
  }

  return withAccountingSurfaceAccess({
    params: (props as { params?: Promise<{ locale: string }> }).params ?? Promise.resolve({ locale: "en" }),
    surface,
    onAllowed: async (_context, locale) => TrialBalancePageImpl(locale),
  })
}
