import { routeByKey, withPosSurfaceAccess } from "./pos-route-access"

import ProfessionalPOSSystem from "@/components/pos/ProfessionalPOSSystem"
import { isPOSG0CashOnlyPilot } from "@/services/pos/pos-g0-pilot"

export default async function POSPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const surface = routeByKey("pos-dashboard")

  if (!surface) {
    throw new Error("Missing pos route surface definition: pos-dashboard")
  }

  return withPosSurfaceAccess({
    params,
    surface,
    onAllowed: (context) => <ProfessionalPOSSystem cashOnlyPilot={isPOSG0CashOnlyPilot(context.orgId)} />,
  })
}
