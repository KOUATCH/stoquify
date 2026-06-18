import { ClipboardCheck, FileSearch, ShieldCheck } from "lucide-react"

import { getCloseAssuranceDashboardAction } from "@/actions/accounting/close-assurance.actions"
import { CloseAssuranceCenter } from "@/components/accounting/CloseAssuranceCenter"
import type { Locale } from "@/types/bilingual"
import { AccountingLinkButton, AccountingPageShell } from "../../_components/accounting-ui"

type CloseAssurancePeriodPageProps = {
  params: Promise<{ locale?: string; periodId: string }>
}

function normalizeLocale(locale?: string): Locale {
  return locale === "fr" ? "fr" : "en"
}

export default async function CloseAssurancePeriodPage({ params }: CloseAssurancePeriodPageProps) {
  const { locale, periodId } = await params
  const normalizedLocale = normalizeLocale(locale)
  const response = await getCloseAssuranceDashboardAction({ periodId })
  const initialData = response.success ? response.data : null

  return (
    <AccountingPageShell
      eyebrow={normalizedLocale === "fr" ? "Assurance de cloture" : "Close assurance"}
      title={normalizedLocale === "fr" ? "Centre De Cloture" : "Close & Assurance Center"}
      description={
        normalizedLocale === "fr"
          ? "Readiness de cloture fondee sur le ledger, la reconciliation, le suspense et les preuves de confiance."
          : "Close readiness from the ledger, reconciliation, suspense, and data-trust evidence already in the accounting backbone."
      }
      icon={ClipboardCheck}
      actions={
        <>
          <AccountingLinkButton href="/dashboard/accounting/control-center" variant="outline">
            <ShieldCheck className="h-4 w-4" />
            <span>{normalizedLocale === "fr" ? "Controle" : "Control center"}</span>
          </AccountingLinkButton>
          <AccountingLinkButton href="/dashboard/accounting/accountant-portal" variant="outline">
            <FileSearch className="h-4 w-4" />
            <span>{normalizedLocale === "fr" ? "Preuves" : "Evidence"}</span>
          </AccountingLinkButton>
        </>
      }
    >
      <CloseAssuranceCenter
        locale={normalizedLocale}
        initialData={initialData}
        initialError={response.success ? null : response.error}
        initialPeriodId={periodId}
      />
    </AccountingPageShell>
  )
}
