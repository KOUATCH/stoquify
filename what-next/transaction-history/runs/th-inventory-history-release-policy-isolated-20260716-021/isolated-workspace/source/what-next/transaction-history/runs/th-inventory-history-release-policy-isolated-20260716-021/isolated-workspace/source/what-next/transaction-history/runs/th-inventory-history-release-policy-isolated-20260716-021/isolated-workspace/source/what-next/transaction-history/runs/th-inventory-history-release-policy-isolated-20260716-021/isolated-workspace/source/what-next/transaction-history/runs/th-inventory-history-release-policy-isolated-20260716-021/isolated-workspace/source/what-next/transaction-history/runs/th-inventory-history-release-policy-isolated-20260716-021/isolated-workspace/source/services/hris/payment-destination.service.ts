import "server-only"

import { PayrollPaymentDestinationChangeStatus } from "@prisma/client"
import { z } from "zod"

import { hasAnyRbacPermission } from "@/lib/security/rbac-permissions"
import { db } from "@/prisma/db"
import { ForbiddenError, NotFoundError } from "@/services/_shared/action-errors"
import { resolveHrisPeopleAccessScope } from "@/services/hris/org.service"
import {
  applyApprovedPaymentDestinationChange,
  applyApprovedPaymentDestinationChangeInputSchema,
  approvePaymentDestinationChange,
  approvePaymentDestinationChangeInputSchema,
  getPaymentEvidenceReadiness,
  PAYMENT_DESTINATION_PRIVACY_POLICY,
  rejectPaymentDestinationChange,
  rejectPaymentDestinationChangeInputSchema,
  requestPaymentDestinationChange,
  requestPaymentDestinationChangeInputSchema,
  type DbClient,
  type PaymentDestinationChangeReadModel,
  type PaymentDestinationMutationResult,
  type PaymentEvidenceReadinessResult,
} from "@/services/payroll/payment-evidence.service"

const HRIS_READ_PERMISSIONS = ["hris.people.read", "hris.people.manage"] as const
const HRIS_MANAGE_PERMISSIONS = ["hris.people.manage"] as const
const HRIS_SELF_SERVICE_READ_PERMISSIONS = [
  "hris.self_service.read",
  ...HRIS_READ_PERMISSIONS,
] as const
const HRIS_SELF_SERVICE_REQUEST_PERMISSIONS = [
  "hris.self_service.request",
  "hris.people.manage",
] as const

export const hrisPaymentDestinationReadInputSchema = z.object({
  organizationId: z.string().trim().min(1),
  actorId: z.string().trim().min(1),
  actorPermissions: z.array(z.string()).optional().default([]),
  employeeId: z.string().trim().min(1),
})

export const ownHrisPaymentDestinationReadInputSchema =
  hrisPaymentDestinationReadInputSchema.omit({ employeeId: true })

export const hrisPaymentDestinationRequestInputSchema =
  requestPaymentDestinationChangeInputSchema

export const ownHrisPaymentDestinationRequestInputSchema =
  requestPaymentDestinationChangeInputSchema.omit({ employeeId: true })

export const hrisPaymentDestinationApprovalInputSchema =
  approvePaymentDestinationChangeInputSchema.extend({
    employeeId: z.string().trim().min(1),
  })

export const hrisPaymentDestinationRejectionInputSchema =
  rejectPaymentDestinationChangeInputSchema.extend({
    employeeId: z.string().trim().min(1),
  })

export const hrisPaymentDestinationApplyInputSchema =
  applyApprovedPaymentDestinationChangeInputSchema.extend({
    employeeId: z.string().trim().min(1),
  })

export type HrisPaymentDestinationReadInput = z.input<
  typeof hrisPaymentDestinationReadInputSchema
>
export type OwnHrisPaymentDestinationReadInput = z.input<
  typeof ownHrisPaymentDestinationReadInputSchema
>
export type HrisPaymentDestinationRequestInput = z.input<
  typeof hrisPaymentDestinationRequestInputSchema
>
export type OwnHrisPaymentDestinationRequestInput = z.input<
  typeof ownHrisPaymentDestinationRequestInputSchema
>
export type HrisPaymentDestinationApprovalInput = z.input<
  typeof hrisPaymentDestinationApprovalInputSchema
>
export type HrisPaymentDestinationRejectionInput = z.input<
  typeof hrisPaymentDestinationRejectionInputSchema
>
export type HrisPaymentDestinationApplyInput = z.input<
  typeof hrisPaymentDestinationApplyInputSchema
>

export const HRIS_PAYMENT_DESTINATION_DATA_OWNERSHIP = {
  sourceOwner: "HRIS_PAYMENT_DESTINATION_SERVICE",
  compatibilityStorage: "PayrollEmployee_and_PayrollPaymentDestinationChangeRequest",
  payrollConsumer: "PAYROLL_RELEASE_READINESS",
  accountingConsumer: "PAYMENT_SETTLEMENT_ONLY",
  rawDestinationOwner: "NONE_RAW_VALUES_ARE_DISCARDED",
} as const

function assertPermission(
  actorPermissions: readonly string[],
  required: readonly string[],
  action: string,
) {
  if (!hasAnyRbacPermission(actorPermissions, required)) {
    throw new ForbiddenError(`Missing permission for ${action}.`)
  }
}

function delegatedPermissions(actorPermissions: readonly string[], permission: string) {
  return Array.from(new Set([...actorPermissions, permission]))
}

function safeAccessScope(scope: Awaited<ReturnType<typeof resolveHrisPeopleAccessScope>>) {
  return {
    organizationId: scope.organizationId,
    authority: scope.authority,
    managedLocationCount: scope.managedLocations.length,
  }
}

function mapChange(change: PaymentDestinationChangeReadModel) {
  const requesterApproverSeparated = change.approvedById
    ? change.requestedById !== change.approvedById
    : null
  const requesterApplierSeparated = change.appliedById
    ? change.requestedById !== change.appliedById
    : null
  const approverApplierSeparated = change.approvedById && change.appliedById
    ? change.approvedById !== change.appliedById
    : null

  return {
    id: change.id,
    employeeId: change.employeeId,
    employeeDisplayName: change.employeeDisplayName,
    status: change.status,
    paymentMethod: change.paymentMethod,
    maskedDestination: change.maskedDestination,
    requestedAt: change.requestedAt,
    approvedAt: change.approvedAt,
    appliedAt: change.appliedAt,
    requestEvidencePresent: Boolean(change.evidenceDocumentHash),
    approvalEvidencePresent: change.approvalEvidenceHashPresent,
    destinationFingerprintPresent: change.paymentDestinationHashPresent,
    separation: {
      requesterApproverSeparated,
      requesterApplierSeparated,
      approverApplierSeparated,
      complete: change.status === PayrollPaymentDestinationChangeStatus.APPLIED
        ? requesterApproverSeparated === true &&
          requesterApplierSeparated === true &&
          approverApplierSeparated === true
        : null,
    },
    privacy: {
      rawValueStored: false,
      revealAllowed: false,
      exportMode: PAYMENT_DESTINATION_PRIVACY_POLICY.exportPolicy,
    },
  }
}

function mapMutation(result: PaymentDestinationMutationResult) {
  return {
    paymentDestinationChange: mapChange(result.paymentDestinationChange),
    businessEventId: result.businessEventId,
    privacyPolicy: PAYMENT_DESTINATION_PRIVACY_POLICY,
    dataOwnership: HRIS_PAYMENT_DESTINATION_DATA_OWNERSHIP,
  }
}

function mapReadiness(result: PaymentEvidenceReadinessResult) {
  const employee = result.employees[0] ?? null
  if (!employee) return null
  const blockers = employee.blockers.filter((blocker) =>
    blocker === "EMPLOYEE_NOT_ACTIVE" ||
    blocker === "APPROVED_PAYMENT_DESTINATION_EVIDENCE_MISSING",
  )

  return {
    id: employee.id,
    employeeNumber: employee.employeeNumber,
    displayName: employee.displayName,
    status: employee.status,
    paymentDestination: {
      state: employee.paymentDestination.state,
      method: employee.paymentDestination.method,
      maskedDestination: employee.paymentDestination.maskedDestination,
      approvalEvidencePresent:
        employee.paymentDestination.approvedEvidenceHashPresent,
      destinationFingerprintPresent:
        employee.paymentDestination.paymentDestinationHashPresent,
      latestChange: employee.paymentDestination.latestChange
        ? mapChange(employee.paymentDestination.latestChange)
        : null,
    },
    payrollReleaseReadiness: {
      status: blockers.length === 0 ? "READY" : "BLOCKED",
      blockers,
    },
  }
}

async function resolveOwnEmployee(
  client: DbClient,
  input: { organizationId: string; actorId: string },
) {
  const employee = await client.payrollEmployee.findFirst({
    where: {
      organizationId: input.organizationId,
      userId: input.actorId,
      deletedAt: null,
    },
    select: { id: true },
  })
  if (!employee) {
    throw new NotFoundError("No HRIS employee profile is linked to the authenticated user.")
  }
  return employee
}

async function assertRequestEmployee(
  client: DbClient,
  input: {
    organizationId: string
    employeeId: string
    paymentDestinationChangeRequestId: string
  },
) {
  const request = await client.payrollPaymentDestinationChangeRequest.findFirst({
    where: {
      id: input.paymentDestinationChangeRequestId,
      organizationId: input.organizationId,
      employeeId: input.employeeId,
      deletedAt: null,
    },
    select: { id: true },
  })
  if (!request) {
    throw new NotFoundError(
      "Payment destination change request was not found for this tenant and employee.",
    )
  }
}

async function readForEmployee(
  client: DbClient,
  input: {
    organizationId: string
    actorId: string
    actorPermissions: readonly string[]
    employeeId: string
  },
) {
  const result = await getPaymentEvidenceReadiness({
    organizationId: input.organizationId,
    actorId: input.actorId,
    actorPermissions: delegatedPermissions(
      input.actorPermissions,
      "payroll.payment_destination.read",
    ),
    employeeId: input.employeeId,
    limit: 1,
  }, client)
  const employee = mapReadiness(result)
  if (!employee) {
    throw new NotFoundError("HRIS employee payment destination was not found.")
  }
  return employee
}

export async function getHrisPaymentDestinationStatus(
  input: HrisPaymentDestinationReadInput,
  client: DbClient = db,
) {
  const parsed = hrisPaymentDestinationReadInputSchema.parse(input)
  const accessScope = await resolveHrisPeopleAccessScope(parsed, client)
  return {
    organizationId: parsed.organizationId,
    employee: await readForEmployee(client, parsed),
    accessScope: safeAccessScope(accessScope),
    privacyPolicy: PAYMENT_DESTINATION_PRIVACY_POLICY,
    dataOwnership: HRIS_PAYMENT_DESTINATION_DATA_OWNERSHIP,
  }
}

export async function getOwnHrisPaymentDestinationStatus(
  input: OwnHrisPaymentDestinationReadInput,
  client: DbClient = db,
) {
  const parsed = ownHrisPaymentDestinationReadInputSchema.parse(input)
  assertPermission(parsed.actorPermissions, HRIS_SELF_SERVICE_READ_PERMISSIONS, "own HRIS payment destination read")
  const employee = await resolveOwnEmployee(client, parsed)
  return {
    organizationId: parsed.organizationId,
    employee: await readForEmployee(client, { ...parsed, employeeId: employee.id }),
    accessScope: {
      organizationId: parsed.organizationId,
      authority: "OWN_RECORD",
      managedLocationCount: 0,
    } as const,
    privacyPolicy: PAYMENT_DESTINATION_PRIVACY_POLICY,
    dataOwnership: HRIS_PAYMENT_DESTINATION_DATA_OWNERSHIP,
  }
}

export async function requestOwnHrisPaymentDestinationChange(
  input: OwnHrisPaymentDestinationRequestInput,
  client: DbClient = db,
) {
  const parsed = ownHrisPaymentDestinationRequestInputSchema.parse(input)
  assertPermission(parsed.actorPermissions, HRIS_SELF_SERVICE_REQUEST_PERMISSIONS, "own HRIS payment destination request")
  const employee = await resolveOwnEmployee(client, parsed)
  return mapMutation(await requestPaymentDestinationChange({
    ...parsed,
    employeeId: employee.id,
    actorPermissions: delegatedPermissions(
      parsed.actorPermissions,
      "payroll.payment_destination.request",
    ),
  }, client))
}

export async function requestHrisPaymentDestinationChange(
  input: HrisPaymentDestinationRequestInput,
  client: DbClient = db,
) {
  const parsed = hrisPaymentDestinationRequestInputSchema.parse(input)
  assertPermission(parsed.actorPermissions, HRIS_MANAGE_PERMISSIONS, "HRIS payment destination request")
  await resolveHrisPeopleAccessScope(parsed, client)
  return mapMutation(await requestPaymentDestinationChange({
    ...parsed,
    actorPermissions: delegatedPermissions(
      parsed.actorPermissions,
      "payroll.payment_destination.request",
    ),
  }, client))
}

export async function approveHrisPaymentDestinationChange(
  input: HrisPaymentDestinationApprovalInput,
  client: DbClient = db,
) {
  const parsed = hrisPaymentDestinationApprovalInputSchema.parse(input)
  assertPermission(parsed.actorPermissions, HRIS_MANAGE_PERMISSIONS, "HRIS payment destination approval")
  await resolveHrisPeopleAccessScope(parsed, client)
  await assertRequestEmployee(client, parsed)
  return mapMutation(await approvePaymentDestinationChange({
    organizationId: parsed.organizationId,
    actorId: parsed.actorId,
    actorPermissions: delegatedPermissions(
      parsed.actorPermissions,
      "payroll.payment_destination.approve",
    ),
    paymentDestinationChangeRequestId:
      parsed.paymentDestinationChangeRequestId,
    decisionReason: parsed.decisionReason,
    approvalEvidenceHash: parsed.approvalEvidenceHash,
    idempotencyKey: parsed.idempotencyKey,
  }, client))
}

export async function rejectHrisPaymentDestinationChange(
  input: HrisPaymentDestinationRejectionInput,
  client: DbClient = db,
) {
  const parsed = hrisPaymentDestinationRejectionInputSchema.parse(input)
  assertPermission(parsed.actorPermissions, HRIS_MANAGE_PERMISSIONS, "HRIS payment destination rejection")
  await resolveHrisPeopleAccessScope(parsed, client)
  await assertRequestEmployee(client, parsed)
  return mapMutation(await rejectPaymentDestinationChange({
    organizationId: parsed.organizationId,
    actorId: parsed.actorId,
    actorPermissions: delegatedPermissions(
      parsed.actorPermissions,
      "payroll.payment_destination.approve",
    ),
    paymentDestinationChangeRequestId:
      parsed.paymentDestinationChangeRequestId,
    decisionReason: parsed.decisionReason,
    idempotencyKey: parsed.idempotencyKey,
  }, client))
}

export async function applyApprovedHrisPaymentDestinationChange(
  input: HrisPaymentDestinationApplyInput,
  client: DbClient = db,
) {
  const parsed = hrisPaymentDestinationApplyInputSchema.parse(input)
  assertPermission(parsed.actorPermissions, HRIS_MANAGE_PERMISSIONS, "HRIS payment destination application")
  await resolveHrisPeopleAccessScope(parsed, client)
  await assertRequestEmployee(client, parsed)
  return mapMutation(await applyApprovedPaymentDestinationChange({
    organizationId: parsed.organizationId,
    actorId: parsed.actorId,
    actorPermissions: delegatedPermissions(
      parsed.actorPermissions,
      "payroll.payment_destination.apply",
    ),
    paymentDestinationChangeRequestId:
      parsed.paymentDestinationChangeRequestId,
    idempotencyKey: parsed.idempotencyKey,
  }, client))
}
