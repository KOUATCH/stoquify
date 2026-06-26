"use server"

import { revalidatePath } from "next/cache"

import { protect } from "@/services/_shared/protect"
import {
  applyApprovedPaymentDestinationChange,
  applyApprovedPaymentDestinationChangeInputSchema,
  approvePaymentDestinationChange,
  approvePaymentDestinationChangeInputSchema,
  getPaymentEvidenceReadiness,
  rejectPaymentDestinationChange,
  rejectPaymentDestinationChangeInputSchema,
  requestPaymentDestinationChange,
  requestPaymentDestinationChangeInputSchema,
  type PaymentDestinationMutationResult,
  type PaymentEvidenceReadinessResult,
} from "@/services/payroll/payment-evidence.service"

export type { PaymentDestinationMutationResult, PaymentEvidenceReadinessResult }

function asRecord(input: unknown) {
  return input && typeof input === "object" && !Array.isArray(input) ? input : {}
}

function revalidatePayrollPaymentEvidencePaths() {
  revalidatePath("/dashboard/payroll", "page")
  revalidatePath("/[locale]/dashboard/payroll", "page")
}

const readPaymentEvidence = protect<unknown, PaymentEvidenceReadinessResult>(
  {
    permission: "payroll.payment_destination.read",
    auditResource: "PayrollPaymentEvidenceReadiness",
    auditAllowed: false,
    tenantGuard: "handler-derived",
    module: {
      moduleSlug: "payroll",
      surface: "payroll.payment_destination.read",
      accessIntent: "read",
      mode: "enforce",
    },
  },
  async (input, ctx) =>
    getPaymentEvidenceReadiness({
      ...asRecord(input),
      organizationId: ctx.orgId,
      actorId: ctx.userId,
      actorPermissions: ctx.permissions,
    }),
)

export async function getPaymentEvidenceReadinessAction(input: unknown = {}) {
  return readPaymentEvidence(input)
}

const requestDestination = protect<unknown, PaymentDestinationMutationResult>(
  {
    permission: "payroll.payment_destination.request",
    auditResource: "PayrollPaymentDestinationChangeRequest",
    freshAuth: true,
    tenantGuard: "handler-derived",
    module: {
      moduleSlug: "payroll",
      surface: "payroll.payment_destination.request",
      accessIntent: "write",
      mode: "enforce",
    },
  },
  async (input, ctx) => {
    const parsed = requestPaymentDestinationChangeInputSchema.parse({
      ...asRecord(input),
      organizationId: ctx.orgId,
      actorId: ctx.userId,
      actorPermissions: ctx.permissions,
    })
    const result = await requestPaymentDestinationChange(parsed)
    revalidatePayrollPaymentEvidencePaths()
    return result
  },
)

export async function requestPaymentDestinationChangeAction(input: unknown) {
  return requestDestination(input)
}

const approveDestination = protect<unknown, PaymentDestinationMutationResult>(
  {
    permission: "payroll.payment_destination.approve",
    auditResource: "PayrollPaymentDestinationChangeRequest",
    freshAuth: true,
    tenantGuard: "handler-derived",
    module: {
      moduleSlug: "payroll",
      surface: "payroll.payment_destination.approve",
      accessIntent: "write",
      mode: "enforce",
    },
  },
  async (input, ctx) => {
    const parsed = approvePaymentDestinationChangeInputSchema.parse({
      ...asRecord(input),
      organizationId: ctx.orgId,
      actorId: ctx.userId,
      actorPermissions: ctx.permissions,
    })
    const result = await approvePaymentDestinationChange(parsed)
    revalidatePayrollPaymentEvidencePaths()
    return result
  },
)

export async function approvePaymentDestinationChangeAction(input: unknown) {
  return approveDestination(input)
}

const rejectDestination = protect<unknown, PaymentDestinationMutationResult>(
  {
    permission: "payroll.payment_destination.approve",
    auditResource: "PayrollPaymentDestinationChangeRequest",
    freshAuth: true,
    tenantGuard: "handler-derived",
    module: {
      moduleSlug: "payroll",
      surface: "payroll.payment_destination.reject",
      accessIntent: "write",
      mode: "enforce",
    },
  },
  async (input, ctx) => {
    const parsed = rejectPaymentDestinationChangeInputSchema.parse({
      ...asRecord(input),
      organizationId: ctx.orgId,
      actorId: ctx.userId,
      actorPermissions: ctx.permissions,
    })
    const result = await rejectPaymentDestinationChange(parsed)
    revalidatePayrollPaymentEvidencePaths()
    return result
  },
)

export async function rejectPaymentDestinationChangeAction(input: unknown) {
  return rejectDestination(input)
}

const applyDestination = protect<unknown, PaymentDestinationMutationResult>(
  {
    permission: "payroll.payment_destination.apply",
    auditResource: "PayrollPaymentDestinationChangeRequest",
    freshAuth: true,
    tenantGuard: "handler-derived",
    module: {
      moduleSlug: "payroll",
      surface: "payroll.payment_destination.apply",
      accessIntent: "write",
      mode: "enforce",
    },
  },
  async (input, ctx) => {
    const parsed = applyApprovedPaymentDestinationChangeInputSchema.parse({
      ...asRecord(input),
      organizationId: ctx.orgId,
      actorId: ctx.userId,
      actorPermissions: ctx.permissions,
    })
    const result = await applyApprovedPaymentDestinationChange(parsed)
    revalidatePayrollPaymentEvidencePaths()
    return result
  },
)

export async function applyApprovedPaymentDestinationChangeAction(input: unknown) {
  return applyDestination(input)
}