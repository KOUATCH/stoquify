export type CashDrawerRouteSurface = {
  key: string
  route: string
  title: string
  resource: string
  permissions: readonly string[]
  permissionMode?: "single" | "all" | "any"
}

export const cashDrawerRouteCatalog: CashDrawerRouteSurface[] = [
  {
    key: "cash-drawer-legacy-redirect",
    route: "/dashboard/cashDrawer",
    title: "Cash drawer",
    resource: "LegacyCashDrawerRedirect",
    permissions: ["finance.cash-drawer.read", "finance.read"],
    permissionMode: "any",
  },
]

export const cashDrawerRouteMap: Record<string, CashDrawerRouteSurface> = Object.fromEntries(
  cashDrawerRouteCatalog.map((entry) => [entry.key, entry]),
)

export const cashDrawerRouteByRoute: Record<string, CashDrawerRouteSurface> = Object.fromEntries(
  cashDrawerRouteCatalog.map((entry) => [entry.route, entry]),
)

const cashDrawerSurfaceByResource: Record<string, CashDrawerRouteSurface> = Object.fromEntries(
  cashDrawerRouteCatalog.map((entry) => [entry.resource, entry]),
)

export function getCashDrawerRouteSurface(key: string) {
  return cashDrawerRouteMap[key]
}

export function getCashDrawerRouteSurfaceByRoute(route: string) {
  return cashDrawerRouteByRoute[route]
}

export function getCashDrawerRouteSurfaceByResource(resource: string) {
  return cashDrawerSurfaceByResource[resource]
}

export const cashDrawerRouteCatalogConst = cashDrawerRouteCatalog

