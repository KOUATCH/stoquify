import { FileSearch } from "lucide-react"

import { getAccountantPortalAction } from "@/actions/accounting/data-trust.actions"
import { AccountantPortal } from "@/components/accounting/AccountantPortal"
import type { Locale } from "@/types/bilingual"
import { AccountingPageShell } from "../_components/accounting-ui"

type AccountantPortalPageProps = {
  params: Promise<{ locale?: Locale }>
}

export default async function AccountantPortalPage({ params }: AccountantPortalPageProps) {
  const portalResponse = await getAccountantPortalAction({ limit: 12 })
  const portal = portalResponse.success ? portalResponse.data : null
  const { locale = "en" } = await params

  return (
    <AccountingPageShell
      eyebrow="Data trust"
      title="Accountant Portal"
      description="Ledger-backed reporting, source-link evidence, audit trail, and certified trust-pack export controls."
      icon={FileSearch}
    >
      <AccountantPortal initialData={portal} initialError={portalResponse.error} locale={locale} />
    </AccountingPageShell>
  )
}
