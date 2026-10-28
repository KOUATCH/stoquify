import type { SVGProps } from "react"
import { fireEvent, render, screen } from "@testing-library/react"
import axe from "axe-core"

jest.mock("lucide-react", () => {
  const createIcon = (name: string) => {
    const Icon = (props: SVGProps<SVGSVGElement>) => <svg data-testid={`icon-${name}`} {...props} />
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

import {
  ActionQueue,
  CommandBriefHeader,
  EvidenceTimeline,
  FilterBar,
  KpiTile,
  PermissionLockedState,
  StatusStrip,
} from "@/components/dashboard/primitives"

describe("command center dashboard primitives", () => {
  it("renders a command brief with metadata, proof, and a primary route action", () => {
    render(
      <CommandBriefHeader
        title="Finance command center"
        summary="Cash is reconciled, close blockers are visible, and proof is ready."
        state={{ label: "Ready", tone: "success" }}
        metadata={[
          { label: "Period", value: "Today" },
          { label: "Generated", value: "08:00" },
        ]}
        actions={[{ label: "Open finance", href: "/en/dashboard/finance", variant: "primary" }]}
        proof={{ state: "reconciled", source: "ledger", sourceCount: 2 }}
      />,
    )

    expect(screen.getByRole("heading", { name: "Finance command center" })).toBeInTheDocument()
    expect(screen.getByText(/Cash is reconciled/)).toBeInTheDocument()
    expect(screen.getByText("Ready")).toBeInTheDocument()
    expect(screen.getByText("Period")).toBeInTheDocument()
    expect(screen.getByText(/ledger/)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Open finance/ })).toHaveAttribute("href", "/en/dashboard/finance")
  })

  it("renders action queue items and keeps empty queues actionable but quiet", () => {
    const onReview = jest.fn()
    const { rerender } = render(
      <ActionQueue
        items={[
          {
            id: "payroll-proof",
            title: "Resolve payroll proof gap",
            summary: "Attach payment evidence before finalizing the period.",
            riskLabel: "High risk",
            tone: "danger",
            owner: "Payroll lead",
            due: "Today",
            action: { label: "Review", onClick: onReview },
            proof: { state: "pending", label: "Needs proof" },
          },
        ]}
      />,
    )

    expect(screen.getByText("1 action")).toBeInTheDocument()
    expect(screen.getByText("Resolve payroll proof gap")).toBeInTheDocument()
    expect(screen.getByText("Needs proof")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Review" }))
    expect(onReview).toHaveBeenCalledTimes(1)

    rerender(<ActionQueue items={[]} />)

    expect(screen.getByText("No visible action is due")).toBeInTheDocument()
    expect(screen.getByText(/There is no permission-filtered command action/)).toBeInTheDocument()
  })

  it("standardizes KPI, status, and evidence display without fetching data", () => {
    render(
      <>
        <StatusStrip
          title="Operating status"
          items={[
            {
              id: "cash",
              label: "Cash",
              value: "Reconciled",
              detail: "Drawer and bank match.",
              state: "ready",
              proof: { state: "verified", source: "cash drawer" },
            },
          ]}
        />
        <KpiTile
          label="Trusted cash"
          value="XAF 12.5M"
          detail="Reconciled cash available for owner decisions."
          tone="success"
          proof={{ state: "certified", label: "Close proof" }}
        />
        <EvidenceTimeline
          events={[
            {
              id: "event-1",
              title: "Cash evidence attached",
              summary: "Provider statement linked to the close pack.",
              timestamp: "08:10",
              proof: { state: "posted", source: "journal" },
            },
          ]}
        />
      </>,
    )

    expect(screen.getByRole("heading", { name: "Operating status" })).toBeInTheDocument()
    expect(screen.getByText("Trusted cash")).toBeInTheDocument()
    expect(screen.getByText("Close proof")).toBeInTheDocument()
    expect(screen.getByText("Cash evidence attached")).toBeInTheDocument()
    expect(screen.getByText(/journal/)).toBeInTheDocument()
  })

  it("handles standard filters, search callbacks, and permission locked states", () => {
    const onSearch = jest.fn()
    const onReady = jest.fn()

    render(
      <>
        <FilterBar
          title="Filters"
          search={{ label: "Find actions", value: "cash", onChange: onSearch }}
          filters={[
            { id: "ready", label: "Ready", active: true, onClick: onReady },
            { id: "blocked", label: "Blocked", value: "2" },
          ]}
        />
        <PermissionLockedState permission="finance.read" moduleLabel="Finance" />
      </>,
    )

    fireEvent.change(screen.getByLabelText("Find actions"), { target: { value: "stock" } })
    fireEvent.click(screen.getByRole("button", { name: "Ready" }))

    expect(onSearch).toHaveBeenCalledWith("stock")
    expect(onReady).toHaveBeenCalledTimes(1)
    expect(screen.getByRole("button", { name: "Ready" })).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByText("Permission required")).toBeInTheDocument()
    expect(screen.getByText(/Required permission: finance.read/)).toBeInTheDocument()
  })

  it("has no serious accessibility violations in the shared command-center shell", async () => {
    const { container } = render(
      <main>
        <CommandBriefHeader
          title="Finance command center"
          summary="Cash is reconciled, close blockers are visible, and proof is ready."
          state={{ label: "Ready", tone: "success" }}
          metadata={[{ label: "Period", value: "Today" }]}
          actions={[{ label: "Open finance", href: "/en/dashboard/finance", variant: "primary" }]}
          proof={{ state: "reconciled", source: "ledger", sourceCount: 2 }}
        />
        <FilterBar
          title="Filters"
          search={{ label: "Find actions", value: "", onChange: jest.fn() }}
          filters={[{ id: "ready", label: "Ready", active: true }]}
        />
        <ActionQueue
          items={[
            {
              id: "payroll-proof",
              title: "Resolve payroll proof gap",
              summary: "Attach payment evidence before finalizing the period.",
              riskLabel: "High risk",
              tone: "danger",
              action: { label: "Review", href: "/en/dashboard/payroll" },
              proof: { state: "pending", label: "Needs proof" },
            },
          ]}
        />
      </main>,
    )

    const results = await axe.run(container, {
      rules: {
        "color-contrast": { enabled: false },
      },
    })
    const seriousViolations = results.violations.filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious",
    )

    expect(seriousViolations).toEqual([])
  })
})
