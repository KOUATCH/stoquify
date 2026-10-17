"use server"

import { revalidatePath } from "next/cache"

import { protect } from "@/services/_shared/protect"
import {
  postPurchaseReturn,
  postSupplierCreditNote,
  reversePurchaseReturn,
  reverseSupplierCreditNote,
} from "@/services/purchasing/purchase-return-credit.service"
import {
  postPurchaseReturnInputSchema,
  postSupplierCreditNoteInputSchema,
  reversePurchaseReturnInputSchema,
  reverseSupplierCreditNoteInputSchema,
} from "@/services/purchasing/purchase-return-credit.schemas"

function asRecord(input: unknown) {
  return input && typeof input === "object" && !Array.isArray(input) ? input : {}
}

function revalidatePurchaseEvidencePaths() {
  revalidatePath("/dashboard/purchases", "page")
  revalidatePath("/dashboard/purchases/payables", "page")
  revalidatePath("/[locale]/dashboard/purchases", "page")
  revalidatePath("/[locale]/dashboard/purchases/payables", "page")
}

const postReturn = protect<unknown, Awaited<ReturnType<typeof postPurchaseReturn>>>(
  {
    permission: "purchasing.returns.post",
    auditResource: "PurchaseReturn",
    freshAuth: true,
    tenantGuard: "handler-derived",
  },
  async (input, ctx) => {
    const parsed = postPurchaseReturnInputSchema.parse({
      ...asRecord(input),
      organizationId: ctx.orgId,
      postedById: ctx.userId,
    })
    const result = await postPurchaseReturn(parsed)
    revalidatePurchaseEvidencePaths()
    return result
  },
)

export async function postPurchaseReturnAction(input: unknown) {
  return postReturn(input)
}

const reverseReturn = protect<unknown, Awaited<ReturnType<typeof reversePurchaseReturn>>>(
  {
    permission: "purchasing.returns.post",
    auditResource: "PurchaseReturn",
    freshAuth: true,
    tenantGuard: "handler-derived",
  },
  async (input, ctx) => {
    const parsed = reversePurchaseReturnInputSchema.parse({
      ...asRecord(input),
      organizationId: ctx.orgId,
      postedById: ctx.userId,
    })
    const result = await reversePurchaseReturn(parsed)
    revalidatePurchaseEvidencePaths()
    return result
  },
)

export async function reversePurchaseReturnAction(input: unknown) {
  return reverseReturn(input)
}

const postCredit = protect<unknown, Awaited<ReturnType<typeof postSupplierCreditNote>>>(
  {
    permission: "purchasing.ap.credit.post",
    auditResource: "SupplierCreditNote",
    freshAuth: true,
    tenantGuard: "handler-derived",
  },
  async (input, ctx) => {
    const parsed = postSupplierCreditNoteInputSchema.parse({
      ...asRecord(input),
      organizationId: ctx.orgId,
      postedById: ctx.userId,
    })
    const result = await postSupplierCreditNote(parsed)
    revalidatePurchaseEvidencePaths()
    return result
  },
)

export async function postSupplierCreditNoteAction(input: unknown) {
  return postCredit(input)
}

const reverseCredit = protect<unknown, Awaited<ReturnType<typeof reverseSupplierCreditNote>>>(
  {
    permission: "purchasing.ap.credit.post",
    auditResource: "SupplierCreditNote",
    freshAuth: true,
    tenantGuard: "handler-derived",
  },
  async (input, ctx) => {
    const parsed = reverseSupplierCreditNoteInputSchema.parse({
      ...asRecord(input),
      organizationId: ctx.orgId,
      postedById: ctx.userId,
    })
    const result = await reverseSupplierCreditNote(parsed)
    revalidatePurchaseEvidencePaths()
    return result
  },
)

export async function reverseSupplierCreditNoteAction(input: unknown) {
  return reverseCredit(input)
}
