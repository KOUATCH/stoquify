import "server-only"

import {
  PaymentMethod,
  PayrollAttendanceSnapshotStatus,
  PayrollEmployeeStatus,
  PayrollPaymentDestinationChangeStatus,
  Prisma,
} from "@prisma/client"
import { z } from "zod"

import { hasAnyRbacPermission } from "@/lib/security/rbac-permissions"
import { db } from "@/prisma/db"
import { BusinessRuleError, ConflictError, ForbiddenError, NotFoundError } from "@/services/_shared/action-errors"
import {
  hashBusinessPayload,
  markBusinessEventAppliedInTx,
  recordBusinessEventInTx,
} from "@/services/events/business-event.service"

export type DbClient = typeof db | Prisma.TransactionClient

type BusinessEventTx = Parameters<typeof recordBusinessEventInTx>[0]
type DestinationChangeRecord = Prisma.PayrollPaymentDestinationChangeRequestGetPayload<{ include: { employee: true } }>
type EmployeeReadinessRecord = Prisma.PayrollEmployeeGetPayload<{
  include: {
    contracts: true
    salaryChangeRequests: true
    paymentDestinationChangeRequests: true
    attendanceSnapshots: true
  }
}>

const READ_PERMISSIONS = ["payroll.payment_destination.read", "payroll.command.read"]
const REQUEST_PERMISSIONS = ["payroll.payment_destination.request"]
const APPROVE_PERMISSIONS = ["payroll.payment_destination.approve"]
const APPLY_PERMISSIONS = ["payroll.payment_destination.apply"]
const ATTENDANCE_READINESS_PERMISSIONS = ["payroll.attendance.readiness.read", "payroll.command.read"]

const evidenceHashSchema = z.string().trim().min(8).max(256)
const sourceReferenceSchema = z.object({
  sourceSystem: z.string().trim().min(1).max(120).optional(),
  sourceRecordId: z.string().trim().min(1).max(160).optional(),
  sourceHash: z.string().trim().min(8).max(256).optional(),
}).optional()

export const paymentDestinationReadinessInputSchema = z.object({
  organizationId: z.string().trim().min(1),
  actorId: z.string().trim().min(1).optional(),
  actorPermissions: z.array(z.string()).optional().default([]),
  employeeId: z.string().trim().min(1).optional(),
  periodStart: z.coerce.date().optional(),
  periodEnd: z.coerce.date().optional(),
  expectedAttendanceSourceHashes: z.record(z.string().trim().min(1), evidenceHashSchema).optional().default({}),
  includeInactive: z.boolean().optional().default(false),
  limit: z.number().int().positive().max(100).optional().default(50),
})

export const requestPaymentDestinationChangeInputSchema = z.object({
  organizationId: z.string().trim().min(1),
  actorId: z.string().trim().min(1),
  actorPermissions: z.array(z.string()).optional().default([]),
  employeeId: z.string().trim().min(1),
  paymentMethod: z.nativeEnum(PaymentMethod),
  bankAccountNumber: z.string().trim().min(4).max(80).optional(),
  bankName: z.string().trim().min(1).max(120).optional(),
  accountHolderName: z.string().trim().min(1).max(160).optional(),
  mobileMoneyProvider: z.string().trim().min(1).max(80).optional(),
  mobileMoneyPhone: z.string().trim().min(6).max(40).optional(),
  requestReason: z.string().trim().min(3).max(500),
  evidenceDocumentHash: evidenceHashSchema,
  sourceReference: sourceReferenceSchema,
  idempotencyKey: z.string().trim().min(1).optional(),
})

export const approvePaymentDestinationChangeInputSchema = z.object({
  organizationId: z.string().trim().min(1),
  actorId: z.string().trim().min(1),
  actorPermissions: z.array(z.string()).optional().default([]),
  paymentDestinationChangeRequestId: z.string().trim().min(1),
  decisionReason: z.string().trim().min(3).max(500),
  approvalEvidenceHash: evidenceHashSchema,
  idempotencyKey: z.string().trim().min(1).optional(),
})

export const rejectPaymentDestinationChangeInputSchema = z.object({
  organizationId: z.string().trim().min(1),
  actorId: z.string().trim().min(1),
  actorPermissions: z.array(z.string()).optional().default([]),
  paymentDestinationChangeRequestId: z.string().trim().min(1),
  decisionReason: z.string().trim().min(3).max(500),
  idempotencyKey: z.string().trim().min(1).optional(),
})

export const applyApprovedPaymentDestinationChangeInputSchema = z.object({
  organizationId: z.string().trim().min(1),
  actorId: z.string().trim().min(1),
  actorPermissions: z.array(z.string()).optional().default([]),
  paymentDestinationChangeRequestId: z.string().trim().min(1),
  idempotencyKey: z.string().trim().min(1).optional(),
})

export type PaymentDestinationReadinessInput = z.input<typeof paymentDestinationReadinessInputSchema>
export type RequestPaymentDestinationChangeInput = z.input<typeof requestPaymentDestinationChangeInputSchema>
export type ApprovePaymentDestinationChangeInput = z.input<typeof approvePaymentDestinationChangeInputSchema>
export type RejectPaymentDestinationChangeInput = z.input<typeof rejectPaymentDestinationChangeInputSchema>
export type ApplyApprovedPaymentDestinationChangeInput = z.input<typeof applyApprovedPaymentDestinationChangeInputSchema>

export type PaymentDestinationChangeReadModel = {
  id: string
  employeeId: string
  employeeDisplayName: string
  status: PayrollPaymentDestinationChangeStatus
  paymentMethod: PaymentMethod
  maskedDestination: string | null
  requestedById: string
  approvedById: string | null
  appliedById: string | null
  requestedAt: string
  approvedAt: string | null
  appliedAt: string | null
  requestReason: string
  decisionReason: string | null
  evidenceDocumentHash: string
  approvalEvidenceHashPresent: boolean
  paymentDestinationHashPresent: boolean
  redactions: string[]
}

export type PaymentDestinationMutationResult = {
  paymentDestinationChange: PaymentDestinationChangeReadModel
  businessEventId: string
}

function assertPermission(actorPermissions: readonly string[] | null | undefined, required: readonly string[], action: string) {
  if (!hasAnyRbacPermission(actorPermissions, required)) throw new ForbiddenError(`Missing permission for ${action}.`)
}

function hasRootTransaction(client: DbClient): client is typeof db {
  return typeof (client as { $transaction?: unknown }).$transaction === "function"
}

async function inTransaction<T>(client: DbClient, fn: (tx: Prisma.TransactionClient) => Promise<T>) {
  if (hasRootTransaction(client)) return client.$transaction((tx) => fn(tx))
  return fn(client as Prisma.TransactionClient)
}

function safeJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue
}

function metadataRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>
}

function prefixedHash(value: unknown) {
  return `sha256:${hashBusinessPayload(value)}`
}

function normalizeSensitiveValue(value: string) {
  return value.replace(/\s+/g, "").trim()
}

function maskTrailing(value: string, visible = 4) {
  const normalized = normalizeSensitiveValue(value)
  const suffix = normalized.slice(-visible)
  return suffix ? `***${suffix}` : null
}

function normalizePaymentMethod(method: PaymentMethod) {
  const supported = new Set<PaymentMethod>([PaymentMethod.BANK_TRANSFER, PaymentMethod.MOBILE_MONEY, PaymentMethod.CASH, PaymentMethod.CHEQUE])
  if (!supported.has(method)) throw new BusinessRuleError("Payroll payment destination method is not supported for salary disbursement.")
  return method
}

function normalizeDestination(input: z.output<typeof requestPaymentDestinationChangeInputSchema>) {
  const paymentMethod = normalizePaymentMethod(input.paymentMethod)
  if (paymentMethod === PaymentMethod.BANK_TRANSFER || paymentMethod === PaymentMethod.CHEQUE) {
    if (!input.bankAccountNumber) throw new BusinessRuleError("Bank or cheque payroll destinations require account evidence.")
    const normalizedAccount = normalizeSensitiveValue(input.bankAccountNumber)
    const payload = {
      method: paymentMethod,
      bankAccountNumber: normalizedAccount,
      bankName: input.bankName?.trim() ?? null,
      accountHolderName: input.accountHolderName?.trim() ?? null,
    }
    return {
      paymentMethod,
      bankAccountMasked: maskTrailing(normalizedAccount),
      bankAccountHash: prefixedHash(payload),
      mobileMoneyProvider: null,
      mobileMoneyPhoneMasked: null,
      mobileMoneyPhoneHash: null,
      paymentDestinationHash: prefixedHash({ destination: payload, evidenceDocumentHash: input.evidenceDocumentHash }),
    }
  }

  if (paymentMethod === PaymentMethod.MOBILE_MONEY) {
    if (!input.mobileMoneyProvider || !input.mobileMoneyPhone) {
      throw new BusinessRuleError("Mobile money payroll destinations require provider and phone evidence.")
    }
    const normalizedPhone = normalizeSensitiveValue(input.mobileMoneyPhone)
    const provider = input.mobileMoneyProvider.trim().toUpperCase()
    const payload = { method: paymentMethod, provider, phone: normalizedPhone }
    return {
      paymentMethod,
      bankAccountMasked: null,
      bankAccountHash: null,
      mobileMoneyProvider: provider,
      mobileMoneyPhoneMasked: maskTrailing(normalizedPhone, 3),
      mobileMoneyPhoneHash: prefixedHash(payload),
      paymentDestinationHash: prefixedHash({ destination: payload, evidenceDocumentHash: input.evidenceDocumentHash }),
    }
  }

  return {
    paymentMethod,
    bankAccountMasked: null,
    bankAccountHash: null,
    mobileMoneyProvider: null,
    mobileMoneyPhoneMasked: null,
    mobileMoneyPhoneHash: null,
    paymentDestinationHash: prefixedHash({ method: paymentMethod, employeeId: input.employeeId, evidenceDocumentHash: input.evidenceDocumentHash }),
  }
}

function maskedDestinationFor(record: {
  paymentMethod: PaymentMethod | null
  bankAccountMasked?: string | null
  mobileMoneyProvider?: string | null
  mobileMoneyPhoneMasked?: string | null
}) {
  if (!record.paymentMethod) return null
  if (record.paymentMethod === PaymentMethod.MOBILE_MONEY) return [record.mobileMoneyProvider, record.mobileMoneyPhoneMasked].filter(Boolean).join(" ") || null
  if (record.paymentMethod === PaymentMethod.BANK_TRANSFER || record.paymentMethod === PaymentMethod.CHEQUE) return record.bankAccountMasked ?? null
  return record.paymentMethod
}

function approvedEvidenceFromMetadata(metadata: unknown) {
  const evidence = metadataRecord(metadataRecord(metadata).approvedPaymentDestinationEvidence)
  return {
    requestId: typeof evidence.requestId === "string" ? evidence.requestId : null,
    paymentDestinationHash: typeof evidence.paymentDestinationHash === "string" ? evidence.paymentDestinationHash : null,
    evidenceDocumentHash: typeof evidence.evidenceDocumentHash === "string" ? evidence.evidenceDocumentHash : null,
    approvalEvidenceHash: typeof evidence.approvalEvidenceHash === "string" ? evidence.approvalEvidenceHash : null,
  }
}

function mapChange(request: DestinationChangeRecord): PaymentDestinationChangeReadModel {
  return {
    id: request.id,
    employeeId: request.employeeId,
    employeeDisplayName: request.employee.displayName,
    status: request.status,
    paymentMethod: request.paymentMethod,
    maskedDestination: maskedDestinationFor(request),
    requestedById: request.requestedById,
    approvedById: request.approvedById,
    appliedById: request.appliedById,
    requestedAt: request.requestedAt.toISOString(),
    approvedAt: request.approvedAt?.toISOString() ?? null,
    appliedAt: request.appliedAt?.toISOString() ?? null,
    requestReason: request.requestReason,
    decisionReason: request.decisionReason,
    evidenceDocumentHash: request.evidenceDocumentHash,
    approvalEvidenceHashPresent: Boolean(request.approvalEvidenceHash),
    paymentDestinationHashPresent: Boolean(request.paymentDestinationHash),
    redactions: ["PAYMENT_DETAILS_REDACTED", "DESTINATION_HASH_HIDDEN"],
  }
}
function evidenceReferencesFromMetadata(metadata: unknown) {
  const references = metadataRecord(metadata).hrEvidenceReferences
  if (!Array.isArray(references)) return []
  return references.filter((item): item is { type?: string; documentHash: string } => {
    return Boolean(item && typeof item === "object" && typeof (item as Record<string, unknown>).documentHash === "string")
  })
}

function paymentEvidenceHashes(employee: EmployeeReadinessRecord) {
  const hashes = new Set<string>()
  const approvedEvidence = approvedEvidenceFromMetadata(employee.metadata)
  if (approvedEvidence.evidenceDocumentHash) hashes.add(approvedEvidence.evidenceDocumentHash)
  if (approvedEvidence.approvalEvidenceHash) hashes.add(approvedEvidence.approvalEvidenceHash)
  for (const request of employee.paymentDestinationChangeRequests) {
    hashes.add(request.evidenceDocumentHash)
    if (request.approvalEvidenceHash) hashes.add(request.approvalEvidenceHash)
  }
  return Array.from(hashes).sort()
}

function buildEmployeeMetadataForAppliedDestination(
  employeeMetadata: unknown,
  request: DestinationChangeRecord,
  appliedBusinessEventId: string,
  actorId: string,
  appliedAt: Date,
) {
  const existing = metadataRecord(employeeMetadata)
  const references = new Map<string, Record<string, unknown>>()
  for (const reference of evidenceReferencesFromMetadata(existing)) {
    references.set(`${reference.type ?? "OTHER"}:${reference.documentHash}`, reference)
  }
  const paymentReferences = [
    { type: "PAYMENT", documentHash: request.evidenceDocumentHash, label: "Payment destination evidence" },
    request.approvalEvidenceHash
      ? { type: "PAYMENT", documentHash: request.approvalEvidenceHash, label: "Payment destination approval evidence" }
      : null,
  ].filter((item): item is { type: string; documentHash: string; label: string } => Boolean(item))
  for (const reference of paymentReferences) {
    references.set(`${reference.type}:${reference.documentHash}`, {
      ...reference,
      source: "payroll.payment_destination",
      attachedAt: appliedAt.toISOString(),
      attachedById: actorId,
      metadata: {
        paymentDestinationChangeRequestId: request.id,
        approvalControl: "MAKER_CHECKER",
      },
    })
  }

  return safeJson({
    ...existing,
    hrEvidenceReferences: Array.from(references.values()),
    approvedPaymentDestinationEvidence: {
      requestId: request.id,
      paymentMethod: request.paymentMethod,
      paymentDestinationHash: request.paymentDestinationHash,
      evidenceDocumentHash: request.evidenceDocumentHash,
      approvalEvidenceHash: request.approvalEvidenceHash,
      requestBusinessEventId: request.requestBusinessEventId,
      approvalBusinessEventId: request.approvalBusinessEventId,
      appliedBusinessEventId,
      requestedById: request.requestedById,
      approvedById: request.approvedById,
      appliedById: actorId,
      appliedAt: appliedAt.toISOString(),
      workflowSource: "payroll.payment_destination_approval",
    },
  })
}

function attendanceReadinessFor(employee: EmployeeReadinessRecord, parsed: z.output<typeof paymentDestinationReadinessInputSchema>) {
  const snapshot = employee.attendanceSnapshots[0] ?? null
  const expectedSourceHash = parsed.expectedAttendanceSourceHashes[employee.id]
  if (!snapshot) {
    return {
      status: "MISSING_SNAPSHOT" as const,
      snapshotId: null,
      snapshotStatus: null,
      periodStart: parsed.periodStart?.toISOString() ?? null,
      periodEnd: parsed.periodEnd?.toISOString() ?? null,
      sourceHashPresent: false,
      expectedSourceHashPresent: Boolean(expectedSourceHash),
      driftDetected: false,
      frozenAt: null,
      blocker: "ATTENDANCE_FREEZE_MISSING",
    }
  }
  if (snapshot.status !== PayrollAttendanceSnapshotStatus.FROZEN) {
    return {
      status: "NOT_FROZEN" as const,
      snapshotId: snapshot.id,
      snapshotStatus: snapshot.status,
      periodStart: snapshot.periodStart.toISOString(),
      periodEnd: snapshot.periodEnd.toISOString(),
      sourceHashPresent: Boolean(snapshot.sourceHash),
      expectedSourceHashPresent: Boolean(expectedSourceHash),
      driftDetected: false,
      frozenAt: snapshot.frozenAt?.toISOString() ?? null,
      blocker: "ATTENDANCE_NOT_FROZEN",
    }
  }
  if (!snapshot.sourceHash) {
    return {
      status: "SOURCE_HASH_MISSING" as const,
      snapshotId: snapshot.id,
      snapshotStatus: snapshot.status,
      periodStart: snapshot.periodStart.toISOString(),
      periodEnd: snapshot.periodEnd.toISOString(),
      sourceHashPresent: false,
      expectedSourceHashPresent: Boolean(expectedSourceHash),
      driftDetected: false,
      frozenAt: snapshot.frozenAt?.toISOString() ?? null,
      blocker: "ATTENDANCE_SOURCE_HASH_MISSING",
    }
  }
  if (expectedSourceHash && expectedSourceHash !== snapshot.sourceHash) {
    return {
      status: "DRIFT_DETECTED" as const,
      snapshotId: snapshot.id,
      snapshotStatus: snapshot.status,
      periodStart: snapshot.periodStart.toISOString(),
      periodEnd: snapshot.periodEnd.toISOString(),
      sourceHashPresent: true,
      expectedSourceHashPresent: true,
      driftDetected: true,
      frozenAt: snapshot.frozenAt?.toISOString() ?? null,
      blocker: "ATTENDANCE_SOURCE_DRIFT_DETECTED",
    }
  }
  return {
    status: "READY" as const,
    snapshotId: snapshot.id,
    snapshotStatus: snapshot.status,
    periodStart: snapshot.periodStart.toISOString(),
    periodEnd: snapshot.periodEnd.toISOString(),
    sourceHashPresent: true,
    expectedSourceHashPresent: Boolean(expectedSourceHash),
    driftDetected: false,
    frozenAt: snapshot.frozenAt?.toISOString() ?? null,
    blocker: null,
  }
}

function mapEmployeeReadiness(employee: EmployeeReadinessRecord, parsed: z.output<typeof paymentDestinationReadinessInputSchema>) {
  const approvedEvidence = approvedEvidenceFromMetadata(employee.metadata)
  const change = employee.paymentDestinationChangeRequests[0]
  const hasApprovedPaymentDestination = Boolean(
    employee.paymentDestinationHash &&
      approvedEvidence.requestId &&
      approvedEvidence.paymentDestinationHash === employee.paymentDestinationHash &&
      approvedEvidence.evidenceDocumentHash &&
      approvedEvidence.approvalEvidenceHash,
  )
  const paymentState = hasApprovedPaymentDestination
    ? "APPROVED"
    : change?.status === PayrollPaymentDestinationChangeStatus.REQUESTED || change?.status === PayrollPaymentDestinationChangeStatus.APPROVED
      ? "PENDING_APPROVAL"
      : change?.status === PayrollPaymentDestinationChangeStatus.REJECTED
        ? "REJECTED"
        : "MISSING_EVIDENCE"
  const attendance = attendanceReadinessFor(employee, parsed)
  const contractEvidenceHashes = employee.contracts
    .flatMap((contract) => [contract.signedDocumentHash, contract.activatedBusinessEventId])
    .filter((value): value is string => Boolean(value))
    .sort()
  const salaryChangeEvidenceHashes = employee.salaryChangeRequests
    .flatMap((request) => [request.evidenceDocumentHash, request.approvalEvidenceHash])
    .filter((value): value is string => Boolean(value))
    .sort()
  const identifierHashTypes = [employee.taxIdentifierHash ? "TAX" : null, employee.socialIdentifierHash ? "SOCIAL" : null]
    .filter((value): value is string => Boolean(value))
  const paymentHashes = paymentEvidenceHashes(employee)
  const blockers: string[] = []
  if (employee.status !== PayrollEmployeeStatus.ACTIVE) blockers.push("EMPLOYEE_NOT_ACTIVE")
  if (!hasApprovedPaymentDestination) blockers.push("APPROVED_PAYMENT_DESTINATION_EVIDENCE_MISSING")
  if (attendance.blocker) blockers.push(attendance.blocker)

  return {
    id: employee.id,
    employeeNumber: employee.employeeNumber,
    displayName: employee.displayName,
    status: employee.status,
    paymentDestination: {
      state: paymentState,
      method: employee.paymentMethod,
      maskedDestination: maskedDestinationFor(employee),
      approvedEvidenceHashPresent: Boolean(approvedEvidence.approvalEvidenceHash),
      paymentDestinationHashPresent: Boolean(employee.paymentDestinationHash),
      latestChange: change ? mapChange({ ...change, employee } as DestinationChangeRecord) : null,
    },
    evidence: {
      contractEvidenceHashes,
      salaryChangeEvidenceHashes,
      identifierHashTypes,
      paymentEvidenceHashes: paymentHashes,
      totalReferenceCount: contractEvidenceHashes.length + salaryChangeEvidenceHashes.length + identifierHashTypes.length + paymentHashes.length,
    },
    attendanceReadiness: attendance,
    blockers,
  }
}

async function writeAudit(
  tx: Prisma.TransactionClient | DbClient,
  input: { organizationId: string; entityType: string; entityId: string; action: string; actorId?: string | null; before?: unknown; after?: unknown },
) {
  await tx.auditLog.create({
    data: {
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      userId: input.actorId ?? null,
      organizationId: input.organizationId,
      changes: safeJson({ before: input.before ?? null, after: input.after ?? null }),
    },
  })
}

async function recordPaymentDestinationEvent(
  tx: Prisma.TransactionClient,
  input: { organizationId: string; actorId: string; eventType: string; idempotencyKey: string; sourceId: string; documentHash: string; payload: Record<string, unknown>; metadata?: Record<string, unknown> },
) {
  const eventResult = await recordBusinessEventInTx(tx as unknown as BusinessEventTx, {
    organizationId: input.organizationId,
    eventType: input.eventType,
    eventSource: "INTERNAL",
    schemaVersion: 1,
    idempotencyKey: input.idempotencyKey,
    payload: input.payload,
    occurredAt: new Date(),
    actorId: input.actorId,
    sourceType: "PAYROLL_PAYMENT_DESTINATION",
    sourceId: input.sourceId,
    documentHash: input.documentHash,
    metadata: { gate: "aqstoqflow-hrpayroll-10-payment-evidence-readiness", ...(input.metadata ?? {}) },
    outboxMessages: [
      {
        channel: "NOTIFICATION",
        eventName: input.eventType.replace(/\./g, "_"),
        destination: "payroll",
        payload: { severity: "info", paymentDestinationChangeRequestId: input.sourceId },
      },
    ],
  })
  await markBusinessEventAppliedInTx(tx as unknown as BusinessEventTx, input.organizationId, eventResult.event.id)
  return eventResult.event.id
}

function changeEventPayload(request: Prisma.PayrollPaymentDestinationChangeRequestGetPayload<object>, action: string) {
  return {
    action,
    paymentDestinationChangeRequestId: request.id,
    employeeId: request.employeeId,
    status: request.status,
    paymentMethod: request.paymentMethod,
    paymentDestinationHashPresent: Boolean(request.paymentDestinationHash),
    evidenceDocumentHashPresent: Boolean(request.evidenceDocumentHash),
    approvalEvidenceHashPresent: Boolean(request.approvalEvidenceHash),
  }
}

async function findPaymentDestinationChangeForDecision(tx: Prisma.TransactionClient, organizationId: string, requestId: string) {
  const request = await tx.payrollPaymentDestinationChangeRequest.findFirst({
    where: { id: requestId, organizationId, deletedAt: null },
    include: { employee: true },
  }) as DestinationChangeRecord | null
  if (!request) throw new NotFoundError("Payment destination change request was not found for this tenant.")
  return request
}

export async function getPaymentEvidenceReadiness(input: PaymentDestinationReadinessInput, client: DbClient = db) {
  const parsed = paymentDestinationReadinessInputSchema.parse(input)
  const canReadDestination = hasAnyRbacPermission(parsed.actorPermissions, READ_PERMISSIONS)
  const canReadAttendance = hasAnyRbacPermission(parsed.actorPermissions, ATTENDANCE_READINESS_PERMISSIONS)
  if (!canReadDestination && !canReadAttendance) throw new ForbiddenError("Missing permission for payment evidence readiness read.")

  const employees = await client.payrollEmployee.findMany({
    where: {
      organizationId: parsed.organizationId,
      deletedAt: null,
      ...(parsed.employeeId ? { id: parsed.employeeId } : {}),
      ...(parsed.includeInactive ? {} : { status: PayrollEmployeeStatus.ACTIVE }),
    },
    include: {
      contracts: { where: { deletedAt: null }, orderBy: [{ effectiveFrom: "desc" }] },
      salaryChangeRequests: { where: { deletedAt: null }, orderBy: [{ createdAt: "desc" }], take: 10 },
      paymentDestinationChangeRequests: { where: { deletedAt: null }, orderBy: [{ createdAt: "desc" }], take: 10 },
      attendanceSnapshots: {
        where: {
          ...(parsed.periodStart ? { periodStart: parsed.periodStart } : {}),
          ...(parsed.periodEnd ? { periodEnd: parsed.periodEnd } : {}),
        },
        orderBy: [{ periodEnd: "desc" }, { createdAt: "desc" }],
        take: 5,
      },
    },
    orderBy: [{ employeeNumber: "asc" }],
    take: parsed.limit,
  })
  const mapped = (employees as EmployeeReadinessRecord[]).map((employee) => mapEmployeeReadiness(employee, parsed))
  await writeAudit(client, {
    organizationId: parsed.organizationId,
    entityType: "PayrollPaymentEvidenceReadiness",
    entityId: parsed.employeeId ?? "payment-evidence-readiness",
    action: "PAYROLL_PAYMENT_EVIDENCE_READINESS_READ",
    actorId: parsed.actorId,
    after: { employeeCount: mapped.length, paymentDestinationReadAllowed: canReadDestination, attendanceReadAllowed: canReadAttendance },
  })

  return {
    organizationId: parsed.organizationId,
    asOf: new Date().toISOString(),
    employees: mapped,
    summary: {
      employeeCount: mapped.length,
      approvedPaymentDestinationCount: mapped.filter((employee) => employee.paymentDestination.state === "APPROVED").length,
      pendingPaymentDestinationCount: mapped.filter((employee) => employee.paymentDestination.state === "PENDING_APPROVAL").length,
      missingPaymentDestinationCount: mapped.filter((employee) => employee.paymentDestination.state === "MISSING_EVIDENCE").length,
      attendanceReadyCount: mapped.filter((employee) => employee.attendanceReadiness.status === "READY").length,
      attendanceDriftCount: mapped.filter((employee) => employee.attendanceReadiness.status === "DRIFT_DETECTED").length,
      blockerCount: mapped.reduce((count, employee) => count + employee.blockers.length, 0),
    },
  }
}

export type PaymentEvidenceReadinessResult = Awaited<ReturnType<typeof getPaymentEvidenceReadiness>>

export async function requestPaymentDestinationChange(
  input: RequestPaymentDestinationChangeInput,
  client: DbClient = db,
): Promise<PaymentDestinationMutationResult> {
  const parsed = requestPaymentDestinationChangeInputSchema.parse(input)
  assertPermission(parsed.actorPermissions, REQUEST_PERMISSIONS, "payment destination change request")
  const destination = normalizeDestination(parsed)

  return inTransaction(client, async (tx) => {
    const employee = await tx.payrollEmployee.findFirst({
      where: { id: parsed.employeeId, organizationId: parsed.organizationId, deletedAt: null },
    })
    if (!employee) throw new NotFoundError("Payroll employee was not found for this tenant.")
    if (employee.status !== PayrollEmployeeStatus.ACTIVE) {
      throw new BusinessRuleError("Payment destination changes require an active payroll employee.")
    }

    const existingOpen = await tx.payrollPaymentDestinationChangeRequest.findFirst({
      where: {
        organizationId: parsed.organizationId,
        employeeId: parsed.employeeId,
        status: { in: [PayrollPaymentDestinationChangeStatus.REQUESTED, PayrollPaymentDestinationChangeStatus.APPROVED] },
        deletedAt: null,
      },
      select: { id: true },
    })
    if (existingOpen) throw new ConflictError("An open payment destination change already exists for this employee.")

    const request = await tx.payrollPaymentDestinationChangeRequest.create({
      data: {
        organizationId: parsed.organizationId,
        employeeId: parsed.employeeId,
        status: PayrollPaymentDestinationChangeStatus.REQUESTED,
        paymentMethod: destination.paymentMethod,
        bankAccountMasked: destination.bankAccountMasked,
        bankAccountHash: destination.bankAccountHash,
        mobileMoneyProvider: destination.mobileMoneyProvider,
        mobileMoneyPhoneMasked: destination.mobileMoneyPhoneMasked,
        mobileMoneyPhoneHash: destination.mobileMoneyPhoneHash,
        paymentDestinationHash: destination.paymentDestinationHash,
        requestedById: parsed.actorId,
        requestReason: parsed.requestReason,
        evidenceDocumentHash: parsed.evidenceDocumentHash,
        metadata: safeJson({
          workflowSource: "payroll.payment_destination_approval",
          sourceReference: parsed.sourceReference ?? null,
          rawPaymentDetailsStored: false,
          redactionPolicy: "MASKED_AND_HASHED_ONLY",
        }),
      },
      include: { employee: true },
    }) as DestinationChangeRecord

    const businessEventId = await recordPaymentDestinationEvent(tx, {
      organizationId: parsed.organizationId,
      actorId: parsed.actorId,
      eventType: "payroll.payment_destination.requested",
      idempotencyKey: parsed.idempotencyKey ?? `payroll-payment-destination-request:${parsed.organizationId}:${request.id}`,
      sourceId: request.id,
      documentHash: parsed.evidenceDocumentHash,
      payload: changeEventPayload(request, "requested"),
      metadata: { sourceReference: parsed.sourceReference ?? null },
    })
    const updated = await tx.payrollPaymentDestinationChangeRequest.update({
      where: { id: request.id, organizationId: parsed.organizationId },
      data: { requestBusinessEventId: businessEventId },
      include: { employee: true },
    }) as DestinationChangeRecord
    const mapped = mapChange(updated)

    await writeAudit(tx, {
      organizationId: parsed.organizationId,
      entityType: "PayrollPaymentDestinationChangeRequest",
      entityId: updated.id,
      action: "PAYROLL_PAYMENT_DESTINATION_CHANGE_REQUESTED",
      actorId: parsed.actorId,
      before: null,
      after: mapped,
    })
    return { paymentDestinationChange: mapped, businessEventId }
  })
}

export async function approvePaymentDestinationChange(
  input: ApprovePaymentDestinationChangeInput,
  client: DbClient = db,
): Promise<PaymentDestinationMutationResult> {
  const parsed = approvePaymentDestinationChangeInputSchema.parse(input)
  assertPermission(parsed.actorPermissions, APPROVE_PERMISSIONS, "payment destination approval")

  return inTransaction(client, async (tx) => {
    const existing = await findPaymentDestinationChangeForDecision(tx, parsed.organizationId, parsed.paymentDestinationChangeRequestId)
    if (existing.status !== PayrollPaymentDestinationChangeStatus.REQUESTED) {
      throw new BusinessRuleError("Only requested payment destination changes can be approved.")
    }
    if (existing.requestedById === parsed.actorId) {
      throw new ForbiddenError("Payment destination requester cannot approve their own request.")
    }

    const approved = await tx.payrollPaymentDestinationChangeRequest.update({
      where: { id: existing.id, organizationId: parsed.organizationId },
      data: {
        status: PayrollPaymentDestinationChangeStatus.APPROVED,
        approvedById: parsed.actorId,
        approvedAt: new Date(),
        decisionReason: parsed.decisionReason,
        approvalEvidenceHash: parsed.approvalEvidenceHash,
        metadata: safeJson({
          ...metadataRecord(existing.metadata),
          approvalControl: "MAKER_CHECKER",
          requesterId: existing.requestedById,
          approverId: parsed.actorId,
        }),
      },
      include: { employee: true },
    }) as DestinationChangeRecord

    const businessEventId = await recordPaymentDestinationEvent(tx, {
      organizationId: parsed.organizationId,
      actorId: parsed.actorId,
      eventType: "payroll.payment_destination.approved",
      idempotencyKey: parsed.idempotencyKey ?? `payroll-payment-destination-approve:${parsed.organizationId}:${approved.id}`,
      sourceId: approved.id,
      documentHash: parsed.approvalEvidenceHash,
      payload: changeEventPayload(approved, "approved"),
      metadata: { decisionReason: parsed.decisionReason },
    })
    const updated = await tx.payrollPaymentDestinationChangeRequest.update({
      where: { id: approved.id, organizationId: parsed.organizationId },
      data: { approvalBusinessEventId: businessEventId },
      include: { employee: true },
    }) as DestinationChangeRecord
    const mapped = mapChange(updated)

    await writeAudit(tx, {
      organizationId: parsed.organizationId,
      entityType: "PayrollPaymentDestinationChangeRequest",
      entityId: updated.id,
      action: "PAYROLL_PAYMENT_DESTINATION_CHANGE_APPROVED",
      actorId: parsed.actorId,
      before: { status: existing.status, requestedById: existing.requestedById },
      after: mapped,
    })
    return { paymentDestinationChange: mapped, businessEventId }
  })
}

export async function rejectPaymentDestinationChange(
  input: RejectPaymentDestinationChangeInput,
  client: DbClient = db,
): Promise<PaymentDestinationMutationResult> {
  const parsed = rejectPaymentDestinationChangeInputSchema.parse(input)
  assertPermission(parsed.actorPermissions, APPROVE_PERMISSIONS, "payment destination rejection")

  return inTransaction(client, async (tx) => {
    const existing = await findPaymentDestinationChangeForDecision(tx, parsed.organizationId, parsed.paymentDestinationChangeRequestId)
    if (existing.status !== PayrollPaymentDestinationChangeStatus.REQUESTED) {
      throw new BusinessRuleError("Only requested payment destination changes can be rejected.")
    }
    if (existing.requestedById === parsed.actorId) {
      throw new ForbiddenError("Payment destination requester cannot reject their own request.")
    }

    const rejected = await tx.payrollPaymentDestinationChangeRequest.update({
      where: { id: existing.id, organizationId: parsed.organizationId },
      data: {
        status: PayrollPaymentDestinationChangeStatus.REJECTED,
        rejectedById: parsed.actorId,
        rejectedAt: new Date(),
        decisionReason: parsed.decisionReason,
      },
      include: { employee: true },
    }) as DestinationChangeRecord
    const businessEventId = await recordPaymentDestinationEvent(tx, {
      organizationId: parsed.organizationId,
      actorId: parsed.actorId,
      eventType: "payroll.payment_destination.rejected",
      idempotencyKey: parsed.idempotencyKey ?? `payroll-payment-destination-reject:${parsed.organizationId}:${rejected.id}`,
      sourceId: rejected.id,
      documentHash: rejected.evidenceDocumentHash,
      payload: changeEventPayload(rejected, "rejected"),
      metadata: { decisionReason: parsed.decisionReason },
    })
    const mapped = mapChange(rejected)

    await writeAudit(tx, {
      organizationId: parsed.organizationId,
      entityType: "PayrollPaymentDestinationChangeRequest",
      entityId: rejected.id,
      action: "PAYROLL_PAYMENT_DESTINATION_CHANGE_REJECTED",
      actorId: parsed.actorId,
      before: { status: existing.status, requestedById: existing.requestedById },
      after: mapped,
    })
    return { paymentDestinationChange: mapped, businessEventId }
  })
}

export async function applyApprovedPaymentDestinationChange(
  input: ApplyApprovedPaymentDestinationChangeInput,
  client: DbClient = db,
): Promise<PaymentDestinationMutationResult> {
  const parsed = applyApprovedPaymentDestinationChangeInputSchema.parse(input)
  assertPermission(parsed.actorPermissions, APPLY_PERMISSIONS, "approved payment destination application")

  return inTransaction(client, async (tx) => {
    const existing = await findPaymentDestinationChangeForDecision(tx, parsed.organizationId, parsed.paymentDestinationChangeRequestId)
    if (existing.status !== PayrollPaymentDestinationChangeStatus.APPROVED) {
      throw new BusinessRuleError("Only approved payment destination changes can be applied.")
    }
    if (!existing.approvalEvidenceHash || !existing.approvedById) {
      throw new BusinessRuleError("Approved payment destination changes require approval evidence before application.")
    }
    if (existing.requestedById === parsed.actorId) {
      throw new ForbiddenError("Payment destination requester cannot apply their own request.")
    }
    const appliedAt = new Date()

    const businessEventId = await recordPaymentDestinationEvent(tx, {
      organizationId: parsed.organizationId,
      actorId: parsed.actorId,
      eventType: "payroll.payment_destination.applied",
      idempotencyKey: parsed.idempotencyKey ?? `payroll-payment-destination-apply:${parsed.organizationId}:${existing.id}`,
      sourceId: existing.id,
      documentHash: existing.approvalEvidenceHash,
      payload: changeEventPayload(existing, "applied"),
      metadata: { approvalBusinessEventId: existing.approvalBusinessEventId },
    })

    await tx.payrollEmployee.update({
      where: { id: existing.employeeId, organizationId: parsed.organizationId },
      data: {
        paymentMethod: existing.paymentMethod,
        bankAccountMasked: existing.bankAccountMasked,
        bankAccountHash: existing.bankAccountHash,
        mobileMoneyProvider: existing.mobileMoneyProvider,
        mobileMoneyPhoneMasked: existing.mobileMoneyPhoneMasked,
        mobileMoneyPhoneHash: existing.mobileMoneyPhoneHash,
        paymentDestinationHash: existing.paymentDestinationHash,
        metadata: buildEmployeeMetadataForAppliedDestination(existing.employee.metadata, existing, businessEventId, parsed.actorId, appliedAt),
      },
    })

    const applied = await tx.payrollPaymentDestinationChangeRequest.update({
      where: { id: existing.id, organizationId: parsed.organizationId },
      data: {
        status: PayrollPaymentDestinationChangeStatus.APPLIED,
        appliedById: parsed.actorId,
        appliedAt,
        appliedBusinessEventId: businessEventId,
      },
      include: { employee: true },
    }) as DestinationChangeRecord
    const mapped = mapChange(applied)

    await writeAudit(tx, {
      organizationId: parsed.organizationId,
      entityType: "PayrollPaymentDestinationChangeRequest",
      entityId: applied.id,
      action: "PAYROLL_PAYMENT_DESTINATION_CHANGE_APPLIED",
      actorId: parsed.actorId,
      before: { status: existing.status, employeePaymentDestinationHashPresent: Boolean(existing.employee.paymentDestinationHash) },
      after: mapped,
    })
    return { paymentDestinationChange: mapped, businessEventId }
  })
}

export async function assertApprovedPaymentDestinationEvidence(
  client: DbClient,
  input: { organizationId: string; employeeId: string },
) {
  const employee = await client.payrollEmployee.findFirst({
    where: { id: input.employeeId, organizationId: input.organizationId, deletedAt: null },
    select: { id: true, displayName: true, paymentDestinationHash: true, metadata: true },
  })
  if (!employee) throw new NotFoundError("Payroll employee was not found for payment destination verification.")
  const approvedEvidence = approvedEvidenceFromMetadata(employee.metadata)
  if (!employee.paymentDestinationHash || !approvedEvidence.requestId) {
    throw new BusinessRuleError(`Employee ${employee.displayName} has no approved payment destination evidence.`)
  }
  if (approvedEvidence.paymentDestinationHash !== employee.paymentDestinationHash) {
    throw new BusinessRuleError(`Employee ${employee.displayName} payment destination evidence no longer matches the applied destination.`)
  }
  if (!approvedEvidence.evidenceDocumentHash || !approvedEvidence.approvalEvidenceHash) {
    throw new BusinessRuleError(`Employee ${employee.displayName} payment destination approval evidence is incomplete.`)
  }

  const request = await client.payrollPaymentDestinationChangeRequest.findFirst({
    where: {
      id: approvedEvidence.requestId,
      organizationId: input.organizationId,
      employeeId: input.employeeId,
      status: PayrollPaymentDestinationChangeStatus.APPLIED,
      paymentDestinationHash: employee.paymentDestinationHash,
      deletedAt: null,
    },
    select: { id: true, evidenceDocumentHash: true, approvalEvidenceHash: true, appliedBusinessEventId: true },
  })
  if (!request || !request.appliedBusinessEventId) {
    throw new BusinessRuleError(`Employee ${employee.displayName} has no applied payment destination approval record.`)
  }
  if (request.evidenceDocumentHash !== approvedEvidence.evidenceDocumentHash || request.approvalEvidenceHash !== approvedEvidence.approvalEvidenceHash) {
    throw new BusinessRuleError(`Employee ${employee.displayName} payment destination evidence hashes do not match approval record.`)
  }

  return {
    employeeId: employee.id,
    paymentDestinationChangeRequestId: request.id,
    paymentDestinationHash: employee.paymentDestinationHash,
    evidenceDocumentHash: request.evidenceDocumentHash,
    approvalEvidenceHash: request.approvalEvidenceHash,
  }
}
