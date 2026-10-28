import { DashboardRouteState } from "@/components/dashboard/DashboardRouteState"
import { HrisManagerSelfService } from "@/components/hris/HrisManagerSelfService"
import { localizePath, pickLocale } from "@/i18n/routing"
import { ForbiddenError } from "@/services/_shared/action-errors"
import { getHrisManagerSelfService } from "@/services/hris/manager-self-service.service"
import { routeByKey, withPeopleSurfaceAccess } from "../people-route-access"

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

  const surface = routeByKey("people-team")

  if (!surface) {
    throw new Error("Missing people route surface definition: people-team")
  }

  return withPeopleSurfaceAccess({
    params: Promise.resolve({ locale }),
    surface,
    onAllowed: async (ctx) => {
      let model

      try {
        model = await getHrisManagerSelfService({
          organizationId: ctx.orgId,
          actorId: ctx.userId,
          actorPermissions: ctx.permissions,
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
    },
  })
}
