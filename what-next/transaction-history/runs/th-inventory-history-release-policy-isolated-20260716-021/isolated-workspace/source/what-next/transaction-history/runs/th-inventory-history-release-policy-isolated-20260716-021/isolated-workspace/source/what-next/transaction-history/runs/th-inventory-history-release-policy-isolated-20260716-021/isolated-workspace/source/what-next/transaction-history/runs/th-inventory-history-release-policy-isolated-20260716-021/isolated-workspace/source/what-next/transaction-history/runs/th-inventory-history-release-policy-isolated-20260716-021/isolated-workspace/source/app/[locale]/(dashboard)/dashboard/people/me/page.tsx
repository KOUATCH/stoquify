import { DashboardRouteState } from "@/components/dashboard/DashboardRouteState"
import { HrisEmployeeSelfService } from "@/components/hris/HrisEmployeeSelfService"
import { localizePath, pickLocale } from "@/i18n/routing"
import { RbacError, requireAnyPermission } from "@/lib/security/rbac"
import { ConflictError, NotFoundError } from "@/services/_shared/action-errors"
import { getHrisEmployeeSelfService } from "@/services/hris/self-service.service"

export const metadata = {
  title: "My HR | Stoquify",
  description: "Own-record HRIS employee self-service.",
}

export default async function EmployeeSelfServicePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale: rawLocale } = await params
  const locale = pickLocale(rawLocale)

  let access
  try {
    access = await requireAnyPermission(["hris.self_service.read"], {
      resource: "HrisEmployeeSelfService",
    })
  } catch (error) {
    if (error instanceof RbacError) {
      return (
        <DashboardRouteState
          kind={error.code === "NO_ACTIVE_ORG" ? "no_active_org" : "permission_denied"}
          title="Employee self-service is not available"
          message="This workspace requires own-record HRIS self-service access in the active organization."
          primaryHref={localizePath("/dashboard", locale)}
        />
      )
    }
    throw error
  }

  let model
  try {
    model = await getHrisEmployeeSelfService({
      organizationId: access.orgId,
      actorId: access.userId,
      actorPermissions: access.permissions,
    })
  } catch (error) {
    if (error instanceof ConflictError) {
      return (
        <DashboardRouteState
          kind="not_found"
          title="Employee profile needs HR review"
          message="Your user account maps to more than one employee profile. HR must resolve the duplicate before self-service can open."
          primaryHref={localizePath("/dashboard", locale)}
        />
      )
    }
    if (error instanceof NotFoundError) {
      return (
        <DashboardRouteState
          kind="not_found"
          title="Employee profile is not linked"
          message="No employee profile is linked to your user account in the active organization."
          primaryHref={localizePath("/dashboard", locale)}
        />
      )
    }
    throw error
  }

  return (
    <main className="dashboard-landing-theme dark min-h-screen overflow-x-hidden">
      <HrisEmployeeSelfService
        model={model}
        payslipsHref={localizePath("/dashboard/payroll/payslips", locale)}
        locale={locale}
      />
    </main>
  )
}
