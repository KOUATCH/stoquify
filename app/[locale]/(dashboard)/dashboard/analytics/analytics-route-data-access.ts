export type AnalyticsRouteSurfaceModule = {
  moduleLockedTitle?: string
  moduleLockedMessage?: string
  moduleLockedPrimaryHref?: string
}

export type PermissionMode = "single" | "all" | "any"

export type AnalyticsRouteSurface = {
  key: string
  route: string
  title: string
  resource: string
  permissions: readonly string[]
  permissionMode?: PermissionMode
  module?: AnalyticsRouteSurfaceModule
  modules?: AnalyticsRouteSurfaceModule[]
  noActiveOrgTitle?: string
  noActiveOrgMessage?: string
  permissionDeniedTitle?: string
  permissionDeniedMessage?: string
  noActiveOrgPrimaryHref?: string
  permissionDeniedPrimaryHref?: string
}

export const analyticsRouteCatalog: AnalyticsRouteSurface[] = [
  {
    key: "analytics-dashboard",
    route: "/dashboard/analytics",
    title: "Analytics dashboard",
    resource: "BusinessPulseAnalytics",
    permissions: ["reports.read", "dashboard.read"],
    permissionMode: "any",
  },
  {
    key: "analytics-reports",
    route: "/dashboard/analytics/reports",
    title: "Analytics reports",
    resource: "AnalyticsReports",
    permissions: ["reports.read"],
  },
  {
    key: "analytics-referrals",
    route: "/dashboard/analytics/referrals",
    title: "Referral funnel",
    resource: "ReferralFunnel",
    permissions: ["analytics.read"],
  },
]

export const analyticsRouteMap: Record<string, AnalyticsRouteSurface> = Object.fromEntries(
  analyticsRouteCatalog.map((entry) => [entry.key, entry]),
)

export const analyticsRouteByRoute: Record<string, AnalyticsRouteSurface> = Object.fromEntries(
  analyticsRouteCatalog.map((entry) => [entry.route, entry]),
)

const analyticsSurfaceByResource: Record<string, AnalyticsRouteSurface> = Object.fromEntries(
  analyticsRouteCatalog.map((entry) => [entry.resource, entry]),
)

export function getAnalyticsRouteSurface(key: string) {
  return analyticsRouteMap[key]
}

export function getAnalyticsRouteSurfaceByRoute(route: string) {
  return analyticsRouteByRoute[route]
}

export function getAnalyticsRouteSurfaceByResource(resource: string) {
  return analyticsSurfaceByResource[resource]
}
