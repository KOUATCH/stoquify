"use server"

import { revalidatePath } from "next/cache"

import { protect } from "@/services/_shared/protect"
import {
  applyApprovedHrisPaymentDestinationChange,
  approveHrisPaymentDestinationChange,
  getHrisPaymentDestinationStatus,
  getOwnHrisPaymentDestinationStatus,
  rejectHrisPaymentDestinationChange,
  requestHrisPaymentDestinationChange,
  requestOwnHrisPaymentDestinationChange,
  type HrisPaymentDestinationApplyInput,
  type HrisPaymentDestinationApprovalInput,
  type HrisPaymentDestinationReadInput,
  type HrisPaymentDestinationRejectionInput,
  type HrisPaymentDestinationRequestInput,
  type OwnHrisPaymentDestinationReadInput,
  type OwnHrisPaymentDestinationRequestInput,
} from "@/services/hris/payment-destination.service"

export type {
  HrisPaymentDestinationApplyInput,
  HrisPaymentDestinationApprovalInput,
  HrisPaymentDestinationReadInput,
  HrisPaymentDestinationRejectionInput,
  HrisPaymentDestinationRequestInput,
  OwnHrisPaymentDestinationReadInput,
  OwnHrisPaymentDestinationRequestInput,
}

function asRecord(input: unknown) {
  return input && typeof input === "object" && !Array.isArray(input)
    ? input as Record<string, unknown>
    : {}
}

function ownRequestFields(input: unknown) {
  const record = asRecord(input)
  return {
    paymentMethod: record.paymentMethod,
    bankAccountNumber: record.bankAccountNumber,
    bankName: record.bankName,
    accountHolderName: record.accountHolderName,
    mobileMoneyProvider: record.mobileMoneyProvider,
    mobileMoneyPhone: record.mobileMoneyPhone,
    requestReason: record.requestReason,
    evidenceDocumentHash: record.evidenceDocumentHash,
    sourceReference: record.sourceReference,
    idempotencyKey: record.idempotencyKey,
  }
}

function revalidatePaymentDestinationPaths() {
  revalidatePath("/dashboard/people", "page")
  revalidatePath("/[locale]/dashboard/people", "page")
  revalidatePath("/dashboard/people/me", "page")
  revalidatePath("/[locale]/dashboard/people/me", "page")
  revalidatePath("/dashboard/payroll", "page")
  revalidatePath("/[locale]/dashboard/payroll", "page")
  revalidatePath("/dashboard/payroll/command-center", "page")
  revalidatePath("/[locale]/dashboard/payroll/command-center", "page")
}

const readPaymentDestination = protect<
  unknown,
  Awaited<ReturnType<typeof getHrisPaymentDestinationStatus>>
>(
  {
    permission: "hris.people.read",
    auditResource: "HrisPaymentDestination",
    auditAllowed: false,
    tenantGuard: "handler-derived",
  },
  async (input, ctx) => getHrisPaymentDestinationStatus({
    ...asRecord(input),
    organizationId: ctx.orgId,
    actorId: ctx.userId,
    actorPermissions: ctx.permissions,
  } as HrisPaymentDestinationReadInput),
)

const readOwnPaymentDestination = protect<
  unknown,
  Awaited<ReturnType<typeof getOwnHrisPaymentDestinationStatus>>
>(
  {
    permission: "hris.self_service.read",
    auditResource: "HrisPaymentDestination",
    auditAllowed: false,
    tenantGuard: "handler-derived",
  },
  async (_input, ctx) => getOwnHrisPaymentDestinationStatus({
    organizationId: ctx.orgId,
    actorId: ctx.userId,
    actorPermissions: ctx.permissions,
  }),
)

export async function getHrisPaymentDestinationStatusAction(input: unknown) {
  return readPaymentDestination(input)
}

export async function getOwnHrisPaymentDestinationStatusAction(
  input: unknown = {},
) {
  return readOwnPaymentDestination(input)
}

const requestOwnPaymentDestination = protect<
  unknown,
  Awaited<ReturnType<typeof requestOwnHrisPaymentDestinationChange>>
>(
  {
    permission: "hris.self_service.request",
    auditResource: "HrisPaymentDestination",
    freshAuth: true,
    tenantGuard: "handler-derived",
  },
  async (input, ctx) => {
    const result = await requestOwnHrisPaymentDestinationChange({
      ...ownRequestFields(input),
      organizationId: ctx.orgId,
      actorId: ctx.userId,
      actorPermissions: ctx.permissions,
    } as OwnHrisPaymentDestinationRequestInput)
    revalidatePaymentDestinationPaths()
    return result
  },
)

export async function requestOwnHrisPaymentDestinationChangeAction(
  input: unknown,
) {
  return requestOwnPaymentDestination(input)
}

function managedMutation<TInput, TResult>(
  operation: (input: TInput) => Promise<TResult>,
) {
  return protect<unknown, TResult>(
    {
      permission: "hris.people.manage",
      auditResource: "HrisPaymentDestination",
      freshAuth: true,
      tenantGuard: "handler-derived",
    },
    async (input, ctx) => {
      const result = await operation({
        ...asRecord(input),
        organizationId: ctx.orgId,
        actorId: ctx.userId,
        actorPermissions: ctx.permissions,
      } as TInput)
      revalidatePaymentDestinationPaths()
      return result
    },
  )
}

const requestPaymentDestination = managedMutation<
  HrisPaymentDestinationRequestInput,
  Awaited<ReturnType<typeof requestHrisPaymentDestinationChange>>
>(requestHrisPaymentDestinationChange)

const approvePaymentDestination = managedMutation<
  HrisPaymentDestinationApprovalInput,
  Awaited<ReturnType<typeof approveHrisPaymentDestinationChange>>
>(approveHrisPaymentDestinationChange)

const rejectPaymentDestination = managedMutation<
  HrisPaymentDestinationRejectionInput,
  Awaited<ReturnType<typeof rejectHrisPaymentDestinationChange>>
>(rejectHrisPaymentDestinationChange)

const applyPaymentDestination = managedMutation<
  HrisPaymentDestinationApplyInput,
  Awaited<ReturnType<typeof applyApprovedHrisPaymentDestinationChange>>
>(applyApprovedHrisPaymentDestinationChange)

export async function requestHrisPaymentDestinationChangeAction(input: unknown) {
  return requestPaymentDestination(input)
}

export async function approveHrisPaymentDestinationChangeAction(input: unknown) {
  return approvePaymentDestination(input)
}

export async function rejectHrisPaymentDestinationChangeAction(input: unknown) {
  return rejectPaymentDestination(input)
}

export async function applyApprovedHrisPaymentDestinationChangeAction(
  input: unknown,
) {
  return applyPaymentDestination(input)
}
