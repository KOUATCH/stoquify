import type { Metadata } from "next"

import { DashboardRouteState } from "@/components/dashboard/DashboardRouteState"
import { OwnerWarRoomDashboard } from "@/components/owner-war-room/OwnerWarRoomDashboard"
import { localizePath } from "@/i18n/routing"
import { RbacError, requirePermission } from "@/lib/security/rbac"
import { getOwnerWarRoomData } from "@/services/owner-war-room/owner-war-room.service"

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
  let ctx: Awaited<ReturnType<typeof requirePermission>>

  try {
    ctx = await requirePermission("dashboard.read", {
      resource: "KontavaOwnerWarRoom",
      auditAllowed: true,
    })
  } catch (error) {
    if (error instanceof RbacError) {
      const noActiveOrg = error.code === "NO_ACTIVE_ORG"

      return (
        <DashboardRouteState
          kind={noActiveOrg ? "no_active_org" : "permission_denied"}
          title={noActiveOrg ? "Owner War Room needs an active organization" : "Owner War Room is not available for this role"}
          message={
            noActiveOrg
              ? "Refresh your session from the dashboard so the command center can load tenant-scoped evidence."
              : "This read-only command center requires dashboard access. The denial was recorded by the RBAC guard."
          }
          primaryHref={localizePath("/dashboard", resolvedLocale)}
        />
      )
    }

    throw error
  }

  const data = await getOwnerWarRoomData({
    organizationId: ctx.orgId,
    actorId: ctx.userId,
    actorPermissions: ctx.permissions,
  })

  return (
    <OwnerWarRoomDashboard
      data={data}
      locale={resolvedLocale}
      title={copy[resolvedLocale].title}
      subtitle={copy[resolvedLocale].subtitle}
    />
  )
}
