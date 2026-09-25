export type DailyDigestRouteSurface = {
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
}

export const dailyDigestRouteCatalog: DailyDigestRouteSurface[] = [
  {
    key: "daily-digest",
    route: "/dashboard/daily-digest",
    title: "Daily Digest",
    resource: "KontavaDailyHabitDigest",
    permissions: ["dashboard.read", "finance.read", "accounting.close.read", "inventory.read", "analytics.read"],
    permissionMode: "any",
    noActiveOrgPrimaryHref: "/dashboard",
    permissionDeniedPrimaryHref: "/dashboard",
  },
]

export const dailyDigestRouteMap: Record<string, DailyDigestRouteSurface> = Object.fromEntries(
  dailyDigestRouteCatalog.map((entry) => [entry.key, entry]),
)

export const dailyDigestRouteByRoute: Record<string, DailyDigestRouteSurface> = Object.fromEntries(
  dailyDigestRouteCatalog.map((entry) => [entry.route, entry]),
)

const dailyDigestSurfaceByResource: Record<string, DailyDigestRouteSurface> = Object.fromEntries(
  dailyDigestRouteCatalog.map((entry) => [entry.resource, entry]),
)

export function getDailyDigestRouteSurface(key: string) {
  return dailyDigestRouteMap[key]
}

export function getDailyDigestRouteSurfaceByRoute(route: string) {
  return dailyDigestRouteByRoute[route]
}

export function getDailyDigestRouteSurfaceByResource(resource: string) {
  return dailyDigestSurfaceByResource[resource]
}
