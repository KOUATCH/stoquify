import SupplierManagementDashboard from "@/components/suppliers/SupplierManagementDashboard"
import { routeByKey, withPurchasesSurfaceAccess } from "../../purchases-route-access"

export const metadata = {
  title: "Create Supplier | Stoquify",
  description: "Create a supplier for purchasing, item links, payment terms, and payable workflows.",
}

export default async function CreatePurchaseSupplierPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale: rawLocale } = await params
  const surface = routeByKey("purchases-suppliers-create")

  if (!surface) {
    throw new Error("Missing purchases route surface definition: purchases-suppliers-create")
  }

  return withPurchasesSurfaceAccess({
    params: Promise.resolve({ locale: rawLocale }),
    surface,
    onAllowed: (context, locale) => {
      const basePath = `/${locale}/dashboard/purchases/suppliers`

      return (
        <div className="dashboard-landing-theme dark min-h-screen overflow-x-hidden">
          <div className="dashboard-landing-content mx-auto flex w-full max-w-[92rem] min-w-0 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
            <SupplierManagementDashboard
              organizationId={context.orgId}
              locale={locale}
              basePath={basePath}
              canExport={context.isSuperUser || context.permissions.includes("reports.export")}
              canExportSensitive={context.isSuperUser}
              initialAction="create"
            />
          </div>
        </div>
      )
    },
  })
}
