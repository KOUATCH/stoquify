export const MASTER_DATA_ONBOARDING_WORKFLOW_KEY = "governed_master_data_onboarding" as const
export const MASTER_DATA_ONBOARDING_MODULE_SLUG = "settings" as const
export const MASTER_DATA_ONBOARDING_ROUTE = "/dashboard/settings/data-onboarding" as const

export const MASTER_DATA_ONBOARDING_TARGET_PERMISSIONS = {
  CUSTOMER: { read: "customers.read", write: "customers.create" },
  SUPPLIER: { read: "purchases.suppliers.read", write: "purchases.suppliers.create" },
  ITEM: { read: "inventory.items.read", write: "inventory.items.create" },
} as const

export const MASTER_DATA_ONBOARDING_READ_PERMISSIONS = Object.values(
  MASTER_DATA_ONBOARDING_TARGET_PERMISSIONS,
).map((permission) => permission.read)
