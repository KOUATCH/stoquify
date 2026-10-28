import { HrisEmployeeSelfService } from "@/components/hris/HrisEmployeeSelfService"
import { DashboardRouteState } from "@/components/dashboard/DashboardRouteState"
import { localizePath, pickLocale } from "@/i18n/routing"
import { ConflictError, NotFoundError } from "@/services/_shared/action-errors"
import { getHrisEmployeeSelfService } from "@/services/hris/self-service.service"
import { routeByKey, withPeopleSurfaceAccess } from "../people-route-access"

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

  const surface = routeByKey("people-me")

  if (!surface) {
    throw new Error("Missing people route surface definition: people-me")
  }

  return withPeopleSurfaceAccess({
    params: Promise.resolve({ locale }),
    surface,
    onAllowed: async (ctx) => {
      let model

      try {
        model = await getHrisEmployeeSelfService({
          organizationId: ctx.orgId,
          actorId: ctx.userId,
          actorPermissions: ctx.permissions,
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
    },
  })
}
