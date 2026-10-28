import CustomerOrdersClientPage from "./CustomerOrdersClientPage"
import {
  createOrganizationMoneyFormatter,
  OrganizationCurrencyUnavailableError,
} from "@/lib/i18n/organization-money"
import { getOrganizationSettingsForOrg } from "@/services/organization/organization-settings.service"
import { hasRbacPermission } from "@/lib/security/rbac-permissions"
import { notFound } from "next/navigation"

import { routeByKey, withCustomersSurfaceAccess } from "../../customers-route-access"

interface CustomerOrdersPageProps {
  params: Promise<{ locale: string; id: string }>
}

export default async function CustomerOrdersPage({ params }: CustomerOrdersPageProps) {
  const { locale: rawLocale, id } = await params
  const surface = routeByKey("customers-orders")

  if (!surface) {
    throw new Error("Missing customers route surface definition: customers-orders")
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
        canViewOrders: true,
        canViewReceivables:
          hasRbacPermission(permissions, "finance.receivables.read") ||
          hasRbacPermission(permissions, "finance.read"),
      }

      return <CustomerOrdersClientPage capabilities={capabilities} currency={currency} />
    },
  })
}
