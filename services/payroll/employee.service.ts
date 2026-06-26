import "server-only"

import { createHash } from "crypto"
import {
  PayrollAttendanceSnapshotStatus,
  PayrollContractStatus,
  PayrollEmployeeStatus,
  Prisma,
} from "@prisma/client"
import { z } from "zod"

import { hasAnyRbacPermission } from "@/lib/security/rbac-permissions"
import { db } from "@/prisma/db"
import { ConflictError, ForbiddenError, NotFoundError } from "@/services/_shared/action-errors"
import {
  hashBusinessPayload,
  markBusinessEventAppliedInTx,
  recordBusinessEventInTx,
} from "@/services/events/business-event.service"
import type { ModuleEntitlementDecision } from "@/services/modules/module-control-contracts"
import { evaluateRedaction, type RedactionDecision } from "@/services/security/redaction-policy.service"

type DbClient = typeof db | Prisma.TransactionClient
type BusinessEventTx = Parameters<typeof recordBusinessEventInTx>[0]

const employeeStatusSchema = z.nativeEnum(PayrollEmployeeStatus)

const evidenceReferenceSchema = z.object({
  type: z.enum(["IDENTITY", "CONTRACT", "TAX", "SOCIAL", "ATTENDANCE", "PAYMENT", "OTHER"]).default("OTHER"),
  documentHash: z.string().trim().min(12),
  label: z.string().trim().min(1).max(120).optional(),
  source: z.string().trim().min(1).max(80).optional(),
  capturedAt: z.coerce.date().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

const sourceReferenceSchema = z.object({
  sourceSystem: z.string().trim().min(1).max(80).optional(),
  sourceRecordId: z.string().trim().min(1).max(120).optional(),
  sourceHash: z.string().trim().min(12).optional(),
})

const payrollEmployeeProfileInputSchema = z.object({
  organizationId: z.string().trim().min(1),
  actorId: z.string().trim().min(1).optional().nullable(),
  actorPermissions: z.array(z.string().trim().min(1)).default([]),
  idempotencyKey: z.string().trim().min(1).optional(),
  employeeNumber: z.string().trim().min(1).max(64),
  displayName: z.string().trim().min(1).max(160),
  legalName: z.string().trim().min(1).max(200).optional().nullable(),
  userId: z.string().trim().min(1).optional().nullable(),
  status: employeeStatusSchema.default(PayrollEmployeeStatus.DRAFT),
  hireDate: z.coerce.date(),
  terminationDate: z.coerce.date().optional().nullable(),
  countryCode: z.string().trim().min(2).max(2).optional().nullable(),
  locationId: z.string().trim().min(1).optional().nullable(),
  department: z.string().trim().min(1).max(120).optional().nullable(),
  jobTitle: z.string().trim().min(1).max(120).optional().nullable(),
  costCenter: z.string().trim().min(1).max(80).optional().nullable(),
  sourceReference: sourceReferenceSchema.optional(),
  evidenceReferences: z.array(evidenceReferenceSchema).max(20).default([]),
})

const employeeSourceDataInputSchema = z.object({
  organizationId: z.string().trim().min(1),
  actorId: z.string().trim().min(1).optional().nullable(),
  actorPermissions: z.array(z.string().trim().min(1)).default([]),
  employeeId: z.string().trim().min(1).optional(),
  limit: z.number().int().positive().max(100).default(50),
  asOf: z.coerce.date().optional(),
  moduleDecision: z.custom<ModuleEntitlementDecision>().optional().nullable(),
})

const attachEvidenceInputSchema = z.object({
  organizationId: z.string().trim().min(1),
  actorId: z.string().trim().min(1).optional().nullable(),
  actorPermissions: z.array(z.string().trim().min(1)).default([]),
  employeeId: z.string().trim().min(1),
  idempotencyKey: z.string().trim().min(1).optional(),
  evidenceReferences: z.array(evidenceReferenceSchema).min(1).max(20),
})

export type PayrollHrEvidenceReference = {
  type: z.output<typeof evidenceReferenceSchema>["type"]
  documentHash: string
  label?: string
  source?: string
  capturedAt?: string
  attachedAt?: string
  attachedById?: string | null
  metadata?: Record<string, unknown>
}
export type PayrollEmployeeProfileInput = z.input<typeof payrollEmployeeProfileInputSchema>
export type PayrollEmployeeSourceDataInput = z.input<typeof employeeSourceDataInputSchema>
export type AttachPayrollEmployeeEvidenceInput = z.input<typeof attachEvidenceInputSchema>

export type PayrollEmployeeSourceDataRecord = {
  id: string
  employeeNumber: string
  displayName: string
  status: PayrollEmployeeStatus
  employment: {
    hireDate: string
    terminationDate: string | null
    countryCode: string | null
    locationId: string | null
    department: string | null
    jobTitle: string | null
    costCenter: string | null
  }
  userMapping: {
    state: "LINKED" | "UNMAPPED" | "ORPHANED"
    userId: string | null
    userDisplayName: string | null
    userEmailMasked: string | null
  }
  evidence: {
    referenceCount: number
    latestDocumentHash: string | null
    referenceTypes: string[]
    hasTaxIdentifierHash: boolean
    hasSocialIdentifierHash: boolean
    hasPaymentDestinationHash: boolean
  }
  contractReadiness: {
    activeContractCount: number
    latestContractStatus: PayrollContractStatus | null
    hasSignedDocumentEvidence: boolean
  }
  attendanceReadiness: {
    frozenSnapshotCount: number
    latestFrozenPeriodEnd: string | null
    hasFrozenAttendanceSource: boolean
  }
  blockers: string[]
}

export type PayrollEmployeeSourceDataResult = {
  organizationId: string
  asOf: string
  employees: PayrollEmployeeSourceDataRecord[]
  summary: {
    totalEmployees: number
    linkedUsers: number
    unmappedEmployees: number
    orphanedUserMappings: number
    activeContractReady: number
    frozenAttendanceReady: number
    payrollReadyCandidates: number
  }
  redaction: {
    salaryDecision: Pick<RedactionDecision, "allowed" | "mode" | "reasonCode" | "policy">
  }
}

const READ_PERMISSIONS = ["payroll.employees.read", "payroll.command.read"] as const
const MANAGE_PERMISSIONS = ["payroll.employees.manage"] as const

function assertPermission(actorPermissions: readonly string[] | null | undefined, required: readonly string[], action: string) {
  if (!hasAnyRbacPermission(actorPermissions, required)) {
    throw new ForbiddenError(`Missing permission for ${action}.`)
  }
}

function hasRootTransaction(client: DbClient): client is typeof db {
  return typeof (client as { $transaction?: unknown }).$transaction === "function"
}

async function inTransaction<T>(client: DbClient, fn: (tx: Prisma.TransactionClient) => Promise<T>) {
  if (hasRootTransaction(client)) {
    return client.$transaction((tx) => fn(tx))
  }
  return fn(client as Prisma.TransactionClient)
}

function safeJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue
}

function metadataRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>
}

function normalizeCountryCode(value?: string | null) {
  const normalized = value?.trim().toUpperCase()
  return normalized || null
}

function hashRef(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 12)
}

function maskEmail(value?: string | null) {
  if (!value) return null
  const [local, domain] = value.split("@")
  if (!domain) return `masked:${hashRef(value)}`
  const first = local.slice(0, 1) || "*"
  return `${first}***@${domain}`
}

function normalizeEvidenceReferences(
  evidenceReferences: readonly z.output<typeof evidenceReferenceSchema>[],
  actorId: string | null | undefined,
  now: Date,
): PayrollHrEvidenceReference[] {
  return evidenceReferences.map((reference) => ({
    type: reference.type,
    documentHash: reference.documentHash.trim(),
    label: reference.label?.trim(),
    source: reference.source?.trim(),
    capturedAt: reference.capturedAt?.toISOString(),
    attachedAt: now.toISOString(),
    attachedById: actorId ?? null,
    metadata: reference.metadata ? metadataRecord(reference.metadata) : undefined,
  }))
}

function evidenceReferencesFromMetadata(metadata: unknown): PayrollHrEvidenceReference[] {
  const record = metadataRecord(metadata)
  const references = record.hrEvidenceReferences
  if (!Array.isArray(references)) return []
  return references
    .filter((item): item is PayrollHrEvidenceReference => {
      if (!item || typeof item !== "object") return false
      const candidate = item as Record<string, unknown>
      return typeof candidate.documentHash === "string" && typeof candidate.type === "string"
    })
    .map((item) => ({
      ...item,
      documentHash: String(item.documentHash),
      type: String(item.type) as PayrollHrEvidenceReference["type"],
    }))
}

function mergeEvidenceReferences(
  existingMetadata: unknown,
  newReferences: readonly PayrollHrEvidenceReference[],
) {
  const merged = new Map<string, PayrollHrEvidenceReference>()
  for (const reference of evidenceReferencesFromMetadata(existingMetadata)) {
    merged.set(`${reference.type}:${reference.documentHash}`, reference)
  }
  for (const reference of newReferences) {
    merged.set(`${reference.type}:${reference.documentHash}`, reference)
  }
  return Array.from(merged.values())
}

function buildEmployeeMetadata(
  existingMetadata: unknown,
  input: z.output<typeof payrollEmployeeProfileInputSchema>,
  now: Date,
) {
  const existing = metadataRecord(existingMetadata)
  const evidenceReferences = mergeEvidenceReferences(
    existing,
    normalizeEvidenceReferences(input.evidenceReferences, input.actorId, now),
  )

  return {
    ...existing,
    hrSourceData: {
      ...(metadataRecord(existing.hrSourceData)),
      sourceSystem: input.sourceReference?.sourceSystem ?? null,
      sourceRecordId: input.sourceReference?.sourceRecordId ?? null,
      sourceHash: input.sourceReference?.sourceHash ?? null,
      updatedAt: now.toISOString(),
      updatedById: input.actorId ?? null,
      gate: "aqstoqflow-hrpayroll-07-source-data-foundation",
    },
    hrEvidenceReferences: evidenceReferences,
  }
}

function evidenceHash(references: readonly PayrollHrEvidenceReference[]) {
  if (references.length === 0) return undefined
  return `sha256:${hashBusinessPayload(references.map((reference) => ({
    type: reference.type,
    documentHash: reference.documentHash,
  })))}`
}

function employeeAuditSnapshot(employee: {
  id: string
  employeeNumber: string
  displayName: string
  status: PayrollEmployeeStatus
  userId?: string | null
  hireDate: Date
  terminationDate?: Date | null
  countryCode?: string | null
  department?: string | null
  jobTitle?: string | null
  costCenter?: string | null
}) {
  return {
    id: employee.id,
    employeeNumber: employee.employeeNumber,
    displayName: employee.displayName,
    status: employee.status,
    userLinked: Boolean(employee.userId),
    hireDate: employee.hireDate.toISOString(),
    terminationDate: employee.terminationDate?.toISOString() ?? null,
    countryCode: employee.countryCode ?? null,
    department: employee.department ?? null,
    jobTitle: employee.jobTitle ?? null,
    costCenter: employee.costCenter ?? null,
  }
}

async function auditEmployeeSourceDataRead(
  client: DbClient,
  input: {
    organizationId: string
    actorId?: string | null
    returnedCount: number
    salaryDecision: RedactionDecision
  },
) {
  await client.auditLog.create({
    data: {
      entityType: "PayrollEmployee",
      entityId: input.organizationId,
      action: "PAYROLL_EMPLOYEE_SOURCE_DATA_READ",
      userId: input.actorId ?? null,
      organizationId: input.organizationId,
      changes: safeJson({
        returnedCount: input.returnedCount,
        salaryAccess: {
          allowed: input.salaryDecision.allowed,
          mode: input.salaryDecision.mode,
          reasonCode: input.salaryDecision.reasonCode,
          policy: input.salaryDecision.policy,
        },
      }),
    },
  })
}

type PayrollEmployeeSourceRow = Prisma.PayrollEmployeeGetPayload<{
  include: {
    contracts: {
      select: {
        id: true
        status: true
        effectiveFrom: true
        effectiveTo: true
        signedDocumentHash: true
        activatedBusinessEventId: true
      }
    }
    attendanceSnapshots: {
      select: {
        id: true
        status: true
        periodStart: true
        periodEnd: true
        sourceHash: true
        frozenAt: true
      }
    }
  }
}>

type LinkedUserRow = {
  id: string
  name: string | null
  email: string
  firstName: string | null
  lastName: string | null
  isActive: boolean
}

function displayNameForUser(user?: LinkedUserRow | null) {
  if (!user) return null
  const joined = [user.firstName, user.lastName].filter(Boolean).join(" ").trim()
  return joined || user.name || null
}

function isActiveContract(contract: PayrollEmployeeSourceRow["contracts"][number], asOf: Date) {
  return (
    contract.status === PayrollContractStatus.ACTIVE &&
    contract.effectiveFrom <= asOf &&
    (!contract.effectiveTo || contract.effectiveTo >= asOf)
  )
}

function mapEmployeeSourceRecord(
  employee: PayrollEmployeeSourceRow,
  linkedUser: LinkedUserRow | null,
  asOf: Date,
): PayrollEmployeeSourceDataRecord {
  const evidenceReferences = evidenceReferencesFromMetadata(employee.metadata)
  const activeContracts = employee.contracts.filter((contract) => isActiveContract(contract, asOf))
  const latestContract = employee.contracts[0] ?? null
  const frozenSnapshots = employee.attendanceSnapshots.filter(
    (snapshot) => snapshot.status === PayrollAttendanceSnapshotStatus.FROZEN,
  )
  const latestFrozenSnapshot = frozenSnapshots[0] ?? null
  const hasSignedDocumentEvidence = activeContracts.some(
    (contract) => Boolean(contract.signedDocumentHash || contract.activatedBusinessEventId),
  )
  const userMappingState = !employee.userId ? "UNMAPPED" : linkedUser ? "LINKED" : "ORPHANED"
  const blockers: string[] = []

  if (employee.status !== PayrollEmployeeStatus.ACTIVE) blockers.push("EMPLOYEE_NOT_ACTIVE")
  if (userMappingState !== "LINKED") blockers.push("USER_MAPPING_NOT_READY")
  if (activeContracts.length === 0) blockers.push("ACTIVE_CONTRACT_MISSING")
  if (activeContracts.length > 0 && !hasSignedDocumentEvidence) blockers.push("CONTRACT_EVIDENCE_MISSING")
  if (frozenSnapshots.length === 0) blockers.push("FROZEN_ATTENDANCE_MISSING")
  if (!employee.paymentDestinationHash) blockers.push("PAYMENT_DESTINATION_EVIDENCE_MISSING")

  return {
    id: employee.id,
    employeeNumber: employee.employeeNumber,
    displayName: employee.displayName,
    status: employee.status,
    employment: {
      hireDate: employee.hireDate.toISOString(),
      terminationDate: employee.terminationDate?.toISOString() ?? null,
      countryCode: employee.countryCode ?? null,
      locationId: employee.locationId ?? null,
      department: employee.department ?? null,
      jobTitle: employee.jobTitle ?? null,
      costCenter: employee.costCenter ?? null,
    },
    userMapping: {
      state: userMappingState,
      userId: employee.userId ?? null,
      userDisplayName: displayNameForUser(linkedUser),
      userEmailMasked: maskEmail(linkedUser?.email),
    },
    evidence: {
      referenceCount: evidenceReferences.length,
      latestDocumentHash: evidenceReferences[evidenceReferences.length - 1]?.documentHash ?? null,
      referenceTypes: Array.from(new Set(evidenceReferences.map((reference) => reference.type))),
      hasTaxIdentifierHash: Boolean(employee.taxIdentifierHash),
      hasSocialIdentifierHash: Boolean(employee.socialIdentifierHash),
      hasPaymentDestinationHash: Boolean(employee.paymentDestinationHash),
    },
    contractReadiness: {
      activeContractCount: activeContracts.length,
      latestContractStatus: latestContract?.status ?? null,
      hasSignedDocumentEvidence,
    },
    attendanceReadiness: {
      frozenSnapshotCount: frozenSnapshots.length,
      latestFrozenPeriodEnd: latestFrozenSnapshot?.periodEnd.toISOString() ?? null,
      hasFrozenAttendanceSource: frozenSnapshots.some((snapshot) => Boolean(snapshot.sourceHash)),
    },
    blockers,
  }
}

export async function getPayrollEmployeeSourceData(
  input: PayrollEmployeeSourceDataInput,
  client: DbClient = db,
): Promise<PayrollEmployeeSourceDataResult> {
  const parsed = employeeSourceDataInputSchema.parse(input)
  assertPermission(parsed.actorPermissions, READ_PERMISSIONS, "payroll employee source-data read")

  const asOf = parsed.asOf ?? new Date()
  const salaryDecision = evaluateRedaction({
    field: "PayrollEmployeeSourceData.salaryAmounts",
    category: "payroll_person_amount",
    actorPermissions: parsed.actorPermissions,
    moduleDecision: parsed.moduleDecision ?? null,
  })

  const employees = await client.payrollEmployee.findMany({
    where: {
      organizationId: parsed.organizationId,
      deletedAt: null,
      ...(parsed.employeeId ? { id: parsed.employeeId } : {}),
    },
    orderBy: [{ displayName: "asc" }],
    take: parsed.limit,
    include: {
      contracts: {
        where: { deletedAt: null },
        orderBy: [{ effectiveFrom: "desc" }],
        select: {
          id: true,
          status: true,
          effectiveFrom: true,
          effectiveTo: true,
          signedDocumentHash: true,
          activatedBusinessEventId: true,
        },
      },
      attendanceSnapshots: {
        where: { status: PayrollAttendanceSnapshotStatus.FROZEN },
        orderBy: [{ periodEnd: "desc" }],
        select: {
          id: true,
          status: true,
          periodStart: true,
          periodEnd: true,
          sourceHash: true,
          frozenAt: true,
        },
      },
    },
  })

  const linkedUserIds = employees
    .map((employee) => employee.userId)
    .filter((userId): userId is string => Boolean(userId))
  const linkedUsers = linkedUserIds.length
    ? await client.user.findMany({
        where: {
          organizationId: parsed.organizationId,
          id: { in: linkedUserIds },
        },
        select: {
          id: true,
          name: true,
          email: true,
          firstName: true,
          lastName: true,
          isActive: true,
        },
      })
    : []
  const userById = new Map(linkedUsers.map((user) => [user.id, user]))
  const records = employees.map((employee) => mapEmployeeSourceRecord(employee, userById.get(employee.userId ?? "") ?? null, asOf))

  await auditEmployeeSourceDataRead(client, {
    organizationId: parsed.organizationId,
    actorId: parsed.actorId,
    returnedCount: records.length,
    salaryDecision,
  })

  return {
    organizationId: parsed.organizationId,
    asOf: asOf.toISOString(),
    employees: records,
    summary: {
      totalEmployees: records.length,
      linkedUsers: records.filter((employee) => employee.userMapping.state === "LINKED").length,
      unmappedEmployees: records.filter((employee) => employee.userMapping.state === "UNMAPPED").length,
      orphanedUserMappings: records.filter((employee) => employee.userMapping.state === "ORPHANED").length,
      activeContractReady: records.filter((employee) => employee.contractReadiness.activeContractCount > 0).length,
      frozenAttendanceReady: records.filter((employee) => employee.attendanceReadiness.frozenSnapshotCount > 0).length,
      payrollReadyCandidates: records.filter((employee) => employee.blockers.length === 0).length,
    },
    redaction: {
      salaryDecision: {
        allowed: salaryDecision.allowed,
        mode: salaryDecision.mode,
        reasonCode: salaryDecision.reasonCode,
        policy: salaryDecision.policy,
      },
    },
  }
}

export async function upsertPayrollEmployeeSourceProfile(
  input: PayrollEmployeeProfileInput,
  client: DbClient = db,
) {
  const parsed = payrollEmployeeProfileInputSchema.parse(input)
  assertPermission(parsed.actorPermissions, MANAGE_PERMISSIONS, "payroll employee source-data management")
  const rawInput = input && typeof input === "object" ? input as Record<string, unknown> : {}
  const userIdProvided = Object.prototype.hasOwnProperty.call(rawInput, "userId")
  const now = new Date()
  const requestPayloadHash = `sha256:${hashBusinessPayload({
    employeeNumber: parsed.employeeNumber,
    displayName: parsed.displayName,
    legalName: parsed.legalName ?? null,
    userId: parsed.userId ?? null,
    status: parsed.status,
    hireDate: parsed.hireDate.toISOString(),
    terminationDate: parsed.terminationDate?.toISOString() ?? null,
    countryCode: normalizeCountryCode(parsed.countryCode),
    locationId: parsed.locationId ?? null,
    department: parsed.department ?? null,
    jobTitle: parsed.jobTitle ?? null,
    costCenter: parsed.costCenter ?? null,
    sourceReference: parsed.sourceReference ?? null,
    evidenceHashes: parsed.evidenceReferences.map((reference) => reference.documentHash).sort(),
  })}`

  return inTransaction(client, async (tx) => {
    const organization = await tx.organization.findFirst({
      where: { id: parsed.organizationId, deletedAt: null },
      select: { id: true },
    })
    if (!organization) throw new NotFoundError("Organization not found")

    if (parsed.userId) {
      const linkedUser = await tx.user.findFirst({
        where: {
          id: parsed.userId,
          organizationId: parsed.organizationId,
          isActive: true,
        },
        select: { id: true },
      })
      if (!linkedUser) throw new NotFoundError("Linked user was not found in this organization")
    }

    const duplicateMatches = await tx.payrollEmployee.findMany({
      where: {
        organizationId: parsed.organizationId,
        deletedAt: null,
        OR: [
          { employeeNumber: parsed.employeeNumber },
          ...(parsed.userId ? [{ userId: parsed.userId }] : []),
        ],
      },
      select: {
        id: true,
        employeeNumber: true,
        userId: true,
        displayName: true,
        status: true,
        hireDate: true,
        terminationDate: true,
        countryCode: true,
        department: true,
        jobTitle: true,
        costCenter: true,
        metadata: true,
      },
    })

    const duplicateIds = new Set(duplicateMatches.map((employee) => employee.id))
    if (duplicateIds.size > 1) {
      throw new ConflictError("Employee number and linked user point to different payroll employees.")
    }

    const existing = duplicateMatches[0] ?? null
    if (existing?.userId && parsed.userId && existing.userId !== parsed.userId) {
      throw new ConflictError("Payroll employee is already linked to a different user.")
    }

    const metadata = safeJson(buildEmployeeMetadata(existing?.metadata, parsed, now))
    const data = {
      userId: userIdProvided ? parsed.userId ?? null : undefined,
      employeeNumber: parsed.employeeNumber,
      displayName: parsed.displayName,
      legalName: parsed.legalName ?? null,
      status: parsed.status,
      hireDate: parsed.hireDate,
      terminationDate: parsed.terminationDate ?? null,
      countryCode: normalizeCountryCode(parsed.countryCode),
      locationId: parsed.locationId ?? null,
      department: parsed.department ?? null,
      jobTitle: parsed.jobTitle ?? null,
      costCenter: parsed.costCenter ?? null,
      metadata,
    }

    const employee = existing
      ? await tx.payrollEmployee.update({
          where: { id: existing.id },
          data,
        })
      : await tx.payrollEmployee.create({
          data: {
            organizationId: parsed.organizationId,
            userId: parsed.userId ?? null,
            employeeNumber: parsed.employeeNumber,
            displayName: parsed.displayName,
            legalName: parsed.legalName ?? null,
            status: parsed.status,
            hireDate: parsed.hireDate,
            terminationDate: parsed.terminationDate ?? null,
            countryCode: normalizeCountryCode(parsed.countryCode),
            locationId: parsed.locationId ?? null,
            department: parsed.department ?? null,
            jobTitle: parsed.jobTitle ?? null,
            costCenter: parsed.costCenter ?? null,
            metadata,
          },
        })

    const references = evidenceReferencesFromMetadata(employee.metadata)
    const eventResult = await recordBusinessEventInTx(tx as unknown as BusinessEventTx, {
      organizationId: parsed.organizationId,
      eventType: "payroll.employee.source_data.upserted",
      eventSource: "INTERNAL",
      schemaVersion: 1,
      idempotencyKey:
        parsed.idempotencyKey ??
        `payroll-employee-source:upsert:${parsed.organizationId}:${parsed.employeeNumber}:${requestPayloadHash}`,
      payload: {
        employeeId: employee.id,
        employeeNumber: employee.employeeNumber,
        displayName: employee.displayName,
        status: employee.status,
        userLinked: Boolean(employee.userId),
        sourceReference: parsed.sourceReference ?? null,
        evidenceHashes: references.map((reference) => reference.documentHash).sort(),
        requestPayloadHash,
      },
      occurredAt: now,
      actorId: parsed.actorId ?? undefined,
      sourceId: employee.id,
      documentHash: evidenceHash(references),
      metadata: {
        gate: "aqstoqflow-hrpayroll-07-source-data-foundation",
        created: !existing,
      },
      outboxMessages: [
        {
          channel: "NOTIFICATION",
          eventName: "payroll_employee.source_data_upserted",
          destination: "payroll",
          payload: {
            severity: "info",
            employeeId: employee.id,
            organizationId: parsed.organizationId,
            created: !existing,
          },
        },
      ],
    })
    await markBusinessEventAppliedInTx(tx as unknown as BusinessEventTx, parsed.organizationId, eventResult.event.id)

    await tx.auditLog.create({
      data: {
        entityType: "PayrollEmployee",
        entityId: employee.id,
        action: existing ? "PAYROLL_EMPLOYEE_SOURCE_DATA_UPDATED" : "PAYROLL_EMPLOYEE_SOURCE_DATA_CREATED",
        userId: parsed.actorId ?? null,
        organizationId: parsed.organizationId,
        changes: safeJson({
          before: existing ? employeeAuditSnapshot(existing) : null,
          after: employeeAuditSnapshot(employee),
          businessEventId: eventResult.event.id,
        }),
      },
    })

    return {
      payrollEmployee: employee,
      created: !existing,
      businessEventId: eventResult.event.id,
      evidenceReferenceCount: references.length,
    }
  })
}

export async function attachPayrollEmployeeEvidenceReferences(
  input: AttachPayrollEmployeeEvidenceInput,
  client: DbClient = db,
) {
  const parsed = attachEvidenceInputSchema.parse(input)
  assertPermission(parsed.actorPermissions, MANAGE_PERMISSIONS, "payroll employee evidence attachment")
  const now = new Date()

  return inTransaction(client, async (tx) => {
    const employee = await tx.payrollEmployee.findFirst({
      where: {
        id: parsed.employeeId,
        organizationId: parsed.organizationId,
        deletedAt: null,
      },
    })
    if (!employee) throw new NotFoundError("Payroll employee not found")

    const references = mergeEvidenceReferences(
      employee.metadata,
      normalizeEvidenceReferences(parsed.evidenceReferences, parsed.actorId, now),
    )
    const metadata = safeJson({
      ...metadataRecord(employee.metadata),
      hrEvidenceReferences: references,
      hrSourceData: {
        ...metadataRecord(metadataRecord(employee.metadata).hrSourceData),
        evidenceUpdatedAt: now.toISOString(),
        evidenceUpdatedById: parsed.actorId ?? null,
        gate: "aqstoqflow-hrpayroll-07-source-data-foundation",
      },
    })

    const updated = await tx.payrollEmployee.update({
      where: { id: employee.id },
      data: { metadata },
    })
    const documentHash = evidenceHash(references)

    const eventResult = await recordBusinessEventInTx(tx as unknown as BusinessEventTx, {
      organizationId: parsed.organizationId,
      eventType: "payroll.employee.evidence_attached",
      eventSource: "INTERNAL",
      schemaVersion: 1,
      idempotencyKey:
        parsed.idempotencyKey ??
        `payroll-employee-evidence:${parsed.organizationId}:${employee.id}:${documentHash ?? hashBusinessPayload(references)}`,
      payload: {
        employeeId: employee.id,
        employeeNumber: employee.employeeNumber,
        evidenceHashes: references.map((reference) => reference.documentHash).sort(),
      },
      occurredAt: now,
      actorId: parsed.actorId ?? undefined,
      sourceId: employee.id,
      documentHash,
      metadata: { gate: "aqstoqflow-hrpayroll-07-source-data-foundation" },
      outboxMessages: [
        {
          channel: "NOTIFICATION",
          eventName: "payroll_employee.evidence_attached",
          destination: "payroll",
          payload: {
            severity: "info",
            employeeId: employee.id,
            organizationId: parsed.organizationId,
          },
        },
      ],
    })
    await markBusinessEventAppliedInTx(tx as unknown as BusinessEventTx, parsed.organizationId, eventResult.event.id)

    await tx.auditLog.create({
      data: {
        entityType: "PayrollEmployee",
        entityId: employee.id,
        action: "PAYROLL_EMPLOYEE_EVIDENCE_ATTACHED",
        userId: parsed.actorId ?? null,
        organizationId: parsed.organizationId,
        changes: safeJson({
          evidenceReferenceCount: references.length,
          evidenceHashes: references.map((reference) => reference.documentHash).sort(),
          businessEventId: eventResult.event.id,
        }),
      },
    })

    return {
      payrollEmployee: updated,
      businessEventId: eventResult.event.id,
      evidenceReferenceCount: references.length,
    }
  })
}
