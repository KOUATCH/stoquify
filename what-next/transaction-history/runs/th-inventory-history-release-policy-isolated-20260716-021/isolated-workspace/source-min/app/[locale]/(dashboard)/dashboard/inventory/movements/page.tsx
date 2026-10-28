import { InventoryMovementHistoryWorkbench } from "@/components/inventory/movements/InventoryMovementHistoryWorkbench"
import { checkPermission } from "@/config/useAuth"

export default async function MovementsPage() {
  await checkPermission("inventory.levels.read")

  return <InventoryMovementHistoryWorkbench />
}
