import { fireEvent, render, screen } from "@testing-library/react"
jest.mock("next-intl/routing", () => ({ defineRouting: (config: unknown) => config }))
import { BICommandBriefHeader } from "../BICommandBriefHeader"
import type { BICommandBrief } from "@/services/bi/bi-contracts"

jest.mock("lucide-react", () => new Proxy({ __esModule: true }, {
  get: (_target, key) => key === "__esModule" ? true : function MockIcon() { return <svg aria-hidden="true" /> },
}))

const brief: BICommandBrief = {
  id: "brief", organizationId: "org", title: "Owner overview", summary: "Cash needs review.",
  conclusion: "Review the source before using this figure.", mode: "brief", state: "blocked",
  generatedAt: "2026-10-12T08:00:00Z", periodStart: "2026-10-01", periodEnd: "2026-10-12",
  evidenceGrade: "blocked", trustState: "blocked", provenance: null, sourceModules: ["finance"],
  blockers: [], redactions: [], drillThrough: null, reviewState: null,
  freshness: { state: "fresh", stale: true, staleReason: "Source expired", generatedAt: "2026-10-12T08:00:00Z", sourceMaxUpdatedAt: "2026-10-10T08:00:00Z", maxAgeMinutes: 60 },
  primaryAction: { id: "review", label: "Review", href: "/en/dashboard/finance", requiredPermission: "finance.read", moduleSlug: "finance", disabled: true, disabledReason: "Permission required" },
}

it.each([
  ["en", "Evidence and sources", "Source flagged as stale", "Trust: Blocked"],
  ["fr", "Preuves et sources", "Source signalée comme périmée", "Confiance: Bloqué"],
])("keeps uncertainty and disabled-action guidance outside collapsed evidence (%s)", (locale, label, warning, trust) => {
  const { container } = render(<BICommandBriefHeader brief={brief} locale={locale} compact />)
  const disclosure = screen.getByText(label).closest("details")!
  expect(disclosure.open).toBe(false)
  expect(screen.getAllByText(warning).find(element => !element.closest("details"))).toBeVisible()
  expect(screen.getByText(trust)).toBeVisible()
  expect(container.querySelector("time:not(details time)")).toHaveAttribute("datetime", brief.freshness.sourceMaxUpdatedAt)
  expect(screen.getByRole("button", { name: "Review", exact: true })).toBeDisabled()
  expect(screen.queryByRole("link", { name: "Review", exact: true })).not.toBeInTheDocument()
  expect(screen.getByText("Permission required")).toBeVisible()
  expect(screen.queryByText(locale === "fr" ? "à jour" : "fresh")).not.toBeInTheDocument()
  fireEvent.click(screen.getByText(label))
  expect(disclosure.open).toBe(true)
  expect(screen.getByText("finance")).toBeVisible()
})

it("does not invent a missing source timestamp or age limit", () => {
  render(<BICommandBriefHeader compact brief={{ ...brief, freshness: { ...brief.freshness, sourceMaxUpdatedAt: "invalid", maxAgeMinutes: null } }} />)
  expect(screen.getAllByText("Source update time unavailable").find(element => !element.closest("details"))).toBeVisible()
  expect(document.querySelector("time")).toBeNull()
  expect(screen.queryByText(/Source age limit/)).not.toBeInTheDocument()
})

it("keeps existing full headers expanded by default", () => {
  const { container } = render(<BICommandBriefHeader brief={brief} />)
  expect(container.querySelector("details")).toBeNull()
  expect(screen.getByText("finance")).toBeVisible()
  expect(screen.getByText("Source flagged as stale")).toBeVisible()
})
