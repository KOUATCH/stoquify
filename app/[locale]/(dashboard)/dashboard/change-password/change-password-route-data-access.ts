export type PermissionMode = "single" | "all" | "any"

export type ChangePasswordRouteSurface = {
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

export const changePasswordRouteCatalog: ChangePasswordRouteSurface[] = [
  {
    key: "change-password",
    route: "/dashboard/change-password",
    title: "Change password",
    resource: "ChangePasswordPage",
    permissions: ["profile.password.update"],
    permissionMode: "single",
    noActiveOrgTitle: "Change password needs an active organization",
    permissionDeniedTitle: "Change password is not available for this role",
    permissionDeniedMessage: "Ask your administrator for permission to update your own password.",
  },
]

export const changePasswordRouteMap: Record<string, ChangePasswordRouteSurface> = Object.fromEntries(
  changePasswordRouteCatalog.map((entry) => [entry.key, entry]),
)

export const changePasswordRouteByRoute: Record<string, ChangePasswordRouteSurface> = Object.fromEntries(
  changePasswordRouteCatalog.map((entry) => [entry.route, entry]),
)

const changePasswordSurfaceByResource: Record<string, ChangePasswordRouteSurface> = Object.fromEntries(
  changePasswordRouteCatalog.map((entry) => [entry.resource, entry]),
)

export function getChangePasswordRouteSurface(key: string) {
  return changePasswordRouteMap[key]
}

export function getChangePasswordRouteSurfaceByRoute(route: string) {
  return changePasswordRouteByRoute[route]
}

export function getChangePasswordRouteSurfaceByResource(resource: string) {
  return changePasswordSurfaceByResource[resource]
}
