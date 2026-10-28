import type { ReactNode } from "react"

import { routeByKey, withCustomersSurfaceAccess } from "./customers-route-access"

type CustomersLayoutProps = {
  children: ReactNode
  params: Promise<{ locale: string }>
}

export default async function CustomersLayout({ children, params }: CustomersLayoutProps) {
  const { locale: rawLocale } = await params
  const surface = routeByKey("customers-dashboard")

  if (!surface) {
    throw new Error("Missing customers route surface definition: customers-dashboard")
  }

  return withCustomersSurfaceAccess({
    params: Promise.resolve({ locale: rawLocale }),
    surface,
    onAllowed: () => children,
  })
}
