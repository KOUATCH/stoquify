import { ShieldCheck, Settings2 } from "lucide-react"

import {
  getAccountingControlCenterAction,
  type AccountingControlCenterData,
} from "@/actions/accounting/settings.actions"
import { AccountingControlCenter } from "@/components/accounting/AccountingControlCenter"
import type { Locale } from "@/types/bilingual"
import {
  AccountingLinkButton,
  AccountingPageShell,
} from "../_components/accounting-ui"

type PageProps = {
  params: Promise<{ locale: string }>
}

function normalizeLocale(locale: string): Locale {
  return locale === "fr" ? "fr" : "en"
}

export default async function AccountingControlCenterPage({ params }: PageProps) {
  const { locale } = await params
  const normalizedLocale = normalizeLocale(locale)
  const response = await getAccountingControlCenterAction({})
  const initialData = response.success ? (response.data as AccountingControlCenterData) : null

  return (
    <AccountingPageShell
      eyebrow={normalizedLocale === "fr" ? "Centre de controle" : "Accounting control"}
      title={normalizedLocale === "fr" ? "Centre De Controle Comptable" : "Accounting Control Center"}
      description={
        normalizedLocale === "fr"
          ? "Vue operationnelle des blocages comptables, mappages, journaux, regles d'ecriture, periodes et controle de verrouillage."
          : "Operational readiness view for accounting blockers, mappings, journals, posting rules, periods, and setup-lock control."
      }
      icon={ShieldCheck}
      actions={
        <AccountingLinkButton href="/dashboard/accounting/setup" variant="outline">
          <Settings2 className="h-4 w-4" />
          <span>{normalizedLocale === "fr" ? "Configuration" : "Setup"}</span>
        </AccountingLinkButton>
      }
    >
      <AccountingControlCenter
        locale={normalizedLocale}
        initialData={initialData}
        initialError={response.success ? null : response.error}
      />
    </AccountingPageShell>
  )
}
