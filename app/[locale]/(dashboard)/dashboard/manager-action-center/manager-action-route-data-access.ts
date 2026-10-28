import type { Locale } from "@/types/bilingual"

export type ManagerActionRouteSurface = {
  key: string
  route: string
  title: string
  resource: string
  permissions: readonly string[]
  permissionMode?: "single" | "all" | "any"
  noActiveOrgTitle?: string
  noActiveOrgMessage?: string
  permissionDeniedTitle?: string
  permissionDeniedMessage?: string
  noActiveOrgPrimaryHref?: string
  permissionDeniedPrimaryHref?: string
  locale?: Locale
}

export const managerActionRouteCatalog: ManagerActionRouteSurface[] = [
  {
    key: "manager-action-center",
    route: "/dashboard/manager-action-center",
    title: "Manager Action Center",
    resource: "KontavaManagerActionCenter",
    permissions: ["dashboard.read"],
    noActiveOrgTitle: "Manager Action Center needs an active organization",
    noActiveOrgMessage: "Refresh your session from the dashboard so the action center can load tenant-scoped operating work.",
    permissionDeniedTitle: "Manager Action Center is not available for this role",
    permissionDeniedMessage: "This action center requires dashboard access. The denial was recorded by the RBAC guard.",
    noActiveOrgPrimaryHref: "/dashboard",
    permissionDeniedPrimaryHref: "/dashboard",
    locale: "en",
  },
  {
    key: "manager-action-center-daily-close",
    route: "/dashboard/manager-action-center/daily-close",
    title: "Branch daily close workspace",
    resource: "BranchDailyCloseWorkspace",
    permissions: ["dashboard.read"],
    noActiveOrgTitle: "Branch daily close needs an active organization",
    permissionDeniedTitle: "Manager Action Center is not available for this role",
    permissionDeniedMessage: "This branch close workspace is unavailable for your role.",
    noActiveOrgPrimaryHref: "/dashboard",
    permissionDeniedPrimaryHref: "/dashboard",
    locale: "en",
  },
]

export const managerActionRouteMap: Record<string, ManagerActionRouteSurface> = Object.fromEntries(
  managerActionRouteCatalog.map((entry) => [entry.key, entry]),
)

export const managerActionRouteByRoute: Record<string, ManagerActionRouteSurface> = Object.fromEntries(
  managerActionRouteCatalog.map((entry) => [entry.route, entry]),
)

export function getManagerActionRouteSurface(key: string) {
  return managerActionRouteMap[key]
}

export function getManagerActionRouteSurfaceByRoute(route: string) {
  return managerActionRouteByRoute[route]
}
