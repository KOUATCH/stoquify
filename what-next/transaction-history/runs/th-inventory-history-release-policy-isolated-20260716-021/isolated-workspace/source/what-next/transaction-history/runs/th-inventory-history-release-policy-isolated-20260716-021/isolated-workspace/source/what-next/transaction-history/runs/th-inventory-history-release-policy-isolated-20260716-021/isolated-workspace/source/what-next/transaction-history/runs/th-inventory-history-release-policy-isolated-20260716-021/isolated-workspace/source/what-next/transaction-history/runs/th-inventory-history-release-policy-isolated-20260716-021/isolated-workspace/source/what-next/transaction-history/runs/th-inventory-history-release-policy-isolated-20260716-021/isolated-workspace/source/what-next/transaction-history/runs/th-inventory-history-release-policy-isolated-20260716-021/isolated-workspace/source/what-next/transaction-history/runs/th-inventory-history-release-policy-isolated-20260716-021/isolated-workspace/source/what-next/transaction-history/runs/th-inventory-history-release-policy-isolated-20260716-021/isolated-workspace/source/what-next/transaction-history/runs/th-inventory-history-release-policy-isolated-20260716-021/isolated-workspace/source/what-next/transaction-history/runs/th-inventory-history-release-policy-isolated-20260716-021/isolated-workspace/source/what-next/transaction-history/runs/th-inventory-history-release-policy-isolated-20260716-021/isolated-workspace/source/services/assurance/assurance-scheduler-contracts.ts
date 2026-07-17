import type {
  WorkflowAssuranceCheckDefinitionContract,
  WorkflowAssuranceExecutionMode,
  WorkflowAssuranceRunType,
} from "./assurance-registry-contracts"

export type WorkflowAssuranceSchedulerCadence =
  | "immediate"
  | "5_to_15_minutes"
  | "daily"
  | "monthly_pre_close"
  | "before_bi_render"

export type WorkflowAssuranceCursorStrategy = {
  tenantScoped: true
  cursorFields: string[]
  sourceHashRequired: boolean
}

export type WorkflowAssuranceSchedulerModePolicy = {
  executionMode: WorkflowAssuranceExecutionMode
  runType: WorkflowAssuranceRunType
  cadence: WorkflowAssuranceSchedulerCadence
  hotPathAllowed: boolean
  cursorStrategy: WorkflowAssuranceCursorStrategy
}

export type WorkflowAssuranceCheckSchedulePlan = {
  checkKey: string
  workflow: WorkflowAssuranceCheckDefinitionContract["workflow"]
  ownerRole: string
  requiredPermission: string
  actionRoute: string
  executionMode: WorkflowAssuranceExecutionMode
  runType: WorkflowAssuranceRunType
  cadence: WorkflowAssuranceSchedulerCadence
  cursorFields: string[]
  sourceTables: string[]
  enforceMode: boolean
  releaseReady: boolean
  blockers: string[]
}

export type WorkflowAssuranceSchedulerPlan = {
  generatedAt: string
  checkCount: number
  byCadence: Record<WorkflowAssuranceSchedulerCadence, number>
  checks: WorkflowAssuranceCheckSchedulePlan[]
  enforceModeBlocked: boolean
  blockers: Array<{
    checkKey: string
    blockers: string[]
  }>
}
