import type { SVGProps } from "react"
import { render, screen } from "@testing-library/react"

jest.mock("@/components/agents/AgentCommandPanel", () => ({
  AgentCommandPanel: () => null,
}))

import type { DailyHabitDigestData } from "@/services/daily-habit/daily-habit-digest-contracts"
import { DailyHabitDigestDashboard } from "../DailyHabitDigestDashboard"

jest.mock("lucide-react", () => {
  const createIcon = (name: string) => {
    const Icon = (props: SVGProps<SVGSVGElement>) => <svg data-testid={"icon-" + name} {...props} />
    return Icon
  }

  return new Proxy(
    { __esModule: true },
    {
      get(target, prop: string) {
        if (prop in target) return target[prop as keyof typeof target]
        return createIcon(prop)
      },
    },
  )
})
describe("DailyHabitDigestDashboard role states", () => {
  it("explains when no role-specific workspace is available", () => {
    const data = {
      organizationId: "org-1",
      organizationName: "Atelier OHADA",
      generatedAt: "2026-07-11T08:00:00.000Z",
      periodStart: "2026-07-11T00:00:00.000Z",
      periodEnd: "2026-07-11T23:59:59.999Z",
      currency: "XAF",
      digests: [],
      actionQueue: {
        summary: {},
        filteredOutCount: 0,
      },
      summary: {
        digestCount: 0,
        visibleActionCount: 0,
        filteredOutActionCount: 0,
        staleSignalCount: 0,
        redactedSignalCount: 0,
        blockedDigestCount: 0,
        hiddenDigestCount: 7,
      },
    } as DailyHabitDigestData

    render(<DailyHabitDigestDashboard locale="en" data={data} />)

    expect(screen.getByRole("heading", { name: "No Daily Digest workspace is available" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Back to dashboard" })).toHaveAttribute("href", "/en/dashboard")
    expect(screen.getByText(/7 role workspace\(s\) are hidden/)).toBeInTheDocument()
    expect(screen.getByText("XAF")).toBeInTheDocument()
  })
})
