import type {
  CommercialModuleSlug,
  ModuleAccessIntent,
} from "@/services/modules/module-control-contracts"

export type CustomersRouteSurfaceModule = {
  moduleSlug: CommercialModuleSlug
  surface: string
  accessIntent?: ModuleAccessIntent
  mode?: "observe" | "enforce"
  moduleLockedTitle?: string
  moduleLockedMessage?: string
}

export type PermissionMode = "single" | "all" | "any"

export type CustomersRouteSurface = {
  key: string
  route: string
  resource: string
  title: string
  permissions: readonly string[]
  permissionMode?: PermissionMode
  module?: CustomersRouteSurfaceModule
  modules?: CustomersRouteSurfaceModule[]
}

export const customersRouteCatalog: CustomersRouteSurface[] = [
  {
    key: "customers-dashboard",
    route: "/dashboard/customers",
    resource: "CustomerManagement",
    title: "Customer management dashboard",
    permissions: ["customers.read"],
    module: {
      moduleSlug: "sales",
      surface: "/dashboard/customers",
      accessIntent: "read",
    },
  },
  {
    key: "customers-new",
    route: "/dashboard/customers/new",
    resource: "CustomerManagement",
    title: "Create customer",
    permissions: ["customers.read", "customers.create"],
    module: {
      moduleSlug: "sales",
      surface: "/dashboard/customers/new",
      accessIntent: "write",
    },
  },
  {
    key: "customers-detail",
    route: "/dashboard/customers/[id]",
    resource: "CustomerManagement",
    title: "Customer analytics",
    permissions: ["customers.read", "customers.analytics.read"],
    module: {
      moduleSlug: "sales",
      surface: "/dashboard/customers/[id]",
      accessIntent: "read",
    },
  },
  {
    key: "customers-edit",
    route: "/dashboard/customers/[id]/edit",
    resource: "CustomerManagement",
    title: "Edit customer",
    permissions: ["customers.read", "customers.update"],
    module: {
      moduleSlug: "sales",
      surface: "/dashboard/customers/[id]/edit",
      accessIntent: "write",
    },
  },
  {
    key: "customers-orders",
    route: "/dashboard/customers/[id]/orders",
    resource: "CustomerManagement",
    title: "Customer orders",
    permissions: ["customers.read", "customers.orders.read"],
    module: {
      moduleSlug: "sales",
      surface: "/dashboard/customers/[id]/orders",
      accessIntent: "read",
    },
  },
  {
    key: "customers-statement",
    route: "/dashboard/customers/[id]/statement",
    resource: "CustomerManagement",
    title: "Customer statement",
    permissions: ["customers.read", "accounting.exports.create"],
    module: {
      moduleSlug: "accounting",
      surface: "/dashboard/customers/[id]/statement",
      accessIntent: "export",
      mode: "enforce",
    },
  },
]

export const customersRouteMap: Record<string, CustomersRouteSurface> = Object.fromEntries(
  customersRouteCatalog.map((entry) => [entry.key, entry]),
)

export const customersRouteByRoute: Record<string, CustomersRouteSurface> = Object.fromEntries(
  customersRouteCatalog.map((entry) => [entry.route, entry]),
)

const customersSurfaceByResource: Record<string, CustomersRouteSurface> = Object.fromEntries(
  customersRouteCatalog.map((entry) => [entry.resource, entry]),
)

export function getCustomersRouteSurface(key: string) {
  return customersRouteMap[key]
}

export function getCustomersRouteSurfaceByRoute(route: string) {
  return customersRouteByRoute[route]
}

export function getCustomersRouteSurfaceByResource(resource: string) {
  return customersSurfaceByResource[resource]
}

