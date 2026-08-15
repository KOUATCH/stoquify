import { CustomerProfilePage } from "@/components/customers/CustomerProfilePage"
import { getOrganizationSettingsForOrg } from "@/services/organization/organization-settings.service"
import { hasRbacPermission } from "@/lib/security/rbac-permissions"
import {
  createOrganizationMoneyFormatter,
  OrganizationCurrencyUnavailableError,
} from "@/lib/i18n/organization-money"
import { notFound } from "next/navigation"

import { routeByKey, withCustomersSurfaceAccess } from "../customers-route-access"

interface CustomerAnalyticsPageProps {
  params: Promise<{ locale: string; id: string }>
}

export const metadata = {
  title: "Customer Analytics | Stoquify",
  description: "Review customer sales activity, receivable ledger, payments, and exposure.",
}

export default async function CustomerAnalyticsPage({ params }: CustomerAnalyticsPageProps) {
  const { locale: rawLocale, id } = await params
  const surface = routeByKey("customers-detail")

  if (!surface) {
    throw new Error("Missing customers route surface definition: customers-detail")
  }

  if (!id) {
    notFound()
  }

  return withCustomersSurfaceAccess({
    params: Promise.resolve({ locale: rawLocale }),
    surface,
    permissionOptions: {
      resourceId: id,
    },
    onAllowed: async (context, locale) => {
      const organization = await getOrganizationSettingsForOrg(context.orgId)
      const currency = organization?.currency.trim().toUpperCase()
      if (!currency) {
        throw new OrganizationCurrencyUnavailableError(context.orgId)
      }
      createOrganizationMoneyFormatter({
        organizationId: context.orgId,
        locale,
        currency,
      })

      const permissions = context.permissions ?? []
      const capabilities = {
        canCreateStatement: hasRbacPermission(permissions, "accounting.exports.create"),
        canExport: hasRbacPermission(permissions, "customers.export"),
        canOpenSales: hasRbacPermission(permissions, "sales.read"),
        canUpdate: hasRbacPermission(permissions, "customers.update"),
        canViewOrders: hasRbacPermission(permissions, "customers.orders.read"),
      }

      return (
        <CustomerProfilePage
          organizationId={context.orgId}
          customerId={id}
          locale={locale}
          currency={currency}
          capabilities={capabilities}
        />
      )
    },
  })
}
