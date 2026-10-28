import type {
  CommercialModuleSlug,
  ModuleAccessIntent,
} from "@/services/modules/module-control-contracts"

export type PurchaseOrdersRouteSurfaceModule = {
  moduleSlug: CommercialModuleSlug
  surface: string
  accessIntent?: ModuleAccessIntent
  mode?: "observe" | "enforce"
  moduleLockedTitle?: string
  moduleLockedMessage?: string
}

export type PermissionMode = "single" | "all" | "any"

export type PurchaseOrdersRouteSurface = {
  key: string
  route: string
  resource: string
  title: string
  permissions: readonly string[]
  permissionMode?: PermissionMode
  module?: PurchaseOrdersRouteSurfaceModule
  modules?: PurchaseOrdersRouteSurfaceModule[]
}

export const purchaseOrdersRouteCatalog: PurchaseOrdersRouteSurface[] = [
  {
    key: "purchase-orders-dashboard",
    route: "/dashboard/purchase-orders",
    resource: "PurchaseOrder",
    title: "Purchase order dashboard",
    permissions: ["purchases.orders.read"],
    module: {
      moduleSlug: "purchasing",
      surface: "/dashboard/purchase-orders",
      accessIntent: "read",
    },
  },
  {
    key: "purchase-orders-analytics",
    route: "/dashboard/purchase-orders/analytics",
    resource: "PurchaseOrder",
    title: "Purchase order analytics",
    permissions: ["purchases.orders.read"],
    module: {
      moduleSlug: "purchasing",
      surface: "/dashboard/purchase-orders/analytics",
      accessIntent: "read",
    },
  },
  {
    key: "purchase-orders-detail",
    route: "/dashboard/purchase-orders/[id]",
    resource: "PurchaseOrder",
    title: "Purchase order detail",
    permissions: ["purchases.orders.read"],
    module: {
      moduleSlug: "purchasing",
      surface: "/dashboard/purchase-orders/[id]",
      accessIntent: "read",
    },
  },
  {
    key: "purchase-orders-supplier-acknowledgement",
    route: "/dashboard/purchase-orders/[id]/supplier-acknowledgement",
    resource: "PurchaseOrder",
    title: "Supplier purchase-order acknowledgement",
    permissions: ["purchases.orders.read"],
    module: {
      moduleSlug: "purchasing",
      surface: "/dashboard/purchase-orders/[id]/supplier-acknowledgement",
      accessIntent: "read",
      mode: "enforce",
    },
  },
  {
    key: "purchase-orders-new",
    route: "/dashboard/purchase-orders/new",
    resource: "PurchaseOrder",
    title: "Create purchase order",
    permissions: ["purchases.orders.create"],
    module: {
      moduleSlug: "purchasing",
      surface: "/dashboard/purchase-orders/new",
      accessIntent: "write",
    },
  },
  {
    key: "purchase-orders-edit",
    route: "/dashboard/purchase-orders/[id]/edit",
    resource: "PurchaseOrder",
    title: "Edit purchase order",
    permissions: ["purchases.orders.update"],
    module: {
      moduleSlug: "purchasing",
      surface: "/dashboard/purchase-orders/[id]/edit",
      accessIntent: "write",
    },
  },
]

export const purchaseOrdersRouteMap: Record<string, PurchaseOrdersRouteSurface> = Object.fromEntries(
  purchaseOrdersRouteCatalog.map((entry) => [entry.key, entry]),
)

export const purchaseOrdersRouteByRoute: Record<string, PurchaseOrdersRouteSurface> = Object.fromEntries(
  purchaseOrdersRouteCatalog.map((entry) => [entry.route, entry]),
)

const purchaseOrdersSurfaceByResource: Record<string, PurchaseOrdersRouteSurface> = Object.fromEntries(
  purchaseOrdersRouteCatalog.map((entry) => [entry.resource, entry]),
)

export function getPurchaseOrdersRouteSurface(key: string) {
  return purchaseOrdersRouteMap[key]
}

export function getPurchaseOrdersRouteSurfaceByRoute(route: string) {
  return purchaseOrdersRouteByRoute[route]
}

export function getPurchaseOrdersRouteSurfaceByResource(resource: string) {
  return purchaseOrdersSurfaceByResource[resource]
}
