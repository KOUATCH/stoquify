import { redirect } from "next/navigation"

import { routeByKey, withCashDrawerSurfaceAccess } from "./cash-drawer-route-access"

export default async function LegacyLocaleCashDrawerPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const surface = routeByKey("cash-drawer-legacy-redirect")

  if (!surface) {
    throw new Error("Missing cash drawer route surface definition: cash-drawer-legacy-redirect")
  }

  return withCashDrawerSurfaceAccess({
    params,
    surface,
    onAllowed: (_context, locale) => {
      redirect(`/${locale}/dashboard/finance/cash-drawer`)
    },
  })
}
