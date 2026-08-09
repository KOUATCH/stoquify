import { render, screen } from "@testing-library/react"

jest.mock("lucide-react", () => {
  const React = jest.requireActual("react")
  const Icon = (props: Record<string, unknown>) =>
    React.createElement("svg", props)

  return {
    BadgeCheck: Icon,
    Link2: Icon,
    MousePointerClick: Icon,
    ShieldCheck: Icon,
    UserRoundCheck: Icon,
  }
})

import { ReferralFunnelDashboard } from "../ReferralFunnelDashboard"

const data = {
  organizationId: "org-a",
  generatedAt: "2026-08-09T18:00:00.000Z",
  scope: "ALL_TIME" as const,
  totals: {
    issuedLinks: 3,
    clicks: 5,
    conversions: 2,
    inviteActivations: 1,
  },
  rows: [
    {
      sourceType: "CUSTOMER_STATEMENT" as const,
      campaign: "customer_statement_share",
      issuedLinks: 2,
      clicks: 4,
      conversions: 1,
      inviteActivations: 0,
    },
    {
      sourceType: "ACCOUNTANT_INVITE" as const,
      campaign: "accountant_client_invite",
      issuedLinks: 1,
      clicks: 1,
      conversions: 1,
      inviteActivations: 1,
    },
  ],
  privacyBoundary: {
    aggregateOnly: true as const,
    includesRecipientContactData: false as const,
    includesRawRequestData: false as const,
  },
}

describe("ReferralFunnelDashboard", () => {
  it("shows aggregate funnel totals and source/campaign rows", () => {
    render(<ReferralFunnelDashboard data={data} locale="en" />)

    expect(screen.getByRole("heading", { name: "Referral funnel", level: 1 })).toBeInTheDocument()
    expect(screen.getByRole("row", {
      name: /Customer statement delivery customer_statement_share 2 4 1 0/i,
    })).toBeInTheDocument()
    expect(screen.getByRole("row", {
      name: /Accountant-client invite accountant_client_invite 1 1 1 1/i,
    })).toBeInTheDocument()
  })

  it("states the privacy boundary without rendering recipient or request details", () => {
    render(<ReferralFunnelDashboard data={data} locale="en" />)

    expect(screen.getByText("Aggregate evidence only")).toBeInTheDocument()
    expect(screen.getByText(/Recipient contacts and raw IP or user-agent data/i)).toBeInTheDocument()
    expect(screen.queryByText(/subject hash|203\.0\.113|recipient@example/i)).not.toBeInTheDocument()
  })
})
