import "server-only"

import {
  PayrollContractStatus,
  PayrollContractType,
  PayrollEmployeeStatus,
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
  markBusinessEventAppliedInTx,
  recordBusinessEventInTx,
} from "@/services/events/business-event.service"
import { evaluateRedaction, type RedactionDecision } from "@/services/security/redaction-policy.service"

type DbClient = typeof db | Prisma.TransactionClient
type BusinessEventTx = Parameters<typeof recordBusinessEventInTx>[0]

type PayrollEmployeeContractRecord = Prisma.PayrollEmployeeGetPayload<{
  include: {
    contracts: true
  }
}>

type PayrollContractRecord = Prisma.PayrollContractGetPayload<{
  include: {
    employee: true
  }
}>

const READ_PERMISSIONS = ["payroll.contracts.read"]
const MANAGE_PERMISSIONS = ["payroll.contracts.manage"]

const dateInputSchema = z.union([z.string().trim().min(1), z.date()])
const optionalDateInputSchema = z.union([z.string().trim().min(1), z.date(), z.null()]).optional()
const decimalInputSchema = z.union([z.string().trim().min(1), z.number()])
const optionalDecimalInputSchema = z.union([z.string().trim().min(1), z.number(), z.null()]).optional()

const sourceReferenceSchema = z.object({
  sourceSystem: z.string().trim().min(1).max(120).optional(),
  sourceRecordId: z.string().trim().min(1).max(160).optional(),
  sourceHash: z.string().trim().min(8).max(256).optional(),
}).optional()

export const employeeContractWorkflowInputSchema = z.object({
  organizationId: z.string().trim().min(1),
  actorId: z.string().trim().min(1).optional(),
  actorPermissions: z.array(z.string()).optional().default([]),
  employeeId: z.string().trim().min(1).optional(),
})

export const resolvePayrollEmployeeForUserInputSchema = z.object({
  organizationId: z.string().trim().min(1),
  userId: z.string().trim().min(1),
  actorId: z.string().trim().min(1).optional(),
  actorPermissions: z.array(z.string()).optional().default([]),
  requestedEmployeeId: z.string().trim().min(1).optional(),
})

export const createPayrollContractInputSchema = z.object({
  organizationId: z.string().trim().min(1),
  actorId: z.string().trim().min(1).optional(),
  actorPermissions: z.array(z.string()).optional().default([]),
  employeeId: z.string().trim().min(1),
  contractNumber: z.string().trim().min(1).max(80),
  type: z.nativeEnum(PayrollContractType),
  status: z.nativeEnum(PayrollContractStatus).optional().default(PayrollContractStatus.DRAFT),
  effectiveFrom: dateInputSchema,
  effectiveTo: optionalDateInputSchema,
  baseSalary: decimalInputSchema,
  currency: z.string().trim().length(3).optional().default("XAF"),
  workingHoursPerMonth: optionalDecimalInputSchema,
  classification: z.string().trim().max(120).nullable().optional(),
  echelon: z.string().trim().max(120).nullable().optional(),
  convention: z.string().trim().max(160).nullable().optional(),
  signedDocumentHash: z.string().trim().min(8).max(256).optional(),
  sourceReference: sourceReferenceSchema,
  idempotencyKey: z.string().trim().min(1).max(200).optional(),
})

export const updatePayrollContractInputSchema = z.object({
  organizationId: z.string().trim().min(1),
  actorId: z.string().trim().min(1).optional(),
  actorPermissions: z.array(z.string()).optional().default([]),
  contractId: z.string().trim().min(1),
  type: z.nativeEnum(PayrollContractType).optional(),
  status: z.nativeEnum(PayrollContractStatus).optional(),
  effectiveFrom: dateInputSchema.optional(),
  effectiveTo: optionalDateInputSchema,
  baseSalary: decimalInputSchema.optional(),
  currency: z.string().trim().length(3).optional(),
  workingHoursPerMonth: optionalDecimalInputSchema,
  classification: z.string().trim().max(120).nullable().optional(),
  echelon: z.string().trim().max(120).nullable().optional(),
  convention: z.string().trim().max(160).nullable().optional(),
  signedDocumentHash: z.string().trim().min(8).max(256).optional(),
  changeReason: z.string().trim().min(1).max(500).optional(),
  sourceReference: sourceReferenceSchema,
  idempotencyKey: z.string().trim().min(1).max(200).optional(),
})

export const terminatePayrollContractInputSchema = z.object({
  organizationId: z.string().trim().min(1),
  actorId: z.string().trim().min(1).optional(),
  actorPermissions: z.array(z.string()).optional().default([]),
  contractId: z.string().trim().min(1),
  effectiveTo: dateInputSchema,
  terminationReason: z.string().trim().min(1).max(500),
  sourceReference: sourceReferenceSchema,
  idempotencyKey: z.string().trim().min(1).max(200).optional(),
})

export type EmployeeContractWorkflowInput = z.input<typeof employeeContractWorkflowInputSchema>
export type ResolvePayrollEmployeeForUserInput = z.input<typeof resolvePayrollEmployeeForUserInputSchema>
export type CreatePayrollContractInput = z.input<typeof createPayrollContractInputSchema>
export type UpdatePayrollContractInput = z.input<typeof updatePayrollContractInputSchema>
export type TerminatePayrollContractInput = z.input<typeof terminatePayrollContractInputSchema>

export type PayrollContractRedaction = {
  field: string
  policy: string
  reasonCode: RedactionDecision["reasonCode"]
}

export type PayrollContractWorkflowContract = {
  id: string
  employeeId: string
  contractNumber: string
  type: PayrollContractType
  status: PayrollContractStatus
  effectiveFrom: string
  effectiveTo: string | null
  baseSalary: string
  currency: string
  workingHoursPerMonth: string | null
  classification: string | null
  echelon: string | null
  convention: string | null
  signedDocumentHashPresent: boolean
  activatedBusinessEventId: string | null
  redactions: PayrollContractRedaction[]
}

export type PayrollEmployeeContractWorkflowRecord = {
  id: string
  employeeNumber: string
  displayName: string
  status: PayrollEmployeeStatus
  userId: string | null
  userMappingStatus: "linked" | "unlinked"
  payrollEligible: boolean
  activeContractId: string | null
  contracts: PayrollContractWorkflowContract[]
}

export type PayrollEmployeeContractWorkflowResult = {
  organizationId: string
  asOf: string
  summary: {
    totalEmployees: number
    linkedEmployees: number
    activeContracts: number
    payrollEligible: number
    redactedContracts: number
  }
  employees: PayrollEmployeeContractWorkflowRecord[]
}

export type PayrollEmployeeUserResolution = {
  organizationId: string
  userId: string
  employeeId: string
  employeeNumber: string
  displayName: string
  status: PayrollEmployeeStatus
}

export type PayrollContractMutationResult = {
  contract: PayrollContractWorkflowContract
  businessEventId: string
}

function assertPermission(
  actorPermissions: readonly string[] | null | undefined,
  required: readonly string[],
  action: string,
) {
  if (!hasAnyRbacPermission(actorPermissions ?? [], required)) {
    throw new ForbiddenError(`Missing payroll contract permission for ${action}.`)
  }
}

function hasRootTransaction(client: DbClient): client is typeof db {
  return typeof (client as { $transaction?: unknown }).$transaction === "function"
}

async function inTransaction<T>(
  client: DbClient,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  if (hasRootTransaction(client)) {
    return client.$transaction((tx) => fn(tx))
  }

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
  if (Number.isNaN(date.getTime())) {
    throw new BusinessRuleError(`${field} must be a valid date.`)
  }
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

  return decimal
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
    throw new BusinessRuleError("Contract effective end date cannot be before its start date.")
  }
}

function rangesOverlap(
  firstFrom: Date,
  firstTo: Date | null,
  secondFrom: Date,
  secondTo: Date | null,
) {
  const firstEnd = firstTo?.getTime() ?? Number.POSITIVE_INFINITY
  const secondEnd = secondTo?.getTime() ?? Number.POSITIVE_INFINITY

  return firstFrom.getTime() <= secondEnd && secondFrom.getTime() <= firstEnd
}

async function assertNoActiveOverlap(
  tx: Prisma.TransactionClient,
  input: {
    organizationId: string
    employeeId: string
    contractId?: string
    effectiveFrom: Date
    effectiveTo: Date | null
  },
) {
  const activeContracts = await tx.payrollContract.findMany({
    where: {
      organizationId: input.organizationId,
      employeeId: input.employeeId,
      status: PayrollContractStatus.ACTIVE,
      deletedAt: null,
      ...(input.contractId ? { id: { not: input.contractId } } : {}),
    },
    select: {
      id: true,
      effectiveFrom: true,
      effectiveTo: true,
    },
  })

  const overlapping = activeContracts.find((contract) =>
    rangesOverlap(input.effectiveFrom, input.effectiveTo, contract.effectiveFrom, contract.effectiveTo),
  )

  if (overlapping) {
    throw new ConflictError("An active contract already covers this employee and effective date range.")
  }
}

function contractAuditSnapshot(contract: PayrollContractRecord | PayrollContractWorkflowContract | null) {
  if (!contract) return null

  const signedDocumentHashPresent = "signedDocumentHashPresent" in contract
    ? contract.signedDocumentHashPresent
    : Boolean(contract.signedDocumentHash)

  return {
    id: contract.id,
    employeeId: contract.employeeId,
    contractNumber: contract.contractNumber,
    type: contract.type,
    status: contract.status,
    effectiveFrom: contract.effectiveFrom instanceof Date
      ? contract.effectiveFrom.toISOString()
      : contract.effectiveFrom,
    effectiveTo: contract.effectiveTo instanceof Date
      ? contract.effectiveTo.toISOString()
      : contract.effectiveTo,
    currency: contract.currency,
    workingHoursPerMonth: decimalToString(contract.workingHoursPerMonth),
    classification: contract.classification,
    echelon: contract.echelon,
    convention: contract.convention,
    signedDocumentHashPresent,
    activatedBusinessEventId: contract.activatedBusinessEventId,
  }
}

function buildContractMetadata(
  existing: Prisma.JsonValue | null | undefined,
  patch: Record<string, unknown>,
) {
  return safeJson({
    ...metadataRecord(existing),
    ...patch,
    workflowSource: "payroll.employee_contract_workflow",
    lastWorkflowUpdatedAt: new Date().toISOString(),
  })
}

function statusSupportsPayrollEligibility(status: PayrollContractStatus) {
  return status === PayrollContractStatus.ACTIVE
}

function salaryRedactionFor(input: {
  actorPermissions: readonly string[]
  field: string
}) {
  const decision = evaluateRedaction({
    field: input.field,
    category: "payroll_person_amount",
    actorPermissions: input.actorPermissions,
  })

  const hasExplicitSalaryPermission = input.actorPermissions.some((permission) =>
    permission === "EMPLOYEE_SALARY_READ" || permission === "payroll.payslips.read",
  )

  if (decision.allowed && !hasExplicitSalaryPermission) {
    return {
      ...decision,
      mode: "redact" as const,
      allowed: false,
      reasonCode: "MISSING_PERMISSION" as const,
      safeMessage: "Payroll person-level amount is protected and has been redacted.",
      replacement: "[REDACTED:PAYROLL]",
    }
  }

  return decision
}

function redactionSummary(decision: RedactionDecision): PayrollContractRedaction[] {
  if (decision.allowed) return []
  return [{
    field: decision.field,
    policy: decision.policy,
    reasonCode: decision.reasonCode,
  }]
}

function mapContractForWorkflow(
  contract: Prisma.PayrollContractGetPayload<object>,
  salaryDecision: RedactionDecision,
): PayrollContractWorkflowContract {
  return {
    id: contract.id,
    employeeId: contract.employeeId,
    contractNumber: contract.contractNumber,
    type: contract.type,
    status: contract.status,
    effectiveFrom: contract.effectiveFrom.toISOString(),
    effectiveTo: contract.effectiveTo?.toISOString() ?? null,
    baseSalary: salaryDecision.allowed
      ? decimalToString(contract.baseSalary) ?? "0.00"
      : salaryDecision.replacement,
    currency: contract.currency,
    workingHoursPerMonth: decimalToString(contract.workingHoursPerMonth),
    classification: contract.classification,
    echelon: contract.echelon,
    convention: contract.convention,
    signedDocumentHashPresent: Boolean(contract.signedDocumentHash),
    activatedBusinessEventId: contract.activatedBusinessEventId,
    redactions: redactionSummary(salaryDecision),
  }
}

function activeContractId(contracts: readonly PayrollContractWorkflowContract[]) {
  return contracts.find((contract) => contract.status === PayrollContractStatus.ACTIVE)?.id ?? null
}

function contractEventPayload(
  action: "created" | "updated" | "terminated",
  contract: Prisma.PayrollContractGetPayload<object>,
  extra: Record<string, unknown> = {},
) {
  return {
    action,
    contractId: contract.id,
    employeeId: contract.employeeId,
    contractNumber: contract.contractNumber,
    type: contract.type,
    status: contract.status,
    effectiveFrom: contract.effectiveFrom.toISOString(),
    effectiveTo: contract.effectiveTo?.toISOString() ?? null,
    currency: contract.currency,
    signedDocumentHashPresent: Boolean(contract.signedDocumentHash),
    activatedBusinessEventId: contract.activatedBusinessEventId,
    ...extra,
  }
}

async function recordContractEvent(
  tx: Prisma.TransactionClient,
  input: {
    organizationId: string
    actorId?: string
    eventType: string
    idempotencyKey: string
    contract: Prisma.PayrollContractGetPayload<object>
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
    actorId: input.actorId,
    sourceType: "PAYROLL_CONTRACT",
    sourceId: input.contract.id,
    documentHash: input.documentHash ?? undefined,
    metadata: input.metadata,
  })

  await markBusinessEventAppliedInTx(tx as unknown as BusinessEventTx, input.organizationId, event.id)
  return event.id
}

async function auditContractChange(
  tx: Prisma.TransactionClient | DbClient,
  input: {
    organizationId: string
    actorId?: string
    action: string
    contractId: string
    before: unknown
    after: unknown
  },
) {
  await tx.auditLog.create({
    data: {
      entityType: "PayrollContract",
      entityId: input.contractId,
      action: input.action,
      userId: input.actorId ?? null,
      organizationId: input.organizationId,
      changes: safeJson({
        before: input.before,
        after: input.after,
      }),
    },
  })
}

export async function getEmployeeContractWorkflow(
  input: EmployeeContractWorkflowInput,
  client: DbClient = db,
): Promise<PayrollEmployeeContractWorkflowResult> {
  const parsed = employeeContractWorkflowInputSchema.parse(input)
  assertPermission(parsed.actorPermissions, READ_PERMISSIONS, "employee contract workflow read")

  const salaryDecision = salaryRedactionFor({
    actorPermissions: parsed.actorPermissions,
    field: "contracts.baseSalary",
  })
  const employees = await client.payrollEmployee.findMany({
    where: {
      organizationId: parsed.organizationId,
      deletedAt: null,
      ...(parsed.employeeId ? { id: parsed.employeeId } : {}),
    },
    include: {
      contracts: {
        where: { deletedAt: null },
        orderBy: [{ effectiveFrom: "desc" }, { createdAt: "desc" }],
      },
    },
    orderBy: [{ employeeNumber: "asc" }],
  }) as PayrollEmployeeContractRecord[]

  if (parsed.employeeId && employees.length === 0) {
    throw new NotFoundError("Payroll employee was not found for this tenant.")
  }

  const mappedEmployees = employees.map((employee) => {
    const contracts = employee.contracts.map((contract) =>
      mapContractForWorkflow(contract, salaryDecision),
    )
    const activeId = activeContractId(contracts)

    return {
      id: employee.id,
      employeeNumber: employee.employeeNumber,
      displayName: employee.displayName,
      status: employee.status,
      userId: employee.userId,
      userMappingStatus: employee.userId ? "linked" : "unlinked",
      payrollEligible: employee.status === PayrollEmployeeStatus.ACTIVE && Boolean(activeId),
      activeContractId: activeId,
      contracts,
    } satisfies PayrollEmployeeContractWorkflowRecord
  })

  await client.auditLog.create({
    data: {
      entityType: "PayrollContract",
      entityId: parsed.employeeId ?? "employee-contract-workflow",
      action: "PAYROLL_EMPLOYEE_CONTRACT_WORKFLOW_READ",
      userId: parsed.actorId ?? null,
      organizationId: parsed.organizationId,
      changes: safeJson({
        after: {
          employeeCount: mappedEmployees.length,
          redaction: salaryDecision.allowed ? "allowed" : salaryDecision.reasonCode,
          policy: salaryDecision.policy,
        },
      }),
    },
  })

  const allContracts = mappedEmployees.flatMap((employee) => employee.contracts)

  return {
    organizationId: parsed.organizationId,
    asOf: new Date().toISOString(),
    summary: {
      totalEmployees: mappedEmployees.length,
      linkedEmployees: mappedEmployees.filter((employee) => employee.userMappingStatus === "linked").length,
      activeContracts: allContracts.filter((contract) => statusSupportsPayrollEligibility(contract.status)).length,
      payrollEligible: mappedEmployees.filter((employee) => employee.payrollEligible).length,
      redactedContracts: allContracts.filter((contract) => contract.redactions.length > 0).length,
    },
    employees: mappedEmployees,
  }
}

export async function resolvePayrollEmployeeForUser(
  input: ResolvePayrollEmployeeForUserInput,
  client: DbClient = db,
): Promise<PayrollEmployeeUserResolution> {
  const parsed = resolvePayrollEmployeeForUserInputSchema.parse(input)
  const actorIsSubject = !parsed.actorId || parsed.actorId === parsed.userId

  if (!actorIsSubject && !hasAnyRbacPermission(parsed.actorPermissions, READ_PERMISSIONS)) {
    throw new ForbiddenError("Only the employee or an authorized payroll reader can resolve employee mapping.")
  }

  const matches = await client.payrollEmployee.findMany({
    where: {
      organizationId: parsed.organizationId,
      userId: parsed.userId,
      deletedAt: null,
    },
    select: {
      id: true,
      organizationId: true,
      userId: true,
      employeeNumber: true,
      displayName: true,
      status: true,
    },
    take: 2,
  })

  if (matches.length === 0) {
    throw new NotFoundError("No payroll employee is linked to this user in the tenant.")
  }

  if (matches.length > 1) {
    throw new ConflictError("More than one payroll employee is linked to this user in the tenant.")
  }

  const employee = matches[0]

  if (parsed.requestedEmployeeId && parsed.requestedEmployeeId !== employee.id) {
    throw new ForbiddenError("Requested employee does not belong to the authenticated user.")
  }

  return {
    organizationId: employee.organizationId,
    userId: employee.userId ?? parsed.userId,
    employeeId: employee.id,
    employeeNumber: employee.employeeNumber,
    displayName: employee.displayName,
    status: employee.status,
  }
}

export async function createPayrollContract(
  input: CreatePayrollContractInput,
  client: DbClient = db,
): Promise<PayrollContractMutationResult> {
  const parsed = createPayrollContractInputSchema.parse(input)
  assertPermission(parsed.actorPermissions, MANAGE_PERMISSIONS, "contract create")

  const effectiveFrom = parseDate(parsed.effectiveFrom, "effectiveFrom")
  const effectiveTo = parseOptionalDate(parsed.effectiveTo, "effectiveTo")
  const baseSalary = parseDecimal(parsed.baseSalary, "baseSalary", false)
  const workingHoursPerMonth = parseOptionalDecimal(parsed.workingHoursPerMonth, "workingHoursPerMonth")
  assertEffectiveDateOrder(effectiveFrom, effectiveTo)

  if (parsed.status === PayrollContractStatus.ACTIVE && !parsed.signedDocumentHash) {
    throw new BusinessRuleError("Active contracts require signed contract evidence.")
  }

  return inTransaction(client, async (tx) => {
    const employee = await tx.payrollEmployee.findFirst({
      where: {
        id: parsed.employeeId,
        organizationId: parsed.organizationId,
        deletedAt: null,
      },
      select: {
        id: true,
        status: true,
        employeeNumber: true,
      },
    })

    if (!employee) {
      throw new NotFoundError("Payroll employee was not found for this tenant.")
    }

    if (
      employee.status === PayrollEmployeeStatus.TERMINATED ||
      employee.status === PayrollEmployeeStatus.ARCHIVED
    ) {
      throw new BusinessRuleError("Contracts cannot be created for terminated or archived employees.")
    }

    const duplicate = await tx.payrollContract.findFirst({
      where: {
        organizationId: parsed.organizationId,
        contractNumber: parsed.contractNumber,
        deletedAt: null,
      },
      select: { id: true },
    })

    if (duplicate) {
      throw new ConflictError("A payroll contract with this number already exists in the tenant.")
    }

    if (parsed.status === PayrollContractStatus.ACTIVE) {
      await assertNoActiveOverlap(tx, {
        organizationId: parsed.organizationId,
        employeeId: parsed.employeeId,
        effectiveFrom,
        effectiveTo,
      })
    }

    let contract = await tx.payrollContract.create({
      data: {
        organizationId: parsed.organizationId,
        employeeId: parsed.employeeId,
        contractNumber: parsed.contractNumber,
        type: parsed.type,
        status: parsed.status,
        effectiveFrom,
        effectiveTo,
        baseSalary,
        currency: parsed.currency.toUpperCase(),
        workingHoursPerMonth,
        classification: parsed.classification ?? null,
        echelon: parsed.echelon ?? null,
        convention: parsed.convention ?? null,
        signedDocumentHash: parsed.signedDocumentHash ?? null,
        metadata: buildContractMetadata(null, {
          sourceReference: parsed.sourceReference ?? null,
          createdByWorkflow: true,
          employeeNumber: employee.employeeNumber,
        }),
      },
    })

    const businessEventId = await recordContractEvent(tx, {
      organizationId: parsed.organizationId,
      actorId: parsed.actorId,
      eventType: "payroll.contract.lifecycle.created",
      idempotencyKey: parsed.idempotencyKey ?? `payroll-contract-create:${parsed.organizationId}:${parsed.contractNumber}`,
      contract,
      documentHash: parsed.signedDocumentHash ?? null,
      payload: contractEventPayload("created", contract, {
        employeeNumber: employee.employeeNumber,
        sourceReference: parsed.sourceReference ?? null,
      }),
      metadata: {
        sourceReference: parsed.sourceReference ?? null,
      },
    })

    if (parsed.status === PayrollContractStatus.ACTIVE) {
      contract = await tx.payrollContract.update({
        where: { id: contract.id, organizationId: parsed.organizationId },
        data: {
          activatedBusinessEventId: businessEventId,
          metadata: buildContractMetadata(contract.metadata, {
            activatedBusinessEventId: businessEventId,
          }),
        },
      })
    }

    const salaryDecision = salaryRedactionFor({
      actorPermissions: parsed.actorPermissions,
      field: "contracts.baseSalary",
    })
    const mapped = mapContractForWorkflow(contract, salaryDecision)

    await auditContractChange(tx, {
      organizationId: parsed.organizationId,
      actorId: parsed.actorId,
      action: "PAYROLL_CONTRACT_CREATED",
      contractId: contract.id,
      before: null,
      after: contractAuditSnapshot(mapped),
    })

    return {
      contract: mapped,
      businessEventId,
    }
  })
}

export async function updatePayrollContract(
  input: UpdatePayrollContractInput,
  client: DbClient = db,
): Promise<PayrollContractMutationResult> {
  const parsed = updatePayrollContractInputSchema.parse(input)
  assertPermission(parsed.actorPermissions, MANAGE_PERMISSIONS, "contract update")

  return inTransaction(client, async (tx) => {
    const existing = await tx.payrollContract.findFirst({
      where: {
        id: parsed.contractId,
        organizationId: parsed.organizationId,
        deletedAt: null,
      },
      include: {
        employee: true,
      },
    }) as PayrollContractRecord | null

    if (!existing) {
      throw new NotFoundError("Payroll contract was not found for this tenant.")
    }

    if (existing.status === PayrollContractStatus.ENDED || existing.status === PayrollContractStatus.CANCELLED) {
      throw new BusinessRuleError("Ended or cancelled contracts cannot be mutated in place.")
    }

    const updateData: Prisma.PayrollContractUpdateInput = {}
    const nextStatus = parsed.status ?? existing.status
    const nextEffectiveFrom = parsed.effectiveFrom
      ? parseDate(parsed.effectiveFrom, "effectiveFrom")
      : existing.effectiveFrom
    const nextEffectiveTo = parsed.effectiveTo !== undefined
      ? parseOptionalDate(parsed.effectiveTo, "effectiveTo")
      : existing.effectiveTo
    const nextSignedDocumentHash = parsed.signedDocumentHash ?? existing.signedDocumentHash

    assertEffectiveDateOrder(nextEffectiveFrom, nextEffectiveTo)

    if (parsed.baseSalary !== undefined) {
      const nextBaseSalary = parseDecimal(parsed.baseSalary, "baseSalary", false)
      if (existing.status === PayrollContractStatus.ACTIVE && !new Prisma.Decimal(existing.baseSalary).equals(nextBaseSalary)) {
        throw new BusinessRuleError("Active contract salary changes require the compensation approval workflow.")
      }
      updateData.baseSalary = nextBaseSalary
    }

    if (nextStatus === PayrollContractStatus.ACTIVE && !nextSignedDocumentHash) {
      throw new BusinessRuleError("Active contracts require signed contract evidence.")
    }

    if (nextStatus === PayrollContractStatus.ACTIVE) {
      await assertNoActiveOverlap(tx, {
        organizationId: parsed.organizationId,
        employeeId: existing.employeeId,
        contractId: existing.id,
        effectiveFrom: nextEffectiveFrom,
        effectiveTo: nextEffectiveTo,
      })
    }

    if (parsed.type) updateData.type = parsed.type
    if (parsed.status) updateData.status = parsed.status
    if (parsed.effectiveFrom) updateData.effectiveFrom = nextEffectiveFrom
    if (parsed.effectiveTo !== undefined) updateData.effectiveTo = nextEffectiveTo
    if (parsed.currency) updateData.currency = parsed.currency.toUpperCase()
    if (parsed.workingHoursPerMonth !== undefined) {
      updateData.workingHoursPerMonth = parseOptionalDecimal(parsed.workingHoursPerMonth, "workingHoursPerMonth")
    }
    if (parsed.classification !== undefined) updateData.classification = parsed.classification ?? null
    if (parsed.echelon !== undefined) updateData.echelon = parsed.echelon ?? null
    if (parsed.convention !== undefined) updateData.convention = parsed.convention ?? null
    if (parsed.signedDocumentHash !== undefined) updateData.signedDocumentHash = parsed.signedDocumentHash
    updateData.metadata = buildContractMetadata(existing.metadata, {
      sourceReference: parsed.sourceReference ?? null,
      changeReason: parsed.changeReason ?? null,
    })

    let updated = await tx.payrollContract.update({
      where: { id: existing.id, organizationId: parsed.organizationId },
      data: updateData,
    })

    const businessEventId = await recordContractEvent(tx, {
      organizationId: parsed.organizationId,
      actorId: parsed.actorId,
      eventType: "payroll.contract.lifecycle.updated",
      idempotencyKey: parsed.idempotencyKey ?? `payroll-contract-update:${parsed.organizationId}:${existing.id}:${updated.updatedAt.toISOString()}`,
      contract: updated,
      documentHash: updated.signedDocumentHash,
      payload: contractEventPayload("updated", updated, {
        changeReason: parsed.changeReason ?? null,
        sourceReference: parsed.sourceReference ?? null,
      }),
      metadata: {
        sourceReference: parsed.sourceReference ?? null,
        changeReason: parsed.changeReason ?? null,
      },
    })

    if (updated.status === PayrollContractStatus.ACTIVE && !updated.activatedBusinessEventId) {
      updated = await tx.payrollContract.update({
        where: { id: updated.id, organizationId: parsed.organizationId },
        data: {
          activatedBusinessEventId: businessEventId,
          metadata: buildContractMetadata(updated.metadata, {
            activatedBusinessEventId: businessEventId,
          }),
        },
      })
    }

    const salaryDecision = salaryRedactionFor({
      actorPermissions: parsed.actorPermissions,
      field: "contracts.baseSalary",
    })
    const mapped = mapContractForWorkflow(updated, salaryDecision)

    await auditContractChange(tx, {
      organizationId: parsed.organizationId,
      actorId: parsed.actorId,
      action: "PAYROLL_CONTRACT_UPDATED",
      contractId: existing.id,
      before: contractAuditSnapshot(existing),
      after: contractAuditSnapshot(mapped),
    })

    return {
      contract: mapped,
      businessEventId,
    }
  })
}

export async function terminatePayrollContract(
  input: TerminatePayrollContractInput,
  client: DbClient = db,
): Promise<PayrollContractMutationResult> {
  const parsed = terminatePayrollContractInputSchema.parse(input)
  assertPermission(parsed.actorPermissions, MANAGE_PERMISSIONS, "contract termination")
  const effectiveTo = parseDate(parsed.effectiveTo, "effectiveTo")

  return inTransaction(client, async (tx) => {
    const existing = await tx.payrollContract.findFirst({
      where: {
        id: parsed.contractId,
        organizationId: parsed.organizationId,
        deletedAt: null,
      },
      include: {
        employee: true,
      },
    }) as PayrollContractRecord | null

    if (!existing) {
      throw new NotFoundError("Payroll contract was not found for this tenant.")
    }

    if (existing.status === PayrollContractStatus.ENDED || existing.status === PayrollContractStatus.CANCELLED) {
      throw new BusinessRuleError("Contract is already ended or cancelled.")
    }

    assertEffectiveDateOrder(existing.effectiveFrom, effectiveTo)

    let updated = await tx.payrollContract.update({
      where: { id: existing.id, organizationId: parsed.organizationId },
      data: {
        status: PayrollContractStatus.ENDED,
        effectiveTo,
        metadata: buildContractMetadata(existing.metadata, {
          terminationReason: parsed.terminationReason,
          terminatedAt: new Date().toISOString(),
          sourceReference: parsed.sourceReference ?? null,
        }),
      },
    })

    const businessEventId = await recordContractEvent(tx, {
      organizationId: parsed.organizationId,
      actorId: parsed.actorId,
      eventType: "payroll.contract.lifecycle.terminated",
      idempotencyKey: parsed.idempotencyKey ?? `payroll-contract-terminate:${parsed.organizationId}:${existing.id}:${effectiveTo.toISOString()}`,
      contract: updated,
      documentHash: updated.signedDocumentHash,
      payload: contractEventPayload("terminated", updated, {
        terminationReason: parsed.terminationReason,
        sourceReference: parsed.sourceReference ?? null,
      }),
      metadata: {
        sourceReference: parsed.sourceReference ?? null,
        terminationReason: parsed.terminationReason,
      },
    })

    if (!updated.activatedBusinessEventId && existing.status === PayrollContractStatus.ACTIVE) {
      updated = await tx.payrollContract.update({
        where: { id: updated.id, organizationId: parsed.organizationId },
        data: {
          activatedBusinessEventId: businessEventId,
          metadata: buildContractMetadata(updated.metadata, {
            lastLifecycleBusinessEventId: businessEventId,
          }),
        },
      })
    }

    const salaryDecision = salaryRedactionFor({
      actorPermissions: parsed.actorPermissions,
      field: "contracts.baseSalary",
    })
    const mapped = mapContractForWorkflow(updated, salaryDecision)

    await auditContractChange(tx, {
      organizationId: parsed.organizationId,
      actorId: parsed.actorId,
      action: "PAYROLL_CONTRACT_TERMINATED",
      contractId: existing.id,
      before: contractAuditSnapshot(existing),
      after: contractAuditSnapshot(mapped),
    })

    return {
      contract: mapped,
      businessEventId,
    }
  })
}


