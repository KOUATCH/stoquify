import { InventoryLossWorkbench } from "@/components/inventory/loss/InventoryLossWorkbench"
import { checkPermission } from "@/config/useAuth"
import { routeByKey, withInventorySurfaceAccess } from "../inventory-route-access"

async function InventoryLossControlPageImpl(organizationId: string, actorId: string) {
  await checkPermission("inventory.levels.read")

  return <InventoryLossWorkbench organizationId={organizationId} actorId={actorId} />
}



export default async function InventoryRoutePage(props: any = {}) {
  const surface = routeByKey("inventory-loss-control")

  if (!surface) {
    throw new Error("Missing inventory route surface definition: inventory-loss-control")
  }

  return withInventorySurfaceAccess({
    params: (props as { params?: Promise<{ locale: string }> }).params ?? Promise.resolve({ locale: "en" }),
    surface,
    onAllowed: async (context) => InventoryLossControlPageImpl(context.orgId, context.userId),
  })
}
