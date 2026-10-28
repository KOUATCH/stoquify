import { TransferDashboard } from "@/components/inventory/transfers/TransferDashboard"
import { checkPermission } from "@/config/useAuth"
import { routeByKey, withInventorySurfaceAccess } from "../inventory-route-access"

async function TransfersPageImpl() {
  await checkPermission("TRANSFERS_READ")

  return <TransferDashboard />
}



export default async function InventoryRoutePage(props: any = {}) {
  const surface = routeByKey("inventory-transfers")

  if (!surface) {
    throw new Error("Missing inventory route surface definition: inventory-transfers")
  }

  return withInventorySurfaceAccess({
    params: (props as { params?: Promise<{ locale: string }> }).params ?? Promise.resolve({ locale: "en" }),
    surface,
    onAllowed: async () => TransfersPageImpl(),
  })
}
