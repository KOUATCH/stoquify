import { AROpenItemsHistoryWorkbench } from "@/components/finance/AROpenItemsHistoryWorkbench"
import { getTranslations } from "next-intl/server"

import { routeByKey, withFinanceSurfaceAccess } from "../../finance-route-access"

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "arHistory" })
  return { title: `${t("title")} | Stoquify`, description: t("summary") }
}

export default async function FinanceReceivablesHistoryPage({ params }: { params: Promise<{ locale: string }> }) {
  const surface = routeByKey("finance-receivables-history")

  if (!surface) {
    throw new Error("Missing finance route surface definition: finance-receivables-history")
  }

  return withFinanceSurfaceAccess({
    params,
    surface,
    onAllowed: () => (
      <div className="dashboard-landing-theme dark min-h-screen overflow-x-hidden">
        <div className="dashboard-landing-content min-w-0">
          <AROpenItemsHistoryWorkbench />
        </div>
      </div>
    ),
  })
}
