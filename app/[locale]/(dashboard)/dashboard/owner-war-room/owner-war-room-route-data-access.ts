export type OwnerWarRoomRouteSurface = {
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

export const ownerWarRoomRouteCatalog: OwnerWarRoomRouteSurface[] = [
  {
    key: "owner-war-room",
    route: "/dashboard/owner-war-room",
    title: "Owner War Room",
    resource: "KontavaOwnerWarRoom",
    permissions: ["dashboard.read"],
    permissionMode: "single",
    noActiveOrgTitle: "Owner War Room needs an active organization",
    noActiveOrgMessage:
      "Refresh your session from the dashboard so the command center can load tenant-scoped evidence.",
    permissionDeniedTitle: "Owner War Room is not available for this role",
    permissionDeniedMessage:
      "This read-only tenant command center requires administrator-wide operating authority. The denial was recorded by the RBAC guard.",
    noActiveOrgPrimaryHref: "/dashboard",
    permissionDeniedPrimaryHref: "/dashboard",
  },
]

export const ownerWarRoomRouteMap: Record<string, OwnerWarRoomRouteSurface> = Object.fromEntries(
  ownerWarRoomRouteCatalog.map((entry) => [entry.key, entry]),
)

export const ownerWarRoomRouteByRoute: Record<string, OwnerWarRoomRouteSurface> = Object.fromEntries(
  ownerWarRoomRouteCatalog.map((entry) => [entry.route, entry]),
)

const ownerWarRoomSurfaceByResource: Record<string, OwnerWarRoomRouteSurface> = Object.fromEntries(
  ownerWarRoomRouteCatalog.map((entry) => [entry.resource, entry]),
)

export function getOwnerWarRoomRouteSurface(key: string) {
  return ownerWarRoomRouteMap[key]
}

export function getOwnerWarRoomRouteSurfaceByRoute(route: string) {
  return ownerWarRoomRouteByRoute[route]
}

export function getOwnerWarRoomRouteSurfaceByResource(resource: string) {
  return ownerWarRoomSurfaceByResource[resource]
}
