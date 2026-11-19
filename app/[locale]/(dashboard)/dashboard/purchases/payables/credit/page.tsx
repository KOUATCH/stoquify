import { DashboardRouteState } from "@/components/dashboard/DashboardRouteState"
import { SupplierCreditWorkbench } from "@/components/purchasing/SupplierCreditWorkbench"
import { loadSupplierCreditWorkbench } from "@/services/purchasing/supplier-credit-workbench.service"
import { routeByKey, withPurchasesSurfaceAccess } from "../../purchases-route-access"

export default async function SupplierCreditPage({
  params, searchParams,
}: { params: Promise<{ locale: string }>; searchParams: Promise<{ q?: string | string[] }> }) {
  const surface = routeByKey("purchases-supplier-credit")
  if (!surface) throw new Error("Missing supplier credit route definition")
  const { q } = await searchParams
  const search = typeof q === "string" ? q.trim().slice(0, 80) : ""
  return withPurchasesSurfaceAccess({
    params, surface, permissionOptions: { auditAllowed: false },
    onAllowed: async (context, locale) => {
      const payablesHref = `/${locale}/dashboard/purchases/payables`
      try {
        const data = await loadSupplierCreditWorkbench(context.orgId, search)
        return <div className="dashboard-landing-theme dark min-h-screen overflow-x-hidden">
          <div className="dashboard-landing-content mx-auto w-full min-w-0 max-w-5xl px-4 py-5 sm:px-6">
            <SupplierCreditWorkbench key={`${context.orgId}:${context.userId}`} data={data} locale={locale} search={search} organizationId={context.orgId} actorId={context.userId} />
          </div>
        </div>
      } catch {
        return <DashboardRouteState kind="error"
          title={locale === "fr" ? "Les avoirs fournisseurs sont indisponibles" : "Supplier credits are unavailable"}
          message={locale === "fr" ? "Réessayez depuis les comptes fournisseurs." : "Retry from the AP workbench."}
          primaryHref={payablesHref} primaryLabel={locale === "fr" ? "Comptes fournisseurs" : "AP workbench"} />
      }
    },
  })
}
