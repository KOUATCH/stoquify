import type {
  CommercialModuleSlug,
  ModuleAccessIntent,
} from "@/services/modules/module-control-contracts"

export type InventoryRouteSurfaceModule = {
  moduleSlug: CommercialModuleSlug
  surface: string
  accessIntent?: ModuleAccessIntent
  mode?: "observe" | "enforce"
  moduleLockedTitle?: string
  moduleLockedMessage?: string
}

export type PermissionMode = "single" | "all" | "any"

export type InventoryRouteSurface = {
  key: string
  route: string
  resource: string
  title: string
  permissions: readonly string[]
  permissionMode?: PermissionMode
  module?: InventoryRouteSurfaceModule
  modules?: InventoryRouteSurfaceModule[]
}

export const inventoryRouteCatalog: InventoryRouteSurface[] = [
  {
    key: "inventory-dashboard",
    route: "/dashboard/inventory",
    resource: "InventoryManagement",
    title: "Inventory dashboard",
    permissions: ["inventory.read"],
  },
  {
    key: "inventory-brands",
    route: "/dashboard/inventory/brands",
    resource: "InventoryBrands",
    title: "Inventory brands",
    permissions: ["inventory.brands.read"],
  },
  {
    key: "inventory-brands-create",
    route: "/dashboard/inventory/brands/create",
    resource: "InventoryBrands",
    title: "Create inventory brand",
    permissions: ["inventory.brands.create"],
  },
  {
    key: "inventory-brands-edit",
    route: "/dashboard/inventory/brands/[id]/edit",
    resource: "InventoryBrands",
    title: "Edit inventory brand",
    permissions: ["inventory.brands.update"],
  },
  {
    key: "inventory-categories",
    route: "/dashboard/inventory/categories",
    resource: "InventoryCategories",
    title: "Inventory categories",
    permissions: ["inventory.categories.read"],
  },
  {
    key: "inventory-categories-create",
    route: "/dashboard/inventory/categories/create",
    resource: "InventoryCategories",
    title: "Create inventory category",
    permissions: ["inventory.categories.create"],
  },
  {
    key: "inventory-categories-detail",
    route: "/dashboard/inventory/categories/[id]",
    resource: "InventoryCategories",
    title: "Inventory category detail",
    permissions: ["inventory.categories.read"],
  },
  {
    key: "inventory-categories-edit",
    route: "/dashboard/inventory/categories/[id]/edit",
    resource: "InventoryCategories",
    title: "Edit inventory category",
    permissions: ["inventory.categories.update"],
  },
  {
    key: "inventory-items",
    route: "/dashboard/inventory/items",
    resource: "InventoryItems",
    title: "Inventory items",
    permissions: ["inventory.items.read"],
  },
  {
    key: "inventory-items-create",
    route: "/dashboard/inventory/items/create",
    resource: "InventoryItems",
    title: "Create inventory item",
    permissions: ["inventory.items.create"],
  },
  {
    key: "inventory-items-new",
    route: "/dashboard/inventory/items/new",
    resource: "InventoryItems",
    title: "Create inventory item",
    permissions: ["inventory.items.create"],
  },
  {
    key: "inventory-items-edit",
    route: "/dashboard/inventory/items/[id]/edit",
    resource: "InventoryItems",
    title: "Edit inventory item",
    permissions: ["inventory.items.update"],
  },
  {
    key: "inventory-items-others",
    route: "/dashboard/inventory/items/[id]/others",
    resource: "InventoryItems",
    title: "Item suppliers and related details",
    permissions: ["inventory.items.read"],
  },
  {
    key: "inventory-items-suppliers",
    route: "/dashboard/inventory/items/[id]/suppliers",
    resource: "InventoryItems",
    title: "Item suppliers",
    permissions: ["inventory.items.read"],
  },
  {
    key: "inventory-loss-control",
    route: "/dashboard/inventory/loss-control",
    resource: "InventoryLossControl",
    title: "Inventory loss control",
    permissions: ["inventory.levels.read"],
  },
  {
    key: "inventory-movements",
    route: "/dashboard/inventory/movements",
    resource: "InventoryMovements",
    title: "Inventory movements",
    permissions: ["inventory.levels.read"],
  },
  {
    key: "inventory-transfers",
    route: "/dashboard/inventory/transfers",
    resource: "InventoryTransfers",
    title: "Inventory transfers",
    permissions: ["TRANSFERS_READ"],
  },
  {
    key: "inventory-units",
    route: "/dashboard/inventory/units",
    resource: "InventoryUnits",
    title: "Inventory units",
    permissions: ["inventory.units.read"],
  },
  {
    key: "inventory-units-create",
    route: "/dashboard/inventory/units/create",
    resource: "InventoryUnits",
    title: "Create inventory unit",
    permissions: ["inventory.units.create"],
  },
  {
    key: "inventory-units-edit",
    route: "/dashboard/inventory/units/[id]/edit",
    resource: "InventoryUnits",
    title: "Edit inventory unit",
    permissions: ["inventory.units.update"],
  },
]

export const inventoryRouteMap: Record<string, InventoryRouteSurface> = Object.fromEntries(
  inventoryRouteCatalog.map((entry) => [entry.key, entry]),
)

export const inventoryRouteByRoute: Record<string, InventoryRouteSurface> = Object.fromEntries(
  inventoryRouteCatalog.map((entry) => [entry.route, entry]),
)

const inventorySurfaceByResource: Record<string, InventoryRouteSurface> = Object.fromEntries(
  inventoryRouteCatalog.map((entry) => [entry.resource, entry]),
)

export function getInventoryRouteSurface(key: string) {
  return inventoryRouteMap[key]
}

export function getInventoryRouteSurfaceByRoute(route: string) {
  return inventoryRouteByRoute[route]
}

export function getInventoryRouteSurfaceByResource(resource: string) {
  return inventorySurfaceByResource[resource]
}
