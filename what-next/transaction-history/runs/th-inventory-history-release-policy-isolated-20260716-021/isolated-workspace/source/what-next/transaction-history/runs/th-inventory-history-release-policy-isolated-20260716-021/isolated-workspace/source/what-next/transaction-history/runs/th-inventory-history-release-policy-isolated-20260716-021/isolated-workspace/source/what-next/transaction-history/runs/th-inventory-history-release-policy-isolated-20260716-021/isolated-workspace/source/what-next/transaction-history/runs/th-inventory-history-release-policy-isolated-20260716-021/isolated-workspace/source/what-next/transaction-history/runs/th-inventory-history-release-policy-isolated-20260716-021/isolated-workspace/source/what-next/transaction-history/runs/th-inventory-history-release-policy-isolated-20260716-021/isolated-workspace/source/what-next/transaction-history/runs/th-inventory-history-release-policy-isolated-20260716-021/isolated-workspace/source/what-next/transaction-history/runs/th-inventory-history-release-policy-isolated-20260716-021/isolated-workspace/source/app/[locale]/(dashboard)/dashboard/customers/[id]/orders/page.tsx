import CustomerOrdersClientPage from "./CustomerOrdersClientPage"
import { checkPermission, getAuthenticatedUser } from "@/config/useAuth"
import { localizePath, pickLocale } from "@/i18n/routing"
import { redirect } from "next/navigation"

interface CustomerOrdersPageProps {
  params: Promise<{ locale: string; id: string }>
}

export default async function CustomerOrdersPage({ params }: CustomerOrdersPageProps) {
  const { locale: rawLocale } = await params
  const locale = pickLocale(rawLocale)
  await checkPermission("customers.orders.read")
  const user = await getAuthenticatedUser()

  if (!user.organizationId) {
    redirect(localizePath("/unauthorized", locale))
  }

  return <CustomerOrdersClientPage />
}