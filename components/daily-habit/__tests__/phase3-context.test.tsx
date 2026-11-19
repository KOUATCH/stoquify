import { act, fireEvent, render, screen } from "@testing-library/react"
import { CommandCenterRecovery } from "@/components/dashboard/CommandCenterRecovery"
import { commandDateLabel, priorityExplanation, stableIdentityOrder } from "@/lib/dashboard/command-center-context"
import { useState } from "react"
import { normalizeManagerView } from "@/components/manager-action-center/useManagerView"
import { presentDailyAction, presentDailySignal } from "@/services/daily-habit/daily-habit-signal-presentation"
import type { ActionItem, BusinessSignal, BusinessSignalType } from "@/services/signals/business-signal-contracts"

const mockRefresh = jest.fn()
jest.mock("next/navigation", () => ({useRouter: () => ({refresh: mockRefresh})}))
afterEach(() => { jest.useRealTimers(); mockRefresh.mockReset() })

it.each(["en", "fr"] as const)("announces %s refresh, hides old private detail, and confirms only committed replacement data", locale => {
  const old = {}, fresh = {}
  const {rerender} = render(<CommandCenterRecovery snapshot={old} locale={locale}><p>private old proof</p></CommandCenterRecovery>)
  fireEvent.click(screen.getByRole("button", {name: locale === "en" ? "Refresh view" : "Actualiser la vue"}))
  expect(mockRefresh).toHaveBeenCalledTimes(1)
  expect(screen.queryByText("private old proof")).not.toBeInTheDocument()
  expect(screen.getByRole("status")).toHaveTextContent(locale === "en" ? "Refreshing" : "Actualisation")
  rerender(<CommandCenterRecovery snapshot={fresh} locale={locale}><p>new authorized snapshot</p></CommandCenterRecovery>)
  expect(screen.getByText("new authorized snapshot")).toBeVisible()
  expect(screen.getByRole("status")).toHaveTextContent(locale === "en" ? "no action was resolved" : "aucune action n’a été résolue")
})

it("fails closed on an unconfirmed refresh, prevents duplicate requests and allows retry", () => {
  jest.useFakeTimers()
  render(<CommandCenterRecovery snapshot={{}} locale="en"><p>private data</p></CommandCenterRecovery>)
  const refresh = screen.getByRole("button", {name: "Refresh view"})
  fireEvent.click(refresh); fireEvent.click(refresh)
  expect(mockRefresh).toHaveBeenCalledTimes(1)
  act(() => jest.advanceTimersByTime(20000))
  expect(screen.getByRole("status")).toHaveTextContent("Refresh was not confirmed")
  expect(screen.queryByText("private data")).not.toBeInTheDocument()
  expect(refresh).toBeEnabled()
  expect(screen.getByRole("button", {name: "Reload page"})).toBeVisible()
})

it("handles a synchronous refresh failure without showing the previous snapshot", () => {
  mockRefresh.mockImplementation(() => {throw Error("private internal failure")})
  render(<CommandCenterRecovery snapshot={{}} locale="en"><p>private data</p></CommandCenterRecovery>)
  fireEvent.click(screen.getByRole("button", {name: "Refresh view"}))
  expect(screen.queryByText("private data")).not.toBeInTheDocument()
  expect(screen.queryByText("private internal failure")).not.toBeInTheDocument()
  expect(screen.getByRole("status")).toHaveTextContent("Refresh was not confirmed")
})

it("unmounts private state on replacement even when generated timestamps are identical", async () => {
  let resolve!: (value: string) => void
  function Detail() {
    const [text, setText] = useState("empty")
    return <><button onClick={() => new Promise<string>(done => {resolve = done}).then(setText)}>Load old proof</button><p>{text}</p></>
  }
  const {rerender} = render(<CommandCenterRecovery snapshot={{generatedAt: "same"}} locale="en"><Detail /></CommandCenterRecovery>)
  fireEvent.click(screen.getByText("Load old proof"))
  rerender(<CommandCenterRecovery snapshot={{generatedAt: "same"}} locale="en"><p>Access withdrawn</p></CommandCenterRecovery>)
  await act(async () => resolve("withdrawn secret"))
  expect(screen.queryByText("withdrawn secret")).not.toBeInTheDocument()
  expect(screen.getByText("Access withdrawn")).toBeVisible()
})

it("labels source timestamps in UTC across midnight and does not call expiry a deadline", () => {
  expect(commandDateLabel("2026-10-24T01:00:00+02:00", "evidence_expiry", "en")).toContain("Evidence expiry (UTC): Oct 23")
  expect(commandDateLabel("2026-10-24T01:00:00+02:00", "submitted", "fr")).toContain("Soumis (UTC): 23 oct.")
  expect(commandDateLabel("bad", "deadline", "fr")).toContain("indisponible")
})

it("explains the actual leading risk and gives ties a locale-independent identity order", () => {
  const item = {id: "z", title: "Missing stock proof", severity: "critical", severityScore: 91, blockers: [{}]}
  expect(priorityExplanation(item, "score", "en")).toMatch(/Missing stock proof.*91.*Review blockers/)
  expect(priorityExplanation(item, "severity_deadline_score", "fr")).toMatch(/Missing stock proof.*critique.*blocages/)
  expect([item, {...item, id: "a"}].sort(stableIdentityOrder).map(i => i.id)).toEqual(["a", "z"])
})

it("restores only authorized queue values and accepts no return destination", () => {
  const view = normalizeManagerView({mode: "https://outside.invalid", source: "other-tenant", role: "admin", location: "withdrawn", urgency: "javascript:alert(1)", page: "-2", returnTo: "//outside.invalid"} as never,
    {sources: ["inventory"], roles: ["manager"], locations: ["current-location"]})
  expect(view).toEqual({mode: "brief", source: "all", role: "all", location: "current-location", urgency: "all", page: 1})
})

it.each([
  ["cash_drawer_variance", "Cash Drawer Variance", "Écart de caisse"],
  ["duplicate_provider_reference", "Duplicate Provider Reference", "Référence de prestataire en double"],
  ["refund_void_spike", "Refund Void Spike", "Hausse des remboursements et annulations"],
  ["dead_stock_cash_exposure", "Dead Stock Cash Exposure", "Trésorerie immobilisée dans les stocks dormants"],
])("localizes canonical %s evidence but preserves authored source text", (type, title, translated) => {
  const signal = {signalType: type as BusinessSignalType, title, detail: `Kontava detected a ${type.replace(/_/g, " ")} signal that needs review.`, suggestedAction: "Source-authored instruction", businessImpact: "Source-authored impact"} as BusinessSignal
  expect(presentDailySignal(signal, "fr")).toEqual(expect.objectContaining({title: translated, suggestedAction: "Source-authored instruction", businessImpact: "Source-authored impact"}))
  expect(presentDailySignal(signal, "fr").detail).not.toContain("Kontava detected")
  expect(presentDailySignal(signal, "en")).toBe(signal)
  expect(presentDailyAction({signalType: signal.signalType, title, nextStep: "Source-authored instruction"} as ActionItem, "fr").title).toBe(translated)
  expect(presentDailySignal({...signal, title: "A specific customer incident"}, "fr").title).toBe("A specific customer incident")
})
