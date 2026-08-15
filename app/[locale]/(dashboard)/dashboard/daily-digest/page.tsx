import type { Metadata } from "next"

import { DailyHabitDigestDashboard } from "@/components/daily-habit/DailyHabitDigestDashboard"
import { getDailyHabitDigestData } from "@/services/daily-habit/daily-habit-digest.service"
import { resolveCommandAgentRollout } from "@/services/agents/agent-rollout.service"
import { routeByKey, withDailyDigestSurfaceAccess } from "./daily-digest-route-access"

export const metadata: Metadata = {
  title: "Daily Habit Digest | Kontava",
  description: "Read-only role-specific daily and weekly digest surfaces from existing command signals.",
}

export default async function DailyHabitDigestPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const surface = routeByKey("daily-digest")

  if (!surface) {
    throw new Error("Missing daily digest route surface definition: daily-digest")
  }

  return withDailyDigestSurfaceAccess({
    params,
    surface,
    onAllowed: async (ctx, locale) => {
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
          locale={locale}
          commandAgentAccess={commandAgentAccess}
        />
      )
    },
  })
}
