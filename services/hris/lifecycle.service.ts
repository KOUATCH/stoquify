import "server-only"

import {
  PayrollContractStatus,
  PayrollEmployeeStatus,
  PayrollRubriqueAssignmentStatus,
  Prisma,
} from "@prisma/client"
import { z } from "zod"

import { hasAnyRbacPermission } from "@/lib/security/rbac-permissions"
import { db } from "@/prisma/db"
import {
  BusinessRuleError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "@/services/_shared/action-errors"
import {
  hashBusinessPayload,
  markBusinessEventAppliedInTx,
  recordBusinessEventInTx,
} from "@/services/events/business-event.service"
import { resolveHrisPeopleAccessScope } from "@/services/hris/org.service"
import { assertPayrollEmployeeLocationInOrganization } from "@/services/payroll/org-manager-scope.service"
import { lockOperationalEmployeeInTx } from "./attendance-correction"
import { projectEmploymentAsOf } from "./employment-projection"
import { syncLifecycleTaskEventInTx } from "./lifecycle-task.service"
import { evaluateHrisContractReadinessProof, evaluateHrisPaymentDestinationReadinessProof } from "./payroll-readiness-contract"

type DbClient = typeof db | Prisma.TransactionClient
type BusinessEventTx = Parameters<typeof recordBusinessEventInTx>[0]

const lifecycleTypeSchema = z.enum([
  "ONBOARD",
  "TRANSFER",
  "PROMOTION",
  "SUSPEND",
  "REINSTATE",
  "TERMINATE",
  "OFFBOARD",
  "REHIRE",
])

const lifecycleTargetSchema = z.object({
  locationId: z.string().trim().min(1).optional().nullable(),
  department: z.string().trim().min(1).max(120).optional().nullable(),
  jobTitle: z.string().trim().min(1).max(120).optional().nullable(),
  costCenter: z.string().trim().min(1).max(80).optional().nullable(),
}).strict()

const lifecycleRequestInputSchema = z.object({
  organizationId: z.string().trim().min(1),
  actorId: z.string().trim().min(1),
  actorPermissions: z.array(z.string().trim().min(1)).default([]),
  employeeId: z.string().trim().min(1),
  type: lifecycleTypeSchema,
  effectiveAt: z.coerce.date(),
  reason: z.string().trim().min(3).max(500),
  evidenceHash: z.string().trim().min(12).max(256),
  target: lifecycleTargetSchema.default({}),
  idempotencyKey: z.string().trim().min(1).optional(),
})

const lifecycleDecisionInputSchema = z.object({
  organizationId: z.string().trim().min(1),
  actorId: z.string().trim().min(1),
  actorPermissions: z.array(z.string().trim().min(1)).default([]),
  employeeId: z.string().trim().min(1),
  requestId: z.string().trim().min(1),
  decisionReason: z.string().trim().min(3).max(500),
  approvalEvidenceHash: z.string().trim().min(12).max(256).optional(),
  idempotencyKey: z.string().trim().min(1).optional(),
})

const lifecycleApplyInputSchema = z.object({
  organizationId: z.string().trim().min(1),
  actorId: z.string().trim().min(1),
  actorPermissions: z.array(z.string().trim().min(1)).default([]),
  employeeId: z.string().trim().min(1),
  requestId: z.string().trim().min(1),
  idempotencyKey: z.string().trim().min(1).optional(),
})

const lifecycleTimelineInputSchema = z.object({
  organizationId: z.string().trim().min(1),
  actorId: z.string().trim().min(1).optional().nullable(),
  actorPermissions: z.array(z.string().trim().min(1)).default([]),
  employeeId: z.string().trim().min(1),
  limit: z.number().int().positive().max(100).default(50),
})

const lifecyclePendingSchema = z.object({
  requestId: z.string().min(1),
  type: lifecycleTypeSchema,
  status: z.enum(["REQUESTED", "APPROVED"]),
  fromStatus: z.nativeEnum(PayrollEmployeeStatus),
  targetStatus: z.nativeEnum(PayrollEmployeeStatus),
  effectiveAt: z.string().datetime(),
  reasonHash: z.string().min(12),
  evidenceHash: z.string().min(12),
  target: lifecycleTargetSchema,
  requestedById: z.string().min(1),
  requestedAt: z.string().datetime(),
  approvedById: z.string().min(1).optional(),
  approvedAt: z.string().datetime().optional(),
  approvalEvidenceHash: z.string().min(12).optional(),
  decisionReasonHash: z.string().min(12).optional(),
  approvalEventId: z.string().min(1).optional(),
  sourceStateHash: z.string().min(12).optional(),
})

const READ_PERMISSIONS = ["hris.people.read", "hris.people.manage"] as const
const MANAGE_PERMISSIONS = ["hris.people.manage"] as const
const LIFECYCLE_EVENT_TYPES = [
  "hris.employee.lifecycle.requested",
  "hris.employee.lifecycle.approved",
  "hris.employee.lifecycle.rejected",
  "hris.employee.lifecycle.applied",
] as const

export type HrisLifecycleType = z.output<typeof lifecycleTypeSchema>
export type HrisLifecycleRequestInput = z.input<typeof lifecycleRequestInputSchema>
export type HrisLifecycleDecisionInput = z.input<typeof lifecycleDecisionInputSchema>
export type HrisLifecycleApplyInput = z.input<typeof lifecycleApplyInputSchema>
export type HrisLifecycleTimelineInput = z.input<typeof lifecycleTimelineInputSchema>
export type HrisLifecyclePending = z.output<typeof lifecyclePendingSchema>

function assertPermission(actorPermissions: readonly string[], required: readonly string[], action: string) {
  if (!hasAnyRbacPermission(actorPermissions, required)) {
    throw new ForbiddenError(`Missing permission for ${action}.`)
  }
}

function hasRootTransaction(client: DbClient): client is typeof db {
  return typeof (client as { $transaction?: unknown }).$transaction === "function"
}

async function inTransaction<T>(client: DbClient, fn: (tx: Prisma.TransactionClient) => Promise<T>) {
  if (hasRootTransaction(client)) return client.$transaction((tx) => fn(tx))
  return fn(client as Prisma.TransactionClient)
}

function metadataRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>
}

function safeJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue
}

function prefixedHash(value: unknown) {
  return `sha256:${hashBusinessPayload(value)}`
}

function lifecycleProjection(metadata: unknown) {
  const root = metadataRecord(metadata)
  return metadataRecord(root.hrisLifecycle)
}

export function pendingHrisLifecycleFromMetadata(metadata: unknown): HrisLifecyclePending | null {
  const parsed = lifecyclePendingSchema.safeParse(lifecycleProjection(metadata).pending)
  return parsed.success ? parsed.data : null
}

function withLifecycleProjection(
  metadata: unknown,
  pending: HrisLifecyclePending | null,
  latest: Record<string, unknown>,
) {
  const root = metadataRecord(metadata)
  return safeJson({
    ...root,
    hrisLifecycle: {
      ...lifecycleProjection(metadata),
      version: 1,
      pending,
      latest,
      lastApplied: latest.status === "APPLIED" ? latest : lifecycleProjection(metadata).lastApplied
        ?? (metadataRecord(lifecycleProjection(metadata).latest).status === "APPLIED" ? lifecycleProjection(metadata).latest : null),
      updatedAt: new Date().toISOString(),
      gate: "stoquify-hris-05-lifecycle-workflows",
    },
  })
}

function targetStatusFor(type: HrisLifecycleType) {
  switch (type) {
    case "ONBOARD":
    case "REINSTATE":
    case "REHIRE":
      return PayrollEmployeeStatus.ACTIVE
    case "SUSPEND":
      return PayrollEmployeeStatus.SUSPENDED
    case "TERMINATE":
      return PayrollEmployeeStatus.TERMINATED
    case "OFFBOARD":
      return PayrollEmployeeStatus.ARCHIVED
    case "TRANSFER":
    case "PROMOTION":
      return PayrollEmployeeStatus.ACTIVE
  }
}

function assertTransition(type: HrisLifecycleType, status: PayrollEmployeeStatus) {
  const allowed: Record<HrisLifecycleType, PayrollEmployeeStatus[]> = {
    ONBOARD: [PayrollEmployeeStatus.DRAFT],
    TRANSFER: [PayrollEmployeeStatus.ACTIVE],
    PROMOTION: [PayrollEmployeeStatus.ACTIVE],
    SUSPEND: [PayrollEmployeeStatus.ACTIVE],
    REINSTATE: [PayrollEmployeeStatus.SUSPENDED],
    TERMINATE: [PayrollEmployeeStatus.ACTIVE, PayrollEmployeeStatus.SUSPENDED],
    OFFBOARD: [PayrollEmployeeStatus.TERMINATED],
    REHIRE: [PayrollEmployeeStatus.TERMINATED, PayrollEmployeeStatus.ARCHIVED],
  }
  if (!allowed[type].includes(status)) {
    throw new BusinessRuleError(`${type} is not allowed while employee status is ${status}.`)
  }
}

function assertTarget(type: HrisLifecycleType, target: z.output<typeof lifecycleTargetSchema>) {
  const hasOrgChange = [target.locationId, target.department, target.costCenter].some(
    (value) => value !== undefined,
  )
  if (type === "TRANSFER" && !hasOrgChange) {
    throw new BusinessRuleError("Transfer requests require a location, department, or cost-center change.")
  }
  if (type === "PROMOTION" && target.jobTitle === undefined) {
    throw new BusinessRuleError("Promotion requests require a job-title change.")
  }
}

async function findEmployee(tx: Prisma.TransactionClient, organizationId: string, employeeId: string) {
  await lockOperationalEmployeeInTx(tx, organizationId, employeeId)
  // Row locking also orders writers which update the existing employee master.
  await tx.$queryRaw(Prisma.sql`SELECT id FROM payroll_employees WHERE id = ${employeeId} AND "organizationId" = ${organizationId} FOR UPDATE`)
  const employee = await tx.payrollEmployee.findFirst({
    where: { id: employeeId, organizationId, deletedAt: null },
  })
  if (!employee) throw new NotFoundError("HRIS employee not found")
  return employee
}

export function employeeSnapshot(employee: {
  id: string
  employeeNumber: string
  status: PayrollEmployeeStatus
  hireDate: Date
  terminationDate: Date | null
  locationId: string | null
  department: string | null
  jobTitle: string | null
  costCenter: string | null
}) {
  return {
    id: employee.id,
    employeeNumber: employee.employeeNumber,
    status: employee.status,
    hireDate: employee.hireDate.toISOString(),
    terminationDate: employee.terminationDate?.toISOString() ?? null,
    locationId: employee.locationId,
    department: employee.department,
    jobTitle: employee.jobTitle,
    costCenter: employee.costCenter,
  }
}

async function recordLifecycleEvent(
  tx: Prisma.TransactionClient,
  input: {
    organizationId: string
    actorId: string
    employeeId: string
    eventType: typeof LIFECYCLE_EVENT_TYPES[number]
    idempotencyKey: string
    payload: Record<string, unknown>
    documentHash?: string
    severity?: "info" | "warning"
  },
) {
  const result = await recordBusinessEventInTx(tx as unknown as BusinessEventTx, {
    organizationId: input.organizationId,
    eventType: input.eventType,
    eventSource: "INTERNAL",
    schemaVersion: 1,
    idempotencyKey: input.idempotencyKey,
    payload: input.payload,
    actorId: input.actorId,
    sourceId: input.employeeId,
    documentHash: input.documentHash,
    metadata: { gate: "stoquify-hris-05-lifecycle-workflows" },
    outboxMessages: [{
      channel: "NOTIFICATION",
      eventName: input.eventType.replaceAll(".", "_"),
      destination: "hris",
      payload: {
        organizationId: input.organizationId,
        employeeId: input.employeeId,
        severity: input.severity ?? "info",
      },
    }],
  })
  await markBusinessEventAppliedInTx(tx as unknown as BusinessEventTx, input.organizationId, result.event.id)
  return result
}

async function auditLifecycle(
  tx: Prisma.TransactionClient,
  input: {
    organizationId: string
    actorId: string | null
    employeeId: string
    action: string
    before: unknown
    after: unknown
    businessEventId?: string
  },
) {
  await tx.auditLog.create({
    data: {
      entityType: "PayrollEmployeeLifecycle",
      entityId: input.employeeId,
      action: input.action,
      userId: input.actorId,
      organizationId: input.organizationId,
      changes: safeJson({
        before: input.before,
        after: input.after,
        businessEventId: input.businessEventId ?? null,
      }),
    },
  })
}

function mutationResult(employee: Awaited<ReturnType<typeof findEmployee>>, workflow: HrisLifecyclePending, businessEventId: string) {
  return {
    employee: employeeSnapshot(employee),
    workflow,
    businessEventId,
    dataOwnership: {
      sourceOfTruth: "HRIS_LIFECYCLE_SERVICE",
      eventAuthority: "BUSINESS_EVENT",
      projection: "PayrollEmployee.metadata.hrisLifecycle",
    } as const,
  }
}

export async function requestHrisEmployeeLifecycle(
  input: HrisLifecycleRequestInput,
  client: DbClient = db,
) {
  const parsed = lifecycleRequestInputSchema.parse(input)
  assertTerminationDate(parsed.type, parsed.effectiveAt)
  assertPermission(parsed.actorPermissions, MANAGE_PERMISSIONS, "HRIS lifecycle request")
  assertTarget(parsed.type, parsed.target)

  return inTransaction(client, async (tx) => {
    const employee = await findEmployee(tx, parsed.organizationId, parsed.employeeId)
    assertTransition(parsed.type, employee.status)

    const targetLocationId = Object.prototype.hasOwnProperty.call(parsed.target, "locationId")
      ? await assertPayrollEmployeeLocationInOrganization(tx, parsed.organizationId, parsed.target.locationId)
      : undefined
    const target = {
      ...parsed.target,
      ...(targetLocationId !== undefined ? { locationId: targetLocationId } : {}),
    }
    const reasonHash = prefixedHash({ reason: parsed.reason.trim() })
    const targetStatus = targetStatusFor(parsed.type)
    const payload = {
      employeeId: employee.id,
      type: parsed.type,
      fromStatus: employee.status,
      targetStatus,
      effectiveAt: parsed.effectiveAt.toISOString(),
      target,
      reasonHash,
      evidenceHash: parsed.evidenceHash,
    }
    const requestHash = prefixedHash(payload)
    const existingPending = pendingHrisLifecycleFromMetadata(employee.metadata)
    if (!existingPending) {
      await assertNoCertifiedPayrollEvidence(tx, {
        organizationId: parsed.organizationId, employeeId: employee.id, effectiveAt: parsed.effectiveAt,
      })
    }
    const eventResult = await recordLifecycleEvent(tx, {
      organizationId: parsed.organizationId,
      actorId: parsed.actorId,
      employeeId: employee.id,
      eventType: "hris.employee.lifecycle.requested",
      idempotencyKey: parsed.idempotencyKey ?? `hris-lifecycle-request:${parsed.organizationId}:${employee.id}:${requestHash}`,
      payload,
      documentHash: parsed.evidenceHash,
    })

    if (existingPending) {
      if (existingPending.requestId === eventResult.event.id) {
        return mutationResult(employee, existingPending, eventResult.event.id)
      }
      throw new ConflictError("Employee already has an open lifecycle request.")
    }

    const workflow: HrisLifecyclePending = {
      requestId: eventResult.event.id,
      type: parsed.type,
      status: "REQUESTED",
      fromStatus: employee.status,
      targetStatus,
      effectiveAt: parsed.effectiveAt.toISOString(),
      reasonHash,
      evidenceHash: parsed.evidenceHash,
      target,
      requestedById: parsed.actorId,
      requestedAt: new Date().toISOString(),
      sourceStateHash: prefixedHash(employeeSnapshot(employee)),
    }
    const updated = await tx.payrollEmployee.update({
      where: { id: employee.id, organizationId: parsed.organizationId },
      data: {
        metadata: withLifecycleProjection(employee.metadata, workflow, {
          requestId: workflow.requestId,
          type: workflow.type,
          status: workflow.status,
          effectiveAt: workflow.effectiveAt,
          businessEventId: eventResult.event.id,
        }),
      },
    })
    await auditLifecycle(tx, {
      organizationId: parsed.organizationId,
      actorId: parsed.actorId,
      employeeId: employee.id,
      action: "HRIS_EMPLOYEE_LIFECYCLE_REQUESTED",
      before: employeeSnapshot(employee),
      after: { ...employeeSnapshot(updated), workflow },
      businessEventId: eventResult.event.id,
    })
    return mutationResult(updated, workflow, eventResult.event.id)
  })
}

export async function approveHrisEmployeeLifecycle(
  input: HrisLifecycleDecisionInput,
  client: DbClient = db,
) {
  const parsed = lifecycleDecisionInputSchema.parse(input)
  assertPermission(parsed.actorPermissions, MANAGE_PERMISSIONS, "HRIS lifecycle approval")
  if (!parsed.approvalEvidenceHash) {
    throw new BusinessRuleError("Lifecycle approval requires approval evidence.")
  }

  return inTransaction(client, async (tx) => {
    const employee = await findEmployee(tx, parsed.organizationId, parsed.employeeId)
    const pending = pendingHrisLifecycleFromMetadata(employee.metadata)
    if (!pending || pending.requestId !== parsed.requestId) {
      throw new NotFoundError("Open lifecycle request not found")
    }
    if (pending.requestedById === parsed.actorId) {
      throw new ForbiddenError("Lifecycle requester cannot approve their own request.")
    }
    if (pending.status !== "REQUESTED") {
      throw new BusinessRuleError("Only requested lifecycle changes can be approved.")
    }
    if (employee.status !== pending.fromStatus) {
      throw new ConflictError("Employee status changed after the lifecycle request was created.")
    }
    await assertNoCertifiedPayrollEvidence(tx, {
      organizationId: parsed.organizationId, employeeId: employee.id, effectiveAt: new Date(pending.effectiveAt),
    })

    const decisionReasonHash = prefixedHash({ decisionReason: parsed.decisionReason.trim() })
    const eventResult = await recordLifecycleEvent(tx, {
      organizationId: parsed.organizationId,
      actorId: parsed.actorId,
      employeeId: employee.id,
      eventType: "hris.employee.lifecycle.approved",
      idempotencyKey: parsed.idempotencyKey ?? `hris-lifecycle-approve:${parsed.organizationId}:${pending.requestId}`,
      payload: {
        employeeId: employee.id,
        requestId: pending.requestId,
        type: pending.type,
        effectiveAt: pending.effectiveAt,
        decisionReasonHash,
        approvalEvidenceHash: parsed.approvalEvidenceHash,
      },
      documentHash: parsed.approvalEvidenceHash,
    })
    const workflow: HrisLifecyclePending = {
      ...pending,
      status: "APPROVED",
      approvedById: parsed.actorId,
      approvedAt: new Date().toISOString(),
      approvalEvidenceHash: parsed.approvalEvidenceHash,
      decisionReasonHash,
      approvalEventId: eventResult.event.id,
    }
    const updated = await tx.payrollEmployee.update({
      where: { id: employee.id, organizationId: parsed.organizationId },
      data: {
        metadata: withLifecycleProjection(employee.metadata, workflow, {
          requestId: workflow.requestId,
          type: workflow.type,
          status: workflow.status,
          effectiveAt: workflow.effectiveAt,
          businessEventId: eventResult.event.id,
        }),
      },
    })
    await auditLifecycle(tx, {
      organizationId: parsed.organizationId,
      actorId: parsed.actorId,
      employeeId: employee.id,
      action: "HRIS_EMPLOYEE_LIFECYCLE_APPROVED",
      before: { ...employeeSnapshot(employee), workflow: pending },
      after: { ...employeeSnapshot(updated), workflow },
      businessEventId: eventResult.event.id,
    })
    await syncLifecycleTaskEventInTx(tx, parsed.organizationId, employee.id, eventResult.event.id)
    return mutationResult(updated, workflow, eventResult.event.id)
  })
}

export async function rejectHrisEmployeeLifecycle(
  input: HrisLifecycleDecisionInput,
  client: DbClient = db,
) {
  const parsed = lifecycleDecisionInputSchema.parse(input)
  assertPermission(parsed.actorPermissions, MANAGE_PERMISSIONS, "HRIS lifecycle rejection")

  return inTransaction(client, async (tx) => {
    const employee = await findEmployee(tx, parsed.organizationId, parsed.employeeId)
    const pending = pendingHrisLifecycleFromMetadata(employee.metadata)
    if (!pending || pending.requestId !== parsed.requestId) {
      throw new NotFoundError("Open lifecycle request not found")
    }
    if (pending.requestedById === parsed.actorId) {
      throw new ForbiddenError("Lifecycle requester cannot reject their own request.")
    }
    if (pending.status !== "REQUESTED" && pending.status !== "APPROVED") {
      throw new BusinessRuleError("Only requested or approved, unapplied lifecycle changes can be rejected.")
    }

    const decisionReasonHash = prefixedHash({ decisionReason: parsed.decisionReason.trim() })
    const eventResult = await recordLifecycleEvent(tx, {
      organizationId: parsed.organizationId,
      actorId: parsed.actorId,
      employeeId: employee.id,
      eventType: "hris.employee.lifecycle.rejected",
      idempotencyKey: parsed.idempotencyKey ?? `hris-lifecycle-reject:${parsed.organizationId}:${pending.requestId}`,
      payload: {
        employeeId: employee.id,
        requestId: pending.requestId,
        type: pending.type,
        effectiveAt: pending.effectiveAt,
        decisionReasonHash,
      },
      severity: "warning",
    })
    const latest = {
      requestId: pending.requestId,
      type: pending.type,
      status: "REJECTED",
      effectiveAt: pending.effectiveAt,
      decisionReasonHash,
      businessEventId: eventResult.event.id,
      decidedAt: new Date().toISOString(),
    }
    const updated = await tx.payrollEmployee.update({
      where: { id: employee.id, organizationId: parsed.organizationId },
      data: { metadata: withLifecycleProjection(employee.metadata, null, latest) },
    })
    await auditLifecycle(tx, {
      organizationId: parsed.organizationId,
      actorId: parsed.actorId,
      employeeId: employee.id,
      action: "HRIS_EMPLOYEE_LIFECYCLE_REJECTED",
      before: { ...employeeSnapshot(employee), workflow: pending },
      after: { ...employeeSnapshot(updated), workflow: latest },
      businessEventId: eventResult.event.id,
    })
    await syncLifecycleTaskEventInTx(tx, parsed.organizationId, employee.id, eventResult.event.id)
    return {
      employee: employeeSnapshot(updated),
      workflow: latest,
      businessEventId: eventResult.event.id,
    }
  })
}

async function assertNoCertifiedPayrollEvidence(
  tx: Prisma.TransactionClient,
  input: { organizationId: string; employeeId: string; effectiveAt: Date },
) {
  const [runLine, frozenAttendance] = await Promise.all([
    tx.payrollRunLine.findFirst({
      where: {
        organizationId: input.organizationId,
        employeeId: input.employeeId,
        payrollRun: { payrollPeriod: { periodEnd: { gte: input.effectiveAt } } },
      },
      select: { id: true },
    }),
    tx.payrollAttendanceSnapshot.findFirst({
      where: {
        organizationId: input.organizationId,
        employeeId: input.employeeId,
        status: "FROZEN",
        periodEnd: { gte: input.effectiveAt },
      },
      select: { id: true },
    }),
  ])
  if (runLine || frozenAttendance) {
    throw new BusinessRuleError(
      "Lifecycle effective date overlaps certified payroll input. Normal lifecycle application is unavailable for this date; an independent reviewer can reject an unapplied proposal. Retrospective changes require a separately supported correction process.",
    )
  }
}

async function assertStarterReadiness(
  tx: Prisma.TransactionClient,
  employee: Awaited<ReturnType<typeof findEmployee>>,
  effectiveAt: Date,
) {
  const contracts = await tx.payrollContract.findMany({
    where: {
      organizationId: employee.organizationId,
      employeeId: employee.id,
      status: PayrollContractStatus.ACTIVE,
      effectiveFrom: { lte: effectiveAt },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: effectiveAt } }],
      deletedAt: null,
    },
    select: { id: true, signedDocumentHash: true, activatedBusinessEventId: true, metadata: true },
    take: 2,
  })
  const proof = evaluateHrisContractReadinessProof(contracts.length === 1 ? contracts[0] : null)
  if (!proof.approvalValid || !proof.documentValid) {
    throw new BusinessRuleError("Onboarding and rehire require an approved active contract covering the effective date.")
  }
  const destination = await tx.payrollPaymentDestinationChangeRequest.findFirst({
    where: { organizationId: employee.organizationId, employeeId: employee.id, status: "APPLIED", deletedAt: null },
    orderBy: [{ appliedAt: "desc" }, { id: "desc" }],
  })
  if (!evaluateHrisPaymentDestinationReadinessProof({
    employeeMetadata: employee.metadata,
    paymentDestinationHash: employee.paymentDestinationHash,
    paymentDestinationRequest: destination ? { ...destination, appliedAt: destination.appliedAt?.toISOString() ?? null } : null,
  })) {
    throw new BusinessRuleError("Onboarding and rehire require a verified payroll payment destination.")
  }
}

function dayBefore(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate() - 1))
}

function assertTerminationDate(type: string, effectiveAt: Date) {
  if (type === "TERMINATE" && effectiveAt.getTime() !== Date.UTC(effectiveAt.getUTCFullYear(), effectiveAt.getUTCMonth(), effectiveAt.getUTCDate())) {
    throw new BusinessRuleError("HRIS_TERMINATION_DATE_REQUIRED: Use a date at midnight UTC; partial-day termination is not supported.")
  }
}

async function closeLeaverAssignments(
  tx: Prisma.TransactionClient,
  input: { organizationId: string; employeeId: string; effectiveAt: Date },
) {
  const effectiveTo = dayBefore(input.effectiveAt)
  const contracts = await tx.payrollContract.findMany({where: {
    organizationId: input.organizationId, employeeId: input.employeeId,
    status: {in: [PayrollContractStatus.DRAFT, PayrollContractStatus.ACTIVE, PayrollContractStatus.SUSPENDED]}, deletedAt: null,
  }})
  for (const contract of contracts) {
    const cancelled = contract.status === PayrollContractStatus.DRAFT || contract.effectiveFrom >= input.effectiveAt
    await tx.payrollContract.update({where: {id: contract.id, organizationId: input.organizationId}, data: {
      status: cancelled ? PayrollContractStatus.CANCELLED : PayrollContractStatus.ENDED,
      ...(!cancelled ? {effectiveTo: contract.effectiveTo && contract.effectiveTo < effectiveTo ? contract.effectiveTo : effectiveTo} : {}),
      metadata: safeJson({...metadataRecord(contract.metadata), hrisLifecycleClosure: {
        status: cancelled ? "CANCELLED" : "ENDED", previousStatus: contract.status, effectiveAt: input.effectiveAt.toISOString(),
      }}),
    }})
  }
  const assignments = await tx.payrollEmployeeRubriqueAssignment.findMany({
    where: {
      organizationId: input.organizationId,
      employeeId: input.employeeId,
      status: { in: [PayrollRubriqueAssignmentStatus.DRAFT, PayrollRubriqueAssignmentStatus.ACTIVE, PayrollRubriqueAssignmentStatus.SUSPENDED] },
      deletedAt: null,
    },
  })
  for (const assignment of assignments) {
    const cancelled = assignment.status === PayrollRubriqueAssignmentStatus.DRAFT || assignment.effectiveFrom >= input.effectiveAt
    await tx.payrollEmployeeRubriqueAssignment.update({
      where: { id: assignment.id, organizationId: input.organizationId },
      data: {
        status: PayrollRubriqueAssignmentStatus.ENDED,
        // Earlier end dates remain historical facts. Never extend them at departure.
        ...(!cancelled ? { effectiveTo: assignment.effectiveTo && assignment.effectiveTo < effectiveTo ? assignment.effectiveTo : effectiveTo } : {}),
        metadata: safeJson({ ...metadataRecord(assignment.metadata), hrisLifecycleClosure: {
          status: cancelled ? "CANCELLED" : "ENDED", previousStatus: assignment.status,
          effectiveAt: input.effectiveAt.toISOString(),
        } }),
      },
    })
  }
}

export async function applyApprovedHrisEmployeeLifecycle(
  input: HrisLifecycleApplyInput,
  client: DbClient = db,
) {
  const parsed = lifecycleApplyInputSchema.parse(input)
  assertPermission(parsed.actorPermissions, MANAGE_PERMISSIONS, "HRIS lifecycle application")

  return inTransaction(client, async (tx) => {
    const employee = await findEmployee(tx, parsed.organizationId, parsed.employeeId)
    const pending = pendingHrisLifecycleFromMetadata(employee.metadata)
    if (!pending || pending.requestId !== parsed.requestId) {
      const retained = await tx.businessEvent.findFirst({ where: {
        organizationId: parsed.organizationId, sourceId: employee.id,
        eventType: "hris.employee.lifecycle.applied", status: "APPLIED",
        payload: { path: ["requestId"], equals: parsed.requestId },
      } })
      const payload = metadataRecord(retained?.payload)
      if (retained && payload.after && payload.workflow) {
        return { employee: payload.after as ReturnType<typeof employeeSnapshot>, workflow: metadataRecord(payload.workflow),
          businessEventId: retained.id, applied: true, replayed: true }
      }
      throw new NotFoundError("Approved lifecycle request not found")
    }
    if (pending.status !== "APPROVED" || !pending.approvalEvidenceHash || !pending.approvedById) {
      throw new BusinessRuleError("Only approved lifecycle changes with approval evidence can be applied.")
    }
    if (pending.requestedById === parsed.actorId) {
      throw new ForbiddenError("Lifecycle requester cannot apply their own request.")
    }
    if (employee.status !== pending.fromStatus) {
      throw new ConflictError("Employee status changed after the lifecycle request was approved.")
    }

    if (!pending.sourceStateHash || pending.sourceStateHash !== prefixedHash(employeeSnapshot(employee))) {
      throw new ConflictError("HRIS_LIFECYCLE_SOURCE_CHANGED: Review the current employment state and submit a fresh request.")
    }

    const effectiveAt = new Date(pending.effectiveAt)
    assertTerminationDate(pending.type, effectiveAt)
    const now = new Date()
    if (effectiveAt > now) {
      return { ...mutationResult(employee, pending, pending.approvalEventId ?? pending.requestId),
        applied: false, replayed: false, scheduledFor: pending.effectiveAt }
    }
    const prior = metadataRecord(lifecycleProjection(employee.metadata).lastApplied)
    if (prior.status === "APPLIED" && typeof prior.effectiveAt === "string" && effectiveAt <= new Date(prior.effectiveAt)) {
      throw new ConflictError("HRIS_LIFECYCLE_BACKDATED_CONFLICT: Reconcile the retained movement history before applying an earlier change.")
    }
    if (pending.target.locationId !== undefined) {
      await assertPayrollEmployeeLocationInOrganization(tx, parsed.organizationId, pending.target.locationId)
    }
    await assertNoCertifiedPayrollEvidence(tx, {
      organizationId: parsed.organizationId,
      employeeId: employee.id,
      effectiveAt,
    })
    if (pending.type === "ONBOARD" || pending.type === "REHIRE") {
      await assertStarterReadiness(tx, employee, effectiveAt)
    }
    if (pending.type === "TERMINATE") {
      await closeLeaverAssignments(tx, {
        organizationId: parsed.organizationId,
        employeeId: employee.id,
        effectiveAt,
      })
    }

    const latest = {
      requestId: pending.requestId,
      type: pending.type,
      status: "APPLIED",
      effectiveAt: pending.effectiveAt,
      approvalEvidenceHash: pending.approvalEvidenceHash,
      appliedAt: now.toISOString(),
    }
    const updateData: Prisma.PayrollEmployeeUpdateInput = {
      status: pending.targetStatus,
      metadata: withLifecycleProjection(employee.metadata, null, latest),
    }
    if (pending.type === "ONBOARD" || pending.type === "REHIRE") {
      updateData.hireDate = effectiveAt
      updateData.terminationDate = null
    }
    if (pending.type === "TERMINATE") updateData.terminationDate = effectiveAt
    if (pending.target.locationId !== undefined) updateData.locationId = pending.target.locationId
    if (pending.target.department !== undefined) updateData.department = pending.target.department
    if (pending.target.jobTitle !== undefined) updateData.jobTitle = pending.target.jobTitle
    if (pending.target.costCenter !== undefined) updateData.costCenter = pending.target.costCenter

    const updated = await tx.payrollEmployee.update({
      where: { id: employee.id, organizationId: parsed.organizationId },
      data: updateData,
    })
    const eventResult = await recordLifecycleEvent(tx, {
      organizationId: parsed.organizationId,
      actorId: parsed.actorId,
      employeeId: employee.id,
      eventType: "hris.employee.lifecycle.applied",
      idempotencyKey: parsed.idempotencyKey ?? `hris-lifecycle-apply:${parsed.organizationId}:${pending.requestId}`,
      payload: {
        employeeId: employee.id,
        requestId: pending.requestId,
        type: pending.type,
        fromStatus: pending.fromStatus,
        targetStatus: pending.targetStatus,
        effectiveAt: pending.effectiveAt,
        target: pending.target,
        approvalEvidenceHash: pending.approvalEvidenceHash,
        before: employeeSnapshot(employee),
        after: employeeSnapshot(updated),
        workflow: latest,
        followUpOwners: { access: "HR-17_ACCESS_REVOCATION", contracts: "EXISTING_CONTRACT_SERVICE", compensation: "EXISTING_COMPENSATION_SERVICE" },
      },
      documentHash: pending.approvalEvidenceHash,
    })
    const finalLatest = { ...latest, businessEventId: eventResult.event.id }
    const finalized = await tx.payrollEmployee.update({
      where: { id: employee.id, organizationId: parsed.organizationId },
      data: { metadata: withLifecycleProjection(updated.metadata, null, finalLatest) },
    })
    await auditLifecycle(tx, {
      organizationId: parsed.organizationId,
      actorId: parsed.actorId,
      employeeId: employee.id,
      action: "HRIS_EMPLOYEE_LIFECYCLE_APPLIED",
      before: { ...employeeSnapshot(employee), workflow: pending },
      after: { ...employeeSnapshot(finalized), workflow: finalLatest },
      businessEventId: eventResult.event.id,
    })
    await syncLifecycleTaskEventInTx(tx, parsed.organizationId, employee.id, eventResult.event.id)
    return {
      employee: employeeSnapshot(finalized),
      workflow: finalLatest,
      businessEventId: eventResult.event.id,
      dataOwnership: {
        sourceOfTruth: "HRIS_LIFECYCLE_SERVICE",
        eventAuthority: "BUSINESS_EVENT",
        projection: "PayrollEmployee.metadata.hrisLifecycle",
      } as const,
      applied: true,
      replayed: false,
    }
  })
}

export async function getHrisEmployeeLifecycleTimeline(
  input: HrisLifecycleTimelineInput,
  client: DbClient = db,
) {
  const parsed = lifecycleTimelineInputSchema.parse(input)
  assertPermission(parsed.actorPermissions, READ_PERMISSIONS, "HRIS lifecycle timeline read")
  const accessScope = await resolveHrisPeopleAccessScope({
    organizationId: parsed.organizationId,
    actorId: parsed.actorId ?? "",
    actorPermissions: parsed.actorPermissions,
    employeeId: parsed.employeeId,
    limit: 1,
  }, client)
  const employee = await client.payrollEmployee.findFirst({
    where: { id: parsed.employeeId, organizationId: parsed.organizationId, deletedAt: null },
    select: { id: true, employeeNumber: true, displayName: true, status: true, metadata: true },
  })
  if (!employee) throw new NotFoundError("HRIS employee not found")

  const events = await client.businessEvent.findMany({
    where: {
      organizationId: parsed.organizationId,
      sourceId: employee.id,
      eventType: { in: [...LIFECYCLE_EVENT_TYPES] },
    },
    orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
    take: parsed.limit,
    select: {
      id: true,
      eventType: true,
      status: true,
      actorId: true,
      occurredAt: true,
      processedAt: true,
      documentHash: true,
      payload: true,
    },
  })
  await client.auditLog.create({
    data: {
      entityType: "PayrollEmployeeLifecycle",
      entityId: employee.id,
      action: "HRIS_EMPLOYEE_LIFECYCLE_TIMELINE_READ",
      userId: parsed.actorId ?? null,
      organizationId: parsed.organizationId,
      changes: safeJson({ returnedCount: events.length }),
    },
  })

  return {
    organizationId: parsed.organizationId,
    employee: {
      id: employee.id,
      employeeNumber: employee.employeeNumber,
      displayName: employee.displayName,
      status: employee.status,
    },
    pending: pendingHrisLifecycleFromMetadata(employee.metadata),
    accessScope,
    events: events.map((event) => ({
      id: event.id,
      eventType: event.eventType,
      status: event.status,
      actorId: event.actorId,
      occurredAt: event.occurredAt.toISOString(),
      processedAt: event.processedAt?.toISOString() ?? null,
      documentHash: event.documentHash,
      payload: metadataRecord(event.payload),
    })),
    dataOwnership: {
      sourceOfTruth: "HRIS_LIFECYCLE_SERVICE",
      eventAuthority: "BUSINESS_EVENT",
      projection: "PayrollEmployee.metadata.hrisLifecycle",
    } as const,
  }
}

/** Explicit due execution remains the existing fresh-auth apply action; no timer. */
export async function getHrisEmploymentAsOf(input: HrisLifecycleTimelineInput & {asOf: Date}, client: DbClient = db) {
  const parsed=lifecycleTimelineInputSchema.parse(input)
  assertPermission(parsed.actorPermissions,READ_PERMISSIONS,"HRIS employment history")
  await resolveHrisPeopleAccessScope({...parsed,actorId:parsed.actorId??"",asOf:new Date(),employeeId:parsed.employeeId},client)
  return inTransaction(client,async tx=>{
    const employee=await findEmployee(tx,parsed.organizationId,parsed.employeeId)
    const events=await tx.businessEvent.findMany({where:{organizationId:parsed.organizationId,sourceId:employee.id,eventType:"hris.employee.lifecycle.applied",status:"APPLIED"},select:{id:true,payload:true}})
    const projection=projectEmploymentAsOf(employeeSnapshot(employee),events,input.asOf)
    return {...projection,pending:pendingHrisLifecycleFromMetadata(employee.metadata)}
  })
}
