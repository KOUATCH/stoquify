import { checkPermission } from "@/config/useAuth"
import { localizePath, pickLocale } from "@/i18n/routing"
import { redirect } from "next/navigation"
import { routeByKey, withInventorySurfaceAccess } from "./inventory-route-access"

// The InventoryOverview landing widget was deleted as an orphan (no
// consumers besides this page, no remaining business logic). Redirect
// the inventory root to the canonical items list.
async function InventoryPageImpl({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  await checkPermission("inventory.read")

  const { locale: rawLocale } = await params
  const locale = pickLocale(rawLocale)

  return redirect(localizePath("/dashboard/inventory/items", locale))
}



export default async function InventoryRoutePage(props: any = {}) {
  const surface = routeByKey("inventory-dashboard")

  if (!surface) {
    throw new Error("Missing inventory route surface definition: inventory-dashboard")
  }

  return withInventorySurfaceAccess({
    params: (props as { params?: Promise<{ locale: string }> }).params ?? Promise.resolve({ locale: "en" }),
    surface,
    onAllowed: async () => InventoryPageImpl(props),
  })
}
