"use server"

import { revalidatePath } from "next/cache"
import { requireAllPermissions } from "@/lib/security/rbac"
import { requireSession } from "@/lib/security/auth-session"
import { ForbiddenError, toSafeActionError } from "@/services/_shared/action-errors"
import {
  paymentReconciliationDraftSchema, paymentReconciliationCommandSchema, paymentReconciliationDecisionSchema,
  paymentReconciliationReopenSchema, paymentReconciliationFinalizeSchema, paymentReconciliationQuerySchema,
} from "@/services/purchasing/payment-reconciliation-contracts"
import {
  previewPaymentReconciliation, proposePaymentReconciliation, reviewPaymentReconciliation,
  decidePaymentReconciliation, reopenPaymentReconciliation, finalizePaymentReconciliation,
  readPaymentReconciliation, loadPaymentReconciliationSources, loadPaymentReconciliationEvidenceChoices,
} from "@/services/purchasing/payment-reconciliation-service"

async function scope(operation: "read" | "propose" | "decide") {
  const permissions = ["payments.reconciliation.read", "accounting.journal.read"]
  if (operation !== "read") permissions.push("payments.reconciliation.exception.resolve")
  if (operation === "decide") permissions.push("payments.reconciliation.sign")
  const actor = await requireAllPermissions(permissions, { resource: "SupplierPayment" })
  const { claims } = await requireSession()
  if (claims.userId !== actor.userId || claims.tenantId !== actor.orgId) throw new ForbiddenError("Current payment workspace identity is required.")
  return { organizationId: actor.orgId, actorId: actor.userId, sessionId: claims.sessionId, sessionToken: claims.sessionToken }
}
function failure(error: unknown) { const safe = toSafeActionError(error); return { success: false as const, data: null, error: safe.error, code: safe.code } }
function refresh() {
  // A cache refresh cannot change the outcome of the committed source decision.
  try {
    for (const route of ["/dashboard/purchases/payables", "/dashboard/purchases/payables/history", "/dashboard/purchases/payables/payments/reconcile", "/dashboard/finance/reconciliation", "/dashboard/finance", "/dashboard/accounting/close"]) revalidatePath(`/[locale]${route}`, "page")
  } catch { /* The retained service result remains authoritative. */ }
}
export async function loadSupplierPaymentReconciliationSources(input: unknown) {
  try { const actor = await scope("read"); return { success: true as const, data: await loadPaymentReconciliationSources(paymentReconciliationQuerySchema.parse(input), actor) } } catch (error) { return failure(error) }
}
export async function loadSupplierPaymentReconciliation(input: unknown) {
  try { const actor = await scope("read"); return { success: true as const, data: await readPaymentReconciliation(paymentReconciliationDraftSchema.shape.paymentRequestId.parse(input), actor) } } catch (error) { return failure(error) }
}
export async function loadSupplierPaymentReconciliationChoices(input: unknown) {
  try { const actor = await scope("read"); return { success: true as const, data: await loadPaymentReconciliationEvidenceChoices(paymentReconciliationDraftSchema.shape.paymentRequestId.parse(input), actor) } } catch (error) { return failure(error) }
}
export async function previewSupplierPaymentReconciliation(input: unknown) {
  try { const actor = await scope("propose"); return { success: true as const, data: await previewPaymentReconciliation(paymentReconciliationDraftSchema.parse(input), actor) } } catch (error) { return failure(error) }
}
export async function reviewSupplierPaymentReconciliation(input: unknown) {
  try { const actor = await scope("read"); return { success: true as const, data: await reviewPaymentReconciliation(paymentReconciliationDraftSchema.shape.paymentRequestId.parse(input), actor) } } catch (error) { return failure(error) }
}
export async function proposeSupplierPaymentReconciliation(input: unknown) {
  try { const actor = await scope("propose"), command = paymentReconciliationCommandSchema.parse(input); const data = await proposePaymentReconciliation(command, actor); refresh(); return { success: true as const, data } } catch (error) { return failure(error) }
}
export async function decideSupplierPaymentReconciliation(input: unknown) {
  try { const actor = await scope("decide"), command = paymentReconciliationDecisionSchema.parse(input); const data = await decidePaymentReconciliation(command, actor); refresh(); return { success: true as const, data } } catch (error) { return failure(error) }
}
export async function reopenSupplierPaymentReconciliation(input: unknown) {
  try { const actor = await scope("propose"), command = paymentReconciliationReopenSchema.parse(input); const data = await reopenPaymentReconciliation(command, actor); refresh(); return { success: true as const, data } } catch (error) { return failure(error) }
}
export async function finalizeSupplierPaymentReconciliation(input: unknown) {
  try { const actor = await scope("decide"), command = paymentReconciliationFinalizeSchema.parse(input); const data = await finalizePaymentReconciliation(command, actor); refresh(); return { success: true as const, data } } catch (error) { return failure(error) }
}
