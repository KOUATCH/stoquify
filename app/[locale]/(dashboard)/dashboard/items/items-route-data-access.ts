export type PermissionMode = "single" | "all" | "any"

export type ItemsRouteSurface = {
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

export const itemsRouteCatalog: ItemsRouteSurface[] = [
  {
    key: "items-dashboard",
    route: "/dashboard/items",
    title: "Items dashboard",
    resource: "ItemsPage",
    permissions: ["inventory.items.read"],
    permissionMode: "single",
    noActiveOrgTitle: "Items dashboard needs an active organization",
    permissionDeniedTitle: "Items dashboard is not available for this role",
    permissionDeniedMessage: "Item listing requires inventory item read permission.",
  },
  {
    key: "items-new",
    route: "/dashboard/items/new",
    title: "Create item alias",
    resource: "ItemsNewPage",
    permissions: ["inventory.items.create"],
    permissionMode: "single",
    noActiveOrgTitle: "Item creation needs an active organization",
    permissionDeniedTitle: "Item creation is not available for this role",
    permissionDeniedMessage: "Item creation requires inventory item create permission.",
  },
]

export const itemsRouteMap: Record<string, ItemsRouteSurface> = Object.fromEntries(
  itemsRouteCatalog.map((entry) => [entry.key, entry]),
)

export const itemsRouteByRoute: Record<string, ItemsRouteSurface> = Object.fromEntries(
  itemsRouteCatalog.map((entry) => [entry.route, entry]),
)

const itemsSurfaceByResource: Record<string, ItemsRouteSurface> = Object.fromEntries(
  itemsRouteCatalog.map((entry) => [entry.resource, entry]),
)

export function getItemsRouteSurface(key: string) {
  return itemsRouteMap[key]
}

export function getItemsRouteSurfaceByRoute(route: string) {
  return itemsRouteByRoute[route]
}

export function getItemsRouteSurfaceByResource(resource: string) {
  return itemsSurfaceByResource[resource]
}
