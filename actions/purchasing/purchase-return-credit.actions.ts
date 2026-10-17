"use server"

import { revalidatePath } from "next/cache"

import { protect, type ProtectedActionContext } from "@/services/_shared/protect"
import { requireFreshAuth } from "@/lib/security/auth-session"
import { RbacError, requirePermission } from "@/lib/security/rbac"
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

function reversalAuthority(ctx: ProtectedActionContext, permission: string, resource: string) {
  if (ctx.freshAuth?.claims.userId !== ctx.userId || ctx.freshAuth.claims.tenantId !== ctx.orgId) {
    throw new RbacError("Session identity mismatch", "UNAUTHENTICATED", 401)
  }
  return {
    // This closure is constructed only from the protected server context. The
    // owner calls it after source/period waits and before the first write.
    async assertCurrentAuthority() {
      const verified = await requireFreshAuth(300)
      const current = await requirePermission(permission, { resource, auditAllowed: false })
      if (verified.claims.userId !== ctx.userId || verified.claims.tenantId !== ctx.orgId ||
          current.userId !== ctx.userId || current.orgId !== ctx.orgId) {
        throw new RbacError("Session identity changed; refresh before reversing.", "UNAUTHENTICATED", 401)
      }
    },
  }
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
    const result = await reversePurchaseReturn(parsed, undefined,
      reversalAuthority(ctx, "purchasing.returns.post", "PurchaseReturn"))
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
    const result = await reverseSupplierCreditNote(parsed, undefined,
      reversalAuthority(ctx, "purchasing.ap.credit.post", "SupplierCreditNote"))
    revalidatePurchaseEvidencePaths()
    return result
  },
)

export async function reverseSupplierCreditNoteAction(input: unknown) {
  return reverseCredit(input)
}
