import { checkPermission } from "@/config/useAuth"
import { localizePath, pickLocale } from "@/i18n/routing"
import { redirect } from "next/navigation"
import { routeByKey, withInventorySurfaceAccess } from "../../inventory-route-access"

// Legacy alias retained for saved links. The canonical create workflow lives at /create.
async function ItemsNewPageImpl({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  await checkPermission("inventory.items.create")

  const { locale: rawLocale } = await params
  const locale = pickLocale(rawLocale)

  return redirect(localizePath("/dashboard/inventory/items/create", locale))
}



export default async function InventoryRoutePage(props: any = {}) {
  const surface = routeByKey("inventory-items-new")

  if (!surface) {
    throw new Error("Missing inventory route surface definition: inventory-items-new")
  }

  return withInventorySurfaceAccess({
    params: (props as { params?: Promise<{ locale: string }> }).params ?? Promise.resolve({ locale: "en" }),
    surface,
    onAllowed: async () => ItemsNewPageImpl(props),
  })
}
