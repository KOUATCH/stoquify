import { fireEvent, render, screen, within } from "@testing-library/react"
import type { SVGProps } from "react"
import { DailyHabitDigestDashboard } from "../DailyHabitDigestDashboard"
import type { DailyHabitDigestData } from "@/services/daily-habit/daily-habit-digest-contracts"
import type { BIDailyDigest, BIActionLink, BIFreshness, BIBlocker } from "@/services/bi/bi-contracts"

const mockPush = jest.fn()
jest.mock("next/navigation", () => ({ useRouter: () => ({ push: mockPush }) }))

// Layout/scroll geometry is verified in the actual browser; jsdom lacks this API.
const scrollDescriptor = Object.getOwnPropertyDescriptor(Element.prototype, "scrollIntoView")
beforeAll(() => Object.defineProperty(Element.prototype, "scrollIntoView", { configurable: true, value: jest.fn() }))
afterAll(() => {
  if (scrollDescriptor) Object.defineProperty(Element.prototype, "scrollIntoView", scrollDescriptor)
  else Reflect.deleteProperty(Element.prototype, "scrollIntoView")
})

jest.mock("@/components/agents/AgentCommandPanel", () => {
  const React = jest.requireActual("react") as typeof import("react")
  return { AgentCommandPanel: function AgentStateProbe() {
    const [saved, setSaved] = React.useState(false)
    return <button onClick={() => setSaved(true)}>{saved ? "Saved test brief" : "Build test brief"}</button>
  } }
})
jest.mock("lucide-react", () => new Proxy({ __esModule: true }, { get: (target, prop: string) => prop in target ? target[prop as keyof typeof target] : (props: SVGProps<SVGSVGElement>) => <svg {...props} /> }))

const freshness: BIFreshness = { state: "stale", stale: true, generatedAt: "2026-07-11T08:00:00Z", sourceMaxUpdatedAt: null, maxAgeMinutes: 60, staleReason: "Source needs refresh" }
const blocker: BIBlocker = { id: "source-blocker", title: "Source evidence missing", detail: "Review the source before use.", severity: "high", gate: "source.review", sourceTables: [], nextAction: "Inspect source" }
const action: BIActionLink = { id: "source-action", label: "Review source", href: "/fr/dashboard/inventory", requiredPermission: "inventory.read", moduleSlug: "inventory", disabled: false, disabledReason: null }
beforeEach(() => { mockPush.mockClear(); window.history.replaceState({}, "", "/en/dashboard/daily-digest") })
function digest(id: string, role: string): BIDailyDigest {
  return {
    id, audienceRole: role, organizationId: "owned-org", generatedAt: freshness.generatedAt!, periodStart: "2026-07-11T00:00:00Z", periodEnd: "2026-07-11T23:59:59Z", freshness,
    commandBrief: { id: id + "-brief", organizationId: "owned-org", title: "Role summary", summary: "Scoped signals", conclusion: "Review limitations", mode: "brief", generatedAt: freshness.generatedAt!, periodStart: "2026-07-11T00:00:00Z", periodEnd: "2026-07-11T23:59:59Z", state: "stale", evidenceGrade: "operational", trustState: "operational", freshness, provenance: { organizationId: "owned-org", sourceHash: "owned-hash", sourceModules: ["inventory"], generatedAt: freshness.generatedAt! }, sourceModules: ["inventory"], blockers: [blocker], redactions: [], primaryAction: null, drillThrough: null, reviewState: null },
    actions: [action, { ...action, id: "disabled", label: "Restricted action", disabled: true, disabledReason: "Current permission required" }], changes: [], risks: [], blockers: [blocker], redactions: [],
    zones: [{ id: id + "-zone", organizationId: "owned-org", moduleSlug: "inventory", title: "Original source view", businessQuestion: "Can I rely on the source?", summary: "Source limitations remain", state: "stale", evidenceGrade: "operational", trustState: "operational", freshness, sourceModules: ["inventory"], primaryMetric: null, sections: [], cards: [], insights: [], risks: [], flowSteps: [], actions: [], blockers: [blocker], redactions: [], drillThrough: null }],
  }
}
function data(): DailyHabitDigestData {
  return { organizationId: "owned-org", organizationName: "Owned test", generatedAt: freshness.generatedAt!, periodStart: "2026-07-11T00:00:00Z", periodEnd: "2026-07-11T23:59:59Z", currency: "XAF", timezone: "UTC", digests: [digest("owner", "owner"), digest("manager", "manager")], actionQueue: { filteredOutCount: 0, summary: { total: 2, open: 2, assigned: 0, stale: 0, expired: 0, redacted: 0, bySeverity: { info: 0, low: 0, medium: 0, high: 2, critical: 0 }, byRole: { owner: 2 } } }, summary: { digestCount: 2, visibleActionCount: 2, filteredOutActionCount: 0, staleSignalCount: 1, redactedSignalCount: 0, blockedDigestCount: 0, hiddenDigestCount: 0 } }
}

it("clears agent state on workspace, source revision or tenant changes, but keeps it across display modes", () => {
  const source = data()
  const { rerender } = render(<DailyHabitDigestDashboard data={source} locale="en" />)
  fireEvent.click(screen.getByRole("button", { name: "Build test brief" }))
  fireEvent.click(screen.getByRole("button", { name: "Command", exact: true }))
  expect(screen.getByRole("button", { name: "Saved test brief" })).toBeVisible()
  fireEvent.click(screen.getByRole("button", { name: "Manager", exact: true }))
  expect(screen.getByRole("button", { name: "Build test brief" })).toBeVisible()
  fireEvent.click(screen.getByRole("button", { name: "Build test brief" }))
  rerender(<DailyHabitDigestDashboard data={{ ...source, generatedAt: "2026-07-11T09:00:00Z" }} locale="en" />)
  expect(screen.getByRole("button", { name: "Build test brief" })).toBeVisible()
  fireEvent.click(screen.getByRole("button", { name: "Build test brief" }))
  rerender(<DailyHabitDigestDashboard data={{ ...source, organizationId: "other-tenant" }} locale="en" />)
  expect(screen.getByRole("button", { name: "Build test brief" })).toBeVisible()
})

it.each(["en", "fr"] as const)("switches both UTC reporting-period labels independently of the local generation time (%s)", locale => {
  const source = data()
  source.timezone = "America/New_York"
  const weekly = digest("weekly", "weekly")
  weekly.periodStart = weekly.commandBrief.periodStart = "2026-07-05T00:00:00Z"
  source.digests.push(weekly)
  render(<DailyHabitDigestDashboard data={source} locale={locale} />)
  const dailyPeriod = locale === "en" ? "Jul 11 - Jul 11" : "11 juil. - 11 juil."
  const weeklyPeriod = locale === "en" ? "Jul 5 - Jul 11" : "5 juil. - 11 juil."
  expect(screen.getAllByText(dailyPeriod)).toHaveLength(2)
  fireEvent.click(screen.getByRole("button", { name: locale === "en" ? "Weekly" : "Hebdomadaire", exact: true }))
  expect(screen.getAllByText(weeklyPeriod)).toHaveLength(2)
  expect(screen.queryByText(dailyPeriod)).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole("button", { name: locale === "en" ? "Owner" : "Dirigeant", exact: true }))
  expect(screen.getAllByText(dailyPeriod)).toHaveLength(2)
})

it.each(["en", "fr"] as const)("switches real mode content in %s while retaining source warnings and disabled actions", locale => {
  const source = data(), before = JSON.stringify(source)
  render(<DailyHabitDigestDashboard data={source} locale={locale} />)
  const titles = locale === "en" ? ["Summary and changes", "Actions and risks", "Source details"] : ["Synthèse et évolutions", "Actions et risques", "Détails des sources"]
  const modes = locale === "en" ? ["Brief", "Command", "Investigate"] : ["Synthèse", "Pilotage", "Examiner"]
  expect(screen.getByRole("region", { name: titles[0] })).toBeVisible()
  const disclosure = screen.getByText(blocker.title, { selector: "summary" })
  expect(disclosure.closest("details")).not.toHaveAttribute("open")
  fireEvent.click(disclosure)
  expect(disclosure.closest("details")).toHaveAttribute("open")
  expect(within(disclosure.closest("details")!).getByText(blocker.detail)).toBeVisible()
  expect(within(disclosure.closest("details")!).getByText(blocker.nextAction!)).toBeVisible()
  expect(screen.queryByRole("link", { name: "Open" })).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole("button", { name: modes[1], exact: true }))
  const command = screen.getByRole("region", { name: titles[1] })
  expect(screen.queryByRole("region", { name: titles[0] })).not.toBeInTheDocument()
  expect(within(command).getByRole("link", { name: locale === "en" ? "Open" : "Ouvrir", exact: true })).toHaveAttribute("href", action.href)
  expect(within(command).getByRole("button", { name: locale === "en" ? "Hidden" : "Masqué" })).toBeDisabled()
  expect(within(command).getByText("Current permission required")).toBeVisible()
  expect(screen.getByRole("region", { name: locale === "en" ? "Source limitations" : "Limites des sources" })).toHaveTextContent(blocker.title)
  fireEvent.click(screen.getByRole("button", { name: modes[2], exact: true }))
  expect(screen.getByRole("region", { name: titles[2] })).toHaveTextContent("Original source view")
  expect(screen.queryByRole("region", { name: titles[1] })).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole("button", { name: locale === "en" ? "Manager" : "Responsable", exact: true }))
  expect(screen.getByRole("region", { name: titles[0] })).toBeVisible()
  expect(screen.getByRole("button", { name: modes[0], exact: true })).toHaveAttribute("aria-pressed", "true")
  expect(JSON.stringify(source)).toBe(before)
})

it("opens source limitations without requiring a user to find the mode switcher", () => {
  render(<DailyHabitDigestDashboard data={data()} locale="fr" />)
  fireEvent.click(screen.getByRole("button", { name: "Examiner les sources", exact: true }))
  expect(screen.getByRole("region", { name: "Détails des sources" })).toBeVisible()
  expect(screen.getByRole("button", { name: "Examiner", exact: true })).toHaveAttribute("aria-pressed", "true")
})

it("restores the authorized workspace and mode from history while retaining unrelated URL fields", () => {
  window.history.replaceState({ existing: true }, "", "/en/dashboard/daily-digest?digest=manager&mode=command&filter=keep")
  render(<DailyHabitDigestDashboard data={data()} locale="en" />)
  expect(screen.getByRole("button", { name: "Manager", exact: true })).toHaveAttribute("aria-pressed", "true")
  expect(screen.getByRole("region", { name: "Actions and risks" })).toBeVisible()
  fireEvent.click(screen.getByRole("button", { name: "Investigate", exact: true }))
  expect(new URL(window.location.href).searchParams.get("mode")).toBe("investigate")
  expect(new URL(window.location.href).searchParams.get("filter")).toBe("keep")
  expect(window.history.state).toEqual({ existing: true })
})

it("does not make an unavailable workspace visible through URL state", () => {
  window.history.replaceState({}, "", "/en/dashboard/daily-digest?digest=unauthorized&mode=unexpected")
  render(<DailyHabitDigestDashboard data={data()} locale="en" />)
  expect(screen.getByRole("region", { name: "Summary and changes" })).toBeVisible()
  expect(screen.queryByRole("button", { name: "unauthorized" })).not.toBeInTheDocument()
})

it.each(["en", "fr"] as const)("opens sources at the top while retaining the current view for Back (%s)", locale => {
  window.history.replaceState({ existing: true }, "", `/${locale}/dashboard/daily-digest?filter=keep`)
  const source = data(), href = `/${locale}/dashboard/manager-action-center?location=owned`
  source.digests[1]!.actions = [{ ...action, href }]
  render(<DailyHabitDigestDashboard data={source} locale={locale} />)
  fireEvent.click(screen.getByRole("button", { name: locale === "fr" ? "Responsable" : "Manager", exact: true }))
  fireEvent.click(screen.getByRole("button", { name: locale === "fr" ? "Pilotage" : "Command", exact: true }))
  const link = screen.getByRole("link", { name: locale === "fr" ? "Ouvrir" : "Open", exact: true })
  fireEvent.click(link)
  expect(mockPush).toHaveBeenCalledTimes(1)
  expect(mockPush).toHaveBeenCalledWith(href + "#top", { scroll: true })
  expect(link).toHaveAttribute("href", href)
  expect(window.location.search).toBe("?filter=keep&digest=manager&mode=command")
  expect(window.history.state).toEqual({ existing: true })
})

it.each([
  ["modified click", { ctrlKey: true }, {}],
  ["new tab", {}, { target: "_blank" }],
  ["download", {}, { download: "" }],
  ["specific fragment", {}, { href: "/en/dashboard/inventory#stock" }],
  ["external link", {}, { href: "https://example.invalid/dashboard" }],
] as const)("preserves native %s behavior", (_name, event, attributes) => {
  const source = data()
  source.digests[0]!.actions = [{ ...action, href: "/en/dashboard/inventory" }]
  render(<DailyHabitDigestDashboard data={source} locale="en" />)
  fireEvent.click(screen.getByRole("button", { name: "Command", exact: true }))
  const link = screen.getByRole("link", { name: "Open", exact: true })
  for (const [key, value] of Object.entries(attributes)) link.setAttribute(key, value)
  // Avoid jsdom's unsupported native navigation after the capture-phase check.
  link.addEventListener("click", click => click.preventDefault())
  fireEvent.click(link, event)
  expect(mockPush).not.toHaveBeenCalled()
})
