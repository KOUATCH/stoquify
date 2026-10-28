import "server-only"

import { Prisma } from "@prisma/client"

import { db } from "@/prisma/db"
import {
  ApplicationError,
  BusinessRuleError,
  ConflictError,
  getPrismaKnownRequest,
} from "@/services/_shared/action-errors"
import { hashBusinessPayload } from "@/services/events/business-event.service"

import { upsertWorkflowAssuranceIncidentFromResultInTx } from "./assurance-incident.service"
import { assertWorkflowAssuranceExecutionReconciled } from "./assurance-registry-persistence-contracts"
import type {
  WorkflowAssuranceCheckDefinitionContract,
  WorkflowAssuranceDefinitionExecution,
  WorkflowAssuranceFindingRunSummary,
  WorkflowAssuranceResultStatus,
  WorkflowAssuranceRunStatus,
  WorkflowAssuranceRunType,
  WorkflowAssuranceSeverity,
} from "./assurance-registry-contracts"

const PERSISTENCE_VERSION = 1 as const
const PERSISTENCE_MAX_ATTEMPTS = 3
const EXECUTION_KEY_MAX_LENGTH = 200

const RESULT_STATUS_TO_PRISMA = {
  passed: "PASSED",
  warning: "WARNING",
  failed: "FAILED",
  blocked: "BLOCKED",
  skipped: "SKIPPED",
  error: "ERROR",
} as const satisfies Record<WorkflowAssuranceResultStatus, string>

const RUN_TYPE_TO_PRISMA = {
  manual: "MANUAL",
  scheduled: "SCHEDULED",
  after_commit: "AFTER_COMMIT",
  pre_close: "PRE_CLOSE",
  snapshot_guard: "SNAPSHOT_GUARD",
} as const satisfies Record<WorkflowAssuranceRunType, string>

const RUN_STATUS_TO_PRISMA = {
  running: "RUNNING",
  completed: "COMPLETED",
  completed_with_warnings: "COMPLETED_WITH_WARNINGS",
  failed: "FAILED",
} as const satisfies Record<WorkflowAssuranceRunStatus, string>

const SEVERITY_TO_PRISMA = {
  info: "INFO",
  warning: "WARNING",
  high: "HIGH",
  blocking: "BLOCKING",
  compliance_critical: "COMPLIANCE_CRITICAL",
} as const satisfies Record<WorkflowAssuranceSeverity, string>

export type WorkflowAssuranceDefinitionPersistenceInput = {
  organizationId: string
  definitionId: string
  definition: WorkflowAssuranceCheckDefinitionContract
  execution: WorkflowAssuranceDefinitionExecution
  executionKey: string
  actorId?: string | null
  actorPermissionCount?: number | null
  runType: WorkflowAssuranceRunType
  runStatus: WorkflowAssuranceRunStatus
  periodId?: string | null
  locationId?: string | null
  sourceType?: string | null
  sourceId?: string | null
  startedAt: Date
  completedAt: Date
  durationMs: number
}

export type WorkflowAssuranceDefinitionPersistenceReceipt = {
  checkRunId: string
  executionKey: string
  executionDigest: string
  replayed: boolean
  startedAt: Date
  completedAt: Date
  durationMs: number
  incidentId?: string
  findings: WorkflowAssuranceFindingRunSummary[]
}

type StoredFindingReceipt = {
  id: string
  ordinal: number
  status: string
  severity: string
  sourceType: string
  sourceId: string
  sourceHash: string
  fingerprint: string
  incidentId: string | null
}

type StoredExecutionReceipt = {
  id: string
  executionKey: string | null
  executionDigest: string | null
  startedAt: Date
  completedAt: Date | null
  durationMs: number | null
  findings: StoredFindingReceipt[]
}

export async function persistWorkflowAssuranceDefinitionExecution(
  input: WorkflowAssuranceDefinitionPersistenceInput,
): Promise<WorkflowAssuranceDefinitionPersistenceReceipt> {
  const executionKey = normalizeWorkflowAssuranceExecutionKey(input.executionKey)
  const execution = assertWorkflowAssuranceExecutionReconciled(input.execution)
  const normalized = { ...input, executionKey, execution }
  const executionDigest = createWorkflowAssuranceExecutionDigest(normalized)

  for (let attempt = 0; attempt < PERSISTENCE_MAX_ATTEMPTS; attempt += 1) {
    try {
      return await db.$transaction(
        (tx) => persistDefinitionExecutionInTx(tx, normalized, executionDigest),
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      )
    } catch (error) {
      if (error instanceof ApplicationError) throw error

      const prismaError = getPrismaKnownRequest(error)
      if (prismaError?.code === "P2002") {
        const replay = await findExistingExecutionReceipt(normalized, executionDigest)
        if (replay) return replay
      }

      const retryable = prismaError?.code === "P2002" || prismaError?.code === "P2034"
      if (!retryable) {
        throw new BusinessRuleError(
          "Workflow assurance definition execution could not be recorded safely.",
        )
      }
      if (attempt === PERSISTENCE_MAX_ATTEMPTS - 1) {
        throw new BusinessRuleError(
          "Workflow assurance definition execution could not converge on one replay identity.",
        )
      }
    }
  }

  throw new BusinessRuleError(
    "Workflow assurance definition execution could not converge on one replay identity.",
  )
}

export function createWorkflowAssuranceExecutionDigest(
  input: WorkflowAssuranceDefinitionPersistenceInput,
) {
  return `sha256:${hashBusinessPayload({
    version: PERSISTENCE_VERSION,
    organizationId: input.organizationId,
    definitionId: input.definitionId,
    checkKey: input.definition.checkKey,
    definitionVersion: input.definition.version,
    executionKey: input.executionKey,
    actorId: input.actorId ?? null,
    runType: input.runType,
    periodId: input.periodId ?? null,
    locationId: input.locationId ?? null,
    sourceType: input.sourceType ?? null,
    sourceId: input.sourceId ?? null,
    aggregate: digestResult(input.execution.aggregate),
    findings: input.execution.findings.map((finding) => ({
      ordinal: finding.ordinal,
      ...digestResult(finding),
    })),
  })}`
}

async function persistDefinitionExecutionInTx(
  tx: Prisma.TransactionClient,
  input: WorkflowAssuranceDefinitionPersistenceInput,
  executionDigest: string,
): Promise<WorkflowAssuranceDefinitionPersistenceReceipt> {
  const existing = await findExecutionByKey(tx, input)
  if (existing) return receiptFromStored(existing, input, executionDigest, true)

  const result = input.execution.aggregate
  const created = await tx.workflowAssuranceCheckRun.create({
    data: {
      organizationId: input.organizationId,
      definitionId: input.definitionId,
      checkKey: input.definition.checkKey,
      definitionVersion: input.definition.version,
      executionKey: input.executionKey,
      executionDigest,
      runType: RUN_TYPE_TO_PRISMA[input.runType],
      runStatus: RUN_STATUS_TO_PRISMA[input.runStatus],
      resultStatus: RESULT_STATUS_TO_PRISMA[result.status],
      severity: SEVERITY_TO_PRISMA[result.severity],
      actorId: input.actorId,
      sourceType: result.sourceType ?? input.sourceType,
      sourceId: result.sourceId ?? input.sourceId,
      sourceHash: result.sourceHash,
      fingerprint: result.fingerprint,
      periodId: input.periodId,
      locationId: input.locationId,
      scannedCount: result.counts.scanned,
      passedCount: result.counts.passed,
      warningCount: result.counts.warning,
      failedCount: result.counts.failed,
      blockedCount: result.counts.blocked,
      skippedCount: result.counts.skipped,
      errorCount: result.counts.error,
      startedAt: input.startedAt,
      completedAt: input.completedAt,
      durationMs: input.durationMs,
      resultSummary: {
        message: result.message,
        recommendedAction: result.recommendedAction,
        evidenceLinks: result.evidenceLinks,
        metadata: result.metadata,
      } as Prisma.InputJsonValue,
      errorCode: result.errorCode,
      errorMessage: result.errorMessage,
      metadata: {
        persistenceVersion: PERSISTENCE_VERSION,
        findingCount: input.execution.findings.length,
        observeMode: !input.definition.enforceMode,
        workflow: input.definition.workflow,
        executionMode: input.definition.executionMode,
        moduleSlug: input.definition.moduleSlug,
        requiredPermission: input.definition.requiredPermission,
        actorPermissionCount: input.actorPermissionCount ?? null,
      } as Prisma.InputJsonValue,
    },
  })

  const findingReceipts: WorkflowAssuranceFindingRunSummary[] = []
  for (const finding of input.execution.findings) {
    const incident = await upsertWorkflowAssuranceIncidentFromResultInTx(tx, {
      organizationId: input.organizationId,
      definitionId: input.definitionId,
      checkRunId: created.id,
      definition: input.definition,
      result: finding,
      actorId: input.actorId,
    })
    const stored = await tx.workflowAssuranceCheckFinding.create({
      data: {
        organizationId: input.organizationId,
        checkRunId: created.id,
        incidentId: incident?.id ?? null,
        ordinal: finding.ordinal,
        status: RESULT_STATUS_TO_PRISMA[finding.status],
        severity: SEVERITY_TO_PRISMA[finding.severity],
        sourceType: finding.sourceType,
        sourceId: finding.sourceId,
        sourceHash: finding.sourceHash,
        fingerprint: finding.fingerprint,
        scannedCount: finding.counts.scanned,
        passedCount: finding.counts.passed,
        warningCount: finding.counts.warning,
        failedCount: finding.counts.failed,
        blockedCount: finding.counts.blocked,
        skippedCount: finding.counts.skipped,
        errorCount: finding.counts.error,
        message: finding.message,
        recommendedAction: finding.recommendedAction,
        evidenceLinks: finding.evidenceLinks as Prisma.InputJsonValue,
        resultMetadata: finding.metadata as Prisma.InputJsonValue,
        errorCode: finding.errorCode,
        errorMessage: finding.errorMessage,
      },
    })

    findingReceipts.push({
      id: stored.id,
      ordinal: finding.ordinal,
      status: finding.status,
      severity: finding.severity,
      sourceType: finding.sourceType,
      sourceId: finding.sourceId,
      sourceHash: finding.sourceHash,
      fingerprint: finding.fingerprint,
      incidentId: incident?.id,
    })
  }

  return {
    checkRunId: created.id,
    executionKey: input.executionKey,
    executionDigest,
    replayed: false,
    startedAt: input.startedAt,
    completedAt: input.completedAt,
    durationMs: input.durationMs,
    incidentId: findingReceipts.find((finding) => finding.incidentId)?.incidentId,
    findings: findingReceipts,
  }
}

async function findExistingExecutionReceipt(
  input: WorkflowAssuranceDefinitionPersistenceInput,
  executionDigest: string,
) {
  const existing = await findExecutionByKey(db, input)
  return existing ? receiptFromStored(existing, input, executionDigest, true) : null
}

function findExecutionByKey(
  client: Pick<typeof db, "workflowAssuranceCheckRun"> | Prisma.TransactionClient,
  input: WorkflowAssuranceDefinitionPersistenceInput,
) {
  return client.workflowAssuranceCheckRun.findUnique({
    where: {
      workflow_assurance_run_execution_key: {
        organizationId: input.organizationId,
        checkKey: input.definition.checkKey,
        definitionVersion: input.definition.version,
        executionKey: input.executionKey,
      },
    },
    include: {
      findings: { orderBy: { ordinal: "asc" } },
    },
  })
}

function receiptFromStored(
  stored: StoredExecutionReceipt,
  input: WorkflowAssuranceDefinitionPersistenceInput,
  executionDigest: string,
  replayed: boolean,
): WorkflowAssuranceDefinitionPersistenceReceipt {
  if (stored.executionDigest !== executionDigest) {
    throw new ConflictError(
      "Workflow assurance execution key was already used for different evidence.",
    )
  }
  if (!stored.executionKey || !stored.completedAt || stored.durationMs === null) {
    throw new BusinessRuleError("Workflow assurance replay evidence is incomplete.")
  }
  if (stored.findings.length !== input.execution.findings.length) {
    throw new BusinessRuleError("Workflow assurance replay finding evidence is incomplete.")
  }

  const findings = stored.findings.map<WorkflowAssuranceFindingRunSummary>((storedFinding, index) => {
    const finding = input.execution.findings[index]
    if (
      storedFinding.ordinal !== finding.ordinal ||
      storedFinding.fingerprint !== finding.fingerprint ||
      storedFinding.sourceHash !== finding.sourceHash
    ) {
      throw new ConflictError(
        "Workflow assurance execution key was already used for different finding evidence.",
      )
    }

    return {
      id: storedFinding.id,
      ordinal: finding.ordinal,
      status: finding.status,
      severity: finding.severity,
      sourceType: finding.sourceType,
      sourceId: finding.sourceId,
      sourceHash: finding.sourceHash,
      fingerprint: finding.fingerprint,
      incidentId: storedFinding.incidentId ?? undefined,
    }
  })

  return {
    checkRunId: stored.id,
    executionKey: stored.executionKey,
    executionDigest,
    replayed,
    startedAt: stored.startedAt,
    completedAt: stored.completedAt,
    durationMs: stored.durationMs,
    incidentId: findings.find((finding) => finding.incidentId)?.incidentId,
    findings,
  }
}

function digestResult(result: WorkflowAssuranceDefinitionExecution["aggregate"]) {
  return {
    status: result.status,
    severity: result.severity,
    sourceType: result.sourceType ?? null,
    sourceId: result.sourceId ?? null,
    sourceHash: result.sourceHash,
    fingerprint: result.fingerprint,
    evidenceLinks: result.evidenceLinks,
    recommendedAction: result.recommendedAction ?? null,
    message: result.message,
    counts: result.counts,
    metadata: result.metadata,
    errorCode: result.errorCode ?? null,
    errorMessage: result.errorMessage ?? null,
  }
}

export function normalizeWorkflowAssuranceExecutionKey(value: string) {
  const normalized = value.trim()
  if (!normalized) {
    throw new BusinessRuleError("Workflow assurance execution key is required.")
  }
  if (normalized.length > EXECUTION_KEY_MAX_LENGTH) {
    throw new BusinessRuleError(
      `Workflow assurance execution key cannot exceed ${EXECUTION_KEY_MAX_LENGTH} characters.`,
    )
  }
  return normalized
}
