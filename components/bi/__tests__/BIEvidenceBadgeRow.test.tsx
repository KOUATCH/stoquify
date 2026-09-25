import { render, screen } from "@testing-library/react"
import { BIEvidenceBadgeRow } from "../BIEvidenceBadgeRow"
import type { BIFreshness } from "@/services/bi/bi-contracts"
jest.mock("lucide-react", () => new Proxy({ __esModule: true }, { get: (_target, key) => key === "__esModule" ? true : function MockIcon() { return <svg aria-hidden="true" /> } }))

const freshness: BIFreshness = { state: "blocked", generatedAt: "2026-09-19T12:00:00Z", sourceMaxUpdatedAt: "2026-09-17T08:15:00Z", maxAgeMinutes: 1440, stale: true, staleReason: "Source data is 3105 minutes old." }

it.each([
  ["en", "Source flagged as stale", "Blocked"],
  ["fr", "Source signalée comme périmée", "Bloqué"],
])("shows stale source timing without clearing a blocked state (%s)", (locale, warning, blocked) => {
  render(<BIEvidenceBadgeRow locale={locale} evidenceGrade="blocked" trustState="blocked" freshness={freshness} />)
  expect(screen.getByText(warning)).toBeVisible()
  expect(screen.getAllByText(blocked).length).toBeGreaterThan(0)
  const time = document.querySelector("time")!
  expect(time).toHaveAttribute("dateTime", freshness.sourceMaxUpdatedAt)
  expect(time).toHaveTextContent("UTC")
  expect(screen.getByText(/1440/)).toBeVisible()
})

it("never labels an explicitly stale source as fresh", () => {
  render(<BIEvidenceBadgeRow evidenceGrade="operational" trustState="operational" freshness={{ ...freshness, state: "fresh" }} />)
  expect(screen.queryByText("fresh")).not.toBeInTheDocument()
  expect(screen.getByText("stale")).toBeVisible()
})

it.each([null, "invalid"])("does not invent source timing or age limits (%s)", sourceMaxUpdatedAt => {
  render(<BIEvidenceBadgeRow locale="fr" evidenceGrade="blocked" trustState="blocked" freshness={{ ...freshness, sourceMaxUpdatedAt, maxAgeMinutes: null }} />)
  expect(screen.getByText("Date de mise à jour indisponible")).toBeVisible()
  expect(document.querySelector("time")).toBeNull()
  expect(screen.queryByText(/1440/)).not.toBeInTheDocument()
})

it("keeps current evidence compact without a stale warning", () => {
  render(<BIEvidenceBadgeRow evidenceGrade="operational" trustState="operational" freshness={{ ...freshness, state: "fresh", stale: false, staleReason: null }} />)
  expect(screen.queryByText("Source flagged as stale")).not.toBeInTheDocument()
})
