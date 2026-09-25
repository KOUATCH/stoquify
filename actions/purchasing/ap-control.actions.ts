"use server"
import { confirmPaymentRequestApproval } from "@/services/purchasing/payment-request.service"
import { paymentRequestApprovalSchema } from "@/services/purchasing/payment-request-contracts"
import { confirmPaymentRelease } from "@/services/purchasing/payment-release.service"
import { paymentReleaseCommandSchema } from "@/services/purchasing/payment-release-contracts"

import { revalidatePath } from "next/cache"

import { protect } from "@/services/_shared/protect"
import {
  approveSupplierBankChangeWithControls,
  getAPWorkbenchData,
  requestSupplierBankChange,
  type APWorkbenchData,
} from "@/services/purchasing/ap-control.service"
import {
  approveSupplierBankChangeInputSchema,
  approveSupplierInvoiceInputSchema,
  postSupplierInvoiceInputSchema,
  requestSupplierInvoiceMatchExceptionInputSchema,
  requestSupplierBankChangeInputSchema,
  reviewSupplierInvoiceMatchExceptionInputSchema,
} from "@/services/purchasing/ap-control.schemas"

export type { APWorkbenchData }

function asRecord(input: unknown) {
  return input && typeof input === "object" && !Array.isArray(input) ? input : {}
}

function revalidateAPPaths() {
  revalidatePath("/dashboard/purchases/payables", "page")
  revalidatePath("/dashboard/finance/payables", "page")
  revalidatePath("/[locale]/dashboard/purchases/payables", "page")
  revalidatePath("/[locale]/dashboard/finance/payables", "page")
}

const getWorkbench = protect<unknown, APWorkbenchData>(
  {
    permission: "purchasing.ap.invoice.view",
    auditResource: "APWorkbench",
    auditAllowed: false,
  },
  async (input, ctx) => {
    const raw = asRecord(input) as { limit?: unknown }
    const limit = typeof raw.limit === "number" ? raw.limit : undefined
    return getAPWorkbenchData({ organizationId: ctx.orgId, limit })
  },
)

export async function getAPWorkbenchAction(input: unknown = {}) {
  return getWorkbench(input)
}

const prepareInvoice = protect<unknown, null>(
  {
    permission: "purchasing.ap.invoice.post",
    auditResource: "SupplierInvoice",
    tenantGuard: "handler-derived",
  },
  async (input, ctx) => {
    postSupplierInvoiceInputSchema.parse({
      ...asRecord(input),
      organizationId: ctx.orgId,
      createdById: ctx.userId,
      approvedById: undefined,
    })
    // Legacy clients must use the reviewed, session-bound preparation command.
    // Parsing still rejects malformed calls; it never creates an unreviewed invoice.
    return null
  },
)

export async function prepareSupplierInvoiceAction(input: unknown) {
  const checked = await prepareInvoice(input)
  if (!checked.success) return checked
  return { success: false as const, data: null, error: "Open invoice preparation and review this invoice before saving.", code: "REVIEW_REQUIRED" as const, status: 422 as const }
}

const approveAndPostInvoice = protect<unknown, null>(
  {
    permission: "purchasing.ap.invoice.post",
    auditResource: "SupplierInvoice",
    freshAuth: true,
    tenantGuard: "handler-derived",
  },
  async (input, ctx) => {
    const raw = asRecord(input) as { supplierInvoiceId?: unknown }
    approveSupplierInvoiceInputSchema.parse({
      organizationId: ctx.orgId,
      supplierInvoiceId: raw.supplierInvoiceId,
      approvedById: ctx.userId,
    })
    // Original callers must review the current source and submit its exact revision.
    return null
  },
)

export async function postSupplierInvoiceAction(input: unknown) {
  const checked = await approveAndPostInvoice(input)
  if (!checked.success) return checked
  return { success: false as const, data: null, error: "Review the current invoice before submitting its approval.", code: "REVIEW_REQUIRED" as const, status: 422 as const }
}

const requestMatchException = protect<unknown, null>(
  {
    permission: "purchasing.ap.invoice.post",
    auditResource: "SupplierInvoiceMatchException",
    tenantGuard: "handler-derived",
  },
  async (input, ctx) => {
    requestSupplierInvoiceMatchExceptionInputSchema.parse({
      ...asRecord(input),
      organizationId: ctx.orgId,
      requestedById: ctx.userId,
    })
    return null
  },
)

export async function requestSupplierInvoiceMatchExceptionAction(input: unknown) {
  const checked = await requestMatchException(input)
  if (!checked.success) return checked
  return { success: false as const, data: null, error: "Review the current exception request before submitting.", code: "REVIEW_REQUIRED" as const, status: 422 as const }
}

const reviewMatchException = protect<unknown, null>(
  {
    permission: "purchasing.ap.match.review",
    auditResource: "SupplierInvoiceMatchException",
    freshAuth: true,
    tenantGuard: "handler-derived",
  },
  async (input, ctx) => {
    reviewSupplierInvoiceMatchExceptionInputSchema.parse({
      ...asRecord(input),
      organizationId: ctx.orgId,
      reviewedById: ctx.userId,
    })
    return null
  },
)

export async function reviewSupplierInvoiceMatchExceptionAction(input: unknown) {
  const checked = await reviewMatchException(input)
  if (!checked.success) return checked
  return { success: false as const, data: null, error: "Review the current exception evidence before deciding.", code: "REVIEW_REQUIRED" as const, status: 422 as const }
}

const requestBankChange = protect<unknown, Awaited<ReturnType<typeof requestSupplierBankChange>>>(
  {
    permission: "purchasing.supplier.bank.request",
    auditResource: "SupplierBankChangeRequest",
    tenantGuard: "handler-derived",
  },
  async (input, ctx) => {
    const parsed = requestSupplierBankChangeInputSchema.parse({
      ...asRecord(input),
      organizationId: ctx.orgId,
      requestedById: ctx.userId,
    })
    const result = await requestSupplierBankChange(parsed)
    revalidateAPPaths()
    return result
  },
)

export async function requestSupplierBankChangeAction(input: unknown) {
  return requestBankChange(input)
}

const approveBankChange = protect<unknown, Awaited<ReturnType<typeof approveSupplierBankChangeWithControls>>>(
  {
    permission: "purchasing.supplier.bank.approve",
    auditResource: "SupplierBankChangeRequest",
    freshAuth: true,
    tenantGuard: "handler-derived",
  },
  async (input, ctx) => {
    const parsed = approveSupplierBankChangeInputSchema.parse({
      ...asRecord(input),
      organizationId: ctx.orgId,
      approvedById: ctx.userId,
    })
    const result = await approveSupplierBankChangeWithControls(parsed, {
      organizationId: ctx.orgId,
      actorId: ctx.userId,
      actorPermissions: ctx.permissions,
      lastAuthAt: Date.now(),
    })
    revalidateAPPaths()
    return result
  },
)

export async function approveSupplierBankChangeAction(input: unknown) {
  return approveBankChange(input)
}

const approvePayment = protect<unknown, Awaited<ReturnType<typeof confirmPaymentRequestApproval>>>({ permission: "purchasing.ap.payment.approve", auditResource: "SupplierPayment", freshAuth: true, tenantGuard: "handler-derived" }, async (input, ctx) => {
  const parsed = paymentRequestApprovalSchema.parse(input)
  if (!ctx.freshAuth) throw new Error("Fresh payment approval context is unavailable.")
  const result = await confirmPaymentRequestApproval(parsed, { organizationId: ctx.orgId, actorId: ctx.userId, sessionId: ctx.freshAuth.claims.sessionId, sessionToken: ctx.freshAuth.claims.sessionToken })
  revalidateAPPaths()
  return result
})

export async function approveSupplierPaymentAction(input: unknown) { return approvePayment(input) }

const releasePayment = protect<unknown, Awaited<ReturnType<typeof confirmPaymentRelease>>>(
  {
    permission: "purchasing.ap.payment.release",
    auditResource: "SupplierPayment",
    freshAuth: true,
    tenantGuard: "handler-derived",
  },
  async (input, ctx) => {
    const parsed = paymentReleaseCommandSchema.parse(input)
    if (!ctx.freshAuth) throw new Error("Fresh payment recording context is unavailable.")
    const result = await confirmPaymentRelease(parsed, { organizationId: ctx.orgId, actorId: ctx.userId, sessionId: ctx.freshAuth.claims.sessionId, sessionToken: ctx.freshAuth.claims.sessionToken })
    revalidateAPPaths()
    return result
  },
)

export async function releaseSupplierPaymentAction(input: unknown) {
  return releasePayment(input)
}
