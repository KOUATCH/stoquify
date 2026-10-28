import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { AssuranceIncidentDetailView } from "@/components/assurance/AssuranceIncidentDetailView"
import { routeByKey, withAssuranceSurfaceAccess } from "../../../assurance-route-access"
import { getAssuranceIncidentDetailData } from "@/services/assurance/assurance-control-tower.service"

export const metadata: Metadata = {
  title: "Workflow Assurance Incident | Kontava",
  description: "Proof-linked workflow assurance incident detail.",
}

export default async function WorkflowAssuranceIncidentDetailPage({
  params,
}: {
  params: Promise<{ locale: string; incidentId: string }>
}) {
    const { incidentId } = await params
  const surface = routeByKey("assurance-control-tower-incident")

  if (!surface) {
    throw new Error("Missing assurance route surface definition: assurance-control-tower-incident")
  }

  return withAssuranceSurfaceAccess({
    params,
    surface,
    onAllowed: async (ctx, locale) => {
      const data = await getAssuranceIncidentDetailData({
        organizationId: ctx.orgId,
        actorPermissions: ctx.permissions,
        incidentId,
      })

      if (!data) notFound()

      return <AssuranceIncidentDetailView data={data} locale={locale} />
    },
  })
}

