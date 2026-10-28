import type { Metadata } from "next"

import { getReferralFunnelAction } from "@/actions/referrals/referral-funnel.actions"
import { ReferralFunnelDashboard } from "@/components/referrals/ReferralFunnelDashboard"
import {
  routeByKey,
  withAnalyticsSurfaceAccess,
} from "../analytics-route-access"

export const metadata: Metadata = {
  title: "Referral Funnel | Stoquify",
  description:
    "Tenant-scoped aggregate referral evidence for customer statements and accountant-client invites.",
}

export default async function ReferralFunnelPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const surface = routeByKey("analytics-referrals")

  if (!surface) {
    throw new Error("Missing analytics route surface definition: analytics-referrals")
  }

  return withAnalyticsSurfaceAccess({
    params,
    surface,
    onAllowed: async (_context, locale) => {
      const referralData = await getReferralFunnelAction()

      return <ReferralFunnelDashboard data={referralData} locale={locale} />
    },
  })
}
