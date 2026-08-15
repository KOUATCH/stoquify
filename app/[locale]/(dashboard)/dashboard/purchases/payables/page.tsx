import { getAPWorkbenchAction } from "@/actions/purchasing/ap-control.actions"
import { DashboardRouteState } from "@/components/dashboard/DashboardRouteState"
import APControlWorkbench from "@/components/purchasing/APControlWorkbench"
import { routeByKey, withPurchasesSurfaceAccess } from "../purchases-route-access"

export const metadata = {
  title: "AP Workbench | Stoquify",
  description: "Supplier AP ledger, payment, reconciliation, and country-pack control workbench.",
}

const routeCopy = {
  en: {
    errorTitle: "AP workbench data is unavailable",
    errorMessage: "The read-only AP source failed safely. Retry from purchases without exposing internal failure details.",
    back: "Back to purchases",
  },
  fr: {
    errorTitle: "Les données de l’atelier AP sont indisponibles",
    errorMessage: "La source AP en lecture seule a échoué de manière sûre. Réessayez sans exposer les détails internes.",
    back: "Retour aux achats",
  },
} as const

export default async function PurchasePayablesPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale: rawLocale } = await params
  const surface = routeByKey("purchases-payables")

  if (!surface) {
    throw new Error("Missing purchases route surface definition: purchases-payables")
  }

  return withPurchasesSurfaceAccess({
    params: Promise.resolve({ locale: rawLocale }),
    surface,
    onAllowed: async (_context, locale) => {
      const t = routeCopy[locale]
      const result = await getAPWorkbenchAction({ limit: 25 })

      if (!result.success) {
        return (
          <DashboardRouteState
            kind="error"
            title={t.errorTitle}
            message={t.errorMessage}
            primaryHref={`/${locale}/dashboard/purchases`}
            primaryLabel={t.back}
          />
        )
      }

      return (
        <div className="dashboard-landing-theme dark min-h-screen overflow-x-hidden">
          <div className="dashboard-landing-content mx-auto flex w-full max-w-[1920px] min-w-0 flex-col gap-4 px-4 py-4 sm:px-6 sm:py-6">
            <APControlWorkbench
              data={result.data}
              error={null}
              locale={locale}
            />
          </div>
        </div>
      )
    },
  })
}
