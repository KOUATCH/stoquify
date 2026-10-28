import type { ReactNode } from "react"
import { fireEvent, render } from "@testing-library/react"

import { WorkflowAtlas } from "@/components/landing/workflow-atlas"
import {
  getWorkflowAtlasOutcomesForRole,
  getWorkflowAtlasWorkflowsForSelection,
  workflowAtlasRoles,
} from "@/components/landing/workflow-atlas-data"

jest.mock("lucide-react", () => {
  const Icon = (props: Record<string, unknown>) => <svg {...props} />
  return new Proxy({}, { get: () => Icon })
})

jest.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: Record<string, string | number>) => {
    if (key === "selectionAnnouncement") {
      return `${values?.role}|${values?.outcome}|${values?.count}`
    }
    return key
  },
}))

jest.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

function outcomeKeys(container: HTMLElement) {
  return Array.from(container.querySelectorAll("[data-workflow-atlas-outcome]")).map((node) =>
    node.getAttribute("data-workflow-atlas-outcome"),
  )
}

describe("WorkflowAtlas role-conditioned outcomes", () => {
  it("derives a non-empty outcome catalogue for every role", () => {
    for (const role of workflowAtlasRoles) {
      const outcomes = getWorkflowAtlasOutcomesForRole(role.key)
      expect(outcomes.length).toBeGreaterThan(0)

      for (const outcome of outcomes) {
        expect(getWorkflowAtlasWorkflowsForSelection(role.key, outcome.key).length).toBeGreaterThan(0)
      }
    }
  })

  it("shows only outcomes backed by the selected role", () => {
    const { container } = render(<WorkflowAtlas />)

    expect(outcomeKeys(container)).toHaveLength(13)
    fireEvent.click(container.querySelector('[data-workflow-atlas-role="cashier"]') as HTMLButtonElement)

    expect(outcomeKeys(container)).toEqual(["all", "sell", "stock"])
    expect(container.querySelector('[data-workflow-atlas-outcome-count="all"]')).toHaveTextContent("2")
  })

  it("resets an incompatible outcome and keeps every result surface synchronized", () => {
    const { container } = render(<WorkflowAtlas />)

    fireEvent.click(container.querySelector('[data-workflow-atlas-role="cashier"]') as HTMLButtonElement)
    fireEvent.click(container.querySelector('[data-workflow-atlas-outcome="stock"]') as HTMLButtonElement)
    fireEvent.click(container.querySelector('[data-workflow-atlas-role="purchasing"]') as HTMLButtonElement)

    expect(outcomeKeys(container)).toEqual(["all", "buy"])
    expect(container.querySelector('[data-workflow-atlas-outcome="all"]')).toHaveAttribute("aria-pressed", "true")
    expect(container.querySelector('[data-workflow-atlas-outcome="stock"]')).not.toBeInTheDocument()
    expect(container.querySelectorAll("[data-workflow-map-index] a")).toHaveLength(1)
    expect(container.querySelector("[data-workflow-atlas-live]")).toHaveTextContent("roles.purchasing|outcomes.all|1")
  })
})
