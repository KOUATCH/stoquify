import { CreateTransferPage } from "@/components/inventory/transfers/CreateTransferPage"
import { routeByKey, withInventorySurfaceAccess } from "../../inventory-route-access"

export default async function InventoryTransferCreateRoute({ params }: {
  params: Promise<{ locale: string }>
}) {
  const surface = routeByKey("inventory-transfers-create")
  if (!surface) throw new Error("Missing inventory transfer create surface")

  return withInventorySurfaceAccess({
    params,
    surface,
    onAllowed: (context) => <CreateTransferPage key={context.orgId} organizationId={context.orgId} />,
  })
}
