import { UserRoundCog } from "lucide-react"

import { getAccountantAccessRegisterAction } from "@/actions/accounting/accountant-access.actions"
import { AccountantAccessManager } from "@/components/accounting/AccountantAccessManager"
import { FirmEngagementWorkspace } from "@/components/accounting/FirmEngagementWorkspace"
import { AccountantInvitationDelivery } from "@/components/accounting/AccountantInvitationDelivery"
import { firmEngagementCopy } from "@/components/accounting/firm-engagement-copy"
import Link from "next/link"
import { accountantAccessCopy } from "@/components/accounting/accountantAccessCopy"
import type { Locale } from "@/types/bilingual"
import { checkPermission } from "@/config/useAuth"
import { AccountingPageShell } from "../_components/accounting-ui"
import { routeByKey, withAccountingSurfaceAccess } from "../accounting-route-access"

async function AccountantAccessPageImpl(locale: Locale, firm: boolean) {
  const t = accountantAccessCopy[locale]
  await checkPermission("accounting.close.accountant.invite")
  const response = firm ? null : await getAccountantAccessRegisterAction()
  const ft = firmEngagementCopy[locale]

  return (
    <AccountingPageShell
      eyebrow={t.eyebrow}
      title={firm ? ft.title : t.title}
      description={firm ? ft.intro : t.description}
      icon={UserRoundCog}
    >
      <nav aria-label={ft.title} className="mb-6 flex flex-wrap gap-3">
        <Link className="dashboard-button-secondary min-h-11 rounded-lg px-4 py-2" aria-current={!firm ? "page" : undefined} href={`/${locale}/dashboard/accounting/accountant-access`}>{ft.clientView}</Link>
        <Link className="dashboard-button-secondary min-h-11 rounded-lg px-4 py-2" aria-current={firm ? "page" : undefined} href={`/${locale}/dashboard/accounting/accountant-access?view=firm`}>{ft.title}</Link>
      </nav>
      {firm ? <FirmEngagementWorkspace locale={locale} /> : response?.success ? (
        <div className="space-y-6"><AccountantAccessManager initialGrants={response.data} locale={locale} /><AccountantInvitationDelivery locale={locale} /></div>
      ) : (
        <div className="rounded-xl border border-destructive/30 p-5 text-sm text-destructive">
          <p>{t.loadError}</p>
          <p>{response && !response.success ? response.error : t.loadError}</p>
        </div>
      )}
    </AccountingPageShell>
  )
}



export default async function AccountingRoutePage(props: any = {}) {
  const surface = routeByKey("accounting-accountant-access")

  if (!surface) {
    throw new Error("Missing accounting route surface definition: accounting-accountant-access")
  }

  const params = (props as { params?: Promise<{ locale: string }> }).params ?? Promise.resolve({ locale: "en" })
  const { locale } = await params
  const search = await (props.searchParams ?? Promise.resolve({}))

  return withAccountingSurfaceAccess({
    params,
    surface,
    onAllowed: async () => AccountantAccessPageImpl(locale === "fr" ? "fr" : "en", search.view === "firm"),
  })
}
