import type {
  CommercialModuleSlug,
  ModuleAccessIntent,
} from "@/services/modules/module-control-contracts"
import {
  MASTER_DATA_ONBOARDING_MODULE_SLUG,
  MASTER_DATA_ONBOARDING_READ_PERMISSIONS,
  MASTER_DATA_ONBOARDING_ROUTE,
} from "@/config/master-data-onboarding"

export type SettingsRouteSurfaceModule = {
  moduleSlug: CommercialModuleSlug
  surface: string
  accessIntent?: ModuleAccessIntent
  mode?: "observe" | "enforce"
  moduleLockedTitle?: string
  moduleLockedMessage?: string
}

export type PermissionMode = "single" | "all" | "any"

export type SettingsRouteSurface = {
  key: string
  route: string
  resource: string
  title: string
  titleFr?: string
  permissions: readonly string[]
  permissionMode?: PermissionMode
  module?: SettingsRouteSurfaceModule
  modules?: SettingsRouteSurfaceModule[]
}

export const settingsRouteCatalog: SettingsRouteSurface[] = [
  {
    key: "settings-appearance",
    route: "/dashboard/settings/appearance",
    resource: "SettingsAppearance",
    title: "Appearance settings",
    permissions: ["DASHBOARD_READ"],
  },
  {
    key: "settings-company",
    route: "/dashboard/settings/company",
    resource: "SettingsCompany",
    title: "Company settings",
    permissions: ["COMPANY_READ"],
  },
  {
    key: "settings-data-onboarding",
    route: MASTER_DATA_ONBOARDING_ROUTE,
    resource: "MasterDataOnboarding",
    title: "Data onboarding",
    titleFr: "Intégration des données",
    permissions: MASTER_DATA_ONBOARDING_READ_PERMISSIONS,
    permissionMode: "any",
    module: {
      moduleSlug: MASTER_DATA_ONBOARDING_MODULE_SLUG,
      surface: `${MASTER_DATA_ONBOARDING_ROUTE}#page`,
      accessIntent: "read",
      mode: "enforce",
    },
  },
  {
    key: "settings-locations",
    route: "/dashboard/settings/locations",
    resource: "SettingsLocations",
    title: "Location settings",
    permissions: ["locations.read"],
  },
  {
    key: "settings-locations-create",
    route: "/dashboard/settings/locations/create",
    resource: "SettingsLocations",
    title: "Create location",
    permissions: ["locations.create"],
  },
  {
    key: "settings-locations-new",
    route: "/dashboard/settings/locations/new",
    resource: "SettingsLocations",
    title: "Create location",
    permissions: ["locations.create"],
  },
  {
    key: "settings-locations-edit",
    route: "/dashboard/settings/locations/[id]/edit",
    resource: "SettingsLocations",
    title: "Edit location",
    permissions: ["locations.update"],
  },
  {
    key: "settings-modules",
    route: "/dashboard/settings/modules",
    resource: "ModuleControlCenter",
    title: "Module control center",
    permissions: ["MANAGE_SYSTEM_SETTINGS"],
  },
  {
    key: "settings-notifications",
    route: "/dashboard/settings/notifications",
    resource: "SettingsNotifications",
    title: "Notification settings",
    permissions: ["communication.notifications.read"],
  },
  {
    key: "settings-organization",
    route: "/dashboard/settings/organization",
    resource: "SettingsOrganization",
    title: "Organization settings",
    permissions: ["COMPANY_READ"],
  },
  {
    key: "settings-roles",
    route: "/dashboard/settings/roles",
    resource: "SettingsRoles",
    title: "Role administration",
    permissions: ["READ_ROLES"],
  },
  {
    key: "settings-roles-new",
    route: "/dashboard/settings/roles/new",
    resource: "SettingsRoles",
    title: "Create role",
    permissions: ["roles.create"],
  },
  {
    key: "settings-roles-update",
    route: "/dashboard/settings/roles/update/[id]",
    resource: "SettingsRoles",
    title: "Update role",
    permissions: ["roles.update"],
  },
  {
    key: "settings-security",
    route: "/dashboard/settings/security",
    resource: "SettingsSecurity",
    title: "Security settings",
    permissions: ["PASSWORD_READ"],
  },
  {
    key: "settings-tax-rates",
    route: "/dashboard/settings/tax-rates",
    resource: "SettingsTaxRates",
    title: "Tax rates",
    permissions: ["taxes.read"],
  },
  {
    key: "settings-tax-rates-create",
    route: "/dashboard/settings/tax-rates/create",
    resource: "SettingsTaxRates",
    title: "Create tax rate",
    permissions: ["taxes.create"],
  },
  {
    key: "settings-tax-rates-edit",
    route: "/dashboard/settings/tax-rates/[id]/edit",
    resource: "SettingsTaxRates",
    title: "Edit tax rate",
    permissions: ["taxes.update"],
  },
  {
    key: "settings-terminals",
    route: "/dashboard/settings/terminals",
    resource: "SettingsTerminals",
    title: "Terminal settings",
    permissions: ["POS_STATION_READ"],
  },
  {
    key: "settings-users",
    route: "/dashboard/settings/users",
    resource: "SettingsUsers",
    title: "User directory",
    permissions: ["READ_USERS"],
  },
]

export const settingsRouteMap: Record<string, SettingsRouteSurface> = Object.fromEntries(
  settingsRouteCatalog.map((entry) => [entry.key, entry]),
)

export const settingsRouteByRoute: Record<string, SettingsRouteSurface> = Object.fromEntries(
  settingsRouteCatalog.map((entry) => [entry.route, entry]),
)

const settingsSurfaceByResource: Record<string, SettingsRouteSurface> = Object.fromEntries(
  settingsRouteCatalog.map((entry) => [entry.resource, entry]),
)

export function getSettingsRouteSurface(key: string) {
  return settingsRouteMap[key]
}

export function getSettingsRouteSurfaceByRoute(route: string) {
  return settingsRouteByRoute[route]
}

export function getSettingsRouteSurfaceByResource(resource: string) {
  return settingsSurfaceByResource[resource]
}
