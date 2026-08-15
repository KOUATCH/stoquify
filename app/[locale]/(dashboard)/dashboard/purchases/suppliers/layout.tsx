import { DashboardRouteState } from "@/components/dashboard/DashboardRouteState"
import { localizePath, pickLocale } from "@/i18n/routing"
import { RbacError, requireAnyPermission } from "@/lib/security/rbac"
import { ReactNode } from "react"

export default async function Layout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale: rawLocale } = await params
  const locale = pickLocale(rawLocale)
  const isFrench = locale === "fr"

  try {
    await requireAnyPermission([
      "purchases.suppliers.read",
      "purchases.suppliers.create",
      "purchases.suppliers.update",
    ], {
      resource: "SupplierManagement",
    })
  } catch (error) {
    if (error instanceof RbacError) {
      const noActiveOrg = error.code === "NO_ACTIVE_ORG"

      return (
        <DashboardRouteState
          kind={noActiveOrg ? "no_active_org" : "permission_denied"}
          title={
            noActiveOrg
              ? isFrench
                ? "Les routes fournisseurs necessitent une organisation active"
                : "Supplier routes need an active organization"
              : isFrench
                ? "Les routes fournisseurs ne sont pas disponibles pour ce role"
                : "Supplier routes are not available for this role"
          }
          message={
            noActiveOrg
              ? isFrench
                ? "Actualisez votre session depuis le tableau de bord afin que les achats puissent charger les routes fournisseurs de votre organisation."
                : "Refresh your session from the dashboard so purchasing can load tenant-scoped supplier routes."
              : isFrench
                ? "Les routes fournisseurs necessitent un acces en lecture, creation ou modification. Le refus a ete enregistre par le controle RBAC."
                : "Supplier routes require purchasing supplier read, create, or update access. The denial was recorded by the RBAC guard."
          }
          primaryHref={localizePath("/dashboard/purchases", locale)}
        />
      )
    }

    throw error
  }

  return <div>{children}</div>
}
