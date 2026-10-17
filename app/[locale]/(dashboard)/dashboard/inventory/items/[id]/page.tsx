import { ItemOverview } from "@/components/inventory/items/ItemOverview"
import { DashboardRouteState } from "@/components/dashboard/DashboardRouteState"
import { canUsePermission } from "@/lib/security/rbac"
import { getItemOverview } from "@/services/item/item-overview.service"
import { localizePath } from "@/i18n/routing"
import { routeByKey, withInventorySurfaceAccess } from "../../inventory-route-access"

export default async function ItemOverviewPage({ params, searchParams }: { params: Promise<{ id: string; locale: string }>; searchParams?: Promise<{ after?: string | string[] }> }) {
  const { id } = await params
  const query = await searchParams
  const after = typeof query?.after === "string" && query.after.length <= 200 ? query.after : undefined
  const surface = routeByKey("inventory-items-detail")
  if (!surface) throw new Error("Missing inventory item detail surface")
  return withInventorySurfaceAccess({
    params, surface, permissionOptions: { resourceId: id },
    onAllowed: async (context, locale) => {
      let item
      try {
        item = await getItemOverview(context, id, after)
      } catch {
        return <DashboardRouteState kind="error" locale={locale} embedded
          title={locale === "fr" ? "Article indisponible" : "Item unavailable"}
          message={locale === "fr" ? "Impossible de charger l’article. Réessayez sans modifier les données." : "The item could not be loaded. Retry without changing any data."}
          primaryLabel={locale === "fr" ? "Réessayer" : "Retry"}
          primaryHref={localizePath(`/dashboard/inventory/items/${encodeURIComponent(id)}${after ? `?after=${encodeURIComponent(after)}` : ""}`, locale)} />
      }
      if (!item) return <DashboardRouteState kind="not_found" locale={locale} embedded
        title={locale === "fr" ? "Article introuvable" : "Item not found"}
        message={locale === "fr" ? "Cet article n’est pas disponible dans votre organisation." : "This item is not available in your organization."}
        primaryLabel={locale === "fr" ? "Retour aux articles" : "Back to items"}
        primaryHref={localizePath("/dashboard/inventory/items", locale)} />
      return <ItemOverview item={item} locale={locale}
        canEdit={canUsePermission(context, "inventory.items.update")}
        canViewSuppliers={canUsePermission(context, "purchases.suppliers.read")}
        canViewMovements={canUsePermission(context, "inventory.levels.read")} />
    },
  })
}
