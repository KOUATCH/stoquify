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
        accountantClientInvite: { states: [{ status: "ACCEPTED" }] },
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
  it("aggregates prepared links, registrations and recorded invitation acceptances by source and campaign", async () => {
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
        preparedLinks: 2,
        clicks: 3,
        registrations: 2,
        acceptedInvitations: 1,
      },
      rows: [
        {
          sourceType: ReferralAttributionSource.CUSTOMER_STATEMENT,
          campaign: "customer_statement_share",
          preparedLinks: 1,
          clicks: 2,
          registrations: 1,
          acceptedInvitations: 0,
        },
        {
          sourceType: ReferralAttributionSource.ACCOUNTANT_INVITE,
          campaign: "accountant_client_invite",
          preparedLinks: 1,
          clicks: 1,
          registrations: 1,
          acceptedInvitations: 1,
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
        accountantClientInvite: {
          select: {
            states: {
              where: { organizationId: "org-a", status: "ACCEPTED" },
              take: 1,
              select: { status: true },
            },
          },
        },
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
    expect(result.totals.registrations).toBe(2)
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

it("does not infer acceptance from registration events and counts historical acceptance once", async () => {
  const findMany = jest.fn().mockResolvedValue([
    { sourceType: "ACCOUNTANT_INVITE", campaign: "pending", accountantClientInvite: { states: [] }, events: [{ eventType: "CONVERSION" }, { eventType: "CONVERSION" }] },
    { sourceType: "ACCOUNTANT_INVITE", campaign: "accepted", accountantClientInvite: { states: [{ status: "ACCEPTED" }] }, events: [{ eventType: "CONVERSION" }, { eventType: "CONVERSION" }] },
    { sourceType: "ACCOUNTANT_INVITE", campaign: "legacy", accountantClientInvite: null, events: [{ eventType: "CONVERSION" }] },
    { sourceType: "ACCOUNTANT_INVITE", campaign: "historical", accountantClientInvite: { states: [{ status: "ACCEPTED" }] }, events: [] },
  ])
  const result = await getReferralFunnelReadModel("org-a", { referralAttribution: { findMany } } as never, now)
  expect(result.totals).toEqual({ preparedLinks: 4, clicks: 0, registrations: 5, acceptedInvitations: 2 })
  expect(result.rows.find(row => row.campaign === "pending")?.acceptedInvitations).toBe(0)
  expect(result.rows.find(row => row.campaign === "legacy")?.acceptedInvitations).toBe(0)
})
it("distinguishes an empty result from a failed source read", async () => {
  const findMany = jest.fn().mockResolvedValue([])
  const client = { referralAttribution: { findMany } } as never
  expect((await getReferralFunnelReadModel("org-empty", client, now)).totals).toEqual({ preparedLinks: 0, clicks: 0, registrations: 0, acceptedInvitations: 0 })
  findMany.mockRejectedValue(new Error("Source unavailable"))
  await expect(getReferralFunnelReadModel("org-empty", client, now)).rejects.toThrow("Source unavailable")
})
