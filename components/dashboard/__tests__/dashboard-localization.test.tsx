import { fireEvent, render, screen } from "@testing-library/react"
import type { SVGProps } from "react"
import { DashboardRouteState, type DashboardRouteStateKind } from "../DashboardRouteState"
import { DashboardErrorState } from "../DashboardErrorState"
import { dashboardSharedCopy, localizeSidebarLinks, navigationLabel, recoveryLabel } from "@/lib/dashboard/presentation"
import { filterSidebarLinksByPermission, findSidebarActiveContext, searchSidebarLinks, sidebarLinks, sidebarSections } from "@/config/sidebar"

jest.mock("lucide-react", () => new Proxy({ __esModule: true }, {
  get(target, prop: string) {
    if (prop in target) return target[prop as keyof typeof target]
    return (props: SVGProps<SVGSVGElement>) => <svg {...props} />
  },
}))

describe("Shared dashboard localization", () => {
  it.each(Object.keys(dashboardSharedCopy.fr.states) as DashboardRouteStateKind[])("provides French %s recovery without a translation provider", kind => {
    render(<DashboardRouteState kind={kind} primaryHref="/fr/dashboard/purchases/payables" />)
    expect(screen.getByRole("heading", { name: dashboardSharedCopy.fr.states[kind].defaultTitle })).toBeVisible()
    expect(screen.getByText(dashboardSharedCopy.fr.states[kind].eyebrow)).toBeVisible()
    expect(screen.getByRole("link", { name: "Retour aux dettes fournisseurs" })).toHaveAttribute("href", "/fr/dashboard/purchases/payables")
    expect(screen.queryByRole("link", { name: "Back to dashboard" })).not.toBeInTheDocument()
  })
  it("retains custom safe copy and explicit locale for unprefixed destinations", () => {
    render(<DashboardRouteState kind="permission_denied" locale="fr" title="Accès aux factures refusé" primaryHref="/dashboard" />)
    expect(screen.getByRole("heading", { name: "Accès aux factures refusé" })).toBeVisible()
    expect(screen.getByRole("link", { name: "Retour au tableau de bord" })).toHaveAttribute("href", "/dashboard")
    expect(recoveryLabel("/fr/dashboard/settings?next=1", "fr")).toBe("Retour à l’espace de travail")
  })
  it("localizes a safe retry and never renders the internal exception", () => {
    const log = jest.spyOn(console, "error").mockImplementation(() => {})
    const reset = jest.fn()
    try {
      render(<DashboardErrorState error="private SQL account connection" reset={reset} dashboardHref="/fr/dashboard" />)
      expect(screen.getByRole("heading", { name: "Impossible de charger cette page" })).toBeVisible()
      fireEvent.click(screen.getByRole("button", { name: "Réessayer" }))
      expect(reset).toHaveBeenCalledTimes(1)
      expect(screen.getByRole("link", { name: "Ouvrir le centre de pilotage" })).toHaveAttribute("href", "/fr/dashboard")
      expect(screen.queryByText(/private SQL/)).not.toBeInTheDocument()
    } finally { log.mockRestore() }
  })
  it("covers current catalogue labels and descriptions in both message catalogues", () => {
    const entries = [...sidebarSections, ...sidebarLinks, ...sidebarLinks.flatMap(link => link.dropdownMenu ?? [])]
    for (const entry of entries) for (const text of [entry.title, entry.description].filter(Boolean) as string[]) {
      expect(dashboardSharedCopy.en.navigation).toHaveProperty(text)
      expect(dashboardSharedCopy.fr.navigation).toHaveProperty(text)
    }
  })
  it("translates the permitted read model, preserving routes and module/permission metadata", () => {
    const filtered = filterSidebarLinksByPermission(sidebarLinks, p => p === "finance.payables.read")
    const before = JSON.stringify(filtered)
    const localized = localizeSidebarLinks(filtered, "fr")
    const authority = (links: typeof sidebarLinks) => links.map(({title: _title, description: _description, dropdownMenu, ...link}) => ({...link, dropdownMenu: dropdownMenu?.map(({title: _t, description: _d, ...item}) => item)}))
    expect(authority(localized)).toEqual(authority(filtered))
    expect(JSON.stringify(filtered)).toBe(before)
    expect(searchSidebarLinks(localized, "dettes").length).toBeGreaterThan(0)
    expect(localizeSidebarLinks([], "fr")).toEqual([])
    expect(navigationLabel("Unregistered custom destination", "fr")).toBe("Unregistered custom destination")
  })
  it("uses the most specific authorized destination for nested work and retained history", () => {
    const links = localizeSidebarLinks(sidebarLinks, "fr")
    expect(findSidebarActiveContext(links, "/dashboard/purchases/payables/prepare")?.child?.title).toBe("Gestion des dettes fournisseurs")
    expect(findSidebarActiveContext(links, "/dashboard/purchases/payables/history")?.child?.title).toBe("Historique fournisseurs")
    expect(findSidebarActiveContext([], "/dashboard/purchases/payables/history")).toBeNull()
  })
})
