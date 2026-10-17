import { FileSearch } from "lucide-react"

import { getAccountantPortalAction } from "@/actions/accounting/data-trust.actions"
import { AccountantPortal } from "@/components/accounting/AccountantPortal"
import { checkPermission } from "@/config/useAuth"
import type { Locale } from "@/types/bilingual"
import { AccountingPageShell } from "../_components/accounting-ui"
import { routeByKey, withAccountingSurfaceAccess } from "../accounting-route-access"

type AccountantPortalPageProps = {
  params: Promise<{ locale?: Locale }>
  searchParams?: Promise<{ clientOrganizationId?: string; periodId?: string }>
}

async function AccountantPortalPageImpl({ params, searchParams }: AccountantPortalPageProps) {
  await checkPermission("accounting.audit.read")

  const query = await searchParams
  const portalResponse = await getAccountantPortalAction({
    limit: 12,
    clientOrganizationId: query?.clientOrganizationId,
    periodId: query?.periodId,
  })
  const portal = portalResponse.success ? portalResponse.data : null
  const { locale = "en" } = await params
  const fr = locale === "fr"

  return (
    <AccountingPageShell
      eyebrow={fr ? "Fiabilité des données" : "Data trust"}
      title={fr ? "Portail comptable" : "Accountant Portal"}
      description={fr ? "Rapports fondés sur le grand livre, justificatifs sources, piste d’audit et contrôles d’export du pack de confiance certifié." : "Ledger-backed reporting, source-link evidence, audit trail, and certified trust-pack export controls."}
      icon={FileSearch}
    >
      <AccountantPortal initialData={portal} initialError={portalResponse.error} locale={locale} clientOrganizationId={query?.clientOrganizationId} periodId={query?.periodId} />
    </AccountingPageShell>
  )
}



export default async function AccountingRoutePage(props: any = {}) {
  const surface = routeByKey("accounting-accountant-portal")

  if (!surface) {
    throw new Error("Missing accounting route surface definition: accounting-accountant-portal")
  }

  return withAccountingSurfaceAccess({
    params: (props as { params?: Promise<{ locale: string }> }).params ?? Promise.resolve({ locale: "en" }),
    surface,
    onAllowed: async () => AccountantPortalPageImpl(props),
  })
}
