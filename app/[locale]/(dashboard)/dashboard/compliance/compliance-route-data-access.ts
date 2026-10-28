export type PermissionMode = "single" | "all" | "any"

export type ComplianceRouteSurface = {
  key: string
  route: string
  title: string
  resource: string
  permissions: readonly string[]
  permissionMode?: PermissionMode
  module?: never
  noActiveOrgTitle?: string
  noActiveOrgMessage?: string
  permissionDeniedTitle?: string
  permissionDeniedMessage?: string
  noActiveOrgPrimaryHref?: string
  permissionDeniedPrimaryHref?: string
}

export const complianceRouteCatalog: ComplianceRouteSurface[] = [
  {
    key: "compliance-dashboard",
    route: "/dashboard/compliance",
    title: "Compliance dashboard",
    resource: "ComplianceCenterPage",
    permissions: ["compliance.documents.read"],
    permissionMode: "single",
    noActiveOrgTitle: "Compliance dashboard needs an active organization",
    permissionDeniedTitle: "Compliance dashboard is not available for this role",
    permissionDeniedMessage: "This surface requires access to compliance documents.",
  },
]

export const complianceRouteMap: Record<string, ComplianceRouteSurface> = Object.fromEntries(
  complianceRouteCatalog.map((entry) => [entry.key, entry]),
)

export const complianceRouteByRoute: Record<string, ComplianceRouteSurface> = Object.fromEntries(
  complianceRouteCatalog.map((entry) => [entry.route, entry]),
)

const complianceSurfaceByResource: Record<string, ComplianceRouteSurface> = Object.fromEntries(
  complianceRouteCatalog.map((entry) => [entry.resource, entry]),
)

export function getComplianceRouteSurface(key: string) {
  return complianceRouteMap[key]
}

export function getComplianceRouteSurfaceByRoute(route: string) {
  return complianceRouteByRoute[route]
}

export function getComplianceRouteSurfaceByResource(resource: string) {
  return complianceSurfaceByResource[resource]
}
