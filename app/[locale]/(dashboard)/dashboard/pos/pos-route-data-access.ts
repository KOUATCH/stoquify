export type PermissionMode = "single" | "all" | "any"

export type PosRouteSurface = {
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

export const posRouteCatalog: PosRouteSurface[] = [
  {
    key: "pos-dashboard",
    route: "/dashboard/pos",
    title: "POS",
    resource: "POSPage",
    permissions: ["OPERATE_POS"],
    permissionMode: "single",
    noActiveOrgTitle: "POS dashboard needs an active organization",
    permissionDeniedTitle: "POS dashboard is not available for this role",
    permissionDeniedMessage: "POS access requires OPERATE_POS permission.",
  },
]

export const posRouteMap: Record<string, PosRouteSurface> = Object.fromEntries(
  posRouteCatalog.map((entry) => [entry.key, entry]),
)

export const posRouteByRoute: Record<string, PosRouteSurface> = Object.fromEntries(
  posRouteCatalog.map((entry) => [entry.route, entry]),
)

const posSurfaceByResource: Record<string, PosRouteSurface> = Object.fromEntries(
  posRouteCatalog.map((entry) => [entry.resource, entry]),
)

export function getPosRouteSurface(key: string) {
  return posRouteMap[key]
}

export function getPosRouteSurfaceByRoute(route: string) {
  return posRouteByRoute[route]
}

export function getPosRouteSurfaceByResource(resource: string) {
  return posSurfaceByResource[resource]
}
