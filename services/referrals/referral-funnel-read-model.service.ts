import {
  AccountantClientInviteStatus,
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
  preparedLinks: number
  clicks: number
  registrations: number
  acceptedInvitations: number
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
    preparedLinks: 0,
    clicks: 0,
    registrations: 0,
    acceptedInvitations: 0,
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
      accountantClientInvite: {
        select: {
          states: {
            where: { organizationId, status: AccountantClientInviteStatus.ACCEPTED },
            take: 1,
            select: { status: true },
          },
        },
      },
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

    row.preparedLinks += 1
    for (const event of attribution.events) {
      if (event.eventType === ReferralAttributionEventType.CLICK) {
        row.clicks += 1
      }
      if (event.eventType === ReferralAttributionEventType.CONVERSION) {
        row.registrations += 1
      }
    }

    // Count the invitation's recorded acceptance once, independently of registration events.
    // Historical acceptance does not establish a currently effective access grant.
    if (
      attribution.sourceType === ReferralAttributionSource.ACCOUNTANT_INVITE &&
      attribution.accountantClientInvite?.states.length
    ) {
      row.acceptedInvitations += 1
    }

    rowsByCampaign.set(key, row)
  }

  const rows = [...rowsByCampaign.values()]
  const totals = rows.reduce((aggregate, row) => ({
    preparedLinks: aggregate.preparedLinks + row.preparedLinks,
    clicks: aggregate.clicks + row.clicks,
    registrations: aggregate.registrations + row.registrations,
    acceptedInvitations:
      aggregate.acceptedInvitations + row.acceptedInvitations,
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
