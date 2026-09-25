import type { CommercialModuleSlug, ModuleCatalogStatus, ModuleDependency, ModuleEntitlementStatus, ModuleEntitlementSource } from "./module-control-contracts"
import type { ModuleStopImpact } from "./module-stop-policy.service"

export type CompositionLifecycleState = "REQUESTED" | "PREPARING" | "ACTIVE" | "FAILED" | "RETAINED"
export type CompositionSetupInputs = { payrollPeriodId?: string; complianceAdapterId?: string }
export type CompositionSetupScope = {
  payrollPeriod: { id: string; name: string; periodStart: string; periodEnd: string; payDate: string; countryCode: string } | null
  complianceAdapter: { id: string; countryCode: string; authorityChannel: string; environment: string; status: string } | null
}
export type CompositionRequirementCode = "ACCOUNTING_SETUP_REQUIRED" | "PROVIDER_SETUP_REQUIRED" | "POS_SETUP_REQUIRED" | "PAYROLL_SCOPE_REQUIRED" | "COMPLIANCE_SETUP_REQUIRED" | "COMPLIANCE_SANDBOX_VERIFIED" | "COMPLIANCE_SCOPE_UNAVAILABLE" | "DOMAIN_SETUP_NOT_ASSESSED" | "SETUP_VERIFIED" | "NO_EXTRA_SETUP" | "PREPARATION_FAILED" | "CONFIGURATION_STALE" | "OBLIGATIONS_PENDING" | "STOP_UNSUPPORTED"
export type CompositionLifecycleStep = {
  moduleSlug: CommercialModuleSlug; stepKey: string; status: "PENDING" | "RUNNING" | "WAITING_INPUT" | "SUCCEEDED" | "FAILED"
  code: CompositionRequirementCode; href: string | null; checkedAt: string | null; evidenceHash: string | null; attempts: number
}
export type CompositionLifecycleOperation = {
  id: string; commandId: string; state: CompositionLifecycleState; desiredRevision: number; activeRevision: number
  createdAt: string; updatedAt: string; errorCode: string | null; canResume: boolean; steps: CompositionLifecycleStep[]
}

export type CompositionIssueCode = "ELIGIBILITY_REQUIRED" | "DEPENDENCY_UNAVAILABLE" | "DEPENDENCY_CYCLE" | "UNKNOWN_MODULE" | "ACCESS_PRESERVED" | "WORKSPACE_ONLY" | "ACCOUNTING_SETUP_REQUIRED" | "PROVIDER_SETUP_REQUIRED" | "DOMAIN_SETUP_NOT_ASSESSED" | "CATALOG_UNAVAILABLE" | "CONFIGURATION_STALE" | "VALIDATION_FAILED" | "STOP_UNSUPPORTED" | "PREPARATION_FAILED"
export type CompositionIssue = { code: CompositionIssueCode; moduleSlug?: string; blocking: boolean; href?: string }
export type CompositionSetup = { status: "ready" | "required" | "not_assessed"; code: "NO_EXTRA_WORKSPACE_SETUP" | "ACCOUNTING_SETUP_REQUIRED" | "PROVIDER_SETUP_REQUIRED" | "DOMAIN_SETUP_NOT_ASSESSED"; href?: string }
export type CompositionCatalogItem = {
  slug: CommercialModuleSlug; name: string; description: string; core: boolean; status: ModuleCatalogStatus; owner: string
  dependencies: ModuleDependency[]; grantStatus: ModuleEntitlementStatus | null; grantSource: ModuleEntitlementSource | null
  eligible: boolean; available: boolean; selected: boolean; required: boolean; canOpen: boolean; href: string | null; setup: CompositionSetup; requirements: CompositionLifecycleStep[]
}
export type CompositionWorkspaceLink = { moduleSlug: CommercialModuleSlug; title: string; href: string }
export type CompositionHistoryEntry = {
  id: string; state: "DRAFT" | CompositionLifecycleState; revision: number; selectedModules: CommercialModuleSlug[]; stopNewWorkModules: CommercialModuleSlug[]; operationId?: string
  previousModules: CommercialModuleSlug[]; createdAt: string; actorId: string; errorCode: string | null
  setupInputs: CompositionSetupInputs
}
export type CompositionHistoryPage = { entries: CompositionHistoryEntry[]; nextCursor: string | null }
export type ModuleCompositionData = {
  organizationId: string; organizationName: string; revision: number; activeRevision: number; newWorkStoppedModules: CommercialModuleSlug[]; lifecycle: CompositionLifecycleOperation | null; source: "legacy" | "durable"; generatedAt: string
  selectedModules: CommercialModuleSlug[]; activeModules: CommercialModuleSlug[]; preservedModules: CommercialModuleSlug[]
  catalog: CompositionCatalogItem[]; workspace: CompositionWorkspaceLink[]; retainedWorkspace: CompositionWorkspaceLink[]; history: CompositionHistoryEntry[]
  stopOptions: Array<{ moduleSlug: CommercialModuleSlug; supported: boolean; newWork: string[]; continuation: string[]; unsupportedReason?: "OFFLINE_CONTINUATION_UNAVAILABLE" | "STOP_UNSUPPORTED" }>
  drafts: CompositionHistoryEntry[]; historyNextCursor: string | null; historyAccessKey: string; limitations: CompositionIssue[]
  setupInputs: CompositionSetupInputs
  availablePayrollPeriods: Array<{ id: string; name: string; periodStart: string; periodEnd: string; payDate: string; countryCode: string }>
  availableComplianceAdapters: Array<{ id: string; countryCode: string; authorityChannel: string; environment: string; status: string }>
}
export type ModuleCompositionPreview = {
  revision: number; previewHash: string; selectedModules: CommercialModuleSlug[]; resolvedModules: CommercialModuleSlug[]
  additions: CommercialModuleSlug[]; kept: CommercialModuleSlug[]; removedFromWorkspace: CommercialModuleSlug[]
  preservedAccess: CommercialModuleSlug[]; requiredBy: Array<{ moduleSlug: CommercialModuleSlug; requiredBy: string[] }>
  issues: CompositionIssue[]; canApply: boolean; commercial: { status: "no_purchase"; messageCode: "EXISTING_ACCESS_ONLY" }; generatedAt: string
  stopNewWorkModules: CommercialModuleSlug[]; stopImpact: ModuleStopImpact; requirements: CompositionLifecycleStep[]
  setupInputs: CompositionSetupInputs
  setupScope: CompositionSetupScope
}
export type ModuleCompositionSelectionInput = { selectedModules: string[]; expectedRevision: number; stopNewWorkModules?: string[]; setupInputs?: CompositionSetupInputs }
export type ModuleCompositionDraftInput = ModuleCompositionSelectionInput & { idempotencyKey: string }
export type ModuleCompositionApplyInput = ModuleCompositionDraftInput & { previewHash: string }
export type ModuleCompositionReopenInput = { commandId: string; expectedRevision: number; idempotencyKey: string }
export type ModuleCompositionResumeInput = { operationId: string; expectedRevision: number; idempotencyKey: string }
export type ModuleCompositionApplyResult = {
  commandId: string; state: CompositionLifecycleState; revision: number; alreadyApplied: boolean; issue: CompositionIssue | null; data: ModuleCompositionData
}
