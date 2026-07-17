export const MODULE_CONTROL_MODE = "observe" as const

export const COMMERCIAL_MODULE_SLUGS = [
  "dashboard",
  "inventory",
  "production",
  "sales",
  "pos",
  "cash_drawer",
  "accounting",
  "close_assurance",
  "compliance",
  "purchasing",
  "presence",
  "payroll",
  "finance",
  "payment_reconciliation",
  "analytics",
  "reports",
  "commercial_agents",
  "content",
  "settings",
  "administration",
] as const

export type CommercialModuleSlug = (typeof COMMERCIAL_MODULE_SLUGS)[number]

export type ModuleCatalogStatus = "available" | "beta" | "internal" | "deprecated"
export type ModuleRiskLevel = "low" | "medium" | "high" | "critical"
export type ModuleEntitlementStatus =
  | "active"
  | "trial"
  | "read_only"
  | "suspended"
  | "expired"
  | "unavailable"
  | "legacy_default"
  | "system_default"

export type ModuleEntitlementSource =
  | "requested_modules"
  | "legacy_default"
  | "system_default"
  | "manual_override"
  | "plan"
  | "trial"

export type ModuleSurfaceType = "navigation" | "page" | "action" | "api" | "report" | "export" | "job"
export type ModuleAccessIntent = "read" | "write" | "export" | "job"
export type ModuleEntitlementDecisionResult = "allow" | "would_block" | "deny"

export type ModuleDependency = {
  moduleSlug: CommercialModuleSlug
  dependsOnSlug: CommercialModuleSlug
  dependencyType: "required" | "recommended"
  reason: string
}

export type ModuleCatalogEntry = {
  slug: CommercialModuleSlug
  name: string
  description: string
  owner: string
  status: ModuleCatalogStatus
  riskLevel: ModuleRiskLevel
  core: boolean
  routePrefixes: string[]
  permissions: string[]
  dependencies: ModuleDependency[]
}

export type TenantModuleEntitlement = {
  moduleSlug: CommercialModuleSlug
  status: ModuleEntitlementStatus
  source: ModuleEntitlementSource
  startsAt: string | null
  endsAt: string | null
  readOnly: boolean
  trial: boolean
  metadata?: Record<string, unknown>
}

export type ModuleEntitlementDecision = {
  organizationId: string
  userId: string | null
  moduleSlug: CommercialModuleSlug
  surfaceType: ModuleSurfaceType
  surface: string
  accessIntent: ModuleAccessIntent
  mode: typeof MODULE_CONTROL_MODE | "enforce"
  result: ModuleEntitlementDecisionResult
  allowed: boolean
  wouldBlock: boolean
  reason: string
  entitlement: TenantModuleEntitlement | null
  missingDependencies: ModuleDependency[]
  rbacWildcardPresent: boolean
  rbacWildcardBypassedEntitlement: false
  hardEnforcementEnabled: boolean
  evaluatedAt: string
}

export type ModuleControlCenterItem = {
  module: ModuleCatalogEntry
  entitlement: TenantModuleEntitlement | null
  decision: ModuleEntitlementDecision
}

export type ModuleControlCenterData = {
  organizationId: string
  organizationName: string | null
  mode: typeof MODULE_CONTROL_MODE
  hardEnforcementEnabled: false
  requestedModules: string[]
  normalizedRequestedModules: CommercialModuleSlug[]
  unknownRequestedModules: string[]
  generatedAt: string
  summary: {
    catalogCount: number
    entitledCount: number
    trialCount: number
    readOnlyCount: number
    suspendedCount: number
    wouldBlockCount: number
    dependencyGapCount: number
  }
  items: ModuleControlCenterItem[]
}

export type ModuleEntitlementEvaluationInput = {
  organizationId: string
  userId?: string | null
  moduleSlug: CommercialModuleSlug
  requestedModules?: readonly string[] | null
  explicitEntitlements?: readonly TenantModuleEntitlement[] | null
  surfaceType: ModuleSurfaceType
  surface: string
  accessIntent?: ModuleAccessIntent
  actorPermissions?: readonly string[] | null
  mode?: typeof MODULE_CONTROL_MODE | "enforce"
  now?: Date | string | null
}

export type ModuleAccessObserveInput = Omit<ModuleEntitlementEvaluationInput, "requestedModules"> & {
  requestedModules?: readonly string[] | null
  audit?: boolean
}

export function isCommercialModuleSlug(value: unknown): value is CommercialModuleSlug {
  return typeof value === "string" && COMMERCIAL_MODULE_SLUGS.includes(value as CommercialModuleSlug)
}

