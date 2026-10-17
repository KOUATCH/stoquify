import { UserRoundCog } from "lucide-react"

import { getAccountantAccessRegisterAction } from "@/actions/accounting/accountant-access.actions"
import { AccountantAccessManager } from "@/components/accounting/AccountantAccessManager"
import { accountantAccessCopy } from "@/components/accounting/accountantAccessCopy"
import type { Locale } from "@/types/bilingual"
import { checkPermission } from "@/config/useAuth"
import { AccountingPageShell } from "../_components/accounting-ui"
import { routeByKey, withAccountingSurfaceAccess } from "../accounting-route-access"

async function AccountantAccessPageImpl(locale: Locale) {
  const t = accountantAccessCopy[locale]
  await checkPermission("accounting.close.accountant.invite")
  const response = await getAccountantAccessRegisterAction()

  return (
    <AccountingPageShell
      eyebrow={t.eyebrow}
      title={t.title}
      description={t.description}
      icon={UserRoundCog}
    >
      {response.success ? (
        <AccountantAccessManager initialGrants={response.data} locale={locale} />
      ) : (
        <div className="rounded-xl border border-destructive/30 p-5 text-sm text-destructive">
          <p>{t.loadError}</p>
          <p>{response.error}</p>
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

  return withAccountingSurfaceAccess({
    params,
    surface,
    onAllowed: async () => AccountantAccessPageImpl(locale === "fr" ? "fr" : "en"),
  })
}
