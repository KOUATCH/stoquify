import { TransferWorkflowPage } from "@/components/inventory/transfers/TransferWorkflowPage"
import { routeByKey, withInventorySurfaceAccess } from "../../inventory-route-access"

export default async function TransferDetailRoute({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { id } = await params
  const surface = routeByKey("inventory-transfers-detail")
  if (!surface) throw new Error("Missing transfer detail surface")
  return withInventorySurfaceAccess({
    params, surface,
    onAllowed: context => <TransferWorkflowPage key={`${context.orgId}:${id}`} organizationId={context.orgId} transferId={id} />,
  })
}
