import { filterSidebarLinksByPermission, type ISidebarLink } from "@/config/sidebar"
import { moduleVisibleInNavigation, type ModuleNavigationSnapshot } from "@/lib/modules/navigation"

jest.mock("lucide-react", () => new Proxy({}, { get: () => () => null }))

const snapshot: ModuleNavigationSnapshot = { visibleModules: ["dashboard", "payment_reconciliation"], routes: [
  { prefix: "/dashboard", moduleSlug: "dashboard" },
  { prefix: "/dashboard/finance", moduleSlug: "finance" },
  { prefix: "/dashboard/finance/reconciliation", moduleSlug: "payment_reconciliation" },
] }
const canShow = (item: { href?: string; moduleSlug?: string }) => moduleVisibleInNavigation(snapshot, item)

describe("workspace navigation", () => {
  it("matches the most specific route and strips locale prefixes", () => {
    expect(canShow({ href: "/fr/dashboard/finance/reconciliation" })).toBe(true)
    expect(canShow({ href: "/en/dashboard/finance" })).toBe(false)
    expect(canShow({ href: "/dashboard/finance/other" })).toBe(false)
  })
  it("honors explicit module ownership for a shared route", () => {
    expect(canShow({ href: "/dashboard/finance/reconciliation", moduleSlug: "finance" })).toBe(false)
  })
  it("does not apply a route prefix to a similarly named sibling", () => {
    expect(canShow({ href: "/dashboard/finance-tools" })).toBe(true)
  })
  it("preserves callers that have no workspace snapshot", () => {
    expect(moduleVisibleInNavigation(undefined, { href: "/dashboard/finance" })).toBe(true)
  })
  const links: ISidebarLink[] = [{ title: "Finance", href: "/dashboard/finance", permission: "finance.read", icon: (() => null) as ISidebarLink["icon"], dropdown: true, dropdownMenu: [
    { title: "Reconciliation", href: "/dashboard/finance/reconciliation", permission: "payments.reconciliation.read" },
    { title: "Other", href: "/dashboard/finance/other", permission: "finance.read" },
  ] }]
  it("retains an authorized child without giving it its parent's destination", () => {
    const result = filterSidebarLinksByPermission(links, () => true, canShow)
    expect(result).toHaveLength(1)
    expect(result[0].href).toBeUndefined()
    expect(result[0].dropdownMenu?.map((item) => item.title)).toEqual(["Reconciliation"])
  })
  it("keeps RBAC effective even for selected capabilities", () => {
    expect(filterSidebarLinksByPermission(links, () => false, canShow)).toEqual([])
    expect(filterSidebarLinksByPermission(links, (permission) => permission === "finance.read", canShow)).toEqual([])
  })
})
