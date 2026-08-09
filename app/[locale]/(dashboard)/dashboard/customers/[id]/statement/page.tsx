import { notFound } from "next/navigation"

import { getCustomerAction } from "@/actions/customers/customerActions"
import { CustomerStatementWorkflow } from "@/components/customers/CustomerStatementWorkflow"
import { DashboardRouteState } from "@/components/dashboard/DashboardRouteState"
import { checkAllPermissions, getAuthenticatedUser } from "@/config/useAuth"
import { localizePath, pickLocale } from "@/i18n/routing"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"

export const metadata = {
  title: "Customer statement | Stoquify",
  description: "Generate, freeze, and securely share a customer statement.",
}

export default async function CustomerStatementWorkflowPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale: rawLocale, id } = await params
  const locale = pickLocale(rawLocale)
  await checkAllPermissions([
    "customers.read",
    "accounting.exports.create",
  ])
  const user = await getAuthenticatedUser()
  const moduleDecision = await observeModuleAccess({
    organizationId: user.organizationId,
    userId: user.id,
    actorPermissions: user.permissions,
    moduleSlug: "accounting",
    surfaceType: "page",
    surface: "/dashboard/customers/[id]/statement",
    accessIntent: "export",
    mode: "enforce",
    audit: true,
  })

  if (!moduleDecision.allowed) {
    return (
      <DashboardRouteState
        kind="locked_module"
        title="Customer statements are not enabled for this organization"
        message="Enable the Accounting module before generating or sharing immutable customer statements. The entitlement denial was audited."
        primaryHref={localizePath(`/dashboard/customers/${id}`, locale)}
      />
    )
  }

  const result = await getCustomerAction(id)
  if (!result.success || !result.data) notFound()

  return (
    <div className="dashboard-landing-theme dark min-h-screen overflow-x-hidden">
      <div className="dashboard-landing-content mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <CustomerStatementWorkflow
          customer={{
            id: result.data.id,
            name: result.data.name,
            code: result.data.code,
            email: result.data.email,
          }}
          locale={locale}
        />
      </div>
    </div>
  )
}
