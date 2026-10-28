import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { AssuranceIncidentDetailView } from "@/components/assurance/AssuranceIncidentDetailView"
import { requirePermission } from "@/lib/security/rbac"
import { getAssuranceIncidentDetailData } from "@/services/assurance/assurance-control-tower.service"

export const metadata: Metadata = {
  title: "Workflow Assurance Incident | Kontava",
  description: "Proof-linked workflow assurance incident detail.",
}

function pickLocale(locale: string) {
  return locale === "fr" ? "fr" : "en"
}

export default async function WorkflowAssuranceIncidentDetailPage({
  params,
}: {
  params: Promise<{ locale: string; incidentId: string }>
}) {
  const { locale, incidentId } = await params
  const ctx = await requirePermission("controls.audit.read", {
    resource: "WorkflowAssuranceIncident",
    auditAllowed: true,
  })
  const data = await getAssuranceIncidentDetailData({
    organizationId: ctx.orgId,
    actorPermissions: ctx.permissions,
    incidentId,
  })

  if (!data) notFound()

  return <AssuranceIncidentDetailView data={data} locale={pickLocale(locale)} />
}
