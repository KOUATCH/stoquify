import "server-only"

import { Prisma } from "@prisma/client"
import { z } from "zod"

import { hasAnyRbacPermission } from "@/lib/security/rbac-permissions"
import { db } from "@/prisma/db"
import { ForbiddenError } from "@/services/_shared/action-errors"
import { resolveHrisPeopleAccessScope } from "@/services/hris/org.service"

const READ_PERMISSIONS = ["hris.people.read", "hris.people.manage"] as const
const MAX_EMPLOYEE_SCOPE = 500

export const hrisMovementDomainSchema = z.enum([
  "EMPLOYEE",
  "LIFECYCLE",
  "CONTRACT",
  "DOCUMENT",
  "COMPENSATION",
  "PAYMENT_DESTINATION",
  "ATTENDANCE",
  "PAYROLL",
  "PAYSLIP",
])

export const hrisMovementRiskSchema = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"])
export const hrisMovementOutcomeSchema = z.enum([
  "CREATED",
  "UPDATED",
  "TERMINATED",
  "REQUESTED",
  "APPROVED",
  "REJECTED",
  "APPLIED",
  "ATTACHED",
  "FROZEN",
  "CORRECTED",
  "CALCULATED",
  "POSTED",
  "EXPORTED",
  "RECORDED",
])
export const hrisMovementProofStateSchema = z.enum([
  "AUDIT_AND_EVENT",
  "EVENT_ONLY",
  "SOURCE_RECORD_ONLY",
  "FAILED_EVENT",
  "UNPROVEN",
])

const actorSchema = z.object({
  organizationId: z.string().trim().min(1),
  actorId: z.string().trim().min(1),
  actorPermissions: z.array(z.string().trim().min(1)).default([]),
})

export const hrisMovementHistoryInputSchema = actorSchema.extend({
  employeeId: z.string().trim().min(1).optional(),
  department: z.string().trim().min(1).max(120).optional(),
  locationId: z.string().trim().min(1).optional(),
  domain: hrisMovementDomainSchema.optional(),
  risk: hrisMovementRiskSchema.optional(),
  outcome: hrisMovementOutcomeSchema.optional(),
  proofState: hrisMovementProofStateSchema.optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  before: z.coerce.date().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
}).strict().superRefine((value, ctx) => {
  if (value.from && value.to && value.from > value.to) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["to"],
      message: "Movement history end date must not precede the start date.",
    })
  }
})

export type HrisMovementDomain = z.output<typeof hrisMovementDomainSchema>
export type HrisMovementRisk = z.output<typeof hrisMovementRiskSchema>
export type HrisMovementOutcome = z.output<typeof hrisMovementOutcomeSchema>
export type HrisMovementProofState = z.output<typeof hrisMovementProofStateSchema>
export type HrisMovementHistoryInput = z.input<typeof hrisMovementHistoryInputSchema>

type MovementDefinition = {
  domain: HrisMovementDomain
  title: string
  summary: string
  outcome: HrisMovementOutcome
  risk: HrisMovementRisk
  sourceLabel: string
}

const MOVEMENT_EVENT_DEFINITIONS = {
  "payroll.employee.source_data.upserted": {
    domain: "EMPLOYEE",
    title: "Employee source updated",
    summary: "Employee identity or employment source data changed.",
    outcome: "UPDATED",
    risk: "MEDIUM",
    sourceLabel: "People source",
  },
  "payroll.employee.evidence_attached": {
    domain: "EMPLOYEE",
    title: "Employee evidence attached",
    summary: "Evidence was attached to the employee source record.",
    outcome: "ATTACHED",
    risk: "MEDIUM",
    sourceLabel: "People source",
  },
  "hris.employee.lifecycle.requested": {
    domain: "LIFECYCLE",
    title: "Lifecycle change requested",
    summary: "A controlled employee lifecycle change entered review.",
    outcome: "REQUESTED",
    risk: "HIGH",
    sourceLabel: "HRIS lifecycle",
  },
  "hris.employee.lifecycle.approved": {
    domain: "LIFECYCLE",
    title: "Lifecycle change approved",
    summary: "A separate reviewer approved the lifecycle change.",
    outcome: "APPROVED",
    risk: "HIGH",
    sourceLabel: "HRIS lifecycle",
  },
  "hris.employee.lifecycle.rejected": {
    domain: "LIFECYCLE",
    title: "Lifecycle change rejected",
    summary: "The lifecycle request was rejected without changing employee truth.",
    outcome: "REJECTED",
    risk: "HIGH",
    sourceLabel: "HRIS lifecycle",
  },
  "hris.employee.lifecycle.applied": {
    domain: "LIFECYCLE",
    title: "Lifecycle change applied",
    summary: "An approved lifecycle change updated the employee source record.",
    outcome: "APPLIED",
    risk: "CRITICAL",
    sourceLabel: "HRIS lifecycle",
  },
  "payroll.contract.lifecycle.created": {
    domain: "CONTRACT",
    title: "Contract created",
    summary: "A draft employment contract record was created.",
    outcome: "CREATED",
    risk: "MEDIUM",
    sourceLabel: "HRIS contract",
  },
  "payroll.contract.lifecycle.updated": {
    domain: "CONTRACT",
    title: "Contract updated",
    summary: "The contract source record changed without exposing compensation values.",
    outcome: "UPDATED",
    risk: "HIGH",
    sourceLabel: "HRIS contract",
  },
  "payroll.contract.lifecycle.terminated": {
    domain: "CONTRACT",
    title: "Contract ended",
    summary: "The employment contract reached a controlled end transition.",
    outcome: "TERMINATED",
    risk: "CRITICAL",
    sourceLabel: "HRIS contract",
  },
  "hris.contract.activation.requested": {
    domain: "CONTRACT",
    title: "Contract activation requested",
    summary: "A draft contract entered activation review.",
    outcome: "REQUESTED",
    risk: "HIGH",
    sourceLabel: "HRIS contract",
  },
  "hris.contract.activation.approved": {
    domain: "CONTRACT",
    title: "Contract activation approved",
    summary: "Approved document evidence and contract controls allowed activation.",
    outcome: "APPROVED",
    risk: "CRITICAL",
    sourceLabel: "HRIS contract",
  },
  "hris.contract.document.requested": {
    domain: "DOCUMENT",
    title: "Contract document submitted",
    summary: "Redacted contract evidence entered document review.",
    outcome: "REQUESTED",
    risk: "HIGH",
    sourceLabel: "HRIS document evidence",
  },
  "hris.contract.document.approved": {
    domain: "DOCUMENT",
    title: "Contract document approved",
    summary: "Contract evidence passed the controlled document review.",
    outcome: "APPROVED",
    risk: "HIGH",
    sourceLabel: "HRIS document evidence",
  },
  "hris.compensation.assignment.requested": {
    domain: "COMPENSATION",
    title: "Compensation assignment requested",
    summary: "A redacted compensation assignment entered review.",
    outcome: "REQUESTED",
    risk: "HIGH",
    sourceLabel: "HRIS compensation",
  },
  "hris.compensation.assignment.approved": {
    domain: "COMPENSATION",
    title: "Compensation assignment approved",
    summary: "A reviewed compensation assignment became active.",
    outcome: "APPROVED",
    risk: "HIGH",
    sourceLabel: "HRIS compensation",
  },
  "payroll.salary_change.requested": {
    domain: "COMPENSATION",
    title: "Salary change requested",
    summary: "A salary change entered maker-checker review with values redacted.",
    outcome: "REQUESTED",
    risk: "CRITICAL",
    sourceLabel: "HRIS compensation",
  },
  "payroll.salary_change.approved": {
    domain: "COMPENSATION",
    title: "Salary change approved",
    summary: "A separate reviewer approved the salary change.",
    outcome: "APPROVED",
    risk: "CRITICAL",
    sourceLabel: "HRIS compensation",
  },
  "payroll.salary_change.rejected": {
    domain: "COMPENSATION",
    title: "Salary change rejected",
    summary: "The salary request was rejected without changing contract truth.",
    outcome: "REJECTED",
    risk: "HIGH",
    sourceLabel: "HRIS compensation",
  },
  "payroll.salary_change.applied": {
    domain: "COMPENSATION",
    title: "Salary change applied",
    summary: "An approved salary change created the effective contract revision.",
    outcome: "APPLIED",
    risk: "CRITICAL",
    sourceLabel: "HRIS compensation",
  },
  "payroll.payment_destination.requested": {
    domain: "PAYMENT_DESTINATION",
    title: "Payment destination change requested",
    summary: "A hashed payment destination change entered review.",
    outcome: "REQUESTED",
    risk: "CRITICAL",
    sourceLabel: "HRIS payment destination",
  },
  "payroll.payment_destination.approved": {
    domain: "PAYMENT_DESTINATION",
    title: "Payment destination change approved",
    summary: "A separate reviewer approved the destination change.",
    outcome: "APPROVED",
    risk: "CRITICAL",
    sourceLabel: "HRIS payment destination",
  },
  "payroll.payment_destination.rejected": {
    domain: "PAYMENT_DESTINATION",
    title: "Payment destination change rejected",
    summary: "The destination request was rejected without changing payment truth.",
    outcome: "REJECTED",
    risk: "HIGH",
    sourceLabel: "HRIS payment destination",
  },
  "payroll.payment_destination.applied": {
    domain: "PAYMENT_DESTINATION",
    title: "Payment destination change applied",
    summary: "An approved destination fingerprint became the payroll payment source.",
    outcome: "APPLIED",
    risk: "CRITICAL",
    sourceLabel: "HRIS payment destination",
  },
  "attendance.period.frozen": {
    domain: "ATTENDANCE",
    title: "Attendance period frozen",
    summary: "Certified time, leave, and attendance totals were frozen for payroll.",
    outcome: "FROZEN",
    risk: "HIGH",
    sourceLabel: "HRIS attendance",
  },
  "attendance.period.corrected": {
    domain: "ATTENDANCE",
    title: "Attendance snapshot corrected",
    summary: "A controlled correction superseded the prior attendance snapshot.",
    outcome: "CORRECTED",
    risk: "CRITICAL",
    sourceLabel: "HRIS attendance",
  },
  "payroll.run.calculated": {
    domain: "PAYROLL",
    title: "Payroll input calculated",
    summary: "Certified HRIS inputs were consumed by a payroll calculation.",
    outcome: "CALCULATED",
    risk: "HIGH",
    sourceLabel: "Payroll engine",
  },
  "payroll.run.posted": {
    domain: "PAYROLL",
    title: "Payroll run posted",
    summary: "The employee payroll result entered the accounting posting chain.",
    outcome: "POSTED",
    risk: "CRITICAL",
    sourceLabel: "Payroll engine",
  },
  "payroll.payslip.exported": {
    domain: "PAYSLIP",
    title: "Payslip exported",
    summary: "A controlled payslip export was generated with amounts redacted here.",
    outcome: "EXPORTED",
    risk: "MEDIUM",
    sourceLabel: "Payroll payslip",
  },
} as const satisfies Record<string, MovementDefinition>

type MovementEventType = keyof typeof MOVEMENT_EVENT_DEFINITIONS
const MOVEMENT_EVENT_TYPES = Object.keys(MOVEMENT_EVENT_DEFINITIONS) as MovementEventType[]

type MovementHistoryClient = typeof db | Prisma.TransactionClient

type EmployeeRecord = {
  id: string
  employeeNumber: string
  displayName: string
  department: string | null
  locationId: string | null
}

type BusinessEventRecord = {
  id: string
  eventType: string
  eventSource: string
  status: string
  payloadHash: string
  payload: Prisma.JsonValue
  occurredAt: Date
  recordedAt: Date
  processedAt: Date | null
  actorId: string | null
  sourceId: string | null
  documentHash: string | null
}

export type HrisMovementHistoryItem = {
  id: string
  domain: HrisMovementDomain
  title: string
  summary: string
  outcome: HrisMovementOutcome
  risk: HrisMovementRisk
  employee: {
    id: string
    employeeNumber: string
    displayName: string
    department: string | null
  }
  effectiveAt: string
  recordedAt: string
  actor: {
    kind: "AUTHENTICATED_USER" | "SYSTEM"
    label: string
    rawIdentifierIncluded: false
  }
  source: {
    label: string
    eventType: string
    eventSource: string
  }
  proof: ReturnType<typeof deriveHrisMovementProofState>
  redaction: {
    policy: "HRIS_MOVEMENT_DEFAULT_REDACTION"
    reasons: readonly [
      "RAW_EVENT_PAYLOAD_REDACTED",
      "SENSITIVE_BEFORE_AFTER_REDACTED",
      "ACTOR_IDENTIFIER_REDACTED",
      "PROOF_HASH_REDACTED",
    ]
  }
  detailHref: string
}

const PROOF_LABELS: Record<HrisMovementProofState, string> = {
  AUDIT_AND_EVENT: "Event + audit",
  EVENT_ONLY: "Event proof",
  SOURCE_RECORD_ONLY: "Source record",
  FAILED_EVENT: "Failed event",
  UNPROVEN: "Unproven",
}

export function deriveHrisMovementProofState(input: {
  hasBusinessEvent: boolean
  eventStatus: string | null
  payloadHashPresent: boolean
  auditLinked: boolean
  sourceRecordPresent: boolean
  documentEvidencePresent: boolean
}) {
  let state: HrisMovementProofState = "UNPROVEN"
  if (
    input.hasBusinessEvent &&
    (input.eventStatus === "FAILED" || input.eventStatus === "REJECTED")
  ) {
    state = "FAILED_EVENT"
  } else if (
    input.hasBusinessEvent &&
    input.eventStatus === "APPLIED" &&
    input.payloadHashPresent &&
    input.auditLinked
  ) {
    state = "AUDIT_AND_EVENT"
  } else if (input.hasBusinessEvent && input.payloadHashPresent) {
    state = "EVENT_ONLY"
  } else if (input.sourceRecordPresent) {
    state = "SOURCE_RECORD_ONLY"
  }

  return {
    state,
    label: PROOF_LABELS[state],
    eventStatus: input.eventStatus,
    payloadHashPresent: input.payloadHashPresent,
    auditLinked: input.auditLinked,
    sourceRecordPresent: input.sourceRecordPresent,
    documentEvidencePresent: input.documentEvidencePresent,
    rawHashesIncluded: false as const,
    consistent:
      state !== "AUDIT_AND_EVENT" ||
      (input.hasBusinessEvent &&
        input.eventStatus === "APPLIED" &&
        input.payloadHashPresent &&
        input.auditLinked),
  }
}

function assertPermission(actorPermissions: readonly string[]) {
  if (!hasAnyRbacPermission(actorPermissions, READ_PERMISSIONS)) {
    throw new ForbiddenError("Missing permission for HRIS movement history read.")
  }
}

function safeJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

function effectiveAt(payload: Prisma.JsonValue, occurredAt: Date) {
  const record = asRecord(payload)
  for (const key of ["effectiveAt", "effectiveFrom", "periodEnd", "generatedAt", "issuedAt"]) {
    const candidate = record[key]
    if (typeof candidate !== "string") continue
    const parsed = new Date(candidate)
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString()
  }
  return occurredAt.toISOString()
}

function addSourceEmployee(
  target: Map<string, Set<string>>,
  sourceId: string,
  employeeId: string,
) {
  const employeeIds = target.get(sourceId) ?? new Set<string>()
  employeeIds.add(employeeId)
  target.set(sourceId, employeeIds)
}

function collectAuditEventReferences(
  value: unknown,
  candidateIds: ReadonlySet<string>,
  result: Set<string>,
) {
  if (Array.isArray(value)) {
    for (const item of value) collectAuditEventReferences(item, candidateIds, result)
    return
  }
  if (!value || typeof value !== "object") return

  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (
      typeof nested === "string" &&
      key.toLowerCase().endsWith("businesseventid") &&
      candidateIds.has(nested)
    ) {
      result.add(nested)
    }
    collectAuditEventReferences(nested, candidateIds, result)
  }
}

function eventDateWhere(input: z.output<typeof hrisMovementHistoryInputSchema>) {
  const occurredAt: { gte?: Date; lte?: Date; lt?: Date } = {}
  if (input.from) occurredAt.gte = input.from
  if (input.to) occurredAt.lte = input.to
  if (input.before) occurredAt.lt = input.before
  return Object.keys(occurredAt).length > 0 ? { occurredAt } : {}
}

function sourceRecordDateWhere(input: z.output<typeof hrisMovementHistoryInputSchema>) {
  const createdAt: { gte?: Date; lte?: Date; lt?: Date } = {}
  if (input.from) createdAt.gte = input.from
  if (input.to) createdAt.lte = input.to
  if (input.before) createdAt.lt = input.before
  return Object.keys(createdAt).length > 0 ? { createdAt } : {}
}

function emptySummary() {
  return {
    matched: 0,
    returned: 0,
    auditAndEvent: 0,
    eventOnly: 0,
    sourceRecordOnly: 0,
    exceptions: 0,
    byDomain: Object.fromEntries(
      hrisMovementDomainSchema.options.map((domain) => [domain, 0]),
    ) as Record<HrisMovementDomain, number>,
  }
}

function movementRedaction() {
  return {
    policy: "HRIS_MOVEMENT_DEFAULT_REDACTION" as const,
    reasons: [
      "RAW_EVENT_PAYLOAD_REDACTED",
      "SENSITIVE_BEFORE_AFTER_REDACTED",
      "ACTOR_IDENTIFIER_REDACTED",
      "PROOF_HASH_REDACTED",
    ] as const,
  }
}

async function auditMovementRead(
  client: MovementHistoryClient,
  input: {
    organizationId: string
    actorId: string
    employeeId?: string
    sourceEventCount: number
    matchedCount: number
    returnedCount: number
    proofCounts: Record<HrisMovementProofState, number>
  },
) {
  await client.auditLog.create({
    data: {
      entityType: "HrisMovementHistory",
      entityId: input.employeeId ?? "tenant-movement-history",
      action: "HRIS_MOVEMENT_HISTORY_READ",
      userId: input.actorId,
      organizationId: input.organizationId,
      changes: safeJson({
        sourceEventCount: input.sourceEventCount,
        matchedCount: input.matchedCount,
        returnedCount: input.returnedCount,
        proofCounts: input.proofCounts,
        rawEventPayloadIncluded: false,
        sensitiveBeforeAfterIncluded: false,
        actorIdentifiersIncluded: false,
        rawProofHashesIncluded: false,
      }),
    },
  })
}

export async function getHrisMovementHistory(
  input: HrisMovementHistoryInput,
  client: MovementHistoryClient = db,
) {
  const parsed = hrisMovementHistoryInputSchema.parse(input)
  assertPermission(parsed.actorPermissions)

  const accessScope = await resolveHrisPeopleAccessScope({
    organizationId: parsed.organizationId,
    actorId: parsed.actorId,
    actorPermissions: parsed.actorPermissions,
    employeeId: parsed.employeeId,
    limit: Math.min(parsed.limit, 250),
  }, client)

  const permittedEmployeeIds = parsed.employeeId
    ? [parsed.employeeId]
    : accessScope.employeeIds
  const employees = await client.payrollEmployee.findMany({
    where: {
      organizationId: parsed.organizationId,
      deletedAt: null,
      ...(permittedEmployeeIds === null ? {} : { id: { in: permittedEmployeeIds } }),
      ...(parsed.department ? { department: parsed.department } : {}),
      ...(parsed.locationId ? { locationId: parsed.locationId } : {}),
    },
    select: {
      id: true,
      employeeNumber: true,
      displayName: true,
      department: true,
      locationId: true,
    },
    orderBy: [{ employeeNumber: "asc" }],
    take: MAX_EMPLOYEE_SCOPE + 1,
  }) as EmployeeRecord[]

  const employeeScopeTruncated = employees.length > MAX_EMPLOYEE_SCOPE
  const visibleEmployees = employees.slice(0, MAX_EMPLOYEE_SCOPE)
  const visibleEmployeeIds = visibleEmployees.map((employee) => employee.id)
  const employeeById = new Map(visibleEmployees.map((employee) => [employee.id, employee]))
  const proofCountSeed = Object.fromEntries(
    hrisMovementProofStateSchema.options.map((state) => [state, 0]),
  ) as Record<HrisMovementProofState, number>

  if (visibleEmployeeIds.length === 0) {
    await auditMovementRead(client, {
      organizationId: parsed.organizationId,
      actorId: parsed.actorId,
      employeeId: parsed.employeeId,
      sourceEventCount: 0,
      matchedCount: 0,
      returnedCount: 0,
      proofCounts: proofCountSeed,
    })
    return {
      organizationId: parsed.organizationId,
      asOf: new Date().toISOString(),
      items: [] as HrisMovementHistoryItem[],
      summary: emptySummary(),
      pagination: { nextBefore: null, limit: parsed.limit },
      accessScope: {
        organizationId: accessScope.organizationId,
        authority: accessScope.authority,
        managedLocationCount: accessScope.managedLocations.length,
        employeeScopeTruncated,
      },
      redaction: movementRedaction(),
      dataOwnership: HRIS_MOVEMENT_HISTORY_DATA_OWNERSHIP,
    }
  }

  const sourceTake = Math.min(Math.max(parsed.limit * 10, 250), 1500)
  const [contracts, assignments, salaryChanges, destinationChanges, attendance, runLines, payslips] = await Promise.all([
    client.payrollContract.findMany({
      where: { organizationId: parsed.organizationId, employeeId: { in: visibleEmployeeIds }, deletedAt: null },
      select: { id: true, employeeId: true },
      orderBy: [{ createdAt: "desc" }],
      take: sourceTake,
    }),
    client.payrollEmployeeRubriqueAssignment.findMany({
      where: { organizationId: parsed.organizationId, employeeId: { in: visibleEmployeeIds }, deletedAt: null },
      select: { id: true, employeeId: true },
      orderBy: [{ createdAt: "desc" }],
      take: sourceTake,
    }),
    client.payrollSalaryChangeRequest.findMany({
      where: { organizationId: parsed.organizationId, employeeId: { in: visibleEmployeeIds }, deletedAt: null },
      select: { id: true, employeeId: true },
      orderBy: [{ createdAt: "desc" }],
      take: sourceTake,
    }),
    client.payrollPaymentDestinationChangeRequest.findMany({
      where: { organizationId: parsed.organizationId, employeeId: { in: visibleEmployeeIds }, deletedAt: null },
      select: { id: true, employeeId: true },
      orderBy: [{ createdAt: "desc" }],
      take: sourceTake,
    }),
    client.payrollAttendanceSnapshot.findMany({
      where: { organizationId: parsed.organizationId, employeeId: { in: visibleEmployeeIds } },
      select: { id: true, employeeId: true },
      orderBy: [{ createdAt: "desc" }],
      take: sourceTake,
    }),
    client.payrollRunLine.findMany({
      where: { organizationId: parsed.organizationId, employeeId: { in: visibleEmployeeIds } },
      select: { payrollRunId: true, employeeId: true },
      orderBy: [{ createdAt: "desc" }],
      take: sourceTake,
    }),
    client.payrollPayslip.findMany({
      where: {
        organizationId: parsed.organizationId,
        employeeId: { in: visibleEmployeeIds },
        ...sourceRecordDateWhere(parsed),
      },
      select: {
        id: true,
        employeeId: true,
        status: true,
        issuedAt: true,
        documentHash: true,
        createdAt: true,
      },
      orderBy: [{ createdAt: "desc" }],
      take: sourceTake,
    }),
  ])

  const sourceEmployees = new Map<string, Set<string>>()
  for (const employeeId of visibleEmployeeIds) addSourceEmployee(sourceEmployees, employeeId, employeeId)
  for (const record of contracts) addSourceEmployee(sourceEmployees, record.id, record.employeeId)
  for (const record of assignments) addSourceEmployee(sourceEmployees, record.id, record.employeeId)
  for (const record of salaryChanges) addSourceEmployee(sourceEmployees, record.id, record.employeeId)
  for (const record of destinationChanges) addSourceEmployee(sourceEmployees, record.id, record.employeeId)
  for (const record of attendance) addSourceEmployee(sourceEmployees, record.id, record.employeeId)
  for (const record of runLines) addSourceEmployee(sourceEmployees, record.payrollRunId, record.employeeId)
  for (const record of payslips) addSourceEmployee(sourceEmployees, record.id, record.employeeId)

  const allowedEventTypes = parsed.domain
    ? MOVEMENT_EVENT_TYPES.filter((eventType) =>
      MOVEMENT_EVENT_DEFINITIONS[eventType].domain === parsed.domain)
    : MOVEMENT_EVENT_TYPES
  const eventTake = Math.min(Math.max(parsed.limit * 10, 100), 1000)
  const events = allowedEventTypes.length === 0
    ? []
    : await client.businessEvent.findMany({
      where: {
        organizationId: parsed.organizationId,
        eventType: { in: allowedEventTypes },
        sourceId: { in: Array.from(sourceEmployees.keys()) },
        ...eventDateWhere(parsed),
      },
      select: {
        id: true,
        eventType: true,
        eventSource: true,
        status: true,
        payloadHash: true,
        payload: true,
        occurredAt: true,
        recordedAt: true,
        processedAt: true,
        actorId: true,
        sourceId: true,
        documentHash: true,
      },
      orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
      take: eventTake,
    }) as BusinessEventRecord[]

  const eventIds = new Set(events.map((event) => event.id))
  const auditableEntityIds = Array.from(new Set([
    ...visibleEmployeeIds,
    ...events.flatMap((event) => event.sourceId ? [event.sourceId] : []),
  ]))
  const audits = auditableEntityIds.length === 0
    ? []
    : await client.auditLog.findMany({
      where: {
        organizationId: parsed.organizationId,
        entityId: { in: auditableEntityIds },
        ...(parsed.from || parsed.to || parsed.before
          ? {
              createdAt: {
                ...(parsed.from ? { gte: parsed.from } : {}),
                ...(parsed.to ? { lte: parsed.to } : {}),
                ...(parsed.before ? { lt: parsed.before } : {}),
              },
            }
          : {}),
      },
      select: { changes: true },
      orderBy: [{ createdAt: "desc" }],
      take: Math.min(Math.max(events.length * 4, 100), 2000),
    })
  const auditLinkedEventIds = new Set<string>()
  for (const audit of audits) {
    collectAuditEventReferences(audit.changes, eventIds, auditLinkedEventIds)
  }

  const items: HrisMovementHistoryItem[] = []
  for (const event of events) {
    const definition = MOVEMENT_EVENT_DEFINITIONS[event.eventType as MovementEventType]
    if (!definition || !event.sourceId) continue
    const eventEmployeeIds = sourceEmployees.get(event.sourceId)
    if (!eventEmployeeIds) continue

    for (const employeeId of eventEmployeeIds) {
      const employee = employeeById.get(employeeId)
      if (!employee) continue
      const proof = deriveHrisMovementProofState({
        hasBusinessEvent: true,
        eventStatus: event.status,
        payloadHashPresent: Boolean(event.payloadHash),
        auditLinked: auditLinkedEventIds.has(event.id),
        sourceRecordPresent: true,
        documentEvidencePresent: Boolean(event.documentHash),
      })
      items.push({
        id: `${event.id}:${employee.id}`,
        domain: definition.domain,
        title: definition.title,
        summary: definition.summary,
        outcome: definition.outcome,
        risk: definition.risk,
        employee: {
          id: employee.id,
          employeeNumber: employee.employeeNumber,
          displayName: employee.displayName,
          department: employee.department,
        },
        effectiveAt: effectiveAt(event.payload, event.occurredAt),
        recordedAt: event.recordedAt.toISOString(),
        actor: {
          kind: event.actorId ? "AUTHENTICATED_USER" : "SYSTEM",
          label: event.actorId ? "Authorized user" : "System process",
          rawIdentifierIncluded: false,
        },
        source: {
          label: definition.sourceLabel,
          eventType: event.eventType,
          eventSource: event.eventSource,
        },
        proof,
        redaction: movementRedaction(),
        detailHref: `/dashboard/people/${employee.id}`,
      })
    }
  }

  for (const payslip of payslips) {
    const employee = employeeById.get(payslip.employeeId)
    if (!employee) continue
    items.push({
      id: `payslip-source:${payslip.id}`,
      domain: "PAYSLIP",
      title: "Payslip source recorded",
      summary: "A payslip source record exists; amounts and document references remain redacted.",
      outcome: "RECORDED",
      risk: "MEDIUM",
      employee: {
        id: employee.id,
        employeeNumber: employee.employeeNumber,
        displayName: employee.displayName,
        department: employee.department,
      },
      effectiveAt: (payslip.issuedAt ?? payslip.createdAt).toISOString(),
      recordedAt: payslip.createdAt.toISOString(),
      actor: {
        kind: "SYSTEM",
        label: "Payroll process",
        rawIdentifierIncluded: false,
      },
      source: {
        label: "Payroll payslip",
        eventType: "payroll.payslip.source_record",
        eventSource: "SOURCE_RECORD",
      },
      proof: deriveHrisMovementProofState({
        hasBusinessEvent: false,
        eventStatus: null,
        payloadHashPresent: false,
        auditLinked: false,
        sourceRecordPresent: true,
        documentEvidencePresent: Boolean(payslip.documentHash),
      }),
      redaction: movementRedaction(),
      detailHref: `/dashboard/people/${employee.id}`,
    })
  }

  const filtered = items
    .filter((item) => !parsed.domain || item.domain === parsed.domain)
    .filter((item) => !parsed.risk || item.risk === parsed.risk)
    .filter((item) => !parsed.outcome || item.outcome === parsed.outcome)
    .filter((item) => !parsed.proofState || item.proof.state === parsed.proofState)
    .sort((left, right) => {
      const recorded = right.recordedAt.localeCompare(left.recordedAt)
      return recorded === 0 ? right.id.localeCompare(left.id) : recorded
    })

  const returned = filtered.slice(0, parsed.limit)
  const proofCounts = { ...proofCountSeed }
  const byDomain = Object.fromEntries(
    hrisMovementDomainSchema.options.map((domain) => [domain, 0]),
  ) as Record<HrisMovementDomain, number>
  for (const item of filtered) {
    proofCounts[item.proof.state] += 1
    byDomain[item.domain] += 1
  }

  await auditMovementRead(client, {
    organizationId: parsed.organizationId,
    actorId: parsed.actorId,
    employeeId: parsed.employeeId,
    sourceEventCount: events.length,
    matchedCount: filtered.length,
    returnedCount: returned.length,
    proofCounts,
  })

  return {
    organizationId: parsed.organizationId,
    asOf: new Date().toISOString(),
    items: returned,
    summary: {
      matched: filtered.length,
      returned: returned.length,
      auditAndEvent: proofCounts.AUDIT_AND_EVENT,
      eventOnly: proofCounts.EVENT_ONLY,
      sourceRecordOnly: proofCounts.SOURCE_RECORD_ONLY,
      exceptions: proofCounts.FAILED_EVENT + proofCounts.UNPROVEN,
      byDomain,
    },
    pagination: {
      nextBefore: filtered.length > returned.length
        ? returned.at(-1)?.recordedAt ?? null
        : null,
      limit: parsed.limit,
    },
    accessScope: {
      organizationId: accessScope.organizationId,
      authority: accessScope.authority,
      managedLocationCount: accessScope.managedLocations.length,
      employeeScopeTruncated,
    },
    redaction: movementRedaction(),
    dataOwnership: HRIS_MOVEMENT_HISTORY_DATA_OWNERSHIP,
  }
}

export const HRIS_MOVEMENT_HISTORY_DATA_OWNERSHIP = {
  sourceOwner: "DOMAIN_SERVICES_AND_IMMUTABLE_BUSINESS_EVENTS",
  readModelOwner: "HRIS_MOVEMENT_HISTORY_SERVICE",
  payrollOwner: "PAYROLL_CERTIFIED_INPUT_AND_FINANCIAL_RESULTS",
  accountingOwner: "ACCOUNTING_LEDGER_AND_CLOSE_ASSURANCE",
  projectionOnly: true,
} as const

export type HrisMovementHistory = Awaited<ReturnType<typeof getHrisMovementHistory>>
