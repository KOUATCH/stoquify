import type {
  CommercialModuleSlug,
  ModuleAccessIntent,
} from "@/services/modules/module-control-contracts"

export type PurchasesRouteSurfaceModule = {
  moduleSlug: CommercialModuleSlug
  surface: string
  accessIntent?: ModuleAccessIntent
  mode?: "observe" | "enforce"
  moduleLockedTitle?: string
  moduleLockedMessage?: string
}

export type PermissionMode = "single" | "all" | "any"

export type PurchasesRouteSurfaceCopy = string | Partial<Record<"en" | "fr", string>>

export type PurchasesRouteSurface = {
  key: string
  route: string
  resource: string
  title: string
  permissions: readonly string[]
  permissionMode?: PermissionMode
  noActiveOrgTitle?: PurchasesRouteSurfaceCopy
  permissionDeniedTitle?: PurchasesRouteSurfaceCopy
  noActiveOrgMessage?: PurchasesRouteSurfaceCopy
  permissionDeniedMessage?: PurchasesRouteSurfaceCopy
  primaryHref?: string
  module?: PurchasesRouteSurfaceModule
  modules?: PurchasesRouteSurfaceModule[]
}

export const purchasesRouteCatalog: PurchasesRouteSurface[] = [
  {
    key: "purchases-dashboard",
    route: "/dashboard/purchases",
    resource: "PurchaseOrder",
    title: "Purchase order dashboard",
    permissions: ["purchases.orders.read"],
    module: {
      moduleSlug: "purchasing",
      surface: "/dashboard/purchases",
      accessIntent: "read",
    },
  },
  {
    key: "purchases-detail",
    route: "/dashboard/purchases/[id]",
    resource: "PurchaseOrder",
    title: "Purchase order detail",
    permissions: ["purchases.orders.read"],
    module: {
      moduleSlug: "purchasing",
      surface: "/dashboard/purchases/[id]",
      accessIntent: "read",
    },
  },
  {
    key: "purchases-payables",
    route: "/dashboard/purchases/payables",
    resource: "APWorkbench",
    title: "AP workbench",
    permissions: ["purchasing.ap.invoice.view"],
    noActiveOrgTitle: "AP workbench needs an active organization",
    permissionDeniedTitle: {
      en: "AP workbench is not available for this role",
      fr: "L'atelier AP n'est pas disponible pour ce rôle",
    },
    noActiveOrgMessage:
      "Refresh your session from the dashboard so purchasing can load tenant-scoped AP controls.",
    permissionDeniedMessage:
      "Viewing the AP workbench requires purchasing AP read access. The denial was recorded by the RBAC guard.",
    primaryHref: "/dashboard/purchases",
    module: {
      moduleSlug: "purchasing",
      surface: "/dashboard/purchases/payables",
      accessIntent: "read",
    },
  },
  {
    key: "purchases-payables-history",
    route: "/dashboard/purchases/payables/history",
    resource: "SupplierAPHistory",
    title: "AP history",
    permissions: ["purchasing.ap.invoice.view", "finance.payables.read", "purchases.suppliers.read"],
    permissionMode: "any",
    permissionDeniedTitle: {
      en: "AP history is not available for this role",
      fr: "L'historique AP n'est pas disponible pour ce rôle",
    },
    primaryHref: "/dashboard/purchases/payables",
    module: {
      moduleSlug: "purchasing",
      surface: "/dashboard/purchases/payables/history",
      accessIntent: "read",
      mode: "enforce",
    },
  },
  {
    key: "purchases-suppliers",
    route: "/dashboard/purchases/suppliers",
    resource: "SupplierManagement",
    title: "Supplier management",
    permissions: ["purchases.suppliers.read"],
    permissionDeniedTitle: {
      en: "Supplier management is not available for this role",
      fr: "La gestion des fournisseurs n'est pas disponible pour ce role",
    },
    primaryHref: "/dashboard/purchases",
    module: {
      moduleSlug: "purchasing",
      surface: "/dashboard/purchases/suppliers",
      accessIntent: "read",
    },
  },
  {
    key: "purchases-suppliers-create",
    route: "/dashboard/purchases/suppliers/create",
    resource: "SupplierManagement",
    title: "Create supplier",
    permissions: ["purchases.suppliers.create"],
    permissionDeniedTitle: {
      en: "Supplier creation is not available for this role",
      fr: "La creation de fournisseurs n'est pas disponible pour ce role",
    },
    primaryHref: "/dashboard/purchases/suppliers",
    module: {
      moduleSlug: "purchasing",
      surface: "/dashboard/purchases/suppliers/create",
      accessIntent: "write",
    },
  },
  {
    key: "purchases-suppliers-detail",
    route: "/dashboard/purchases/suppliers/[id]",
    resource: "SupplierManagement",
    title: "Supplier analytics",
    permissions: ["purchases.suppliers.read"],
    permissionDeniedTitle: {
      en: "Supplier analytics are not available for this role",
      fr: "Les analyses fournisseur ne sont pas disponibles pour ce role",
    },
    primaryHref: "/dashboard/purchases/suppliers",
    module: {
      moduleSlug: "purchasing",
      surface: "/dashboard/purchases/suppliers/[id]",
      accessIntent: "read",
    },
  },
  {
    key: "purchases-suppliers-edit",
    route: "/dashboard/purchases/suppliers/[id]/edit",
    resource: "SupplierManagement",
    title: "Edit supplier",
    permissions: ["purchases.suppliers.update"],
    permissionDeniedTitle: {
      en: "Supplier editing is not available for this role",
      fr: "La modification des fournisseurs n'est pas disponible pour ce role",
    },
    primaryHref: "/dashboard/purchases/suppliers",
    module: {
      moduleSlug: "purchasing",
      surface: "/dashboard/purchases/suppliers/[id]/edit",
      accessIntent: "write",
    },
  },
]

export const purchasesRouteMap: Record<string, PurchasesRouteSurface> = Object.fromEntries(
  purchasesRouteCatalog.map((entry) => [entry.key, entry]),
)

export const purchasesRouteByRoute: Record<string, PurchasesRouteSurface> = Object.fromEntries(
  purchasesRouteCatalog.map((entry) => [entry.route, entry]),
)

const purchasesSurfaceByResource: Record<string, PurchasesRouteSurface> = Object.fromEntries(
  purchasesRouteCatalog.map((entry) => [entry.resource, entry]),
)

export function getPurchasesRouteSurface(key: string) {
  return purchasesRouteMap[key]
}

export function getPurchasesRouteSurfaceByRoute(route: string) {
  return purchasesRouteByRoute[route]
}

export function getPurchasesRouteSurfaceByResource(resource: string) {
  return purchasesSurfaceByResource[resource]
}
