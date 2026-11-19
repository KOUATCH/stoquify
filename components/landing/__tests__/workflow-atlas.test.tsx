import type { ReactNode } from "react"
import { act, cleanup, fireEvent, render } from "@testing-library/react"

import { WorkflowAtlas } from "@/components/landing/workflow-atlas"
import {
  getWorkflowAtlasOutcomesForRole,
  getWorkflowAtlasWorkflowsForSelection,
  workflowAtlasRoles,
  workflowAtlasWorkflows,
} from "@/components/landing/workflow-atlas-data"
import { WorkflowStory } from "@/components/landing/workflow-story"
import { productCommunicationCopy, workflowGuidance } from "@/components/landing/public-product-copy"

jest.mock("@/components/landing/cinematic-shell", () => ({ useCinematicSignedIn: () => false, useCinematicMotionOff: () => false }))

jest.mock("lucide-react", () => {
  const Icon = (props: Record<string, unknown>) => <svg {...props} />
  return new Proxy({}, { get: () => Icon })
})

jest.mock("next-intl", () => ({
  useLocale: () => "en",
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
  it("keeps compact selectors and desktop filters synchronized when a role removes an outcome", () => {
    const { container } = render(<WorkflowAtlas />)
    const role = container.querySelector('select[aria-labelledby="workflow-role-label"]')!
    const outcome = container.querySelector('select[aria-labelledby="workflow-outcome-label"]')!
    fireEvent.click(container.querySelector('[data-workflow-atlas-role="hrPayroll"]')!)
    fireEvent.change(outcome, { target: { value: "payPeople" } })
    expect(role).toHaveValue("hrPayroll")
    expect(container.querySelector('[data-workflow-atlas-outcome="payPeople"]')).toHaveAttribute("aria-pressed", "true")
    fireEvent.change(role, { target: { value: "cashier" } })
    expect(outcome).toHaveValue("all")
    expect(container.querySelector('[data-workflow-atlas-role="cashier"]')).toHaveAttribute("aria-pressed", "true")
    expect(outcome.querySelector('option[value="payPeople"]')).toBeNull()
  })

  it.each(["en", "fr"] as const)("provides a responsible role and prerequisites for every %s journey", (locale) => {
    for (const workflow of workflowAtlasWorkflows) {
      const guidance = workflowGuidance[locale][workflow.key]
      expect(guidance.owners).toHaveLength(workflow.stepKeys.length)
      expect(guidance.owners.every(owner => owner.trim().length > 0)).toBe(true)
      for (const field of ["prerequisites", "result", "handoff", "execution"] as const) {
        expect(guidance[field].length).toBeGreaterThan(25)
      }
    }
    for (const group of productCommunicationCopy[locale].groups) {
      expect(workflowAtlasWorkflows.some(workflow => workflow.key === group.workflow)).toBe(true)
    }
  })

  it("keeps the final payroll publication step and its owner in the detailed guide", () => {
    const { container } = render(<WorkflowAtlas />)
    fireEvent.click(container.querySelector('[data-workflow-atlas-role="hrPayroll"]') as HTMLButtonElement)
    fireEvent.click(container.querySelector('[data-workflow-atlas-outcome="payPeople"]') as HTMLButtonElement)
    const guide = container.querySelector("#workflow-peopleToPay") as HTMLElement
    expect(guide.querySelectorAll("[data-workflow-atlas-step]")).toHaveLength(6)
    expect(guide.querySelector('[data-workflow-atlas-step="publishPayslip"]')).toHaveTextContent("Payroll administrator")
    expect(guide.querySelector("[data-workflow-prerequisites]")).toHaveTextContent("supported country rules")
    expect(guide.querySelector("[data-workflow-handoff]")).toHaveTextContent("unavailable pending expert review")
  })

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


describe("Workflow visual stories", () => {
  it("switches business context while keeping the selected controls and destination links aligned", () => {
    const { container, getByRole } = render(<WorkflowStory />)
    expect(getByRole("button", { name: "Retail & locations" })).toHaveAttribute("aria-pressed", "true")
    expect(getByRole("img")).toHaveAttribute("src", "/landing/cinematic/retail-screen-v2.webp")
    expect(container.querySelector("h2")).toHaveTextContent("Every location. One connected business.")
    expect(container.querySelector('a[href="#workflow-ownerDailyControl"]')).toBeInTheDocument()
    fireEvent.click(getByRole("button", { name: "Pharmacy" }))
    expect(getByRole("button", { name: "Pharmacy" })).toHaveAttribute("aria-pressed", "true")
    expect(getByRole("button", { name: "Bakery" })).toHaveAttribute("aria-pressed", "false")
    expect(getByRole("img")).toHaveAttribute("src", "/landing/cinematic/pharmacy-screen-v2.webp")
    expect([...container.querySelectorAll('.workflow-story-record-panel[aria-hidden="false"] .workflow-story-steps a')].map(a => a.getAttribute("href"))).toEqual([
      "#workflow-procureToPay", "#workflow-stockToSale", "#workflow-sellToCash",
    ])
    fireEvent.click(getByRole("button", { name: "Building supplies" }))
    expect(container.querySelector('a[href="#workflow-customerToCollection"]')).toBeInTheDocument()
    fireEvent.click(getByRole("button", { name: "Accounting firm" }))
    expect(getByRole("img")).toHaveAttribute("src", "/landing/cinematic/accounting-firm-screen-v2.webp")
    expect(container.querySelector('.workflow-scene-media[data-active="true"] [data-screen-page]')).toHaveAttribute("data-screen-page", "accounting")
    expect(container.querySelector(".workflow-story-record")).toHaveTextContent("client’s authorization")
    expect([...container.querySelectorAll('.workflow-story-record-panel[aria-hidden="false"] .workflow-story-steps a')].map(a => a.getAttribute("href"))).toEqual([
      "#workflow-sellToCash", "#workflow-paymentReconciliation", "#workflow-accountingCloseAssurance",
    ])
  })

  it("retains every workflow anchor and its existing protected destinations", () => {
    const { container } = render(<WorkflowAtlas />)
    for (const workflow of workflowAtlasWorkflows) {
      const guide = container.querySelector(`#workflow-${workflow.key}`)!
      expect(guide).toBeInTheDocument()
      expect(guide.querySelector(`[data-protected-route="${workflow.dailyRoute.href}"]`)).toBeInTheDocument()
      expect(guide.querySelectorAll("[data-workflow-atlas-step]")).toHaveLength(workflow.stepKeys.length)
    }
    expect(container.querySelector("main")).toHaveAttribute("id", "main")
  })
})

describe("Workflow link navigation", () => {
  const scrollDescriptor = Object.getOwnPropertyDescriptor(Element.prototype, "scrollIntoView")
  const matchMedia = window.matchMedia
  const scrollIntoView = jest.fn()

  beforeEach(() => {
    jest.useFakeTimers()
    scrollIntoView.mockClear()
    Object.defineProperty(Element.prototype, "scrollIntoView", { configurable: true, value: scrollIntoView })
    window.history.replaceState(null, "", "/en/workflows")
  })

  afterEach(() => {
    cleanup()
    jest.useRealTimers()
    jest.restoreAllMocks()
    window.matchMedia = matchMedia
    if (scrollDescriptor) Object.defineProperty(Element.prototype, "scrollIntoView", scrollDescriptor)
    else Reflect.deleteProperty(Element.prototype, "scrollIntoView")
    window.history.replaceState(null, "", "/en/workflows")
  })

  it("restores a filtered-out guide, prevents the native jump and supports repeated links", () => {
    const { container } = render(<WorkflowAtlas />)
    fireEvent.click(container.querySelector('[data-workflow-atlas-role="hrPayroll"]')!)
    expect(container.querySelector("#workflow-sellToCash")).not.toBeInTheDocument()
    const link = container.querySelector('.workflow-story-steps a[href="#workflow-sellToCash"]')!
    expect(fireEvent.click(link)).toBe(false)
    act(() => jest.advanceTimersByTime(40))
    const guide = container.querySelector("#workflow-sellToCash")!
    expect(window.location.hash).toBe("#workflow-sellToCash")
    expect(guide.querySelector("details")).toHaveAttribute("open")
    expect(guide).toHaveFocus()
    expect(scrollIntoView).toHaveBeenLastCalledWith({ block: "start", behavior: "smooth" })
    fireEvent.click(link)
    act(() => jest.advanceTimersByTime(40))
    expect(scrollIntoView).toHaveBeenCalledTimes(2)
  })

  it("opens a bookmarked firm guide while the section link preserves the compact overview", () => {
    window.history.replaceState(null, "", "/en/workflows#workflow-accountant-portfolio")
    const { container } = render(<WorkflowAtlas />)
    act(() => jest.advanceTimersByTime(40))
    const guide = container.querySelector("#workflow-accountant-portfolio")!
    expect(guide.querySelector("details")).toHaveAttribute("open")
    expect(guide).toHaveFocus()
    fireEvent.click(container.querySelector('a[href="#workflow-specialists"]')!)
    act(() => jest.advanceTimersByTime(40))
    expect(container.querySelector("#workflow-specialists")).toHaveFocus()
    expect(container.querySelector("#workflow-accountant-access details")).not.toHaveAttribute("open")
  })

  it.each(["reduced", "paused"])("keeps navigation instant when motion is %s", preference => {
    if (preference === "reduced") {
      const media = window.matchMedia("(prefers-reduced-motion: reduce)")
      window.matchMedia = jest.fn().mockReturnValue({ ...media, matches: true })
    }
    const { container } = render(<div className={preference === "paused" ? "motion-off" : ""}><WorkflowAtlas /></div>)
    fireEvent.click(container.querySelector('.workflow-story-steps a[href="#workflow-sellToCash"]')!)
    act(() => jest.advanceTimersByTime(40))
    expect(scrollIntoView).toHaveBeenLastCalledWith({ block: "start", behavior: "instant" })
    expect(container.querySelector("#workflow-sellToCash")).toHaveFocus()
  })

  it("scrolls to the finder without resetting the chosen role", () => {
    const { container } = render(<WorkflowAtlas />)
    fireEvent.click(container.querySelector('[data-workflow-atlas-role="cashier"]')!)
    fireEvent.click(container.querySelector('a[href="#workflow-finder"]')!)
    act(() => jest.advanceTimersByTime(40))
    expect(container.querySelector("#workflow-finder")).toHaveFocus()
    expect(container.querySelector('[data-workflow-atlas-role="cashier"]')).toHaveAttribute("aria-pressed", "true")
    expect(scrollIntoView).toHaveBeenLastCalledWith({ block: "start", behavior: "smooth" })
  })

  it("leaves modified clicks to the browser", () => {
    const { container } = render(<WorkflowAtlas />)
    expect(fireEvent.click(container.querySelector('.workflow-story-steps a')!, { ctrlKey: true })).toBe(true)
    expect(window.location.hash).toBe("")
    expect(scrollIntoView).not.toHaveBeenCalled()
  })

  it("keeps an expanded guide open when the page rerenders", () => {
    const { container, rerender } = render(<WorkflowAtlas />)
    const details = container.querySelector("#workflow-sellToCash details")!
    fireEvent.click(details.querySelector("summary")!)
    expect(details).toHaveAttribute("open")
    rerender(<WorkflowAtlas />)
    expect(container.querySelector("#workflow-sellToCash details")).toBe(details)
    expect(details).toHaveAttribute("open")
  })

  it("highlights only after arrival, clears the effect, and repeats it for the same link", () => {
    const { container } = render(<WorkflowAtlas />)
    const guide = container.querySelector("#workflow-sellToCash")!
    const link = container.querySelector('.workflow-story-steps a[href="#workflow-sellToCash"]')!
    jest.spyOn(document.documentElement, "scrollHeight", "get").mockReturnValue(10000)
    const bounds = guide.getBoundingClientRect()
    const position = jest.spyOn(guide, "getBoundingClientRect").mockReturnValue({ ...bounds, top: 800 })
    fireEvent.click(link)
    act(() => jest.advanceTimersByTime(100))
    expect(guide).not.toHaveClass("workflow-destination-highlight")
    position.mockReturnValue({ ...bounds, top: 0 })
    act(() => jest.advanceTimersByTime(40))
    expect(guide).toHaveClass("workflow-destination-highlight")
    act(() => jest.advanceTimersByTime(1400))
    expect(guide).not.toHaveClass("workflow-destination-highlight")
    fireEvent.click(link)
    act(() => jest.advanceTimersByTime(80))
    expect(guide).toHaveClass("workflow-destination-highlight")
  })

  it("cancels an earlier destination and removes the highlight on unmount", () => {
    const { container, unmount } = render(<WorkflowAtlas />)
    const first = container.querySelector("#workflow-sellToCash")!
    const latest = container.querySelector("#workflow-stockToSale")!
    fireEvent.click(container.querySelector('.workflow-story-steps a[href="#workflow-sellToCash"]')!)
    act(() => jest.advanceTimersByTime(40))
    fireEvent.click(container.querySelector('.workflow-story-steps a[href="#workflow-stockToSale"]')!)
    act(() => jest.advanceTimersByTime(80))
    expect(first).not.toHaveClass("workflow-destination-highlight")
    expect(latest).toHaveClass("workflow-destination-highlight")
    unmount()
    expect(latest).not.toHaveClass("workflow-destination-highlight")
  })

  it("does not highlight a destination when scrolling stops short of it", () => {
    const { container } = render(<WorkflowAtlas />)
    const guide = container.querySelector("#workflow-sellToCash")!
    jest.spyOn(document.documentElement, "scrollHeight", "get").mockReturnValue(10000)
    jest.spyOn(guide, "getBoundingClientRect").mockReturnValue({ ...guide.getBoundingClientRect(), top: 800 })
    fireEvent.click(container.querySelector('.workflow-story-steps a[href="#workflow-sellToCash"]')!)
    act(() => jest.advanceTimersByTime(3100))
    expect(guide).not.toHaveClass("workflow-destination-highlight")
    expect(jest.getTimerCount()).toBe(0)
  })
})

describe("Workflow playbook continuity", () => {
  it("preserves the focused and expanded playbook across a parent rerender", () => {
    const view = render(<WorkflowAtlas />)
    const guide = view.container.querySelector("#workflow-sellToCash") as HTMLElement
    const details = guide.querySelector("details") as HTMLDetailsElement
    details.open = true
    guide.focus()
    view.rerender(<WorkflowAtlas />)
    expect(view.container.querySelector("#workflow-sellToCash")).toBe(guide)
    expect(guide).toHaveFocus()
    expect(details).toHaveAttribute("open", "")
  })
})
