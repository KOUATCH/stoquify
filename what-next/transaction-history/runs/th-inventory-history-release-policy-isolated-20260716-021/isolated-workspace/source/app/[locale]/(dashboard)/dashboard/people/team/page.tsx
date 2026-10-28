import { DashboardRouteState } from "@/components/dashboard/DashboardRouteState"
import { HrisManagerSelfService } from "@/components/hris/HrisManagerSelfService"
import { localizePath, pickLocale } from "@/i18n/routing"
import { RbacError, requireAnyPermission } from "@/lib/security/rbac"
import { ForbiddenError } from "@/services/_shared/action-errors"
import { getHrisManagerSelfService } from "@/services/hris/manager-self-service.service"

export const metadata = {
  title: "Managed Workforce | Stoquify",
  description: "Location-scoped HRIS manager workspace.",
}

export default async function ManagedWorkforcePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale: rawLocale } = await params
  const locale = pickLocale(rawLocale)

  let access
  try {
    access = await requireAnyPermission(["hris.people.read"], {
      resource: "HrisManagerSelfService",
    })
  } catch (error) {
    if (error instanceof RbacError) {
      return (
        <DashboardRouteState
          kind={error.code === "NO_ACTIVE_ORG" ? "no_active_org" : "permission_denied"}
          title="Managed workforce is not available"
          message="This workspace requires scoped HRIS people access in the active organization."
          primaryHref={localizePath("/dashboard", locale)}
        />
      )
    }
    throw error
  }

  let model
  try {
    model = await getHrisManagerSelfService({
      organizationId: access.orgId,
      actorId: access.userId,
      actorPermissions: access.permissions,
      limit: 100,
    })
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return (
        <DashboardRouteState
          kind="permission_denied"
          title="No managed workforce scope is available"
          message="This account does not have tenant HRIS authority or a current managed-location responsibility."
          primaryHref={localizePath("/dashboard/people", locale)}
        />
      )
    }
    throw error
  }

  return (
    <main className="dashboard-landing-theme dark min-h-screen overflow-x-hidden">
      <HrisManagerSelfService
        model={model}
        approvalsHref={localizePath("/dashboard/people/approvals", locale)}
        locale={locale}
      />
    </main>
  )
}
