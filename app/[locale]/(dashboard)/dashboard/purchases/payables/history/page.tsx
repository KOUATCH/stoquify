import { hasRbacPermission } from "@/lib/security/rbac-permissions"
import { getTranslations } from "next-intl/server"
import { APHistoryWorkbench } from "@/components/purchasing/APHistoryWorkbench"
import { routeByKey, withPurchasesSurfaceAccess } from "../../purchases-route-access"

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "apHistory" })
  return { title: `${t("title")} | Stoquify`, description: t("summary") }
}

export default async function SupplierAPHistoryPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale: rawLocale } = await params
  const surface = routeByKey("purchases-payables-history")

  if (!surface) {
    throw new Error("Missing purchases route surface definition: purchases-payables-history")
  }

  return withPurchasesSurfaceAccess({
    params: Promise.resolve({ locale: rawLocale }),
    surface,
    onAllowed: context => (
      <div className="dashboard-landing-theme dark min-h-screen overflow-x-hidden">
        <div className="dashboard-landing-content min-w-0">
          <APHistoryWorkbench organizationId={context.orgId} actorId={context.userId} canExport={hasRbacPermission(context.permissions, "reports.export")} />
        </div>
      </div>
    ),
  })
}
