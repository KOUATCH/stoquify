import type { CommercialModuleSlug, ModuleAccessIntent } from "@/services/modules/module-control-contracts"

export type SalesRouteSurfaceModule = {
  moduleSlug: CommercialModuleSlug
  surface: string
  accessIntent?: ModuleAccessIntent
  mode?: "observe" | "enforce"
  moduleLockedTitle?: string
  moduleLockedMessage?: string
}

export type SalesRouteSurface = {
  key: string
  route: string
  title: string
  resource: string
  permissions: readonly string[]
  permissionMode?: "single" | "all" | "any"
  module?: SalesRouteSurfaceModule
  noActiveOrgTitle?: string
  noActiveOrgMessage?: string
  permissionDeniedTitle?: string
  permissionDeniedMessage?: string
  noActiveOrgPrimaryHref?: string
  permissionDeniedPrimaryHref?: string
}

export const salesRouteCatalog: SalesRouteSurface[] = [
  {
    key: "sales-dashboard",
    route: "/dashboard/sales",
    title: "Sales dashboard",
    resource: "SalesDashboard",
    permissions: ["sales.read"],
    permissionMode: "single",
    module: {
      moduleSlug: "sales",
      surface: "/dashboard/sales",
      accessIntent: "read",
      mode: "observe",
      moduleLockedTitle: "Sales module is not enabled for this organization",
      moduleLockedMessage:
        "Enable the sales module so this dashboard can display order, customer, and transaction evidence.",
    },
    noActiveOrgTitle: "Sales dashboard needs an active organization",
    noActiveOrgMessage:
      "Refresh your session from the dashboard so sales can load tenant-scoped order and customer data.",
    permissionDeniedTitle: "Sales dashboard is not available for this role",
    permissionDeniedMessage:
      "Viewing sales requires sales read access. The denial was recorded by the RBAC guard.",
    noActiveOrgPrimaryHref: "/dashboard",
    permissionDeniedPrimaryHref: "/dashboard",
  },
]

export const salesRouteMap: Record<string, SalesRouteSurface> = Object.fromEntries(
  salesRouteCatalog.map((entry) => [entry.key, entry]),
)

export const salesRouteByRoute: Record<string, SalesRouteSurface> = Object.fromEntries(
  salesRouteCatalog.map((entry) => [entry.route, entry]),
)

const salesSurfaceByResource: Record<string, SalesRouteSurface> = Object.fromEntries(
  salesRouteCatalog.map((entry) => [entry.resource, entry]),
)

export function getSalesRouteSurface(key: string) {
  return salesRouteMap[key]
}

export function getSalesRouteSurfaceByRoute(route: string) {
  return salesRouteByRoute[route]
}

export function getSalesRouteSurfaceByResource(resource: string) {
  return salesSurfaceByResource[resource]
}
