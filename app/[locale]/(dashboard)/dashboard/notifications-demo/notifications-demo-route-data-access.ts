import type { CommercialModuleSlug } from "@/services/modules/module-control-contracts"

export type NotificationsDemoRouteSurface = {
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
  module?: {
    moduleSlug: CommercialModuleSlug
    surface: string
    accessIntent?: "read" | "write"
    mode?: "observe" | "enforce"
    moduleLockedTitle?: string
    moduleLockedMessage?: string
  }
}

export const notificationsDemoRouteCatalog: NotificationsDemoRouteSurface[] = [
  {
    key: "notifications-demo",
    route: "/dashboard/notifications-demo",
    title: "Notification demo",
    resource: "NotificationSystemDemo",
    permissions: ["communication.notifications.read"],
    permissionMode: "single",
    noActiveOrgTitle: "Notification demo needs an active organization",
    noActiveOrgMessage: "Refresh your session from the dashboard so notification diagnostics can load tenant-scoped settings.",
    permissionDeniedTitle: "Notification demo is not available for this role",
    permissionDeniedMessage:
      "Viewing notification diagnostics requires notification settings read access. The denial was recorded by the RBAC guard.",
    noActiveOrgPrimaryHref: "/dashboard",
    permissionDeniedPrimaryHref: "/dashboard/settings/notifications",
    module: {
      moduleSlug: "settings",
      surface: "/dashboard/notifications-demo",
      accessIntent: "read",
      mode: "observe",
      moduleLockedTitle: "Notification module is not enabled for this tenant",
      moduleLockedMessage:
        "Enable the settings module so notification diagnostics can load tenant-scoped feature configuration and evidence.",
    },
  },
]

export const notificationsDemoRouteMap: Record<string, NotificationsDemoRouteSurface> = Object.fromEntries(
  notificationsDemoRouteCatalog.map((entry) => [entry.key, entry]),
)

export const notificationsDemoRouteByRoute: Record<string, NotificationsDemoRouteSurface> = Object.fromEntries(
  notificationsDemoRouteCatalog.map((entry) => [entry.route, entry]),
)

const notificationsDemoSurfaceByResource: Record<string, NotificationsDemoRouteSurface> = Object.fromEntries(
  notificationsDemoRouteCatalog.map((entry) => [entry.resource, entry]),
)

export function getNotificationsDemoRouteSurface(key: string) {
  return notificationsDemoRouteMap[key]
}

export function getNotificationsDemoRouteSurfaceByRoute(route: string) {
  return notificationsDemoRouteByRoute[route]
}

export function getNotificationsDemoRouteSurfaceByResource(resource: string) {
  return notificationsDemoSurfaceByResource[resource]
}

export const notificationsDemoRouteCatalogConst = notificationsDemoRouteCatalog


