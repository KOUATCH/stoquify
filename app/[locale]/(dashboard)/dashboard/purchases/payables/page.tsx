import APControlWorkbench from "@/components/purchasing/APControlWorkbench"
import { getAuthenticatedUser } from "@/config/useAuth"
import { localizePath, pickLocale } from "@/i18n/routing"
import { getAPWorkbenchAction } from "@/actions/purchasing/ap-control.actions"
import { redirect } from "next/navigation"

export const metadata = {
  title: "AP Workbench | StockFlow",
  description: "Supplier AP ledger, payment, reconciliation, and country-pack control workbench.",
}

export default async function PurchasePayablesPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale: rawLocale } = await params
  const locale = pickLocale(rawLocale)
  const user = await getAuthenticatedUser()

  if (!user.organizationId) {
    redirect(localizePath("/unauthorized", locale))
  }

  const result = await getAPWorkbenchAction({ limit: 25 })

  return (
    <div className="dashboard-landing-theme dark min-h-screen overflow-x-hidden">
      <div className="dashboard-landing-content mx-auto flex w-full max-w-[1920px] min-w-0 flex-col gap-4 px-4 py-4 sm:px-6 sm:py-6">
        <APControlWorkbench
          data={result.success ? result.data : null}
          error={result.success ? null : result.error}
          locale={locale}
        />
      </div>
    </div>
  )
}
