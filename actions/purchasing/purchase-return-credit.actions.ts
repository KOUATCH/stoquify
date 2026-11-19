"use server"

import { revalidatePath, revalidateTag } from "next/cache"

import { protect, type ProtectedActionContext } from "@/services/_shared/protect"
import { FreshAuthRequiredError, requireFreshAuth } from "@/lib/security/auth-session"
import { RbacError, requirePermission } from "@/lib/security/rbac"
import { purchaseReceivingAuthority, purchaseReceivingScopeSchema } from "@/services/purchase-order/purchase-receiving-authority"
import { purchaseReturnWorkbenchCommandSchema } from "@/services/purchasing/purchase-return-workbench.contracts"
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
    const session = ctx.freshAuth?.claims
    if (session?.userId !== ctx.userId || session.tenantId !== ctx.orgId) throw new FreshAuthRequiredError()
    const scope = purchaseReceivingScopeSchema.parse({ organizationId: ctx.orgId, actorId: ctx.userId, sessionId: session.sessionId, sessionToken: session.sessionToken })
    const result = await postPurchaseReturn(parsed, undefined, {
      async assertCurrentAuthority(tx) {
        const current = await purchaseReceivingAuthority(tx, scope, "return")
        if (!current.fresh) throw new FreshAuthRequiredError()
      },
    })
    try {
      revalidatePurchaseEvidencePaths()
      revalidateTag(`purchaseOrder-${parsed.purchaseOrderId}`)
      revalidateTag(`inventory-${ctx.orgId}`)
      revalidatePath("/[locale]/dashboard/purchase-orders/[id]", "page")
    } catch { /* The retained operation is authoritative after commit. */ }
    return result
  },
)

export async function postPurchaseReturnAction(input: unknown) {
  return postReturn(input)
}

export async function postPurchaseReturnFromReceiptAction(input: unknown) {
  const command = purchaseReturnWorkbenchCommandSchema.safeParse(input)
  if (!command.success) return { success: false as const, code: "VALIDATION_ERROR", error: "A reviewed source receipt and valid return quantities are required." }
  const result = await postReturn(command.data)
  if (!result.success) return { success: false as const, code: result.code, error: result.error }
  const { purchaseReturn, replayed } = result.data
  return { success: true as const, data: {
    organizationId: purchaseReturn.organizationId, actorId: purchaseReturn.postedById,
    purchaseOrderId: purchaseReturn.purchaseOrderId, goodsReceiptId: purchaseReturn.goodsReceiptId,
    returnNumber: purchaseReturn.returnNumber, requestReference: purchaseReturn.idempotencyKey, replayed,
  } }
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

const postCredit = protect(
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
    const { supplierCreditNote: note } = result
    return {
      supplierCreditNote: { id: note.id, creditNoteNumber: note.creditNoteNumber, currency: note.currency, total: note.total.toFixed(2) },
      replayed: result.replayed,
      ledgerStatus: result.ledgerStatus ?? (note.journalEntryId ? "POSTED" : note.ledgerPostingBatchId ? "BLOCKED_PENDING_RULES" : "NOT_REQUIRED"),
    }
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
