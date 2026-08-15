import { routeByKey, withPosSurfaceAccess } from "./pos-route-access"

import ProfessionalPOSSystem from "@/components/pos/ProfessionalPOSSystem"

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
    onAllowed: () => <ProfessionalPOSSystem />,
  })
}
