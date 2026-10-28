import { ShieldCheck, Settings2 } from "lucide-react"

import {
  getAccountingControlCenterAction,
  type AccountingControlCenterData,
} from "@/actions/accounting/settings.actions"
import { AccountingControlCenter } from "@/components/accounting/AccountingControlCenter"
import { checkPermission } from "@/config/useAuth"
import type { Locale } from "@/types/bilingual"
import {
  AccountingLinkButton,
  AccountingPageShell,
} from "../_components/accounting-ui"
import { routeByKey, withAccountingSurfaceAccess } from "../accounting-route-access"

type PageProps = {
  params: Promise<{ locale: string }>
}

function normalizeLocale(locale: string): Locale {
  return locale === "fr" ? "fr" : "en"
}

async function AccountingControlCenterPageImpl({ params }: PageProps) {
  await checkPermission("accounting.setup.manage")

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



export default async function AccountingRoutePage(props: any = {}) {
  const surface = routeByKey("accounting-control-center")

  if (!surface) {
    throw new Error("Missing accounting route surface definition: accounting-control-center")
  }

  return withAccountingSurfaceAccess({
    params: (props as { params?: Promise<{ locale: string }> }).params ?? Promise.resolve({ locale: "en" }),
    surface,
    onAllowed: async () => AccountingControlCenterPageImpl(props),
  })
}
