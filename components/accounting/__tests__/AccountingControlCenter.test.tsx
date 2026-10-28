import { render, screen } from "@testing-library/react"

import { BusinessEventOutboxPanel } from "@/components/accounting/AccountingControlCenter"
import type { AccountingControlCenterData } from "@/actions/accounting/settings.actions"

jest.mock("@/hooks/useAccountingControlCenter", () => ({
  useAccountingControlCenter: jest.fn(),
  useLockAccountingSetup: jest.fn(),
}))

jest.mock("lucide-react", () => {
  const React = require("react")
  const makeIcon = (name: string) => {
    const MockIcon = (props: React.SVGProps<SVGSVGElement>) =>
      React.createElement("svg", { "data-testid": `icon-${name}`, ...props })
    MockIcon.displayName = `Mock${name}Icon`
    return MockIcon
  }

  return new Proxy(
    { __esModule: true },
    {
      get(target, prop) {
        if (prop in target) return target[prop as keyof typeof target]
        return makeIcon(String(prop))
      },
    },
  )
})

function controlCenterData(
  businessEventOutbox: AccountingControlCenterData["businessEventOutbox"],
) {
  return {
    businessEventOutbox,
  } as AccountingControlCenterData
}

describe("BusinessEventOutboxPanel", () => {
  it("renders the healthy outbox state without exposing message payloads", () => {
    render(
      <BusinessEventOutboxPanel
        locale="en"
        data={controlCenterData({
          status: "ok",
          pending: 0,
          locked: 0,
          deferred: 0,
          failed: 0,
          deadLetter: 0,
          openCount: 0,
          blockerCount: 0,
          warningCount: 0,
          oldestOpenAt: null,
          oldestOpenStatus: null,
          oldestOpenEventName: null,
        })}
      />,
    )

    expect(screen.getByText("Business event outbox")).toBeInTheDocument()
    expect(screen.getByTestId("accounting-business-event-outbox-open-count")).toHaveTextContent("0")
    expect(screen.getByText("No delayed or dead-lettered messages.")).toBeInTheDocument()
  })

  it("surfaces delayed and dead-lettered event counts with oldest event context", () => {
    render(
      <BusinessEventOutboxPanel
        locale="en"
        data={controlCenterData({
          status: "blocked",
          pending: 4,
          locked: 1,
          deferred: 2,
          failed: 3,
          deadLetter: 1,
          openCount: 11,
          blockerCount: 1,
          warningCount: 1,
          oldestOpenAt: "2026-06-11T08:00:00.000Z",
          oldestOpenStatus: "FAILED",
          oldestOpenEventName: "pos.receipt.whatsapp.requested",
        })}
      />,
    )

    expect(screen.getByTestId("accounting-business-event-outbox-open-count")).toHaveTextContent("11")
    expect(screen.getByText("Failed")).toBeInTheDocument()
    expect(screen.getByText("Dead letter")).toBeInTheDocument()
    expect(screen.getByText(/Oldest open:/)).toBeInTheDocument()
    expect(screen.getByText("Event: pos.receipt.whatsapp.requested")).toBeInTheDocument()
  })
})
