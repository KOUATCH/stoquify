import type { Metadata } from "next"

import { DashboardRouteState } from "@/components/dashboard/DashboardRouteState"
import { ManagerActionCenterDashboard } from "@/components/manager-action-center/ManagerActionCenterDashboard"
import { localizePath } from "@/i18n/routing"
import { RbacError, requirePermission } from "@/lib/security/rbac"
import { getManagerActionCenterData } from "@/services/manager-action-center/manager-action-center.service"

export const metadata: Metadata = {
  title: "Manager Action Center | Kontava",
  description: "Permission-filtered, evidence-backed manager action center for daily operating control.",
}

const copy = {
  en: {
    title: "Manager Action Center",
    subtitle:
      "A read-only daily control surface for the actions managers can actually take, backed by business signals, evidence grades, freshness, redaction, and server-side permissions.",
  },
  fr: {
    title: "Centre d'actions manager",
    subtitle:
      "Une surface de controle quotidienne en lecture seule pour les actions qu'un manager peut vraiment traiter, appuyee par les signaux metier, les preuves, la fraicheur, les masquages et les permissions serveur.",
  },
} as const

function pickLocale(locale: string) {
  return locale === "fr" ? "fr" : "en"
}

export default async function ManagerActionCenterPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const resolvedLocale = pickLocale(locale)
  let ctx: Awaited<ReturnType<typeof requirePermission>>

  try {
    ctx = await requirePermission("dashboard.read", {
      resource: "KontavaManagerActionCenter",
      auditAllowed: true,
    })
  } catch (error) {
    if (error instanceof RbacError) {
      const noActiveOrg = error.code === "NO_ACTIVE_ORG"

      return (
        <DashboardRouteState
          kind={noActiveOrg ? "no_active_org" : "permission_denied"}
          title={noActiveOrg ? "Manager Action Center needs an active organization" : "Manager Action Center is not available for this role"}
          message={
            noActiveOrg
              ? "Refresh your session from the dashboard so the action center can load tenant-scoped operating work."
              : "This read-only action center requires dashboard access. The denial was recorded by the RBAC guard."
          }
          primaryHref={localizePath("/dashboard", resolvedLocale)}
        />
      )
    }

    throw error
  }

  const data = await getManagerActionCenterData({
    organizationId: ctx.orgId,
    actorPermissions: ctx.permissions,
  })

  return (
    <ManagerActionCenterDashboard
      data={data}
      locale={resolvedLocale}
      title={copy[resolvedLocale].title}
      subtitle={copy[resolvedLocale].subtitle}
    />
  )
}
