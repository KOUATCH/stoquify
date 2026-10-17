import { fireEvent, render, screen, within } from "@testing-library/react"
import type { SVGProps } from "react"
import Sidebar from "../Sidebar"

let mockPathname = "/en/dashboard/purchases/payables/prepare"
jest.mock("next/navigation", () => ({ usePathname: () => mockPathname }))
jest.mock("@/i18n/routing", () => ({ localizePath: (href: string, locale: string) => `/${locale}${href}` }))
jest.mock("@/lib/auth-client", () => ({ signOut: jest.fn() }))
jest.mock("@/components/NotificationMenu", () => ({ NotificationMenu: () => null }))
jest.mock("@/components/global/kit-logo", () => ({ __esModule: true, default: () => <span>Stoquify</span> }))
jest.mock("lucide-react", () => new Proxy({ __esModule: true }, {
  get(target, prop: string) {
    if (prop in target) return target[prop as keyof typeof target]
    return (props: SVGProps<SVGSVGElement>) => <svg {...props} />
  },
}))
const session = { user: { name: "Owned test", permissions: ["purchases.orders.read", "finance.payables.read", "purchasing.ap.invoice.view"] } }
const currentLinks = () => document.querySelectorAll('aside a[aria-current]')

describe("Sidebar current destination and disclosure", () => {
  beforeEach(() => { mockPathname = "/en/dashboard/purchases/payables/prepare" })

  it("uses the localized role label without granting navigation permissions", () => {
    mockPathname = "/fr/dashboard"
    render(<Sidebar session={{ user: { name: "Owned test", permissions: [], roles: [{ name: "Accountant", nameEn: "Accountant", nameFr: "Comptable", code: "ACCOUNTANT" }] } }} />)
    expect(screen.getByText("Comptable")).toBeVisible()
    expect(screen.queryByText("Accountant")).not.toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "AP Workbench" })).not.toBeInTheDocument()
  })

  it("marks the nearest authorized destination once without marking its overview ancestor", () => {
    render(<Sidebar session={session} />)
    expect(currentLinks()).toHaveLength(1)
    expect(currentLinks()[0]).toHaveAttribute("href", "/en/dashboard/purchases/payables")
    expect(currentLinks()[0]).toHaveAttribute("aria-current", "location")
    expect(screen.getByRole("link", { name: "Overview" })).not.toHaveAttribute("aria-current")
    expect(screen.getByRole("link", { name: "Overview" })).toHaveAttribute("data-active", "false")
  })

  it("allows closing and reopening the selected group and follows a changed route", () => {
    const { rerender } = render(<Sidebar session={session} />)
    const group = screen.getByRole("button", { name: "Purchases menu" })
    expect(group).toHaveAttribute("aria-expanded", "true")
    fireEvent.click(group)
    expect(group).toHaveAttribute("aria-expanded", "false")
    expect(screen.queryByRole("link", { name: "AP Workbench" })).not.toBeInTheDocument()
    fireEvent.click(group)
    expect(group).toHaveAttribute("aria-expanded", "true")
    fireEvent.click(group)
    mockPathname = "/en/dashboard/purchases/payables/history"
    rerender(<Sidebar session={session} />)
    expect(group).toHaveAttribute("aria-expanded", "true")
    expect(currentLinks()).toHaveLength(1)
    expect(currentLinks()[0]).toHaveAttribute("href", "/en/dashboard/purchases/payables/history")
    expect(currentLinks()[0]).toHaveAttribute("aria-current", "page")
  })

  it("does not promote an ancestor when search hides the actual selected destination", () => {
    render(<Sidebar session={session} />)
    fireEvent.change(screen.getByRole("textbox", { name: "Search navigation modules" }), { target: { value: "Overview" } })
    expect(screen.getByRole("link", { name: "Overview" })).toBeVisible()
    expect(currentLinks()).toHaveLength(0)
    fireEvent.change(screen.getByRole("textbox", { name: "Search navigation modules" }), { target: { value: "workbench" } })
    expect(currentLinks()).toHaveLength(1)
  })

  it("recomputes after permission and module visibility changes without retaining unauthorized destinations", () => {
    const { rerender } = render(<Sidebar session={session} />)
    rerender(<Sidebar session={{ user: { ...session.user, permissions: ["purchases.orders.read"] } }} />)
    expect(screen.queryByRole("link", { name: "AP Workbench" })).not.toBeInTheDocument()
    expect(currentLinks()).toHaveLength(1)
    expect(currentLinks()[0]).toHaveAttribute("href", "/en/dashboard/purchases")
    rerender(<Sidebar session={{ user: { ...session.user, moduleNavigation: { visibleModules: [], routes: [{prefix: "/dashboard/purchases", moduleSlug: "purchasing"}] } } }} />)
    // A partial snapshot leaves unrelated /purchase-orders destinations under the existing policy.
    expect(screen.queryByRole("link", { name: "AP Workbench" })).not.toBeInTheDocument()
    expect(currentLinks()).toHaveLength(0)
    rerender(<Sidebar session={{ user: { ...session.user, moduleNavigation: { visibleModules: [], routes: [{prefix: "/dashboard/purchases", moduleSlug: "purchasing"}, {prefix: "/dashboard/purchase-orders", moduleSlug: "purchasing"}] } } }} />)
    expect(screen.queryByRole("button", { name: "Purchases menu" })).not.toBeInTheDocument()
    expect(currentLinks()).toHaveLength(0)
  })

  it("keeps exact French history selection and provides no current marker for an unknown path", () => {
    mockPathname = "/fr/dashboard/purchases/payables/history"
    const { rerender } = render(<Sidebar session={session} />)
    expect(currentLinks()).toHaveLength(1)
    expect(currentLinks()[0]).toHaveAttribute("href", "/fr/dashboard/purchases/payables/history")
    expect(within(currentLinks()[0] as HTMLElement).getByText("Historique fournisseurs")).toBeVisible()
    mockPathname = "/fr/dashboard/unregistered-destination"
    rerender(<Sidebar session={session} />)
    expect(currentLinks()).toHaveLength(0)
  })
})
