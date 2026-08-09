import {
  ReferralAttributionEventType,
  ReferralAttributionSource,
} from "@prisma/client"

import { getReferralFunnelReadModel } from "../referral-funnel-read-model.service"

const now = new Date("2026-08-09T18:00:00.000Z")

function client() {
  const evidenceByOrganization = {
    "org-a": [
      {
        sourceType: ReferralAttributionSource.CUSTOMER_STATEMENT,
        campaign: "customer_statement_share",
        events: [
          { eventType: ReferralAttributionEventType.CLICK },
          { eventType: ReferralAttributionEventType.CLICK },
          { eventType: ReferralAttributionEventType.CONVERSION },
        ],
      },
      {
        sourceType: ReferralAttributionSource.ACCOUNTANT_INVITE,
        campaign: "accountant_client_invite",
        events: [
          { eventType: ReferralAttributionEventType.CLICK },
          { eventType: ReferralAttributionEventType.CONVERSION },
        ],
      },
    ],
    "org-b": [
      {
        sourceType: ReferralAttributionSource.CUSTOMER_STATEMENT,
        campaign: "other_tenant_campaign",
        events: Array.from({ length: 12 }, () => ({
          eventType: ReferralAttributionEventType.CONVERSION,
        })),
      },
    ],
  }
  const findMany = jest.fn(async ({ where }: {
    where: { organizationId: keyof typeof evidenceByOrganization }
  }) => evidenceByOrganization[where.organizationId] ?? [])

  return {
    findMany,
    db: { referralAttribution: { findMany } },
  }
}

describe("referral funnel read model", () => {
  it("aggregates issued links and privacy-bounded events by source and campaign", async () => {
    const fixture = client()

    const result = await getReferralFunnelReadModel(
      "org-a",
      fixture.db as never,
      now,
    )

    expect(result).toEqual({
      organizationId: "org-a",
      generatedAt: now.toISOString(),
      scope: "ALL_TIME",
      totals: {
        issuedLinks: 2,
        clicks: 3,
        conversions: 2,
        inviteActivations: 1,
      },
      rows: [
        {
          sourceType: ReferralAttributionSource.CUSTOMER_STATEMENT,
          campaign: "customer_statement_share",
          issuedLinks: 1,
          clicks: 2,
          conversions: 1,
          inviteActivations: 0,
        },
        {
          sourceType: ReferralAttributionSource.ACCOUNTANT_INVITE,
          campaign: "accountant_client_invite",
          issuedLinks: 1,
          clicks: 1,
          conversions: 1,
          inviteActivations: 1,
        },
      ],
      privacyBoundary: {
        aggregateOnly: true,
        includesRecipientContactData: false,
        includesRawRequestData: false,
      },
    })
  })

  it("scopes the base evidence and nested events to the requested tenant", async () => {
    const fixture = client()

    const result = await getReferralFunnelReadModel(
      "org-a",
      fixture.db as never,
      now,
    )

    expect(fixture.findMany).toHaveBeenCalledWith({
      where: {
        organizationId: "org-a",
        sourceType: {
          in: [
            ReferralAttributionSource.CUSTOMER_STATEMENT,
            ReferralAttributionSource.ACCOUNTANT_INVITE,
          ],
        },
      },
      select: {
        sourceType: true,
        campaign: true,
        events: {
          where: {
            organizationId: "org-a",
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
    expect(JSON.stringify(result)).not.toContain("other_tenant_campaign")
    expect(result.totals.conversions).toBe(2)
  })

  it("does not select or return recipient contacts or raw request evidence", async () => {
    const fixture = client()

    const result = await getReferralFunnelReadModel(
      "org-a",
      fixture.db as never,
      now,
    )
    const query = fixture.findMany.mock.calls[0][0]

    expect(JSON.stringify(query.select)).not.toMatch(
      /email|phone|destination|subjectHash|metadata|ipAddress|userAgent|referralCode/i,
    )
    expect(JSON.stringify(result)).not.toMatch(
      /subjectHash|ipAddress|userAgent|referralCode/i,
    )
  })
})
