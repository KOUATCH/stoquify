import type { Metadata } from "next"

import { AssuranceControlTowerDashboard } from "@/components/assurance/AssuranceControlTowerDashboard"
import { getAssuranceControlTowerData } from "@/services/assurance/assurance-control-tower.service"

import { routeByKey, withAssuranceSurfaceAccess } from "../assurance-route-access"

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
  const surface = routeByKey("assurance-control-tower")

  if (!surface) {
    throw new Error("Missing assurance route surface definition: assurance-control-tower")
  }

  return withAssuranceSurfaceAccess({
    params,
    surface,
    onAllowed: async (ctx, locale) => {
      const data = await getAssuranceControlTowerData({
        organizationId: ctx.orgId,
        actorPermissions: ctx.permissions,
      })

      return <AssuranceControlTowerDashboard data={data} locale={pickLocale(locale)} />
    },
  })
}
