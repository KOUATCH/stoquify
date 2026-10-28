export type AssuranceRouteSurfaceModule = {
  moduleLockedTitle?: string
  moduleLockedMessage?: string
  moduleLockedPrimaryHref?: string
}

export type PermissionMode = "single" | "all" | "any"

export type AssuranceRouteSurface = {
  key: string
  route: string
  title: string
  resource: string
  permissions: readonly string[]
  permissionMode?: PermissionMode
  module?: AssuranceRouteSurfaceModule
  modules?: AssuranceRouteSurfaceModule[]
  noActiveOrgTitle?: string
  noActiveOrgMessage?: string
  permissionDeniedTitle?: string
  permissionDeniedMessage?: string
  noActiveOrgPrimaryHref?: string
  permissionDeniedPrimaryHref?: string
}

export const assuranceRouteCatalog: AssuranceRouteSurface[] = [
  {
    key: "assurance-control-tower",
    route: "/dashboard/assurance/control-tower",
    title: "Assurance control tower",
    resource: "WorkflowAssuranceControlTower",
    permissions: ["controls.audit.read"],
  },
  {
    key: "assurance-control-tower-incident",
    route: "/dashboard/assurance/control-tower/incidents/[incidentId]",
    title: "Assurance control tower incident",
    resource: "WorkflowAssuranceControlTower",
    permissions: ["controls.audit.read"],
  },
]

export const assuranceRouteMap: Record<string, AssuranceRouteSurface> = Object.fromEntries(
  assuranceRouteCatalog.map((entry) => [entry.key, entry]),
)

export const assuranceRouteByRoute: Record<string, AssuranceRouteSurface> = Object.fromEntries(
  assuranceRouteCatalog.map((entry) => [entry.route, entry]),
)

const assuranceSurfaceByResource: Record<string, AssuranceRouteSurface> = Object.fromEntries(
  assuranceRouteCatalog.map((entry) => [entry.resource, entry]),
)

export function getAssuranceRouteSurface(key: string) {
  return assuranceRouteMap[key]
}

export function getAssuranceRouteSurfaceByRoute(route: string) {
  return assuranceRouteByRoute[route]
}

export function getAssuranceRouteSurfaceByResource(resource: string) {
  return assuranceSurfaceByResource[resource]
}
