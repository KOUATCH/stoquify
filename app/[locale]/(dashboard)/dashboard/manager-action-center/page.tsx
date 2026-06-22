import type { Metadata } from "next"

import { ManagerActionCenterDashboard } from "@/components/manager-action-center/ManagerActionCenterDashboard"
import { requirePermission } from "@/lib/security/rbac"
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
  const ctx = await requirePermission("dashboard.read", {
    resource: "KontavaManagerActionCenter",
    auditAllowed: true,
  })
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
