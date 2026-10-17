import { fireEvent, render, screen } from "@testing-library/react"
import type { SVGProps } from "react"
import { DashboardMobileNavigation } from "../DashboardMobileNavigation"
import { filterSidebarLinksByPermission, getSidebarSections, searchSidebarLinks, sidebarLinks } from "@/config/sidebar"
import { localizeSidebarLinks } from "@/lib/dashboard/presentation"

jest.mock("@/i18n/routing", () => ({ localizePath: (href: string, locale: string) => `/${locale}${href}` }))
jest.mock("lucide-react", () => new Proxy({ __esModule: true }, {
  get: (_target, key) => key === "__esModule" ? true : (props: SVGProps<SVGSVGElement>) => <svg {...props} />,
}))

const permitted = () => filterSidebarLinksByPermission(sidebarLinks, p => p === "finance.payables.read")

it("starts with the active module expanded and keeps other modules keyboard-disclosable", () => {
  const onNavigate = jest.fn()
  const { container } = render(<DashboardMobileNavigation sections={getSidebarSections(permitted())} locale="en"
    activeHref="/dashboard/purchases/payables" pathname="/dashboard/purchases/payables" searching={false} onNavigate={onNavigate} />)
  const purchases = screen.getByText("Purchases").closest("details")!
  const finance = screen.getByText("Finance").closest("details")!
  expect(purchases.open).toBe(true)
  expect(finance.open).toBe(false)
  expect(container.querySelectorAll('a[aria-current="page"]')).toHaveLength(1)
  fireEvent.click(screen.getByText("Finance"))
  expect(finance.open).toBe(true)
  fireEvent.click(screen.getByRole("link", { name: "Payables", exact: true }))
  expect(onNavigate).toHaveBeenCalledTimes(1)
  expect(screen.queryByText("Inventory")).not.toBeInTheDocument()
})

it("opens French search results and removes destinations when authority changes", () => {
  const links = localizeSidebarLinks(permitted(), "fr")
  const sections = getSidebarSections(searchSidebarLinks(links, "dettes"))
  const { container, rerender } = render(<DashboardMobileNavigation sections={sections} locale="fr" pathname="/dashboard"
    searching onNavigate={jest.fn()} />)
  expect([...container.querySelectorAll("details")].every(d => d.open)).toBe(true)
  expect([...container.querySelectorAll("a")].every(a => a.getAttribute("href")?.startsWith("/fr/"))).toBe(true)
  expect(screen.getByRole("navigation", { name: "Navigation mobile du tableau de bord" })).toBeVisible()
  rerender(<DashboardMobileNavigation sections={[]} locale="fr" pathname="/dashboard" searching onNavigate={jest.fn()} />)
  expect(container.querySelectorAll("a")).toHaveLength(0)
  expect(screen.getByRole("status")).toHaveTextContent("Aucun module")
})
