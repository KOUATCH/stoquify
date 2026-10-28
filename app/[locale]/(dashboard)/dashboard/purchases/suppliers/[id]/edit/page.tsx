import SupplierManagementDashboard from "@/components/suppliers/SupplierManagementDashboard"
import { routeByKey, withPurchasesSurfaceAccess } from "../../../purchases-route-access"

interface EditPurchaseSupplierPageProps {
  params: Promise<{ locale: string; id: string }>
}

export const metadata = {
  title: "Edit Supplier | Stoquify",
  description: "Edit supplier identity, contact, terms, language, and active state.",
}

export default async function EditPurchaseSupplierPage({ params }: EditPurchaseSupplierPageProps) {
  const { locale: rawLocale, id } = await params
  const surface = routeByKey("purchases-suppliers-edit")

  if (!surface) {
    throw new Error("Missing purchases route surface definition: purchases-suppliers-edit")
  }

  return withPurchasesSurfaceAccess({
    params: Promise.resolve({ locale: rawLocale }),
    surface,
    permissionOptions: {
      resourceId: id,
    },
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
              initialEditId={id}
            />
          </div>
        </div>
      )
    },
  })
}
