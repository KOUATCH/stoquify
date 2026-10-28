import { TransferDashboard } from "@/components/inventory/transfers/TransferDashboard"
import { checkPermission } from "@/config/useAuth"

export default async function TransfersPage() {
  await checkPermission("TRANSFERS_READ")

  return <TransferDashboard />
}
