import { InventoryMovementHistoryWorkbench } from "@/components/inventory/movements/InventoryMovementHistoryWorkbench"
import { checkPermission } from "@/config/useAuth"
import { routeByKey, withInventorySurfaceAccess } from "../inventory-route-access"

async function MovementsPageImpl() {
  await checkPermission("inventory.levels.read")

  return <InventoryMovementHistoryWorkbench />
}



export default async function InventoryRoutePage(props: any = {}) {
  const surface = routeByKey("inventory-movements")

  if (!surface) {
    throw new Error("Missing inventory route surface definition: inventory-movements")
  }

  return withInventorySurfaceAccess({
    params: (props as { params?: Promise<{ locale: string }> }).params ?? Promise.resolve({ locale: "en" }),
    surface,
    onAllowed: async () => MovementsPageImpl(),
  })
}
