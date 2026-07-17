import "server-only"

import {
  INITIAL_WORKFLOW_ASSURANCE_CHECK_DEFINITIONS,
  type WorkflowAssuranceCheckDefinitionContract,
  type WorkflowAssuranceExecutionMode,
} from "./assurance-registry-contracts"
import type {
  WorkflowAssuranceSchedulerCadence,
  WorkflowAssuranceSchedulerModePolicy,
  WorkflowAssuranceSchedulerPlan,
} from "./assurance-scheduler-contracts"

export const WORKFLOW_ASSURANCE_SCHEDULER_POLICIES: Record<
  WorkflowAssuranceExecutionMode,
  WorkflowAssuranceSchedulerModePolicy
> = {
  synchronous_guard: {
    executionMode: "synchronous_guard",
    runType: "manual",
    cadence: "immediate",
    hotPathAllowed: true,
    cursorStrategy: {
      tenantScoped: true,
      cursorFields: ["organizationId", "sourceType", "sourceId", "sourceHash"],
      sourceHashRequired: true,
    },
  },
  after_commit_validator: {
    executionMode: "after_commit_validator",
    runType: "after_commit",
    cadence: "5_to_15_minutes",
    hotPathAllowed: false,
    cursorStrategy: {
      tenantScoped: true,
      cursorFields: ["organizationId", "businessEventId", "sourceHash"],
      sourceHashRequired: true,
    },
  },
  scheduled_scan: {
    executionMode: "scheduled_scan",
    runType: "scheduled",
    cadence: "daily",
    hotPathAllowed: false,
    cursorStrategy: {
      tenantScoped: true,
      cursorFields: ["organizationId", "updatedAt", "sourceType", "sourceId", "sourceHash"],
      sourceHashRequired: true,
    },
  },
  pre_close_gate: {
    executionMode: "pre_close_gate",
    runType: "pre_close",
    cadence: "monthly_pre_close",
    hotPathAllowed: false,
    cursorStrategy: {
      tenantScoped: true,
      cursorFields: ["organizationId", "periodId", "sourceHash"],
      sourceHashRequired: true,
    },
  },
  snapshot_bi_guard: {
    executionMode: "snapshot_bi_guard",
    runType: "snapshot_guard",
    cadence: "before_bi_render",
    hotPathAllowed: false,
    cursorStrategy: {
      tenantScoped: true,
      cursorFields: ["organizationId", "snapshotKind", "sourceHash"],
      sourceHashRequired: true,
    },
  },
}

const CADENCES: WorkflowAssuranceSchedulerCadence[] = [
  "immediate",
  "5_to_15_minutes",
  "daily",
  "monthly_pre_close",
  "before_bi_render",
]

export function buildWorkflowAssuranceSchedulerPlan(input: {
  definitions?: readonly WorkflowAssuranceCheckDefinitionContract[]
  testedCheckKeys?: readonly string[]
  now?: Date | string | null
} = {}): WorkflowAssuranceSchedulerPlan {
  const tested = new Set(input.testedCheckKeys ?? [])
  const checks = (input.definitions ?? INITIAL_WORKFLOW_ASSURANCE_CHECK_DEFINITIONS).map((definition) => {
    const policy = WORKFLOW_ASSURANCE_SCHEDULER_POLICIES[definition.executionMode]
    const blockers = releaseBlockersForDefinition(definition, tested)

    return {
      checkKey: definition.checkKey,
      workflow: definition.workflow,
      ownerRole: definition.ownerRole,
      requiredPermission: definition.requiredPermission,
      actionRoute: definition.actionRoute,
      executionMode: definition.executionMode,
      runType: policy.runType,
      cadence: cadenceForDefinition(definition, policy.cadence),
      cursorFields: policy.cursorStrategy.cursorFields,
      sourceTables: definition.sourceTables,
      enforceMode: definition.enforceMode,
      releaseReady: blockers.length === 0,
      blockers,
    }
  })
  const byCadence = CADENCES.reduce<Record<WorkflowAssuranceSchedulerCadence, number>>((acc, cadence) => {
    acc[cadence] = checks.filter((check) => check.cadence === cadence).length
    return acc
  }, {} as Record<WorkflowAssuranceSchedulerCadence, number>)
  const blockers = checks
    .filter((check) => check.enforceMode || check.blockers.length > 0)
    .map((check) => ({ checkKey: check.checkKey, blockers: check.blockers }))

  return {
    generatedAt: normalizeNow(input.now).toISOString(),
    checkCount: checks.length,
    byCadence,
    checks,
    enforceModeBlocked: blockers.some((item) => item.blockers.length > 0),
    blockers,
  }
}

function releaseBlockersForDefinition(
  definition: WorkflowAssuranceCheckDefinitionContract,
  testedCheckKeys: ReadonlySet<string>,
) {
  const blockers: string[] = []

  if (!definition.ownerRole) blockers.push("missing_owner_role")
  if (!definition.defaultSeverity) blockers.push("missing_severity")
  if (!definition.executionMode) blockers.push("missing_execution_mode")
  if (!definition.actionRoute) blockers.push("missing_action_route")
  if (!definition.requiredPermission) blockers.push("missing_permission")
  if (!definition.sourceTables.length) blockers.push("missing_source_tables")
  if (!definition.metadata.assuranceDomain) blockers.push("missing_assurance_domain")
  if (!testedCheckKeys.has(definition.checkKey)) blockers.push("missing_clean_or_broken_fixture_test")

  return blockers
}

function cadenceForDefinition(
  definition: WorkflowAssuranceCheckDefinitionContract,
  defaultCadence: WorkflowAssuranceSchedulerCadence,
): WorkflowAssuranceSchedulerCadence {
  if (definition.executionMode === "scheduled_scan") {
    if (/outbox|exception|suspense|replay|submission/i.test(definition.checkKey)) return "5_to_15_minutes"
    if (/payroll|supplier|inventory/i.test(definition.checkKey)) return "daily"
  }
  return defaultCadence
}

function normalizeNow(value: Date | string | null | undefined) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value
  if (typeof value === "string") {
    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) return parsed
  }
  return new Date()
}
