import { act, fireEvent, render, screen } from "@testing-library/react"
import { ManagerLocationActionCenterDashboard } from "../ManagerLocationActionCenterDashboard"
import { buildLocationData } from "./manager-location-fixtures"

function renderDashboard(data = buildLocationData(), locale: "en" | "fr" = "en") {
  return render(<ManagerLocationActionCenterDashboard data={data} locale={locale} title="Manager Action Center" subtitle="Branch work" />)
}

describe("Location-scoped manager modes", () => {
  it("separates modes, preserves daily-close scope and restores the permitted location", () => {
    window.history.replaceState({}, "", "?mode=investigate&location=location-central")
    renderDashboard()
    expect(screen.getByRole("region", {name: "Central Store: Investigate"})).toBeInTheDocument()
    expect(screen.getByRole("heading", {name: "Branch evidence is blocked"})).toBeVisible()
    expect(screen.getByRole("link", {name: "Open daily close: Central Store"})).toHaveAttribute("href", "/en/dashboard/manager-action-center/daily-close?locationId=location-central")
    fireEvent.click(screen.getByRole("button", {name: "Command", exact: true}))
    expect(screen.queryByRole("heading", {name: "Supported branch metrics"})).not.toBeInTheDocument()
    expect(screen.getByText("1 authorized actions loaded · 1 matching filters · 1 shown")).toBeVisible()
    fireEvent.mouseDown(screen.getByRole("tab", {name: /Coastal Outlet.*BR-02/}), {button: 0, ctrlKey: false})
    expect(screen.getByText("No permitted actions are available in this scope.")).toBeVisible()
    expect(document.querySelector('[data-location-id="location-central"]')).toBeNull()
    expect(window.location.search).toContain("location=location-coastal")
    act(() => { window.history.replaceState({}, "", "?mode=brief&location=location-central"); window.dispatchEvent(new PopStateEvent("popstate")) })
    expect(screen.getByRole("region", {name: "Central Store: Brief"})).toBeInTheDocument()
    expect(screen.getByText("1 priorities shown / 1 authorized actions loaded")).toBeVisible()
  })

  it("does not widen unauthorized URLs and clears a revoked location on refreshed scope", () => {
    window.history.replaceState({}, "", "?mode=command&location=unauthorized&role=admin")
    const data = buildLocationData()
    const result = renderDashboard(data)
    expect(window.location.search).not.toContain("unauthorized")
    expect(screen.getByRole("tab", {name: /Central Store.*BR-01/})).toHaveAttribute("aria-selected", "true")
    result.rerender(<ManagerLocationActionCenterDashboard data={{...data, scope: {kind: "LOCATIONS", locationIds: ["location-coastal"]}, bundles: [data.bundles[1]]}} locale="en" title="Manager" subtitle="Branch work" />)
    expect(screen.queryByRole("tab", {name: /Central Store/})).not.toBeInTheDocument()
    expect(window.location.search).toContain("location-coastal")
    expect(document.querySelector('[data-location-id="location-central"]')).toBeNull()
  })

  it("makes 25 branch actions reachable and resets the page when the location changes", () => {
    const data = buildLocationData()
    const item = data.bundles[0].actionQueue.actionItems[0]
    data.bundles[0].actionQueue.actionItems = Array.from({length: 25}, (_, i) => ({...item, id: `branch-${i}`, title: `Branch ${i}`}))
    window.history.replaceState({}, "", "?mode=command")
    renderDashboard(data)
    const names: string[] = []
    for (let page = 1; page <= 3; page++) {
      names.push(...Array.from(document.querySelectorAll('#manager-queue-title ~ div details > summary')).map(node => node.textContent!.split(" — ")[0]))
      if (page < 3) fireEvent.click(screen.getByRole("button", {name: "Next page"}))
    }
    expect(names).toEqual(Array.from({length: 25}, (_, i) => `Branch ${i}`))
    fireEvent.mouseDown(screen.getByRole("tab", {name: /Coastal Outlet.*BR-02/}), {button: 0, ctrlKey: false})
    expect(screen.getByText("Page 1 / 1")).toBeVisible()
  })

  it("keeps French modes, hidden-work notice and source links within the branch", () => {
    renderDashboard(buildLocationData(), "fr")
    expect(screen.getByRole("region", {name: "Central Store: Synthèse"})).toBeInTheDocument()
    expect(screen.getByText("1 masquees par permission")).toBeVisible()
    expect(screen.getByRole("link", {name: "Ouvrir la cloture quotidienne: Central Store"})).toHaveAttribute("href", "/fr/dashboard/manager-action-center/daily-close?locationId=location-central")
    fireEvent.click(screen.getByRole("button", {name: "Voir toute la file"}))
    expect(screen.getByRole("region", {name: "Central Store: Actions"})).toBeInTheDocument()
    const details = document.querySelector('#manager-queue-title ~ div details')!; details.setAttribute("open", "")
    expect(screen.getByRole("link", {name: /Ouvrir l.action:/})).toHaveAttribute("href", expect.stringMatching(/^\/fr\//))
  })

  it.each(["en", "fr"] as const)("keeps the explicit empty scope for %s", locale => {
    renderDashboard({...buildLocationData(), scope: {kind: "LOCATIONS", locationIds: []}, bundles: []}, locale)
    expect(screen.getByRole("heading", {name: locale === "fr" ? "Aucun site gere n'est disponible" : "No managed location is available"})).toBeVisible()
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument()
  })
})
