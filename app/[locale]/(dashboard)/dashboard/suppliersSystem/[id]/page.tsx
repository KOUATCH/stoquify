import SupplierManagementDashboard from "@/components/suppliers/SupplierManagementDashboard"
import { routeByKey, withSuppliersSystemSurfaceAccess } from "../suppliers-system-route-access"

interface SupplierSystemAnalyticsPageProps {
  params: Promise<{ locale: string; id: string }>
}

export const metadata = {
  title: "Supplier Analytics | Stoquify",
  description: "Review supplier purchase activity, payable ledger, item links, and exposure.",
}

export default async function SupplierSystemAnalyticsPage({ params }: SupplierSystemAnalyticsPageProps) {
  const { locale: rawLocale, id } = await params
  const surface = routeByKey("suppliers-system-detail")

  if (!surface) {
    throw new Error("Missing suppliers system route surface definition: suppliers-system-detail")
  }

  return withSuppliersSystemSurfaceAccess({
    params: Promise.resolve({ locale: rawLocale }),
    surface,
    permissionOptions: {
      resourceId: id,
    },
    onAllowed: (context, locale) => {
      const basePath = `/${locale}/dashboard/suppliersSystem`

      return (
        <div className="dashboard-landing-theme dark min-h-screen overflow-x-hidden">
          <div className="dashboard-landing-content mx-auto flex w-full max-w-[92rem] min-w-0 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
            <SupplierManagementDashboard
              organizationId={context.orgId}
              locale={locale}
              basePath={basePath}
              canExport={context.isSuperUser || context.permissions.includes("reports.export")}
              canExportSensitive={context.isSuperUser}
              canEdit={context.isSuperUser || context.permissions.includes("purchases.suppliers.update")}
              initialAnalyticsId={id}
            />
          </div>
        </div>
      )
    },
  })
}