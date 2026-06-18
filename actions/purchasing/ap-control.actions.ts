"use server"

import { revalidatePath } from "next/cache"

import { protect } from "@/services/_shared/protect"
import {
  approveSupplierBankChangeWithControls,
  getAPWorkbenchData,
  postSupplierInvoice,
  releaseSupplierPaymentWithControls,
  requestSupplierBankChange,
  type APWorkbenchData,
} from "@/services/purchasing/ap-control.service"
import {
  approveSupplierBankChangeInputSchema,
  postSupplierInvoiceInputSchema,
  releaseSupplierPaymentInputSchema,
  requestSupplierBankChangeInputSchema,
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

const postInvoice = protect<unknown, Awaited<ReturnType<typeof postSupplierInvoice>>>(
  {
    permission: "purchasing.ap.invoice.post",
    auditResource: "SupplierInvoice",
    tenantGuard: "handler-derived",
  },
  async (input, ctx) => {
    const parsed = postSupplierInvoiceInputSchema.parse({
      ...asRecord(input),
      organizationId: ctx.orgId,
      createdById: ctx.userId,
      approvedById: ctx.userId,
    })
    const result = await postSupplierInvoice(parsed)
    revalidateAPPaths()
    return result
  },
)

export async function postSupplierInvoiceAction(input: unknown) {
  return postInvoice(input)
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

const releasePayment = protect<unknown, Awaited<ReturnType<typeof releaseSupplierPaymentWithControls>>>(
  {
    permission: "purchasing.ap.payment.release",
    auditResource: "SupplierPayment",
    freshAuth: true,
    tenantGuard: "handler-derived",
  },
  async (input, ctx) => {
    const parsed = releaseSupplierPaymentInputSchema.parse({
      ...asRecord(input),
      organizationId: ctx.orgId,
      approvedById: ctx.userId,
      releasedById: ctx.userId,
    })
    const result = await releaseSupplierPaymentWithControls(parsed, {
      organizationId: ctx.orgId,
      actorId: ctx.userId,
      actorPermissions: ctx.permissions,
      lastAuthAt: Date.now(),
    })
    revalidateAPPaths()
    return result
  },
)

export async function releaseSupplierPaymentAction(input: unknown) {
  return releasePayment(input)
}
