import type { Metadata } from "next"

import { AssuranceControlTowerDashboard } from "@/components/assurance/AssuranceControlTowerDashboard"
import { requirePermission } from "@/lib/security/rbac"
import { getAssuranceControlTowerData } from "@/services/assurance/assurance-control-tower.service"

export const metadata: Metadata = {
  title: "Workflow Assurance Control Tower | Kontava",
  description: "Proof-linked workflow assurance incident routing and engine health.",
}

function pickLocale(locale: string) {
  return locale === "fr" ? "fr" : "en"
}

export default async function WorkflowAssuranceControlTowerPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const ctx = await requirePermission("controls.audit.read", {
    resource: "WorkflowAssuranceControlTower",
    auditAllowed: true,
  })
  const data = await getAssuranceControlTowerData({
    organizationId: ctx.orgId,
    actorPermissions: ctx.permissions,
  })

  return <AssuranceControlTowerDashboard data={data} locale={pickLocale(locale)} />
}
