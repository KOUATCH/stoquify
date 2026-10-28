import "server-only"

import {
  PayrollRubriqueAssignmentStatus,
  PayrollSalaryChangeStatus,
} from "@prisma/client"
import { z } from "zod"

import { hasAnyRbacPermission } from "@/lib/security/rbac-permissions"
import { db } from "@/prisma/db"
import { ForbiddenError, NotFoundError } from "@/services/_shared/action-errors"
import { hashBusinessPayload } from "@/services/events/business-event.service"
import { resolveHrisPeopleAccessScope } from "@/services/hris/org.service"
import {
  applyApprovedSalaryChange,
  applyApprovedSalaryChangeInputSchema,
  approveEmployeeRubriqueAssignment,
  approveSalaryChange,
  approveSalaryChangeInputSchema,
  assignEmployeeRubrique,
  assignEmployeeRubriqueInputSchema,
  compensationWorkflowInputSchema,
  getCompensationWorkflow,
  requestSalaryChange,
  requestSalaryChangeInputSchema,
  rejectSalaryChange,
  rejectSalaryChangeInputSchema,
  type AssignmentMutationResult,
  type CompensationWorkflowResult,
  type PayrollRubriqueAssignmentReadModel,
  type PayrollSalaryChangeReadModel,
  type SalaryChangeMutationResult,
} from "@/services/payroll/compensation.service"

type CompensationClient = NonNullable<Parameters<typeof getCompensationWorkflow>[1]>

const MANAGE_PERMISSIONS = ["hris.people.manage"] as const

export const hrisCompensationReadInputSchema = compensationWorkflowInputSchema.extend({
  actorId: z.string().trim().min(1),
  employeeId: z.string().trim().min(1),
})

export const hrisCompensationAssignmentRequestInputSchema =
  assignEmployeeRubriqueInputSchema.omit({ status: true })

export const hrisCompensationAssignmentApprovalInputSchema = z.object({
  organizationId: z.string().trim().min(1),
  actorId: z.string().trim().min(1),
  actorPermissions: z.array(z.string()).optional().default([]),
  employeeId: z.string().trim().min(1),
  assignmentId: z.string().trim().min(1),
  decisionReason: z.string().trim().min(3).max(800),
  approvalEvidenceHash: z.string().trim().min(8).max(256),
  idempotencyKey: z.string().trim().min(1).max(200).optional(),
})

export const hrisSalaryChangeRequestInputSchema = requestSalaryChangeInputSchema
export const hrisSalaryChangeApprovalInputSchema = approveSalaryChangeInputSchema.extend({
  employeeId: z.string().trim().min(1),
})
export const hrisSalaryChangeRejectionInputSchema = rejectSalaryChangeInputSchema.extend({
  employeeId: z.string().trim().min(1),
})
export const hrisSalaryChangeApplyInputSchema = applyApprovedSalaryChangeInputSchema.extend({
  employeeId: z.string().trim().min(1),
})

export type HrisCompensationReadInput = z.input<typeof hrisCompensationReadInputSchema>
export type HrisCompensationAssignmentRequestInput = z.input<
  typeof hrisCompensationAssignmentRequestInputSchema
>
export type HrisCompensationAssignmentApprovalInput = z.input<
  typeof hrisCompensationAssignmentApprovalInputSchema
>
export type HrisSalaryChangeRequestInput = z.input<typeof hrisSalaryChangeRequestInputSchema>
export type HrisSalaryChangeApprovalInput = z.input<typeof hrisSalaryChangeApprovalInputSchema>
export type HrisSalaryChangeRejectionInput = z.input<typeof hrisSalaryChangeRejectionInputSchema>
export type HrisSalaryChangeApplyInput = z.input<typeof hrisSalaryChangeApplyInputSchema>

export const HRIS_COMPENSATION_DATA_OWNERSHIP = {
  employeeCompensationOwner: "HRIS_COMPENSATION_SERVICE",
  compatibilityStorage: "PayrollContract_and_PayrollEmployeeRubriqueAssignment",
  componentDefinitionOwner: "PAYROLL_COMPONENT_CATALOG_OR_COUNTRY_PACK",
  statutoryMeaningOwner: "PAYROLL_COUNTRY_PACK",
  postingMapOwner: "ACCOUNTING",
  payrollConsumptionRule: "APPROVED_EFFECTIVE_DATED_EVIDENCE_ONLY",
} as const

function assertManagePermission(actorPermissions: readonly string[]) {
  if (!hasAnyRbacPermission(actorPermissions, MANAGE_PERMISSIONS)) {
    throw new ForbiddenError("Missing permission for HRIS compensation management.")
  }
}

function delegatedPermissions(actorPermissions: readonly string[], permission: string) {
  return Array.from(new Set([...actorPermissions, permission]))
}

const hrisCompensationAssignmentPendingSchema = z.object({
  version: z.literal(1),
  status: z.literal("REQUESTED"),
  requestedById: z.string().trim().min(1),
  requestBusinessEventId: z.string().trim().min(1).nullable(),
  requestedAt: z.string().datetime(),
})

export function pendingHrisCompensationAssignmentFromMetadata(metadata: unknown) {
  const root = metadata && typeof metadata === "object" && !Array.isArray(metadata)
    ? metadata as Record<string, unknown>
    : {}
  const parsed = hrisCompensationAssignmentPendingSchema.safeParse(
    root.hrisCompensationApproval,
  )
  return parsed.success ? parsed.data : null
}

function safeAccessScope(scope: Awaited<ReturnType<typeof resolveHrisPeopleAccessScope>>) {
  return {
    organizationId: scope.organizationId,
    authority: scope.authority,
    managedLocationCount: scope.managedLocations.length,
  }
}

function mapAssignment(assignment: PayrollRubriqueAssignmentReadModel) {
  const approved = assignment.status === PayrollRubriqueAssignmentStatus.ACTIVE &&
    assignment.hrisApprovalStatus === "APPROVED" &&
    assignment.evidenceDocumentHashPresent &&
    assignment.approvalBusinessEventPresent

  return {
    id: assignment.id,
    employeeId: assignment.employeeId,
    rubriqueId: assignment.rubriqueId,
    rubriqueCode: assignment.rubriqueCode,
    status: assignment.status,
    amount: assignment.amount,
    rateBps: assignment.rateBps,
    quantity: assignment.quantity,
    currency: assignment.currency,
    effectiveFrom: assignment.effectiveFrom,
    effectiveTo: assignment.effectiveTo,
    evidencePresent: assignment.evidenceDocumentHashPresent,
    approvalEventPresent: assignment.approvalBusinessEventPresent,
    approvalStatus: assignment.hrisApprovalStatus,
    payrollReadiness: approved
      ? "READY"
      : assignment.hrisApprovalStatus === "LEGACY_ACTIVE"
        ? "LEGACY_REVIEW_REQUIRED"
        : "BLOCKED",
    redactions: assignment.redactions,
  }
}

function mapSalaryChange(request: PayrollSalaryChangeReadModel) {
  const requestApprovalSeparated = request.approvedById
    ? request.approvedById !== request.requestedById
    : null
  const requestApplySeparated = request.appliedById
    ? request.appliedById !== request.requestedById
    : null
  const approvalApplySeparated = request.appliedById && request.approvedById
    ? request.appliedById !== request.approvedById
    : null

  return {
    id: request.id,
    employeeId: request.employeeId,
    sourceContractId: request.sourceContractId,
    supersedingContractId: request.supersedingContractId,
    status: request.status,
    currentBaseSalary: request.currentBaseSalary,
    proposedBaseSalary: request.proposedBaseSalary,
    currency: request.currency,
    effectiveFrom: request.effectiveFrom,
    requestEvidencePresent: request.evidenceDocumentHashPresent,
    approvalEvidencePresent: request.approvalEvidenceHashPresent,
    separation: {
      requestApprovalSeparated,
      requestApplySeparated,
      approvalApplySeparated,
      complete: request.status === PayrollSalaryChangeStatus.APPLIED
        ? requestApprovalSeparated === true &&
          requestApplySeparated === true &&
          approvalApplySeparated === true
        : null,
    },
    redactions: request.redactions,
  }
}

function mapMutation(result: AssignmentMutationResult) {
  return {
    assignment: mapAssignment(result.assignment),
    businessEventId: result.businessEventId,
  }
}

function mapSalaryMutation(result: SalaryChangeMutationResult) {
  return {
    salaryChange: mapSalaryChange(result.salaryChange),
    businessEventId: result.businessEventId,
    supersedingContractId: result.supersedingContractId ?? null,
  }
}

function mapWorkflow(result: CompensationWorkflowResult) {
  return {
    organizationId: result.organizationId,
    asOf: result.asOf,
    summary: result.summary,
    components: result.rubriques.map((rubrique) => ({
      id: rubrique.id,
      code: rubrique.code,
      label: rubrique.label,
      kind: rubrique.kind,
      valueType: rubrique.valueType,
      status: rubrique.status,
      taxableBase: rubrique.taxableBase,
      socialBase: rubrique.socialBase,
      employerCharge: rubrique.employerCharge,
      payslipLabel: rubrique.payslipLabel,
      definitionOwner: rubrique.countryPackVersion
        ? "PAYROLL_COUNTRY_PACK"
        : "TENANT_PAYROLL_COMPONENT_CATALOG",
      postingMapOwner: "ACCOUNTING",
      statutoryProvenance: {
        countryCode: rubrique.countryCode,
        countryPackVersion: rubrique.countryPackVersion,
        countryPackSchemaVersion: rubrique.countryPackSchemaVersion,
        verificationStatus: rubrique.countryPackVerificationStatus,
        capabilityStatus: rubrique.countryPackCapabilityStatus,
      },
    })),
    assignments: result.assignments.map(mapAssignment),
    salaryChanges: result.salaryChanges.map(mapSalaryChange),
    dataOwnership: HRIS_COMPENSATION_DATA_OWNERSHIP,
  }
}

async function assertSalaryRequestEmployee(
  client: CompensationClient,
  input: { organizationId: string; employeeId: string; salaryChangeRequestId: string },
) {
  const request = await client.payrollSalaryChangeRequest.findFirst({
    where: {
      id: input.salaryChangeRequestId,
      organizationId: input.organizationId,
      employeeId: input.employeeId,
      deletedAt: null,
    },
    select: { id: true },
  })
  if (!request) {
    throw new NotFoundError("Salary change request was not found for this tenant and employee.")
  }
}

export async function getHrisEmployeeCompensation(
  input: HrisCompensationReadInput,
  client: CompensationClient = db,
) {
  const parsed = hrisCompensationReadInputSchema.parse(input)
  const accessScope = await resolveHrisPeopleAccessScope(parsed, client)
  const result = await getCompensationWorkflow({
    ...parsed,
    actorPermissions: delegatedPermissions(
      parsed.actorPermissions,
      "payroll.compensation.read",
    ),
  }, client)

  return {
    ...mapWorkflow(result),
    accessScope: safeAccessScope(accessScope),
  }
}

export async function requestHrisCompensationAssignment(
  input: HrisCompensationAssignmentRequestInput,
  client: CompensationClient = db,
) {
  const parsed = hrisCompensationAssignmentRequestInputSchema.parse(input)
  assertManagePermission(parsed.actorPermissions)
  await resolveHrisPeopleAccessScope(parsed, client)
  return mapMutation(await assignEmployeeRubrique({
    ...parsed,
    status: PayrollRubriqueAssignmentStatus.DRAFT,
    actorPermissions: delegatedPermissions(
      parsed.actorPermissions,
      "payroll.compensation.manage",
    ),
  }, client))
}

export async function approveHrisCompensationAssignment(
  input: HrisCompensationAssignmentApprovalInput,
  client: CompensationClient = db,
) {
  const parsed = hrisCompensationAssignmentApprovalInputSchema.parse(input)
  assertManagePermission(parsed.actorPermissions)
  await resolveHrisPeopleAccessScope(parsed, client)
  return mapMutation(await approveEmployeeRubriqueAssignment({
    organizationId: parsed.organizationId,
    actorId: parsed.actorId,
    actorPermissions: delegatedPermissions(
      parsed.actorPermissions,
      "payroll.compensation.manage",
    ),
    employeeId: parsed.employeeId,
    assignmentId: parsed.assignmentId,
    decisionReasonHash: `sha256:${hashBusinessPayload({
      decisionReason: parsed.decisionReason,
    })}`,
    approvalEvidenceHash: parsed.approvalEvidenceHash,
    idempotencyKey: parsed.idempotencyKey,
  }, client))
}

export async function requestHrisSalaryChange(
  input: HrisSalaryChangeRequestInput,
  client: CompensationClient = db,
) {
  const parsed = hrisSalaryChangeRequestInputSchema.parse(input)
  assertManagePermission(parsed.actorPermissions)
  await resolveHrisPeopleAccessScope(parsed, client)
  return mapSalaryMutation(await requestSalaryChange({
    ...parsed,
    actorPermissions: delegatedPermissions(
      parsed.actorPermissions,
      "payroll.salary_changes.request",
    ),
  }, client))
}

export async function approveHrisSalaryChange(
  input: HrisSalaryChangeApprovalInput,
  client: CompensationClient = db,
) {
  const parsed = hrisSalaryChangeApprovalInputSchema.parse(input)
  assertManagePermission(parsed.actorPermissions)
  await resolveHrisPeopleAccessScope(parsed, client)
  await assertSalaryRequestEmployee(client, parsed)
  return mapSalaryMutation(await approveSalaryChange({
    organizationId: parsed.organizationId,
    actorId: parsed.actorId,
    actorPermissions: delegatedPermissions(
      parsed.actorPermissions,
      "payroll.salary_changes.approve",
    ),
    salaryChangeRequestId: parsed.salaryChangeRequestId,
    decisionReason: parsed.decisionReason,
    approvalEvidenceHash: parsed.approvalEvidenceHash,
    idempotencyKey: parsed.idempotencyKey,
  }, client))
}

export async function rejectHrisSalaryChange(
  input: HrisSalaryChangeRejectionInput,
  client: CompensationClient = db,
) {
  const parsed = hrisSalaryChangeRejectionInputSchema.parse(input)
  assertManagePermission(parsed.actorPermissions)
  await resolveHrisPeopleAccessScope(parsed, client)
  await assertSalaryRequestEmployee(client, parsed)
  return mapSalaryMutation(await rejectSalaryChange({
    organizationId: parsed.organizationId,
    actorId: parsed.actorId,
    actorPermissions: delegatedPermissions(
      parsed.actorPermissions,
      "payroll.salary_changes.approve",
    ),
    salaryChangeRequestId: parsed.salaryChangeRequestId,
    decisionReason: parsed.decisionReason,
    idempotencyKey: parsed.idempotencyKey,
  }, client))
}

export async function applyApprovedHrisSalaryChange(
  input: HrisSalaryChangeApplyInput,
  client: CompensationClient = db,
) {
  const parsed = hrisSalaryChangeApplyInputSchema.parse(input)
  assertManagePermission(parsed.actorPermissions)
  await resolveHrisPeopleAccessScope(parsed, client)
  await assertSalaryRequestEmployee(client, parsed)
  return mapSalaryMutation(await applyApprovedSalaryChange({
    organizationId: parsed.organizationId,
    actorId: parsed.actorId,
    actorPermissions: delegatedPermissions(
      parsed.actorPermissions,
      "payroll.salary_changes.apply",
    ),
    salaryChangeRequestId: parsed.salaryChangeRequestId,
    idempotencyKey: parsed.idempotencyKey,
  }, client))
}

export type HrisEmployeeCompensation = Awaited<ReturnType<typeof getHrisEmployeeCompensation>>
