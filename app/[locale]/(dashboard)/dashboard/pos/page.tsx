import { checkPermission } from "@/config/useAuth"
import ProfessionalPOSSystem from "@/components/pos/ProfessionalPOSSystem"

export default async function POSPage() {
  await checkPermission("OPERATE_POS")

  return <ProfessionalPOSSystem />
}
