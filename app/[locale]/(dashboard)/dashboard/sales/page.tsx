import { routeByKey, withSalesSurfaceAccess } from "./sales-route-access"
import { getLocale } from "next-intl/server"

import SalesClientPage from "./SalesClientPage"

export default async function SalesPage({
  params,
}: {
  params?: Promise<{ locale: string }>
}) {
  const routeParams = params ?? getLocale().then((locale) => ({ locale }))
  const surface = routeByKey("sales-dashboard")

  if (!surface) {
    throw new Error("Missing sales route surface definition: sales-dashboard")
  }

  return withSalesSurfaceAccess({
    params: routeParams,
    surface,
    onAllowed: () => <SalesClientPage />,
  })
}
