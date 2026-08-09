import {
  ReferralAttributionEventType,
  ReferralAttributionSource,
} from "@prisma/client"

import { db } from "@/prisma/db"

const REFERRAL_FUNNEL_SOURCES = [
  ReferralAttributionSource.CUSTOMER_STATEMENT,
  ReferralAttributionSource.ACCOUNTANT_INVITE,
] as const

export type ReferralFunnelRow = {
  sourceType: ReferralAttributionSource
  campaign: string
  issuedLinks: number
  clicks: number
  conversions: number
  inviteActivations: number
}

export type ReferralFunnelReadModel = {
  organizationId: string
  generatedAt: string
  scope: "ALL_TIME"
  totals: Omit<ReferralFunnelRow, "sourceType" | "campaign">
  rows: ReferralFunnelRow[]
  privacyBoundary: {
    aggregateOnly: true
    includesRecipientContactData: false
    includesRawRequestData: false
  }
}

type ReferralFunnelReadClient = Pick<typeof db, "referralAttribution">

function emptyCounts() {
  return {
    issuedLinks: 0,
    clicks: 0,
    conversions: 0,
    inviteActivations: 0,
  }
}

export async function getReferralFunnelReadModel(
  organizationId: string,
  client: ReferralFunnelReadClient = db,
  now = new Date(),
): Promise<ReferralFunnelReadModel> {
  const attributions = await client.referralAttribution.findMany({
    where: {
      organizationId,
      sourceType: { in: [...REFERRAL_FUNNEL_SOURCES] },
    },
    select: {
      sourceType: true,
      campaign: true,
      events: {
        where: {
          organizationId,
          eventType: {
            in: [
              ReferralAttributionEventType.CLICK,
              ReferralAttributionEventType.CONVERSION,
            ],
          },
        },
        select: { eventType: true },
      },
    },
    orderBy: [
      { sourceType: "asc" },
      { campaign: "asc" },
      { createdAt: "asc" },
    ],
  })

  const rowsByCampaign = new Map<string, ReferralFunnelRow>()

  for (const attribution of attributions) {
    const key = attribution.sourceType + ":" + attribution.campaign
    const row = rowsByCampaign.get(key) ?? {
      sourceType: attribution.sourceType,
      campaign: attribution.campaign,
      ...emptyCounts(),
    }

    row.issuedLinks += 1
    for (const event of attribution.events) {
      if (event.eventType === ReferralAttributionEventType.CLICK) {
        row.clicks += 1
      }
      if (event.eventType === ReferralAttributionEventType.CONVERSION) {
        row.conversions += 1
        if (
          attribution.sourceType ===
            ReferralAttributionSource.ACCOUNTANT_INVITE
        ) {
          row.inviteActivations += 1
        }
      }
    }

    rowsByCampaign.set(key, row)
  }

  const rows = [...rowsByCampaign.values()]
  const totals = rows.reduce((aggregate, row) => ({
    issuedLinks: aggregate.issuedLinks + row.issuedLinks,
    clicks: aggregate.clicks + row.clicks,
    conversions: aggregate.conversions + row.conversions,
    inviteActivations:
      aggregate.inviteActivations + row.inviteActivations,
  }), emptyCounts())

  return {
    organizationId,
    generatedAt: now.toISOString(),
    scope: "ALL_TIME",
    totals,
    rows,
    privacyBoundary: {
      aggregateOnly: true,
      includesRecipientContactData: false,
      includesRawRequestData: false,
    },
  }
}
