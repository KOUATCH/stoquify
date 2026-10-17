
import { checkPermission } from "@/config/useAuth"
import { DashboardRouteState } from "@/components/dashboard/DashboardRouteState"
import { localizePath, pickLocale } from "@/i18n/routing"
import { routeByKey, withInventorySurfaceAccess } from "../../../inventory-route-access"

const pageImpl = async ({ params }: { params: Promise<{ id: string; locale: string }> }) => {
  await checkPermission("inventory.items.read")


  const { id, locale: rawLocale } = await params
  const locale = pickLocale(rawLocale)
  return (
    <DashboardRouteState kind="empty" locale={locale} embedded
      title={locale === "fr" ? "Détails complémentaires" : "Additional item details"}
      message={locale === "fr" ? "Cette rubrique ne propose pas encore de détails complémentaires. Consultez la fiche article pour les informations disponibles." : "Additional details are not available in this section yet. Open the item overview for the available information."}
      primaryLabel={locale === "fr" ? "Retour à l’article" : "Back to item"}
      primaryHref={localizePath(`/dashboard/inventory/items/${encodeURIComponent(id)}`, locale)} />
  )
}



export default async function InventoryRoutePage(props: any = {}) {
  const surface = routeByKey("inventory-items-others")

  if (!surface) {
    throw new Error("Missing inventory route surface definition: inventory-items-others")
  }

  return withInventorySurfaceAccess({
    params: (props as { params?: Promise<{ locale: string }> }).params ?? Promise.resolve({ locale: "en" }),
    surface,
    onAllowed: async () => pageImpl(props),
  })
}
