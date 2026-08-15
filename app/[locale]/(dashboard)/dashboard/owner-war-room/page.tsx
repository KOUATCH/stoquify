import type { Metadata } from "next"

import { DashboardRouteState } from "@/components/dashboard/DashboardRouteState"
import { OwnerWarRoomDashboard } from "@/components/owner-war-room/OwnerWarRoomDashboard"
import { localizePath } from "@/i18n/routing"
import { getOwnerWarRoomData } from "@/services/owner-war-room/owner-war-room.service"
import { routeByKey, withOwnerWarRoomSurfaceAccess } from "./owner-war-room-route-access"

export const metadata: Metadata = {
  title: "Owner War Room | Kontava",
  description: "Evidence-backed owner command center for cash, stock, close, module, and action risk.",
}

const copy = {
  en: {
    title: "Owner War Room",
    subtitle:
      "A read-only, evidence-backed command center for cash truth, reconciliation pressure, stock exposure, supplier commitments, payroll exposure, close readiness, action pressure, and module state.",
  },
  fr: {
    title: "Salle de controle proprietaire",
    subtitle:
      "Un centre de commandement en lecture seule, appuye sur les preuves, pour la tresorerie, le rapprochement, le stock, les engagements fournisseurs, la paie, la cloture, les actions et les modules.",
  },
} as const

function pickLocale(locale: string) {
  return locale === "fr" ? "fr" : "en"
}

export default async function OwnerWarRoomPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const resolvedLocale = pickLocale(locale)
  const surface = routeByKey("owner-war-room")

  if (!surface) {
    throw new Error("Missing owner war room route surface definition: owner-war-room")
  }

  return withOwnerWarRoomSurfaceAccess({
    params,
    surface,
    onAllowed: async (ctx, _locale) => {
      const data = await getOwnerWarRoomData({
        organizationId: ctx.orgId,
        actorId: ctx.userId,
        actorPermissions: ctx.permissions,
        actorRoleCodes: ctx.roles.map((role) => role.code),
        isSuperUser: ctx.isSuperUser,
      })

      return (
        <OwnerWarRoomDashboard
          data={data}
          locale={resolvedLocale}
          title={copy[resolvedLocale].title}
          subtitle={copy[resolvedLocale].subtitle}
        />
      )
    },
    onDenied: ({ noActiveOrg, title, message, href }) => (
      <DashboardRouteState
        kind={noActiveOrg ? "no_active_org" : "permission_denied"}
        title={title}
        message={message}
        primaryHref={href}
      />
    ),
  })
}
