import type { Metadata } from "next"

import { getReferralFunnelAction } from "@/actions/referrals/referral-funnel.actions"
import { ReferralFunnelDashboard } from "@/components/referrals/ReferralFunnelDashboard"

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
  const { locale } = await params
  const data = await getReferralFunnelAction()

  return (
    <ReferralFunnelDashboard
      data={data}
      locale={locale === "fr" ? "fr" : "en"}
    />
  )
}
