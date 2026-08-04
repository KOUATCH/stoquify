import type { Metadata } from "next"

import { DailyHabitDigestDashboard } from "@/components/daily-habit/DailyHabitDigestDashboard"
import { DashboardRouteState } from "@/components/dashboard/DashboardRouteState"
import { localizePath } from "@/i18n/routing"
import { RbacError, requireAnyPermission } from "@/lib/security/rbac"
import { getDailyHabitDigestData } from "@/services/daily-habit/daily-habit-digest.service"
import { resolveCommandAgentRollout } from "@/services/agents/agent-rollout.service"

export const metadata: Metadata = {
  title: "Daily Habit Digest | Kontava",
  description: "Read-only role-specific daily and weekly digest surfaces from existing command signals.",
}

function pickLocale(locale: string) {
  return locale === "fr" ? "fr" : "en"
}

export default async function DailyHabitDigestPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const resolvedLocale = pickLocale(locale)
  let ctx: Awaited<ReturnType<typeof requireAnyPermission>>

  try {
    ctx = await requireAnyPermission(["dashboard.read", "finance.read", "accounting.close.read", "inventory.read", "analytics.read"], {
      resource: "KontavaDailyHabitDigest",
    })
  } catch (error) {
    if (error instanceof RbacError) {
      const noActiveOrg = error.code === "NO_ACTIVE_ORG"

      return (
        <DashboardRouteState
          kind={noActiveOrg ? "no_active_org" : "permission_denied"}
          title={noActiveOrg ? "Daily Digest needs an active organization" : "Daily Digest is not available for this role"}
          message={
            noActiveOrg
              ? "Refresh your session from the dashboard so Daily Digest can load tenant-scoped signals."
              : "Daily Digest is read-only, but it still requires dashboard, finance, accounting, or inventory access."
          }
          primaryHref={localizePath("/dashboard", resolvedLocale)}
        />
      )
    }

    throw error
  }

  const data = await getDailyHabitDigestData({
    organizationId: ctx.orgId,
    actorId: ctx.userId,
    actorPermissions: ctx.permissions,
    actorRoleCodes: ctx.roles.map((role) => role.code),
    isSuperUser: ctx.isSuperUser,
  })
  const commandAgentAccess = resolveCommandAgentRollout({
    organizationId: ctx.orgId,
    roleCodes: ctx.roles.map((role) => role.code),
    permissions: ctx.permissions,
  })

  return (
    <DailyHabitDigestDashboard
      data={data}
      locale={resolvedLocale}
      commandAgentAccess={commandAgentAccess}
    />
  )
}
