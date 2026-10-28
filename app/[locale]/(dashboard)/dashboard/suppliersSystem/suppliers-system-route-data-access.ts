import type {
  CommercialModuleSlug,
  ModuleAccessIntent,
} from "@/services/modules/module-control-contracts"

export type SuppliersSystemRouteSurfaceModule = {
  moduleSlug: CommercialModuleSlug
  surface: string
  accessIntent?: ModuleAccessIntent
  mode?: "observe" | "enforce"
  moduleLockedTitle?: string
  moduleLockedMessage?: string
}

export type PermissionMode = "single" | "all" | "any"

export type SuppliersSystemRouteSurface = {
  key: string
  route: string
  resource: string
  title: string
  permissions: readonly string[]
  permissionMode?: PermissionMode
  module?: SuppliersSystemRouteSurfaceModule
  modules?: SuppliersSystemRouteSurfaceModule[]
}

export const suppliersSystemRouteCatalog: SuppliersSystemRouteSurface[] = [
  {
    key: "suppliers-system-dashboard",
    route: "/dashboard/suppliersSystem",
    resource: "SupplierManagement",
    title: "Supplier system dashboard",
    permissions: ["purchases.suppliers.read"],
    module: {
      moduleSlug: "purchasing",
      surface: "/dashboard/suppliersSystem",
      accessIntent: "read",
    },
  },
  {
    key: "suppliers-system-new",
    route: "/dashboard/suppliersSystem/new",
    resource: "SupplierManagement",
    title: "Create supplier",
    permissions: ["purchases.suppliers.create"],
    module: {
      moduleSlug: "purchasing",
      surface: "/dashboard/suppliersSystem/new",
      accessIntent: "write",
    },
  },
  {
    key: "suppliers-system-detail",
    route: "/dashboard/suppliersSystem/[id]",
    resource: "SupplierManagement",
    title: "Supplier analytics",
    permissions: ["purchases.suppliers.read"],
    module: {
      moduleSlug: "purchasing",
      surface: "/dashboard/suppliersSystem/[id]",
      accessIntent: "read",
    },
  },
  {
    key: "suppliers-system-edit",
    route: "/dashboard/suppliersSystem/[id]/edit",
    resource: "SupplierManagement",
    title: "Edit supplier",
    permissions: ["purchases.suppliers.update"],
    module: {
      moduleSlug: "purchasing",
      surface: "/dashboard/suppliersSystem/[id]/edit",
      accessIntent: "write",
    },
  },
]

export const suppliersSystemRouteMap: Record<string, SuppliersSystemRouteSurface> = Object.fromEntries(
  suppliersSystemRouteCatalog.map((entry) => [entry.key, entry]),
)

export const suppliersSystemRouteByRoute: Record<string, SuppliersSystemRouteSurface> = Object.fromEntries(
  suppliersSystemRouteCatalog.map((entry) => [entry.route, entry]),
)

const suppliersSystemSurfaceByResource: Record<string, SuppliersSystemRouteSurface> = Object.fromEntries(
  suppliersSystemRouteCatalog.map((entry) => [entry.resource, entry]),
)

export function getSuppliersSystemRouteSurface(key: string) {
  return suppliersSystemRouteMap[key]
}

export function getSuppliersSystemRouteSurfaceByRoute(route: string) {
  return suppliersSystemRouteByRoute[route]
}

export function getSuppliersSystemRouteSurfaceByResource(resource: string) {
  return suppliersSystemSurfaceByResource[resource]
}
