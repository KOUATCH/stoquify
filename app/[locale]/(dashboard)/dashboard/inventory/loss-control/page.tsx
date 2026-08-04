import { InventoryLossWorkbench } from "@/components/inventory/loss/InventoryLossWorkbench"
import { checkPermission } from "@/config/useAuth"

export default async function InventoryLossControlPage() {
  await checkPermission("inventory.levels.read")

  return <InventoryLossWorkbench />
}
