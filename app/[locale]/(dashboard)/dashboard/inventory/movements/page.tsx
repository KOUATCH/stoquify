import { StockMovementDashboard } from "@/components/inventory/movements/StockMovementDashboard"
import { checkPermission } from "@/config/useAuth"

export default async function MovementsPage() {
  await checkPermission("inventory.levels.read")

  return <StockMovementDashboard />
}
