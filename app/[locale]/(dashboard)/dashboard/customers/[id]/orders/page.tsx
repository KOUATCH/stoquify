import CustomerOrdersClientPage from "./CustomerOrdersClientPage"
import { checkAllPermissions, getAuthenticatedUser } from "@/config/useAuth"
import { localizePath, pickLocale } from "@/i18n/routing"
import {
  createOrganizationMoneyFormatter,
  OrganizationCurrencyUnavailableError,
} from "@/lib/i18n/organization-money"
import { getOrganizationSettingsForOrg } from "@/services/organization/organization-settings.service"
import { redirect } from "next/navigation"

interface CustomerOrdersPageProps {
  params: Promise<{ locale: string; id: string }>
}

export default async function CustomerOrdersPage({ params }: CustomerOrdersPageProps) {
  const { locale: rawLocale } = await params
  const locale = pickLocale(rawLocale)
  await checkAllPermissions(["customers.read", "customers.orders.read"])
  const user = await getAuthenticatedUser()

  if (!user.organizationId) {
    redirect(localizePath("/unauthorized", locale))
  }

  const organization = await getOrganizationSettingsForOrg(user.organizationId)
  const currency = organization?.currency.trim().toUpperCase()
  if (!currency) {
    throw new OrganizationCurrencyUnavailableError(user.organizationId)
  }
  createOrganizationMoneyFormatter({
    organizationId: user.organizationId,
    locale,
    currency,
  })

  return <CustomerOrdersClientPage currency={currency} />
}
