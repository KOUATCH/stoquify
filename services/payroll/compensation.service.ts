import "server-only"

import {
  PayrollContractStatus,
  PayrollEmployeeStatus,
  PayrollRubriqueAssignmentStatus,
  PayrollRubriqueKind,
  PayrollRubriqueStatus,
  PayrollRubriqueValueType,
  PayrollSalaryChangeStatus,
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
import { resolveRegulatoryParameter } from "@/services/regulatory/country-packs/resolve"
import { evaluateRedaction, type RedactionDecision } from "@/services/security/redaction-policy.service"

type DbClient = typeof db | Prisma.TransactionClient
type BusinessEventTx = Parameters<typeof recordBusinessEventInTx>[0]

type RubriqueRecord = Prisma.PayrollRubriqueGetPayload<object>
type AssignmentRecord = Prisma.PayrollEmployeeRubriqueAssignmentGetPayload<{
  include: { employee: true; rubrique: true }
}>
type SalaryChangeRecord = Prisma.PayrollSalaryChangeRequestGetPayload<{
  include: {
    employee: true
    sourceContract: true
    supersedingContract: true
  }
}>
type ContractRecord = Prisma.PayrollContractGetPayload<{ include: { employee: true } }>

const READ_PERMISSIONS = ["payroll.compensation.read"]
const MANAGE_PERMISSIONS = ["payroll.compensation.manage"]
const SALARY_REQUEST_PERMISSIONS = ["payroll.salary_changes.request"]
const SALARY_APPROVE_PERMISSIONS = ["payroll.salary_changes.approve"]
const SALARY_APPLY_PERMISSIONS = ["payroll.salary_changes.apply"]

const dateInputSchema = z.union([z.string().trim().min(1), z.date()])
const optionalDateInputSchema = z.union([z.string().trim().min(1), z.date(), z.null()]).optional()
const decimalInputSchema = z.union([z.string().trim().min(1), z.number()])
const optionalDecimalInputSchema = z.union([z.string().trim().min(1), z.number(), z.null()]).optional()

const evidenceHashSchema = z.string().trim().min(8).max(256)

const sourceReferenceSchema = z.object({
  sourceSystem: z.string().trim().min(1).max(120).optional(),
  sourceRecordId: z.string().trim().min(1).max(160).optional(),
  sourceHash: z.string().trim().min(8).max(256).optional(),
}).optional()

export const compensationWorkflowInputSchema = z.object({
  organizationId: z.string().trim().min(1),
  actorId: z.string().trim().min(1).optional(),
  actorPermissions: z.array(z.string()).optional().default([]),
  employeeId: z.string().trim().min(1).optional(),
  includeInactive: z.boolean().optional().default(false),
})

export const upsertPayrollRubriqueInputSchema = z.object({
  organizationId: z.string().trim().min(1),
  actorId: z.string().trim().min(1).optional(),
  actorPermissions: z.array(z.string()).optional().default([]),
  code: z.string().trim().min(1).max(40),
  label: z.string().trim().min(1).max(160),
  description: z.string().trim().max(600).nullable().optional(),
  kind: z.nativeEnum(PayrollRubriqueKind),
  valueType: z.nativeEnum(PayrollRubriqueValueType),
  status: z.nativeEnum(PayrollRubriqueStatus).optional().default(PayrollRubriqueStatus.DRAFT),
  taxableBase: z.boolean().optional().default(false),
  socialBase: z.boolean().optional().default(false),
  employerCharge: z.boolean().optional().default(false),
  payslipLabel: z.string().trim().max(160).nullable().optional(),
  postingDebitAccountCode: z.string().trim().max(40).nullable().optional(),
  postingCreditAccountCode: z.string().trim().max(40).nullable().optional(),
  countryCode: z.string().trim().length(2).optional(),
  statutoryParameterPath: z.string().trim().min(1).max(240).optional(),
  effectiveAt: dateInputSchema.optional(),
  sourceReference: sourceReferenceSchema,
  idempotencyKey: z.string().trim().min(1).max(200).optional(),
})

export const assignEmployeeRubriqueInputSchema = z.object({
  organizationId: z.string().trim().min(1),
  actorId: z.string().trim().min(1).optional(),
  actorPermissions: z.array(z.string()).optional().default([]),
  employeeId: z.string().trim().min(1),
  rubriqueId: z.string().trim().min(1),
  status: z.nativeEnum(PayrollRubriqueAssignmentStatus).optional().default(PayrollRubriqueAssignmentStatus.DRAFT),
  amount: optionalDecimalInputSchema,
  rateBps: z.number().int().nonnegative().max(1_000_000).nullable().optional(),
  quantity: optionalDecimalInputSchema,
  currency: z.string().trim().length(3).optional().default("XAF"),
  effectiveFrom: dateInputSchema,
  effectiveTo: optionalDateInputSchema,
  evidenceDocumentHash: evidenceHashSchema.optional(),
  sourceReference: sourceReferenceSchema,
  idempotencyKey: z.string().trim().min(1).max(200).optional(),
})

export const requestSalaryChangeInputSchema = z.object({
  organizationId: z.string().trim().min(1),
  actorId: z.string().trim().min(1),
  actorPermissions: z.array(z.string()).optional().default([]),
  employeeId: z.string().trim().min(1),
  sourceContractId: z.string().trim().min(1),
  proposedBaseSalary: decimalInputSchema,
  effectiveFrom: dateInputSchema,
  requestReason: z.string().trim().min(3).max(800),
  evidenceDocumentHash: evidenceHashSchema,
  sourceReference: sourceReferenceSchema,
  idempotencyKey: z.string().trim().min(1).max(200).optional(),
})

export const approveSalaryChangeInputSchema = z.object({
  organizationId: z.string().trim().min(1),
  actorId: z.string().trim().min(1),
  actorPermissions: z.array(z.string()).optional().default([]),
  salaryChangeRequestId: z.string().trim().min(1),
  decisionReason: z.string().trim().min(3).max(800),
  approvalEvidenceHash: evidenceHashSchema,
  idempotencyKey: z.string().trim().min(1).max(200).optional(),
})

export const rejectSalaryChangeInputSchema = z.object({
  organizationId: z.string().trim().min(1),
  actorId: z.string().trim().min(1),
  actorPermissions: z.array(z.string()).optional().default([]),
  salaryChangeRequestId: z.string().trim().min(1),
  decisionReason: z.string().trim().min(3).max(800),
  idempotencyKey: z.string().trim().min(1).max(200).optional(),
})

export const applyApprovedSalaryChangeInputSchema = z.object({
  organizationId: z.string().trim().min(1),
  actorId: z.string().trim().min(1),
  actorPermissions: z.array(z.string()).optional().default([]),
  salaryChangeRequestId: z.string().trim().min(1),
  idempotencyKey: z.string().trim().min(1).max(200).optional(),
})

export type CompensationWorkflowInput = z.input<typeof compensationWorkflowInputSchema>
export type UpsertPayrollRubriqueInput = z.input<typeof upsertPayrollRubriqueInputSchema>
export type AssignEmployeeRubriqueInput = z.input<typeof assignEmployeeRubriqueInputSchema>
export type RequestSalaryChangeInput = z.input<typeof requestSalaryChangeInputSchema>
export type ApproveSalaryChangeInput = z.input<typeof approveSalaryChangeInputSchema>
export type RejectSalaryChangeInput = z.input<typeof rejectSalaryChangeInputSchema>
export type ApplyApprovedSalaryChangeInput = z.input<typeof applyApprovedSalaryChangeInputSchema>

export type CompensationRedaction = {
  field: string
  policy: string
  reasonCode: RedactionDecision["reasonCode"]
}

export type PayrollRubriqueReadModel = {
  id: string
  code: string
  label: string
  kind: PayrollRubriqueKind
  valueType: PayrollRubriqueValueType
  status: PayrollRubriqueStatus
  taxableBase: boolean
  socialBase: boolean
  employerCharge: boolean
  statutoryParameterPath: string | null
  countryPackVersion: string | null
  countryPackResolutionHash: string | null
  countryPackVerificationStatus: string | null
  countryPackCapabilityStatus: string | null
}

export type PayrollRubriqueAssignmentReadModel = {
  id: string
  employeeId: string
  employeeNumber: string
  rubriqueId: string
  rubriqueCode: string
  status: PayrollRubriqueAssignmentStatus
  amount: string | null
  rateBps: number | null
  quantity: string | null
  currency: string
  effectiveFrom: string
  effectiveTo: string | null
  redactions: CompensationRedaction[]
}

export type PayrollSalaryChangeReadModel = {
  id: string
  employeeId: string
  employeeNumber: string
  sourceContractId: string
  supersedingContractId: string | null
  status: PayrollSalaryChangeStatus
  currentBaseSalary: string
  proposedBaseSalary: string
  currency: string
  effectiveFrom: string
  requestedById: string
  approvedById: string | null
  appliedById: string | null
  evidenceDocumentHashPresent: boolean
  approvalEvidenceHashPresent: boolean
  redactions: CompensationRedaction[]
}

export type CompensationWorkflowResult = {
  organizationId: string
  asOf: string
  summary: {
    rubriques: number
    activeRubriques: number
    assignments: number
    requestedSalaryChanges: number
    approvedSalaryChanges: number
    redactedSalaryChanges: number
  }
  rubriques: PayrollRubriqueReadModel[]
  assignments: PayrollRubriqueAssignmentReadModel[]
  salaryChanges: PayrollSalaryChangeReadModel[]
}

export type RubriqueMutationResult = {
  rubrique: PayrollRubriqueReadModel
  businessEventId: string
  created: boolean
}

export type AssignmentMutationResult = {
  assignment: PayrollRubriqueAssignmentReadModel
  businessEventId: string
}

export type SalaryChangeMutationResult = {
  salaryChange: PayrollSalaryChangeReadModel
  businessEventId: string
  supersedingContractId?: string | null
}

function assertPermission(
  actorPermissions: readonly string[] | null | undefined,
  required: readonly string[],
  action: string,
) {
  if (!hasAnyRbacPermission(actorPermissions ?? [], required)) {
    throw new ForbiddenError(`Missing payroll compensation permission for ${action}.`)
  }
}

function hasRootTransaction(client: DbClient): client is typeof db {
  return typeof (client as { $transaction?: unknown }).$transaction === "function"
}

async function inTransaction<T>(client: DbClient, fn: (tx: Prisma.TransactionClient) => Promise<T>) {
  if (hasRootTransaction(client)) return client.$transaction((tx) => fn(tx))
  return fn(client as Prisma.TransactionClient)
}

function safeJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue
}

function metadataRecord(value: Prisma.JsonValue | null | undefined): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

function parseDate(value: z.input<typeof dateInputSchema>, field: string) {
  const date = value instanceof Date ? new Date(value) : new Date(value)
  if (Number.isNaN(date.getTime())) throw new BusinessRuleError(`${field} must be a valid date.`)
  return date
}

function parseOptionalDate(value: z.input<typeof optionalDateInputSchema>, field: string) {
  if (value === undefined || value === null) return null
  return parseDate(value, field)
}

function parseDecimal(value: z.input<typeof decimalInputSchema>, field: string, allowZero = true) {
  let decimal: Prisma.Decimal
  try {
    decimal = new Prisma.Decimal(value)
  } catch {
    throw new BusinessRuleError(`${field} must be a valid decimal amount.`)
  }

  if (decimal.lessThan(0) || (!allowZero && decimal.equals(0))) {
    throw new BusinessRuleError(`${field} must be ${allowZero ? "zero or positive" : "positive"}.`)
  }

  return decimal.toDecimalPlaces(2)
}

function parseOptionalDecimal(value: z.input<typeof optionalDecimalInputSchema>, field: string) {
  if (value === undefined || value === null || value === "") return null
  return parseDecimal(value, field, false)
}

function decimalToString(value: Prisma.Decimal | number | string | null | undefined) {
  if (value === null || value === undefined) return null
  return new Prisma.Decimal(value).toFixed(2)
}

function assertEffectiveDateOrder(effectiveFrom: Date, effectiveTo: Date | null) {
  if (effectiveTo && effectiveTo < effectiveFrom) {
    throw new BusinessRuleError("Effective end date cannot be before its start date.")
  }
}

function normalizeCode(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9_.-]/g, "_")
}

function normalizeCountryCode(value?: string | null) {
  const normalized = value?.trim().toUpperCase()
  if (!normalized) return null
  if (normalized === "CAMEROON") return "CM"
  return normalized.length === 2 ? normalized : null
}

function compactDate(date: Date) {
  return date.toISOString().slice(0, 10).replace(/-/g, "")
}

function dayBefore(date: Date) {
  const copy = new Date(date)
  copy.setUTCDate(copy.getUTCDate() - 1)
  return copy
}

function buildMetadata(existing: Prisma.JsonValue | null | undefined, patch: Record<string, unknown>) {
  return safeJson({
    ...metadataRecord(existing),
    ...patch,
    workflowSource: "payroll.compensation_approval",
    lastWorkflowUpdatedAt: new Date().toISOString(),
  })
}

function salaryDecisionFor(input: { actorPermissions: readonly string[]; field: string }) {
  const decision = evaluateRedaction({
    field: input.field,
    category: "payroll_person_amount",
    actorPermissions: input.actorPermissions,
  })
  const explicitSalary = input.actorPermissions.some((permission) =>
    permission === "EMPLOYEE_SALARY_READ" || permission === "payroll.payslips.read",
  )

  if (decision.allowed && !explicitSalary) {
    return {
      ...decision,
      mode: "redact" as const,
      allowed: false,
      reasonCode: "MISSING_PERMISSION" as const,
      replacement: "[REDACTED:PAYROLL]",
    }
  }

  return decision
}

function redactions(decision: RedactionDecision): CompensationRedaction[] {
  if (decision.allowed) return []
  return [{ field: decision.field, policy: decision.policy, reasonCode: decision.reasonCode }]
}

async function writeAudit(
  tx: Prisma.TransactionClient | DbClient,
  input: {
    organizationId: string
    entityType: string
    entityId: string
    action: string
    actorId?: string | null
    before?: unknown
    after?: unknown
  },
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

async function recordCompensationEvent(
  tx: Prisma.TransactionClient,
  input: {
    organizationId: string
    actorId?: string | null
    eventType: string
    idempotencyKey: string
    sourceType: string
    sourceId: string
    payload: Record<string, unknown>
    documentHash?: string | null
    metadata?: Record<string, unknown>
  },
) {
  const { event } = await recordBusinessEventInTx(tx as unknown as BusinessEventTx, {
    organizationId: input.organizationId,
    eventType: input.eventType,
    eventSource: "INTERNAL",
    schemaVersion: 1,
    idempotencyKey: input.idempotencyKey,
    payload: input.payload,
    actorId: input.actorId ?? undefined,
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    documentHash: input.documentHash ?? undefined,
    metadata: input.metadata,
  })
  await markBusinessEventAppliedInTx(tx as unknown as BusinessEventTx, input.organizationId, event.id)
  return event.id
}

function mapRubrique(rubrique: RubriqueRecord): PayrollRubriqueReadModel {
  return {
    id: rubrique.id,
    code: rubrique.code,
    label: rubrique.label,
    kind: rubrique.kind,
    valueType: rubrique.valueType,
    status: rubrique.status,
    taxableBase: rubrique.taxableBase,
    socialBase: rubrique.socialBase,
    employerCharge: rubrique.employerCharge,
    statutoryParameterPath: rubrique.statutoryParameterPath,
    countryPackVersion: rubrique.countryPackVersion,
    countryPackResolutionHash: rubrique.countryPackResolutionHash,
    countryPackVerificationStatus: rubrique.countryPackVerificationStatus,
    countryPackCapabilityStatus: rubrique.countryPackCapabilityStatus,
  }
}

function mapAssignment(
  assignment: AssignmentRecord,
  decision: RedactionDecision,
): PayrollRubriqueAssignmentReadModel {
  return {
    id: assignment.id,
    employeeId: assignment.employeeId,
    employeeNumber: assignment.employee.employeeNumber,
    rubriqueId: assignment.rubriqueId,
    rubriqueCode: assignment.rubrique.code,
    status: assignment.status,
    amount: decision.allowed ? decimalToString(assignment.amount) : decision.replacement,
    rateBps: assignment.rateBps,
    quantity: decimalToString(assignment.quantity),
    currency: assignment.currency,
    effectiveFrom: assignment.effectiveFrom.toISOString(),
    effectiveTo: assignment.effectiveTo?.toISOString() ?? null,
    redactions: redactions(decision),
  }
}

function mapSalaryChange(
  request: SalaryChangeRecord,
  decision: RedactionDecision,
): PayrollSalaryChangeReadModel {
  return {
    id: request.id,
    employeeId: request.employeeId,
    employeeNumber: request.employee.employeeNumber,
    sourceContractId: request.sourceContractId,
    supersedingContractId: request.supersedingContractId,
    status: request.status,
    currentBaseSalary: decision.allowed ? decimalToString(request.currentBaseSalary) ?? "0.00" : decision.replacement,
    proposedBaseSalary: decision.allowed ? decimalToString(request.proposedBaseSalary) ?? "0.00" : decision.replacement,
    currency: request.currency,
    effectiveFrom: request.effectiveFrom.toISOString(),
    requestedById: request.requestedById,
    approvedById: request.approvedById,
    appliedById: request.appliedById,
    evidenceDocumentHashPresent: Boolean(request.evidenceDocumentHash),
    approvalEvidenceHashPresent: Boolean(request.approvalEvidenceHash),
    redactions: redactions(decision),
  }
}

async function resolveRubriqueProvenance(
  tx: Prisma.TransactionClient,
  input: {
    organizationId: string
    countryCode?: string | null
    statutoryParameterPath?: string
    effectiveAt: Date
  },
) {
  const organization = await tx.organization.findFirst({
    where: { id: input.organizationId, deletedAt: null },
    select: {
      country: true,
      countryCode: true,
      accountingSettings: {
        select: {
          countryPack: true,
          taxRegime: true,
        },
      },
    },
  })
  if (!organization) throw new NotFoundError("Organization was not found.")

  const countryCode = normalizeCountryCode(input.countryCode)
    ?? normalizeCountryCode(organization.countryCode)
    ?? normalizeCountryCode(organization.country)

  if (!input.statutoryParameterPath) {
    return {
      countryCode,
      statutoryParameterPath: null,
      countryPackVersion: null,
      countryPackSchemaVersion: null,
      countryPackResolutionHash: null,
      countryPackLegalRef: null,
      countryPackVerificationStatus: null,
      countryPackCapabilityStatus: null,
      provenanceMode: "TENANT_DEFINED",
    }
  }

  if (!countryCode) {
    throw new BusinessRuleError("Country code is required before a statutory rubrique can be linked to country-pack provenance.")
  }

  const resolution = resolveRegulatoryParameter(input.statutoryParameterPath, {
    countryCode,
    date: input.effectiveAt,
    pinnedPackVersion: organization.accountingSettings?.countryPack ?? undefined,
    purpose: "PAYROLL_RUBRIQUE_PROVENANCE",
    entityProfile: {
      countryCode,
      taxRegime: organization.accountingSettings?.taxRegime ?? null,
    },
  })

  return {
    countryCode,
    statutoryParameterPath: input.statutoryParameterPath,
    countryPackVersion: resolution.packVersion,
    countryPackSchemaVersion: resolution.schemaVersion,
    countryPackResolutionHash: `sha256:${resolution.resolutionHash}`,
    countryPackLegalRef: resolution.legalRef,
    countryPackVerificationStatus: resolution.verificationStatus,
    countryPackCapabilityStatus: resolution.capabilityStatus,
    provenanceMode: "COUNTRY_PACK",
  }
}

async function assertNoPayrollRunLineOnOrAfter(
  tx: Prisma.TransactionClient,
  input: { organizationId: string; contractId: string; effectiveFrom: Date },
) {
  const impactedLine = await tx.payrollRunLine.findFirst({
    where: {
      organizationId: input.organizationId,
      contractId: input.contractId,
      payrollRun: {
        payrollPeriod: {
          periodEnd: { gte: input.effectiveFrom },
        },
      },
    },
    select: { id: true },
  })
  if (impactedLine) {
    throw new BusinessRuleError("Salary change effective date overlaps an existing payroll run; use a corrective payroll workflow instead.")
  }
}

function salaryChangePayload(request: Prisma.PayrollSalaryChangeRequestGetPayload<object>, action: string) {
  return {
    action,
    salaryChangeRequestId: request.id,
    employeeId: request.employeeId,
    sourceContractId: request.sourceContractId,
    supersedingContractId: request.supersedingContractId,
    status: request.status,
    effectiveFrom: request.effectiveFrom.toISOString(),
    currency: request.currency,
    currentBaseSalaryHash: hashBusinessPayload({ value: request.currentBaseSalary.toString(), currency: request.currency }),
    proposedBaseSalaryHash: hashBusinessPayload({ value: request.proposedBaseSalary.toString(), currency: request.currency }),
    evidenceDocumentHashPresent: Boolean(request.evidenceDocumentHash),
    approvalEvidenceHashPresent: Boolean(request.approvalEvidenceHash),
  }
}

export async function getCompensationWorkflow(
  input: CompensationWorkflowInput,
  client: DbClient = db,
): Promise<CompensationWorkflowResult> {
  const parsed = compensationWorkflowInputSchema.parse(input)
  assertPermission(parsed.actorPermissions, READ_PERMISSIONS, "compensation workflow read")
  const decision = salaryDecisionFor({ actorPermissions: parsed.actorPermissions, field: "payroll.compensation.amounts" })

  const [rubriques, assignments, salaryChanges] = await Promise.all([
    client.payrollRubrique.findMany({
      where: {
        organizationId: parsed.organizationId,
        deletedAt: null,
        ...(parsed.includeInactive ? {} : { status: { not: PayrollRubriqueStatus.RETIRED } }),
      },
      orderBy: [{ code: "asc" }],
    }),
    client.payrollEmployeeRubriqueAssignment.findMany({
      where: {
        organizationId: parsed.organizationId,
        deletedAt: null,
        ...(parsed.employeeId ? { employeeId: parsed.employeeId } : {}),
        ...(parsed.includeInactive ? {} : { status: { in: [PayrollRubriqueAssignmentStatus.DRAFT, PayrollRubriqueAssignmentStatus.ACTIVE] } }),
      },
      include: { employee: true, rubrique: true },
      orderBy: [{ effectiveFrom: "desc" }],
    }),
    client.payrollSalaryChangeRequest.findMany({
      where: {
        organizationId: parsed.organizationId,
        deletedAt: null,
        ...(parsed.employeeId ? { employeeId: parsed.employeeId } : {}),
      },
      include: { employee: true, sourceContract: true, supersedingContract: true },
      orderBy: [{ createdAt: "desc" }],
    }),
  ])

  await writeAudit(client, {
    organizationId: parsed.organizationId,
    entityType: "PayrollCompensation",
    entityId: parsed.employeeId ?? "compensation-workflow",
    action: "PAYROLL_COMPENSATION_WORKFLOW_READ",
    actorId: parsed.actorId,
    after: {
      rubriqueCount: rubriques.length,
      assignmentCount: assignments.length,
      salaryChangeCount: salaryChanges.length,
      redaction: decision.allowed ? "allowed" : decision.reasonCode,
      policy: decision.policy,
    },
  })

  const mappedSalaryChanges = salaryChanges.map((request) => mapSalaryChange(request, decision))

  return {
    organizationId: parsed.organizationId,
    asOf: new Date().toISOString(),
    summary: {
      rubriques: rubriques.length,
      activeRubriques: rubriques.filter((rubrique) => rubrique.status === PayrollRubriqueStatus.ACTIVE).length,
      assignments: assignments.length,
      requestedSalaryChanges: salaryChanges.filter((request) => request.status === PayrollSalaryChangeStatus.REQUESTED).length,
      approvedSalaryChanges: salaryChanges.filter((request) => request.status === PayrollSalaryChangeStatus.APPROVED).length,
      redactedSalaryChanges: mappedSalaryChanges.filter((request) => request.redactions.length > 0).length,
    },
    rubriques: rubriques.map(mapRubrique),
    assignments: assignments.map((assignment) => mapAssignment(assignment, decision)),
    salaryChanges: mappedSalaryChanges,
  }
}

export async function upsertPayrollRubrique(
  input: UpsertPayrollRubriqueInput,
  client: DbClient = db,
): Promise<RubriqueMutationResult> {
  const parsed = upsertPayrollRubriqueInputSchema.parse(input)
  assertPermission(parsed.actorPermissions, MANAGE_PERMISSIONS, "rubrique catalog upsert")
  const code = normalizeCode(parsed.code)
  const effectiveAt = parsed.effectiveAt ? parseDate(parsed.effectiveAt, "effectiveAt") : new Date()

  return inTransaction(client, async (tx) => {
    const provenance = await resolveRubriqueProvenance(tx, {
      organizationId: parsed.organizationId,
      countryCode: parsed.countryCode,
      statutoryParameterPath: parsed.statutoryParameterPath,
      effectiveAt,
    })
    const existing = await tx.payrollRubrique.findFirst({
      where: { organizationId: parsed.organizationId, code, deletedAt: null },
    })
    const data = {
      code,
      label: parsed.label,
      description: parsed.description ?? null,
      kind: parsed.kind,
      valueType: parsed.valueType,
      status: parsed.status,
      taxableBase: parsed.taxableBase,
      socialBase: parsed.socialBase,
      employerCharge: parsed.employerCharge,
      payslipLabel: parsed.payslipLabel ?? null,
      postingDebitAccountCode: parsed.postingDebitAccountCode ?? null,
      postingCreditAccountCode: parsed.postingCreditAccountCode ?? null,
      countryCode: provenance.countryCode,
      statutoryParameterPath: provenance.statutoryParameterPath,
      countryPackVersion: provenance.countryPackVersion,
      countryPackSchemaVersion: provenance.countryPackSchemaVersion,
      countryPackResolutionHash: provenance.countryPackResolutionHash,
      countryPackLegalRef: provenance.countryPackLegalRef,
      countryPackVerificationStatus: provenance.countryPackVerificationStatus,
      countryPackCapabilityStatus: provenance.countryPackCapabilityStatus,
      metadata: buildMetadata(existing?.metadata, {
        sourceReference: parsed.sourceReference ?? null,
        provenanceMode: provenance.provenanceMode,
        statutoryFormulaImplemented: false,
      }),
    }

    const rubrique = existing
      ? await tx.payrollRubrique.update({
        where: { id: existing.id, organizationId: parsed.organizationId },
        data,
      })
      : await tx.payrollRubrique.create({
        data: {
          organizationId: parsed.organizationId,
          ...data,
        },
      })

    const eventType = existing ? "payroll.rubrique.catalog.updated" : "payroll.rubrique.catalog.created"
    const businessEventId = await recordCompensationEvent(tx, {
      organizationId: parsed.organizationId,
      actorId: parsed.actorId,
      eventType,
      idempotencyKey: parsed.idempotencyKey ?? `${eventType}:${parsed.organizationId}:${code}`,
      sourceType: "PAYROLL_RUBRIQUE",
      sourceId: rubrique.id,
      payload: {
        rubriqueId: rubrique.id,
        code: rubrique.code,
        kind: rubrique.kind,
        valueType: rubrique.valueType,
        status: rubrique.status,
        taxableBase: rubrique.taxableBase,
        socialBase: rubrique.socialBase,
        employerCharge: rubrique.employerCharge,
        statutoryParameterPath: rubrique.statutoryParameterPath,
        countryPackResolutionHash: rubrique.countryPackResolutionHash,
      },
      metadata: { sourceReference: parsed.sourceReference ?? null },
    })

    await writeAudit(tx, {
      organizationId: parsed.organizationId,
      entityType: "PayrollRubrique",
      entityId: rubrique.id,
      action: existing ? "PAYROLL_RUBRIQUE_UPDATED" : "PAYROLL_RUBRIQUE_CREATED",
      actorId: parsed.actorId,
      before: existing ? mapRubrique(existing) : null,
      after: mapRubrique(rubrique),
    })

    return { rubrique: mapRubrique(rubrique), businessEventId, created: !existing }
  })
}

export async function assignEmployeeRubrique(
  input: AssignEmployeeRubriqueInput,
  client: DbClient = db,
): Promise<AssignmentMutationResult> {
  const parsed = assignEmployeeRubriqueInputSchema.parse(input)
  assertPermission(parsed.actorPermissions, MANAGE_PERMISSIONS, "employee rubrique assignment")
  const effectiveFrom = parseDate(parsed.effectiveFrom, "effectiveFrom")
  const effectiveTo = parseOptionalDate(parsed.effectiveTo, "effectiveTo")
  const amount = parseOptionalDecimal(parsed.amount, "amount")
  const quantity = parseOptionalDecimal(parsed.quantity, "quantity")
  assertEffectiveDateOrder(effectiveFrom, effectiveTo)

  if (!amount && parsed.rateBps === undefined && !quantity) {
    throw new BusinessRuleError("Rubrique assignment requires an amount, rate, or quantity.")
  }

  return inTransaction(client, async (tx) => {
    const employee = await tx.payrollEmployee.findFirst({
      where: { id: parsed.employeeId, organizationId: parsed.organizationId, deletedAt: null },
      select: { id: true, employeeNumber: true, status: true },
    })
    if (!employee) throw new NotFoundError("Payroll employee was not found for this tenant.")
    if (employee.status === PayrollEmployeeStatus.TERMINATED || employee.status === PayrollEmployeeStatus.ARCHIVED) {
      throw new BusinessRuleError("Rubriques cannot be assigned to terminated or archived employees.")
    }

    const rubrique = await tx.payrollRubrique.findFirst({
      where: { id: parsed.rubriqueId, organizationId: parsed.organizationId, deletedAt: null },
    })
    if (!rubrique) throw new NotFoundError("Payroll rubrique was not found for this tenant.")
    if (rubrique.status === PayrollRubriqueStatus.RETIRED) {
      throw new BusinessRuleError("Retired rubriques cannot be assigned.")
    }

    const assignment = await tx.payrollEmployeeRubriqueAssignment.create({
      data: {
        organizationId: parsed.organizationId,
        employeeId: parsed.employeeId,
        rubriqueId: parsed.rubriqueId,
        status: parsed.status,
        amount,
        rateBps: parsed.rateBps ?? null,
        quantity,
        currency: parsed.currency.toUpperCase(),
        effectiveFrom,
        effectiveTo,
        evidenceDocumentHash: parsed.evidenceDocumentHash ?? null,
        metadata: buildMetadata(null, {
          sourceReference: parsed.sourceReference ?? null,
          employeeNumber: employee.employeeNumber,
        }),
      },
      include: { employee: true, rubrique: true },
    })

    const businessEventId = await recordCompensationEvent(tx, {
      organizationId: parsed.organizationId,
      actorId: parsed.actorId,
      eventType: "payroll.rubrique.assignment.created",
      idempotencyKey: parsed.idempotencyKey ?? `payroll-rubrique-assignment:${parsed.organizationId}:${assignment.id}`,
      sourceType: "PAYROLL_RUBRIQUE_ASSIGNMENT",
      sourceId: assignment.id,
      documentHash: parsed.evidenceDocumentHash ?? null,
      payload: {
        assignmentId: assignment.id,
        employeeId: assignment.employeeId,
        rubriqueId: assignment.rubriqueId,
        rubriqueCode: rubrique.code,
        status: assignment.status,
        effectiveFrom: assignment.effectiveFrom.toISOString(),
        effectiveTo: assignment.effectiveTo?.toISOString() ?? null,
        amountHash: amount ? hashBusinessPayload({ value: amount.toString(), currency: assignment.currency }) : null,
        rateBps: assignment.rateBps,
        quantity: assignment.quantity?.toString() ?? null,
      },
      metadata: { sourceReference: parsed.sourceReference ?? null },
    })

    const updated = await tx.payrollEmployeeRubriqueAssignment.update({
      where: { id: assignment.id },
      data: { approvalBusinessEventId: businessEventId },
      include: { employee: true, rubrique: true },
    })

    const decision = salaryDecisionFor({ actorPermissions: parsed.actorPermissions, field: "payroll.compensation.assignment.amount" })
    const mapped = mapAssignment(updated, decision)

    await writeAudit(tx, {
      organizationId: parsed.organizationId,
      entityType: "PayrollEmployeeRubriqueAssignment",
      entityId: assignment.id,
      action: "PAYROLL_RUBRIQUE_ASSIGNMENT_CREATED",
      actorId: parsed.actorId,
      before: null,
      after: { ...mapped, amount: mapped.redactions.length ? "[REDACTED]" : mapped.amount },
    })

    return { assignment: mapped, businessEventId }
  })
}

export async function requestSalaryChange(
  input: RequestSalaryChangeInput,
  client: DbClient = db,
): Promise<SalaryChangeMutationResult> {
  const parsed = requestSalaryChangeInputSchema.parse(input)
  assertPermission(parsed.actorPermissions, SALARY_REQUEST_PERMISSIONS, "salary change request")
  const proposedBaseSalary = parseDecimal(parsed.proposedBaseSalary, "proposedBaseSalary", false)
  const effectiveFrom = parseDate(parsed.effectiveFrom, "effectiveFrom")

  return inTransaction(client, async (tx) => {
    const contract = await tx.payrollContract.findFirst({
      where: {
        id: parsed.sourceContractId,
        employeeId: parsed.employeeId,
        organizationId: parsed.organizationId,
        status: PayrollContractStatus.ACTIVE,
        deletedAt: null,
      },
      include: { employee: true },
    }) as ContractRecord | null
    if (!contract) throw new NotFoundError("Active payroll contract was not found for this tenant and employee.")
    if (contract.employee.status !== PayrollEmployeeStatus.ACTIVE) {
      throw new BusinessRuleError("Salary changes require an active employee.")
    }
    if (effectiveFrom < contract.effectiveFrom) {
      throw new BusinessRuleError("Salary change effective date cannot be before the source contract start date.")
    }
    if (contract.effectiveTo && effectiveFrom > contract.effectiveTo) {
      throw new BusinessRuleError("Salary change effective date cannot be after the source contract end date.")
    }
    const currentBaseSalary = new Prisma.Decimal(contract.baseSalary).toDecimalPlaces(2)
    if (currentBaseSalary.equals(proposedBaseSalary)) {
      throw new BusinessRuleError("Proposed salary must differ from the current contract salary.")
    }

    const existingOpen = await tx.payrollSalaryChangeRequest.findFirst({
      where: {
        organizationId: parsed.organizationId,
        employeeId: parsed.employeeId,
        sourceContractId: parsed.sourceContractId,
        status: { in: [PayrollSalaryChangeStatus.REQUESTED, PayrollSalaryChangeStatus.APPROVED] },
        deletedAt: null,
      },
      select: { id: true },
    })
    if (existingOpen) {
      throw new ConflictError("An open salary change request already exists for this contract.")
    }

    const salaryChange = await tx.payrollSalaryChangeRequest.create({
      data: {
        organizationId: parsed.organizationId,
        employeeId: parsed.employeeId,
        sourceContractId: parsed.sourceContractId,
        status: PayrollSalaryChangeStatus.REQUESTED,
        currentBaseSalary,
        proposedBaseSalary,
        currency: contract.currency,
        effectiveFrom,
        requestedById: parsed.actorId,
        requestReason: parsed.requestReason,
        evidenceDocumentHash: parsed.evidenceDocumentHash,
        metadata: buildMetadata(null, {
          sourceReference: parsed.sourceReference ?? null,
          sourceContractNumber: contract.contractNumber,
          correctionSemantics: "APPROVAL_CREATES_EFFECTIVE_DATED_CONTRACT_VERSION",
        }),
      },
      include: { employee: true, sourceContract: true, supersedingContract: true },
    })

    const businessEventId = await recordCompensationEvent(tx, {
      organizationId: parsed.organizationId,
      actorId: parsed.actorId,
      eventType: "payroll.salary_change.requested",
      idempotencyKey: parsed.idempotencyKey ?? `payroll-salary-change-request:${parsed.organizationId}:${salaryChange.id}`,
      sourceType: "PAYROLL_SALARY_CHANGE",
      sourceId: salaryChange.id,
      documentHash: parsed.evidenceDocumentHash,
      payload: salaryChangePayload(salaryChange, "requested"),
      metadata: { sourceReference: parsed.sourceReference ?? null },
    })

    const updated = await tx.payrollSalaryChangeRequest.update({
      where: { id: salaryChange.id },
      data: { requestBusinessEventId: businessEventId },
      include: { employee: true, sourceContract: true, supersedingContract: true },
    })

    const decision = salaryDecisionFor({ actorPermissions: parsed.actorPermissions, field: "payroll.salaryChange.amounts" })
    const mapped = mapSalaryChange(updated, decision)

    await writeAudit(tx, {
      organizationId: parsed.organizationId,
      entityType: "PayrollSalaryChangeRequest",
      entityId: updated.id,
      action: "PAYROLL_SALARY_CHANGE_REQUESTED",
      actorId: parsed.actorId,
      before: null,
      after: { ...mapped, currentBaseSalary: "[HASHED]", proposedBaseSalary: "[HASHED]" },
    })

    return { salaryChange: mapped, businessEventId }
  })
}

async function findSalaryChangeForDecision(
  tx: Prisma.TransactionClient,
  organizationId: string,
  salaryChangeRequestId: string,
) {
  const request = await tx.payrollSalaryChangeRequest.findFirst({
    where: { id: salaryChangeRequestId, organizationId, deletedAt: null },
    include: { employee: true, sourceContract: true, supersedingContract: true },
  }) as SalaryChangeRecord | null
  if (!request) throw new NotFoundError("Salary change request was not found for this tenant.")
  return request
}

export async function approveSalaryChange(
  input: ApproveSalaryChangeInput,
  client: DbClient = db,
): Promise<SalaryChangeMutationResult> {
  const parsed = approveSalaryChangeInputSchema.parse(input)
  assertPermission(parsed.actorPermissions, SALARY_APPROVE_PERMISSIONS, "salary change approval")

  return inTransaction(client, async (tx) => {
    const existing = await findSalaryChangeForDecision(tx, parsed.organizationId, parsed.salaryChangeRequestId)
    if (existing.status !== PayrollSalaryChangeStatus.REQUESTED) {
      throw new BusinessRuleError("Only requested salary changes can be approved.")
    }
    if (existing.requestedById === parsed.actorId) {
      throw new ForbiddenError("Salary change requester cannot approve their own request.")
    }

    const approved = await tx.payrollSalaryChangeRequest.update({
      where: { id: existing.id, organizationId: parsed.organizationId },
      data: {
        status: PayrollSalaryChangeStatus.APPROVED,
        approvedById: parsed.actorId,
        approvedAt: new Date(),
        decisionReason: parsed.decisionReason,
        approvalEvidenceHash: parsed.approvalEvidenceHash,
        metadata: buildMetadata(existing.metadata, {
          approvalControl: "MAKER_CHECKER",
          requesterId: existing.requestedById,
          approverId: parsed.actorId,
        }),
      },
      include: { employee: true, sourceContract: true, supersedingContract: true },
    })

    const businessEventId = await recordCompensationEvent(tx, {
      organizationId: parsed.organizationId,
      actorId: parsed.actorId,
      eventType: "payroll.salary_change.approved",
      idempotencyKey: parsed.idempotencyKey ?? `payroll-salary-change-approve:${parsed.organizationId}:${approved.id}`,
      sourceType: "PAYROLL_SALARY_CHANGE",
      sourceId: approved.id,
      documentHash: parsed.approvalEvidenceHash,
      payload: salaryChangePayload(approved, "approved"),
      metadata: { decisionReason: parsed.decisionReason },
    })

    const updated = await tx.payrollSalaryChangeRequest.update({
      where: { id: approved.id, organizationId: parsed.organizationId },
      data: { approvalBusinessEventId: businessEventId },
      include: { employee: true, sourceContract: true, supersedingContract: true },
    })

    const decision = salaryDecisionFor({ actorPermissions: parsed.actorPermissions, field: "payroll.salaryChange.amounts" })
    const mapped = mapSalaryChange(updated, decision)

    await writeAudit(tx, {
      organizationId: parsed.organizationId,
      entityType: "PayrollSalaryChangeRequest",
      entityId: updated.id,
      action: "PAYROLL_SALARY_CHANGE_APPROVED",
      actorId: parsed.actorId,
      before: { status: existing.status, requestedById: existing.requestedById },
      after: { status: updated.status, approvedById: updated.approvedById, approvalEvidenceHashPresent: true },
    })

    return { salaryChange: mapped, businessEventId }
  })
}

export async function rejectSalaryChange(
  input: RejectSalaryChangeInput,
  client: DbClient = db,
): Promise<SalaryChangeMutationResult> {
  const parsed = rejectSalaryChangeInputSchema.parse(input)
  assertPermission(parsed.actorPermissions, SALARY_APPROVE_PERMISSIONS, "salary change rejection")

  return inTransaction(client, async (tx) => {
    const existing = await findSalaryChangeForDecision(tx, parsed.organizationId, parsed.salaryChangeRequestId)
    if (existing.status !== PayrollSalaryChangeStatus.REQUESTED) {
      throw new BusinessRuleError("Only requested salary changes can be rejected.")
    }
    if (existing.requestedById === parsed.actorId) {
      throw new ForbiddenError("Salary change requester cannot reject their own request.")
    }

    const rejected = await tx.payrollSalaryChangeRequest.update({
      where: { id: existing.id, organizationId: parsed.organizationId },
      data: {
        status: PayrollSalaryChangeStatus.REJECTED,
        rejectedById: parsed.actorId,
        rejectedAt: new Date(),
        decisionReason: parsed.decisionReason,
        metadata: buildMetadata(existing.metadata, { rejectionControl: "MAKER_CHECKER" }),
      },
      include: { employee: true, sourceContract: true, supersedingContract: true },
    })

    const businessEventId = await recordCompensationEvent(tx, {
      organizationId: parsed.organizationId,
      actorId: parsed.actorId,
      eventType: "payroll.salary_change.rejected",
      idempotencyKey: parsed.idempotencyKey ?? `payroll-salary-change-reject:${parsed.organizationId}:${rejected.id}`,
      sourceType: "PAYROLL_SALARY_CHANGE",
      sourceId: rejected.id,
      payload: salaryChangePayload(rejected, "rejected"),
      metadata: { decisionReason: parsed.decisionReason },
    })

    const decision = salaryDecisionFor({ actorPermissions: parsed.actorPermissions, field: "payroll.salaryChange.amounts" })
    const mapped = mapSalaryChange(rejected, decision)
    await writeAudit(tx, {
      organizationId: parsed.organizationId,
      entityType: "PayrollSalaryChangeRequest",
      entityId: rejected.id,
      action: "PAYROLL_SALARY_CHANGE_REJECTED",
      actorId: parsed.actorId,
      before: { status: existing.status, requestedById: existing.requestedById },
      after: { status: rejected.status, rejectedById: rejected.rejectedById },
    })

    return { salaryChange: mapped, businessEventId }
  })
}

export async function applyApprovedSalaryChange(
  input: ApplyApprovedSalaryChangeInput,
  client: DbClient = db,
): Promise<SalaryChangeMutationResult> {
  const parsed = applyApprovedSalaryChangeInputSchema.parse(input)
  assertPermission(parsed.actorPermissions, SALARY_APPLY_PERMISSIONS, "salary change application")

  return inTransaction(client, async (tx) => {
    const existing = await findSalaryChangeForDecision(tx, parsed.organizationId, parsed.salaryChangeRequestId)
    if (existing.status !== PayrollSalaryChangeStatus.APPROVED) {
      throw new BusinessRuleError("Only approved salary changes can be applied.")
    }
    if (existing.requestedById === parsed.actorId) {
      throw new ForbiddenError("Salary change requester cannot apply their own request.")
    }
    if (!existing.approvalEvidenceHash) {
      throw new BusinessRuleError("Approved salary changes require approval evidence before application.")
    }

    const sourceContract = existing.sourceContract
    if (sourceContract.status !== PayrollContractStatus.ACTIVE) {
      throw new BusinessRuleError("Only active source contracts can be versioned by salary change approval.")
    }
    if (!new Prisma.Decimal(sourceContract.baseSalary).equals(existing.currentBaseSalary)) {
      throw new ConflictError("Source contract salary changed after the request was created; create a new salary change request.")
    }
    await assertNoPayrollRunLineOnOrAfter(tx, {
      organizationId: parsed.organizationId,
      contractId: sourceContract.id,
      effectiveFrom: existing.effectiveFrom,
    })

    const priorEffectiveTo = sourceContract.effectiveTo
    const sourceEndDate = dayBefore(existing.effectiveFrom)
    if (sourceEndDate < sourceContract.effectiveFrom) {
      throw new BusinessRuleError("Salary change effective date must be after the source contract start date.")
    }

    await tx.payrollContract.update({
      where: { id: sourceContract.id, organizationId: parsed.organizationId },
      data: {
        effectiveTo: sourceEndDate,
        metadata: buildMetadata(sourceContract.metadata, {
          supersededBySalaryChangeRequestId: existing.id,
          correctionSemantics: "ENDED_BY_EFFECTIVE_DATED_SALARY_CHANGE",
        }),
      },
    })

    const supersedingContract = await tx.payrollContract.create({
      data: {
        organizationId: parsed.organizationId,
        employeeId: existing.employeeId,
        contractNumber: `${sourceContract.contractNumber}-SC-${compactDate(existing.effectiveFrom)}`,
        type: sourceContract.type,
        status: PayrollContractStatus.ACTIVE,
        effectiveFrom: existing.effectiveFrom,
        effectiveTo: priorEffectiveTo,
        baseSalary: existing.proposedBaseSalary,
        currency: existing.currency,
        workingHoursPerMonth: sourceContract.workingHoursPerMonth,
        classification: sourceContract.classification,
        echelon: sourceContract.echelon,
        convention: sourceContract.convention,
        signedDocumentHash: existing.approvalEvidenceHash,
        metadata: buildMetadata(null, {
          sourceSalaryChangeRequestId: existing.id,
          sourceContractId: sourceContract.id,
          correctionSemantics: "EFFECTIVE_DATED_CONTRACT_VERSION",
        }),
      },
    })

    const applied = await tx.payrollSalaryChangeRequest.update({
      where: { id: existing.id, organizationId: parsed.organizationId },
      data: {
        status: PayrollSalaryChangeStatus.APPLIED,
        appliedById: parsed.actorId,
        appliedAt: new Date(),
        supersedingContractId: supersedingContract.id,
        metadata: buildMetadata(existing.metadata, {
          supersedingContractId: supersedingContract.id,
          sourceContractEndedAt: sourceEndDate.toISOString(),
        }),
      },
      include: { employee: true, sourceContract: true, supersedingContract: true },
    })

    const businessEventId = await recordCompensationEvent(tx, {
      organizationId: parsed.organizationId,
      actorId: parsed.actorId,
      eventType: "payroll.salary_change.applied",
      idempotencyKey: parsed.idempotencyKey ?? `payroll-salary-change-apply:${parsed.organizationId}:${applied.id}`,
      sourceType: "PAYROLL_SALARY_CHANGE",
      sourceId: applied.id,
      documentHash: existing.approvalEvidenceHash,
      payload: {
        ...salaryChangePayload(applied, "applied"),
        sourceContractEndedAt: sourceEndDate.toISOString(),
        supersedingContractId: supersedingContract.id,
      },
      metadata: { supersedingContractId: supersedingContract.id },
    })

    const updated = await tx.payrollSalaryChangeRequest.update({
      where: { id: applied.id, organizationId: parsed.organizationId },
      data: { appliedBusinessEventId: businessEventId },
      include: { employee: true, sourceContract: true, supersedingContract: true },
    })

    const activatedContract = await tx.payrollContract.update({
      where: { id: supersedingContract.id, organizationId: parsed.organizationId },
      data: {
        activatedBusinessEventId: businessEventId,
        metadata: buildMetadata(supersedingContract.metadata, { activatedBusinessEventId: businessEventId }),
      },
    })

    const decision = salaryDecisionFor({ actorPermissions: parsed.actorPermissions, field: "payroll.salaryChange.amounts" })
    const mapped = mapSalaryChange({ ...updated, supersedingContract: activatedContract }, decision)

    await writeAudit(tx, {
      organizationId: parsed.organizationId,
      entityType: "PayrollSalaryChangeRequest",
      entityId: updated.id,
      action: "PAYROLL_SALARY_CHANGE_APPLIED",
      actorId: parsed.actorId,
      before: { status: existing.status, sourceContractId: sourceContract.id },
      after: {
        status: updated.status,
        supersedingContractId: activatedContract.id,
        sourceContractEndedAt: sourceEndDate.toISOString(),
      },
    })

    return { salaryChange: mapped, businessEventId, supersedingContractId: activatedContract.id }
  })
}
